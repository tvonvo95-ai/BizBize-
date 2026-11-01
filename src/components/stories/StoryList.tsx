import React from 'react';
import { Plus, Camera, Eye, CircleDot, Clock } from 'lucide-react';
import { Story, UserProfile } from '../../types';

interface StoryListProps {
  stories: Story[];
  currentProfile: UserProfile;
  onOpenCreateStory: () => void;
  onSelectStory: (story: Story) => void;
}

export const StoryList: React.FC<StoryListProps> = ({
  stories,
  currentProfile,
  onOpenCreateStory,
  onSelectStory,
}) => {
  const myStories = stories.filter((s) => s.userId === currentProfile.uid);
  const othersStories = stories.filter((s) => s.userId !== currentProfile.uid);

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 border-b border-neutral-900 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Durumlar</h1>
          <p className="text-[10px] text-neutral-400">24 Saat Sonra Kaybolan Hikâyeler</p>
        </div>
        <button
          onClick={onOpenCreateStory}
          className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30 transition active:scale-95"
          title="Durum Ekle"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* User's own status card */}
        <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                onClick={myStories.length > 0 ? () => onSelectStory(myStories[0]) : onOpenCreateStory}
                className="relative cursor-pointer group"
              >
                <div
                  className={`w-14 h-14 rounded-full p-0.5 ${
                    myStories.length > 0
                      ? 'bg-gradient-to-tr from-rose-500 to-amber-400'
                      : 'border-2 border-dashed border-neutral-700'
                  }`}
                >
                  <img
                    src={currentProfile.photoURL}
                    alt={currentProfile.displayName}
                    className="w-full h-full rounded-full object-cover border-2 border-neutral-950"
                  />
                </div>
                {myStories.length === 0 && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-neutral-950">
                    +
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-white">Durumum</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {myStories.length > 0 ? (
                    <span className="flex items-center gap-1 text-rose-400">
                      <Eye className="w-3 h-3" />
                      {myStories.reduce((acc, s) => acc + (s.viewers?.length || 0), 0)} görüntüleme
                    </span>
                  ) : (
                    'Durum güncellemesi paylaş'
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenCreateStory}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-rose-400 transition"
            >
              + Ekle
            </button>
          </div>
        </div>

        {/* Recent Updates section */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
            Son Güncellemeler ({othersStories.length})
          </div>

          {othersStories.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-neutral-900/30 border border-neutral-800/40">
              <CircleDot className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-400 font-medium">Henüz yeni bir durum paylaşımı yok</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Arkadaşlarınız fotoğraf veya metin durumu paylaştığında burada görünecektir.
              </p>
            </div>
          ) : (
            othersStories.map((story) => (
              <div
                key={story.id}
                onClick={() => onSelectStory(story)}
                className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-neutral-900/80 border border-transparent hover:border-neutral-800/60 transition cursor-pointer group"
              >
                <div className="w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex-shrink-0 group-hover:scale-105 transition">
                  <img
                    src={story.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.userId}`}
                    alt={story.userName}
                    className="w-full h-full rounded-full object-cover border-2 border-neutral-950"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white group-hover:text-rose-400 truncate">
                    {story.userName}
                  </h4>
                  <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-neutral-500" />
                    {new Date(story.createdAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {story.text && ` • ${story.text.slice(0, 20)}...`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
