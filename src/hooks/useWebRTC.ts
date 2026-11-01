import { useEffect, useRef, useState, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { CallRecord, UserProfile } from '../types';
import { initiateCall, updateCallStatus } from '../firebase/services';
import { sounds } from '../utils/audio';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(currentUserProfile: UserProfile | null) {
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<any>(null);

  // Clean up streams & peer connection
  const cleanupCall = useCallback(() => {
    sounds.stopRing();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    remoteStreamRef.current = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  // Duration timer when connected
  useEffect(() => {
    if (callState === 'connected') {
      sounds.stopRing();
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Start outgoing call
  const startCall = async (receiver: UserProfile, type: 'audio' | 'video') => {
    if (!currentUserProfile) return;
    cleanupCall();
    setCallState('calling');
    sounds.playRing();

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Acquire media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Create call document in Firestore
      const call = await initiateCall(currentUserProfile, receiver, type, offer);
      setActiveCall(call);

      // Collect ICE candidates
      const callerCandidatesCol = collection(db, 'calls', call.id, 'callerCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(callerCandidatesCol, event.candidate.toJSON());
        }
      };

      // Listen for answer and status changes
      const unsubCall = onSnapshot(doc(db, 'calls', call.id), async (snapshot) => {
        const data = snapshot.data() as CallRecord;
        if (!data) return;

        if (data.status === 'connected' && data.answer && !pc.currentRemoteDescription) {
          const answerDesc = new RTCSessionDescription(JSON.parse(data.answer));
          await pc.setRemoteDescription(answerDesc);
          setCallState('connected');
          sounds.stopRing();
        } else if (data.status === 'rejected' || data.status === 'ended') {
          sounds.playCallEnd();
          setCallState('ended');
          cleanupCall();
          unsubCall();
        }
      });

      // Listen for receiver ICE candidates
      const receiverCandidatesCol = collection(db, 'calls', call.id, 'receiverCandidates');
      const unsubReceiverCand = onSnapshot(receiverCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            try {
              await pc.addIceCandidate(candidate);
            } catch (err) {
              console.warn('Error adding ICE candidate:', err);
            }
          }
        });
      });
    } catch (err) {
      console.error('Call failed to initialize:', err);
      sounds.stopRing();
      setCallState('idle');
      cleanupCall();
    }
  };

  // Answer incoming call
  const answerCall = async (incomingCall: CallRecord) => {
    if (!currentUserProfile) return;
    sounds.stopRing();
    setCallState('connected');
    setActiveCall(incomingCall);

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };

      // Set Remote Description from offer
      if (incomingCall.offer) {
        const offerDesc = new RTCSessionDescription(JSON.parse(incomingCall.offer));
        await pc.setRemoteDescription(offerDesc);
      }

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Save answer in Firestore
      await updateCallStatus(incomingCall.id, 'connected', answer);

      // Collect receiver candidates
      const receiverCandidatesCol = collection(db, 'calls', incomingCall.id, 'receiverCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(receiverCandidatesCol, event.candidate.toJSON());
        }
      };

      // Listen for caller candidates
      const callerCandidatesCol = collection(db, 'calls', incomingCall.id, 'callerCandidates');
      onSnapshot(callerCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            try {
              await pc.addIceCandidate(candidate);
            } catch (err) {
              console.warn('Error adding ICE candidate:', err);
            }
          }
        });
      });

      // Listen for call termination
      onSnapshot(doc(db, 'calls', incomingCall.id), (snapshot) => {
        const data = snapshot.data() as CallRecord;
        if (data?.status === 'ended') {
          sounds.playCallEnd();
          setCallState('ended');
          cleanupCall();
        }
      });
    } catch (err) {
      console.error('Answer call failed:', err);
      cleanupCall();
      setCallState('idle');
    }
  };

  // Reject or Hang up
  const endCall = async () => {
    sounds.stopRing();
    sounds.playCallEnd();
    if (activeCall) {
      await updateCallStatus(activeCall.id, 'ended');
    }
    setCallState('ended');
    cleanupCall();
    setTimeout(() => {
      setCallState('idle');
      setActiveCall(null);
    }, 1200);
  };

  const rejectCall = async (incomingCall: CallRecord) => {
    sounds.stopRing();
    await updateCallStatus(incomingCall.id, 'rejected');
    setCallState('idle');
    setActiveCall(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return {
    activeCall,
    callState,
    callDuration,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleVideo,
    setCallState,
    setActiveCall,
  };
}
