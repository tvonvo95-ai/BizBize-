import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, buildUserProfileFromFirebaseUser } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PhoneContainer } from './components/PhoneContainer';
import { AuthModal } from './components/auth/AuthModal';
import { BottomNav, TabType } from './components/navigation/BottomNav';
import { ChatList } from './components/chat/ChatList';
import { ChatRoom } from './components/chat/ChatRoom';
import { NewChatModal } from './components/chat/NewChatModal';
import { CallScreen } from './components/calls/CallScreen';
import { StoryList } from './components/stories/StoryList';
import { StoryViewerModal } from './components/stories/StoryViewerModal';
import { CreateStoryModal } from './components/stories/CreateStoryModal';
import { FriendsView } from './components/friends/FriendsView';
import { SettingsView } from './components/settings/SettingsView';
import { Chat, Story, UserProfile, CallRecord } from './types';
import {
  subscribeToUserChats,
  subscribeToStories,
  subscribeToIncomingCalls,
  getOrCreateDirectChat,
} from './firebase/services';
import { getDemoChatsForUser, INITIAL_DEMO_STORIES } from './data/demoData';
import { useWebRTC } from './hooks/useWebRTC';
import { sounds } from './utils/audio';
import { showSystemNotification } from './utils/notifications';

const BizBizeApp: React.FC = () => {
  const { profile, loading, updateProfileData, isDemoUser, currentUser, signInWithGoogle, exitDemoMode } = useAuth();
  const [googleSwitching, setGoogleSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Guarantee an immediate non-null UserProfile whenever Firebase Auth is active
  const currentProfile: UserProfile | null = profile || (currentUser ? buildUserProfileFromFirebaseUser(currentUser) : null);

  const handleSwitchToGoogle = async () => {
    setGoogleSwitching(true);
    setSwitchError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Switch to Google failed:', err);
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (err.code === 'auth/unauthorized-domain') {
        setSwitchError(`Yetkisiz Alan Adı: Firebase Console -> Authentication -> Settings -> Authorized domains kısmına "${host}" eklenmelidir.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setSwitchError('Firebase Console -> Authentication -> Sign-in method üzerinden Google etkinleştirilmelidir.');
      } else if (err.code === 'auth/popup-blocked') {
        setSwitchError('Tarayıcınız Google popup penceresini engelledi. Lütfen adres çubuğundan açılır pencerelere izin verin.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setSwitchError('Google giriş penceresi kapatıldı.');
      } else {
        setSwitchError(err.message || 'Google girişi sırasında hata oluştu.');
      }
    } finally {
      setGoogleSwitching(false);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [incomingCallDoc, setIncomingCallDoc] = useState<CallRecord | null>(null);

  // WebRTC Call Manager
  const {
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
  } = useWebRTC(currentProfile);

  // Subscribe to user chats
  useEffect(() => {
    if (!currentProfile?.uid) return;
    if (isDemoUser) {
      setChats(getDemoChatsForUser(currentProfile.uid));
      return;
    }
    if (!currentUser) return;
    const unsub = subscribeToUserChats(currentProfile.uid, (c) => setChats(c));
    return () => unsub();
  }, [currentProfile?.uid, isDemoUser, currentUser]);

  // Subscribe to stories
  useEffect(() => {
    if (!currentProfile?.uid) return;
    if (isDemoUser) {
      setStories(INITIAL_DEMO_STORIES);
      return;
    }
    if (!currentUser) return;
    const unsub = subscribeToStories((s) => setStories(s));
    return () => unsub();
  }, [currentProfile?.uid, isDemoUser, currentUser]);

  // Subscribe to incoming WebRTC calls
  useEffect(() => {
    if (!currentProfile?.uid || isDemoUser || !currentUser) return;
    const unsub = subscribeToIncomingCalls(currentProfile.uid, (call) => {
      if (call && call.status === 'ringing') {
        setIncomingCallDoc(call);
        sounds.playRing();
        showSystemNotification(
          `Gelen Arama: ${call.callerName}`,
          `BizBize ❤️ üzerinden ${call.callType === 'video' ? 'görüntülü' : 'sesli'} arama yapılıyor...`,
          call.callerPhoto
        );
      } else {
        setIncomingCallDoc(null);
        sounds.stopRing();
      }
    });
    return () => {
      unsub();
      sounds.stopRing();
    };
  }, [currentProfile?.uid, isDemoUser, currentUser]);

  // Loading Splash Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center text-4xl shadow-2xl shadow-rose-600/40 animate-pulse mb-4">
          ❤️
        </div>
        <h1 className="text-2xl font-bold tracking-tight">BizBize ❤️</h1>
        <p className="text-xs text-neutral-400 mt-1">Yükleniyor...</p>
      </div>
    );
  }

  // Unauthenticated screen: Only show if neither a logged-in user nor profile exists
  if (!currentUser && !currentProfile) {
    return (
      <PhoneContainer>
        <AuthModal />
      </PhoneContainer>
    );
  }

  // Guarantee non-null profile for all downstream components
  const activeProfile = currentProfile || (currentUser ? buildUserProfileFromFirebaseUser(currentUser) : null);
  if (!activeProfile) {
    return (
      <PhoneContainer>
        <AuthModal />
      </PhoneContainer>
    );
  }

  // Calculate unread badge count
  const unreadMessagesCount = chats.reduce(
    (acc, c) => acc + (c.unreadCount?.[activeProfile.uid] || 0),
    0
  );

  const handleBlockUser = async (targetUid: string) => {
    const currentBlocked = activeProfile.blockedUsers || [];
    if (!currentBlocked.includes(targetUid)) {
      await updateProfileData({
        blockedUsers: [...currentBlocked, targetUid],
      });
      alert('Kullanıcı engellendi.');
    }
  };

  return (
    <PhoneContainer>
      {/* Demo Mode Notice */}
      {isDemoUser && (
        <div className="bg-gradient-to-r from-amber-950 via-neutral-900 to-amber-950 border-b border-amber-600/40 px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-200 z-30 select-none shadow">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
            <span className="truncate text-amber-300 font-semibold">Örnek Mod: {activeProfile.displayName}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleSwitchToGoogle}
              disabled={googleSwitching}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-[10px] flex items-center gap-1 shadow transition active:scale-95 disabled:opacity-50"
            >
              {googleSwitching ? (
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Google Girişi</span>
            </button>
            <button
              onClick={exitDemoMode}
              title="Örnek moddan çıkış yap"
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] transition"
            >
              Çıkış
            </button>
          </div>
        </div>
      )}

      {/* Switch error banner if any */}
      {switchError && (
        <div className="bg-rose-950/95 border-b border-rose-800 px-3 py-2 flex items-start justify-between text-xs text-rose-200 z-30 shadow-md">
          <span className="leading-snug">{switchError}</span>
          <button onClick={() => setSwitchError(null)} className="ml-2 text-neutral-400 hover:text-white font-bold p-0.5">×</button>
        </div>
      )}

      {/* If a ChatRoom is actively open, display it */}
      {selectedChat ? (
        <ChatRoom
          chat={selectedChat}
          currentProfile={activeProfile}
          onBack={() => setSelectedChat(null)}
          onStartAudioCall={(receiver) => startCall(receiver, 'audio')}
          onStartVideoCall={(receiver) => startCall(receiver, 'video')}
        />
      ) : (
        /* Otherwise display the active tab view */
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'chats' && (
            <ChatList
              chats={chats}
              currentProfile={activeProfile}
              stories={stories}
              onSelectChat={(chat) => setSelectedChat(chat)}
              onOpenNewChat={() => setIsNewChatOpen(true)}
              onOpenStory={(story) => {
                const idx = stories.findIndex((s) => s.id === story.id);
                setViewingStoryIndex(idx >= 0 ? idx : 0);
              }}
              onOpenCreateStory={() => setIsCreateStoryOpen(true)}
            />
          )}

          {activeTab === 'calls' && (
            <CallScreen
              currentProfile={activeProfile}
              activeCall={activeCall}
              incomingCall={incomingCallDoc}
              callState={callState}
              callDuration={callDuration}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              onAnswerCall={(call) => {
                setIncomingCallDoc(null);
                answerCall(call);
              }}
              onRejectCall={(call) => {
                setIncomingCallDoc(null);
                rejectCall(call);
              }}
              onEndCall={endCall}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onStartCall={(receiver, type) => startCall(receiver, type)}
            />
          )}

          {activeTab === 'stories' && (
            <StoryList
              stories={stories}
              currentProfile={activeProfile}
              onOpenCreateStory={() => setIsCreateStoryOpen(true)}
              onSelectStory={(story) => {
                const idx = stories.findIndex((s) => s.id === story.id);
                setViewingStoryIndex(idx >= 0 ? idx : 0);
              }}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsView
              currentProfile={activeProfile}
              onStartChat={async (user) => {
                if (currentUser) {
                  try {
                    const chat = await getOrCreateDirectChat(activeProfile.uid, user);
                    setSelectedChat(chat);
                  } catch (e) {
                    console.error('Error starting direct chat:', e);
                  }
                } else {
                  const directId = [activeProfile.uid, user.uid].sort().join('_');
                  const chatObj: Chat = {
                    id: directId,
                    type: 'direct',
                    participants: [activeProfile.uid, user.uid],
                    name: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  setSelectedChat(chatObj);
                }
              }}
              onStartAudioCall={(user) => startCall(user, 'audio')}
              onStartVideoCall={(user) => startCall(user, 'video')}
              onBlockUser={handleBlockUser}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}

          {/* Bottom Navigation Bar */}
          <BottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            unreadMessagesCount={unreadMessagesCount}
            userAvatar={activeProfile.photoURL}
          />
        </div>
      )}

      {/* Global Modals */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentProfile={activeProfile}
        onChatCreated={(chat) => {
          setSelectedChat(chat);
          setIsNewChatOpen(false);
        }}
      />

      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        currentProfile={activeProfile}
      />

      {viewingStoryIndex !== null && stories[viewingStoryIndex] && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewingStoryIndex}
          currentProfile={activeProfile}
          onClose={() => setViewingStoryIndex(null)}
        />
      )}
    </PhoneContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BizBizeApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
