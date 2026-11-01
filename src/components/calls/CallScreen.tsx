import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  User,
  ShieldCheck,
} from 'lucide-react';
import { CallRecord, UserProfile } from '../../types';
import { subscribeToCallHistory } from '../../firebase/services';

interface CallScreenProps {
  currentProfile: UserProfile;
  activeCall: CallRecord | null;
  incomingCall: CallRecord | null;
  callState: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onAnswerCall: (call: CallRecord) => void;
  onRejectCall: (call: CallRecord) => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onStartCall: (receiver: UserProfile, type: 'audio' | 'video') => void;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  currentProfile,
  activeCall,
  incomingCall,
  callState,
  callDuration,
  isMuted,
  isVideoOff,
  localVideoRef,
  remoteVideoRef,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onStartCall,
}) => {
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);

  useEffect(() => {
    const unsub = subscribeToCallHistory(currentProfile.uid, (history) => {
      setCallHistory(history);
    });
    return () => unsub();
  }, [currentProfile.uid]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isCallActive = callState === 'calling' || callState === 'connected';

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
      {/* ================= INCOMING CALL MODAL ================= */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-8 animate-in fade-in zoom-in-95">
          <div className="text-center pt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-4 border border-rose-500/30">
              <PhoneIncoming className="w-3.5 h-3.5 animate-bounce" />
              Gelen {incomingCall.callType === 'video' ? 'Görüntülü' : 'Sesli'} Arama
            </span>
            <div className="relative mx-auto w-28 h-28 my-4">
              <div className="absolute inset-0 rounded-full bg-rose-600/30 animate-ping"></div>
              <img
                src={incomingCall.callerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall.callerId}`}
                alt={incomingCall.callerName}
                className="w-full h-full rounded-full object-cover ring-4 ring-rose-500 shadow-2xl relative z-10"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">{incomingCall.callerName}</h2>
            <p className="text-xs text-neutral-400 mt-1">BizBize üzerinden arıyor...</p>
          </div>

          <div className="flex items-center justify-center gap-12 pb-12 w-full">
            {/* Reject Button */}
            <button
              onClick={() => onRejectCall(incomingCall)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition active:scale-95">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs text-neutral-300 font-medium">Reddet</span>
            </button>

            {/* Accept Button */}
            <button
              onClick={() => onAnswerCall(incomingCall)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition active:scale-95 animate-pulse">
                {incomingCall.callType === 'video' ? (
                  <Video className="w-7 h-7" />
                ) : (
                  <Phone className="w-7 h-7" />
                )}
              </div>
              <span className="text-xs text-emerald-400 font-medium">Yanıtla</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= ACTIVE / OUTGOING CALL OVERLAY ================= */}
      {isCallActive && activeCall && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between p-4 overflow-hidden">
          {/* Top Status */}
          <div className="flex items-center justify-between text-white z-20 pt-4 px-2">
            <div>
              <h3 className="text-lg font-bold">
                {activeCall.callerId === currentProfile.uid
                  ? activeCall.receiverName
                  : activeCall.callerName}
              </h3>
              <p className="text-xs text-rose-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {callState === 'calling'
                  ? 'Çalıyor...'
                  : `Görüşmede • ${formatDuration(callDuration)}`}
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-neutral-800/80 text-xs font-mono">
              {activeCall.callType === 'video' ? 'Görüntülü' : 'Sesli'}
            </div>
          </div>

          {/* Video Streams Display */}
          {activeCall.callType === 'video' ? (
            <div className="relative flex-1 rounded-3xl overflow-hidden my-4 bg-neutral-900 border border-neutral-800">
              {/* Remote Video (Main background) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local PiP Video */}
              <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-neutral-800">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                    Kamera Kapalı
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Audio Call Avatar Pulse */
            <div className="flex-1 flex flex-col items-center justify-center my-8">
              <div className="relative">
                {callState === 'connected' && (
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
                )}
                <img
                  src={
                    (activeCall.callerId === currentProfile.uid
                      ? activeCall.receiverPhoto
                      : activeCall.callerPhoto) ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=call`
                  }
                  alt="Arama"
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-rose-500 shadow-2xl relative z-10"
                />
              </div>
              <h2 className="text-xl font-bold text-white mt-6">
                {activeCall.callerId === currentProfile.uid
                  ? activeCall.receiverName
                  : activeCall.callerName}
              </h2>
              <p className="text-sm text-neutral-400 mt-2 font-mono">
                {callState === 'calling' ? 'Bağlanıyor...' : formatDuration(callDuration)}
              </p>
            </div>
          )}

          {/* Bottom Control Actions */}
          <div className="flex items-center justify-center gap-6 pb-6 z-20">
            <button
              onClick={onToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                isMuted ? 'bg-amber-500 text-white' : 'bg-neutral-800 text-neutral-200 hover:text-white'
              }`}
              title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {activeCall.callType === 'video' && (
              <button
                onClick={onToggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                  isVideoOff ? 'bg-amber-500 text-white' : 'bg-neutral-800 text-neutral-200 hover:text-white'
                }`}
                title={isVideoOff ? 'Kamerayı Aç' : 'Kamerayı Kapat'}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            <button
              onClick={onEndCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 transition active:scale-95"
              title="Aramayı Sonlandır"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* ================= CALL HISTORY TAB ================= */}
      <div className="px-4 pt-3 pb-2 border-b border-neutral-900 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Aramalar</h1>
          <p className="text-[10px] text-neutral-400">WebRTC Sesli ve Görüntülü Arama Geçmişi</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {callHistory.length === 0 ? (
          <div className="text-center py-16 px-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-500 mb-2">
              <PhoneCall className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-300">Henüz arama kaydı yok</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Arkadaşlarınızla yüksek kaliteli WebRTC sesli ve görüntülü görüşmeler yapabilirsiniz.
            </p>
          </div>
        ) : (
          callHistory.map((call) => {
            const isOutgoing = call.callerId === currentProfile.uid;
            const otherName = isOutgoing ? call.receiverName : call.callerName;
            const otherPhoto = isOutgoing ? call.receiverPhoto : call.callerPhoto;
            const otherUid = isOutgoing ? call.receiverId : call.callerId;
            const isMissed = call.status === 'missed' || call.status === 'rejected';

            const dummyUser: UserProfile = {
              uid: otherUid,
              displayName: otherName,
              username: 'kullanici',
              photoURL: otherPhoto,
              isOnline: true,
              lastSeen: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };

            return (
              <div
                key={call.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={otherPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUid}`}
                    alt={otherName}
                    className="w-11 h-11 rounded-full object-cover ring-1 ring-neutral-800"
                  />
                  <div>
                    <h3
                      className={`text-xs font-semibold ${
                        isMissed && !isOutgoing ? 'text-rose-400' : 'text-neutral-100'
                      }`}
                    >
                      {otherName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-0.5">
                      {isOutgoing ? (
                        <PhoneOutgoing className="w-3 h-3 text-emerald-400" />
                      ) : isMissed ? (
                        <PhoneMissed className="w-3 h-3 text-rose-500" />
                      ) : (
                        <PhoneIncoming className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>
                        {new Date(call.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onStartCall(dummyUser, 'audio')}
                    className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition"
                    title="Sesli Ara"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStartCall(dummyUser, 'video')}
                    className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition"
                    title="Görüntülü Ara"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
