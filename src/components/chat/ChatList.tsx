import React, { useState } from 'react';
import {
  Search,
  Plus,
  Lock,
  Check,
  CheckCheck,
  Image,
  Mic,
  Video,
  FileText,
  Users,
  CircleDot,
} from 'lucide-react';
import { Chat, UserProfile, Story } from '../../types';

interface ChatListProps {
  chats: Chat[];
  currentProfile: UserProfile;
  stories: Story[];
  onSelectChat: (chat: Chat) => void;
  onOpenNewChat: () => void;
  onOpenStory: (story: Story) => void;
  onOpenCreateStory: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentProfile,
  stories,
  onSelectChat,
  onOpenNewChat,
  onOpenStory,
  onOpenCreateStory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');

  const filteredChats = chats.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'groups') return c.type === 'group';
    if (filter === 'unread') return (c.unreadCount?.[currentProfile.uid] || 0) > 0;
    return true;
  });

  const formatChatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-neutral-900">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              BizBize <span className="text-rose-500 animate-pulse">❤️</span>
            </h1>
          </div>
          <p className="text-[10px] text-neutral-400">Canlı Mesajlaşma</p>
        </div>

        <button
          onClick={onOpenNewChat}
          className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30 transition active:scale-95"
          title="Yeni Sohbet"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Top Stories Highlights Bar */}
      <div className="px-3 py-2 border-b border-neutral-900/60 overflow-x-auto flex items-center gap-3 no-scrollbar">
        {/* User's own add story button */}
        <button
          onClick={onOpenCreateStory}
          className="flex flex-col items-center flex-shrink-0 group"
        >
          <div className="relative w-14 h-14 rounded-full p-0.5 border border-dashed border-neutral-700 group-hover:border-rose-500 transition">
            <img
              src={currentProfile.photoURL}
              alt="Profil"
              className="w-full h-full rounded-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center border-2 border-neutral-950">
              +
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-1 truncate max-w-[60px]">Durumum</span>
        </button>

        {/* Stories from others */}
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => onOpenStory(story)}
            className="flex flex-col items-center flex-shrink-0 group"
          >
            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 shadow-sm group-hover:scale-105 transition">
              <img
                src={story.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.userId}`}
                alt={story.userName}
                className="w-full h-full rounded-full object-cover border-2 border-neutral-950"
              />
            </div>
            <span className="text-[10px] text-neutral-300 font-medium mt-1 truncate max-w-[62px]">
              {story.userName}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter pills */}
      <div className="px-3 pt-2 pb-1 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Sohbetlerde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/90 border border-neutral-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-rose-500/80"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-0.5 rounded-full font-medium transition ${
              filter === 'all'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-2.5 py-0.5 rounded-full font-medium transition ${
              filter === 'unread'
                ? 'bg-neutral-800 text-rose-400'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Okunmamış
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`px-2.5 py-0.5 rounded-full font-medium transition ${
              filter === 'groups'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Gruplar
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredChats.length === 0 ? (
          <div className="text-center py-12 px-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-500 mb-2">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-300">Henüz sohbet yok</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Yeni bir sohbet başlatın veya grup oluşturarak arkadaşlarınızla mesajlaşmaya başlayın.
            </p>
            <button
              onClick={onOpenNewChat}
              className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold shadow-md shadow-rose-600/20"
            >
              Yeni Sohbet Başlat
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isGroup = chat.type === 'group';
            const unread = chat.unreadCount?.[currentProfile.uid] || 0;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-neutral-900/80 active:bg-neutral-900 transition cursor-pointer group border border-transparent hover:border-neutral-800/60"
              >
                {/* Avatar with indicator */}
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`}
                    alt={chat.name}
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-neutral-800 group-hover:ring-rose-500/50"
                  />
                  {!isGroup && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-neutral-950 rounded-full"></span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-xs font-semibold text-neutral-100 group-hover:text-rose-400 truncate flex items-center gap-1">
                      <span>{chat.name || 'Sohbet'}</span>
                      {!isGroup && <Lock className="w-2.5 h-2.5 text-emerald-400 inline" />}
                    </h3>
                    <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                      {formatChatTime(chat.lastMessageTimestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-neutral-400 truncate max-w-[210px] flex items-center gap-1">
                      {chat.lastMessageSenderId === currentProfile.uid && (
                        <CheckCheck className="w-3.5 h-3.5 text-rose-500 inline flex-shrink-0" />
                      )}
                      <span>{chat.lastMessage || 'Yeni sohbet oluşturuldu'}</span>
                    </p>

                    {unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm shadow-rose-600/30">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
