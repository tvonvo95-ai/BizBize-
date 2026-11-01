import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, Heart, Flame, ThumbsUp, Laugh, Sparkles, Send } from 'lucide-react';
import { Story, UserProfile } from '../../types';
import { markStoryViewed, sendMessage, getOrCreateDirectChat } from '../../firebase/services';
import { sounds } from '../../utils/audio';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  currentProfile: UserProfile;
  onClose: () => void;
}

const QUICK_REACTIONS = ['❤️', '🔥', '👏', '😂', '😍', '🎉'];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  currentProfile,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reactionSent, setReactionSent] = useState<string | null>(null);

  const currentStory = stories[currentIndex];
  const timerRef = useRef<any>(null);

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && currentProfile.uid) {
      markStoryViewed(currentStory.id, currentProfile.uid);
    }
  }, [currentStory?.id, currentProfile.uid]);

  // Story Progress Timer (6 seconds)
  useEffect(() => {
    if (isPaused || showViewers) return;

    setProgress(0);
    const interval = 50; // update every 50ms
    const totalDuration = 6000;
    const step = (interval / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, isPaused, showViewers]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleSendReaction = async (emoji: string) => {
    if (!currentStory) return;
    setReactionSent(emoji);
    sounds.playMessageSent();
    setTimeout(() => setReactionSent(null), 1500);

    try {
      // Send reaction to the user in a direct chat
      const chat = await getOrCreateDirectChat(currentProfile.uid, {
        uid: currentStory.userId,
        displayName: currentStory.userName,
        username: 'kullanici',
        photoURL: currentStory.userPhoto,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      await sendMessage(chat.id, {
        chatId: chat.id,
        senderId: currentProfile.uid,
        senderName: currentProfile.displayName,
        senderPhoto: currentProfile.photoURL,
        content: `Hikâyene tepki verdi: ${emoji}`,
        type: 'text',
      });
    } catch (e) {
      console.warn('Reaction send warning:', e);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory) return;

    const text = replyText.trim();
    setReplyText('');
    sounds.playMessageSent();

    try {
      const chat = await getOrCreateDirectChat(currentProfile.uid, {
        uid: currentStory.userId,
        displayName: currentStory.userName,
        username: 'kullanici',
        photoURL: currentStory.userPhoto,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      await sendMessage(chat.id, {
        chatId: chat.id,
        senderId: currentProfile.uid,
        senderName: currentProfile.displayName,
        senderPhoto: currentProfile.photoURL,
        content: `[Hikâye Yanıtı]: ${text}`,
        type: 'text',
      });
    } catch (e) {
      console.warn('Reply send warning:', e);
    }
  };

  if (!currentStory) return null;
  const isMyStory = currentStory.userId === currentProfile.uid;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none">
      {/* Top Progress Bars */}
      <div className="flex items-center gap-1.5 pt-2 z-20">
        {stories.map((s, idx) => (
          <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              style={{
                width:
                  idx === currentIndex
                    ? `${progress}%`
                    : idx < currentIndex
                    ? '100%'
                    : '0%',
              }}
              className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
            />
          </div>
        ))}
      </div>

      {/* Story Header */}
      <div className="flex items-center justify-between text-white pt-3 z-20">
        <div className="flex items-center gap-2.5">
          <img
            src={currentStory.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentStory.userId}`}
            alt={currentStory.userName}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/50"
          />
          <div>
            <h3 className="text-xs font-bold leading-tight">{currentStory.userName}</h3>
            <span className="text-[10px] text-white/70">
              {new Date(currentStory.createdAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Story Content Container */}
      <div
        className="relative flex-1 my-3 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl cursor-pointer"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Tap areas for next / prev */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute inset-y-0 left-0 w-1/3 z-10"
        />
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute inset-y-0 right-0 w-1/3 z-10"
        />

        {currentStory.mediaUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
            {currentStory.text && (
              <div className="absolute bottom-6 left-4 right-4 bg-black/60 backdrop-blur border border-white/10 rounded-2xl p-3 text-center text-white text-sm font-medium z-10">
                {currentStory.text}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-tr ${
              currentStory.bgColor || 'from-rose-600 to-pink-600'
            } flex items-center justify-center p-8 text-center`}
          >
            <p className="text-2xl font-bold text-white drop-shadow-md">
              {currentStory.text}
            </p>
          </div>
        )}

        {/* Reaction animated pop */}
        {reactionSent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-bounce">
            <span className="text-7xl drop-shadow-xl">{reactionSent}</span>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="z-20 pb-2">
        {isMyStory ? (
          <button
            onClick={() => setShowViewers(!showViewers)}
            className="w-full py-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition"
          >
            <Eye className="w-4 h-4 text-rose-500" />
            <span>Görüntüleyenler ({currentStory.viewers?.length || 0})</span>
          </button>
        ) : (
          <div className="space-y-2">
            {/* Quick emoji reactions */}
            <div className="flex items-center justify-around bg-black/40 backdrop-blur rounded-2xl py-1.5 px-2 border border-white/10">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="text-2xl hover:scale-130 transition active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick Reply Box */}
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`${currentStory.userName} kişisine yanıt yaz...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-black/60 backdrop-blur border border-white/20 rounded-2xl px-4 py-2 text-xs text-white placeholder:text-neutral-400 outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="p-2 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Viewers Drawer */}
      {showViewers && (
        <div className="absolute inset-x-0 bottom-0 max-h-[60%] bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-5 z-40 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-rose-500" />
              Görüntüleyen Kişiler ({currentStory.viewers?.length || 0})
            </h4>
            <button onClick={() => setShowViewers(false)} className="text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-56 py-3 space-y-2 custom-scrollbar">
            {(!currentStory.viewers || currentStory.viewers.length === 0) ? (
              <p className="text-xs text-neutral-500 text-center py-4">Henüz kimse görüntülemedi</p>
            ) : (
              currentStory.viewers.map((viewerId) => (
                <div key={viewerId} className="flex items-center gap-3 py-1">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${viewerId}`}
                    alt="Viewer"
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-700"
                  />
                  <div className="text-xs font-medium text-neutral-200">
                    Kullanıcı ({viewerId.slice(0, 8)})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
