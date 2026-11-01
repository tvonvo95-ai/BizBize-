import React from 'react';
import { MessageSquare, Phone, CircleDot, Users, Settings } from 'lucide-react';

export type TabType = 'chats' | 'calls' | 'stories' | 'friends' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  unreadMessagesCount?: number;
  missedCallsCount?: number;
  newStoriesCount?: number;
  pendingFriendsCount?: number;
  userAvatar?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  unreadMessagesCount = 0,
  missedCallsCount = 0,
  newStoriesCount = 0,
  pendingFriendsCount = 0,
  userAvatar,
}) => {
  const tabs = [
    {
      id: 'chats' as TabType,
      label: 'Sohbetler',
      icon: MessageSquare,
      badge: unreadMessagesCount,
    },
    {
      id: 'calls' as TabType,
      label: 'Aramalar',
      icon: Phone,
      badge: missedCallsCount,
    },
    {
      id: 'stories' as TabType,
      label: 'Durumlar',
      icon: CircleDot,
      badge: newStoriesCount,
    },
    {
      id: 'friends' as TabType,
      label: 'Arkadaşlar',
      icon: Users,
      badge: pendingFriendsCount,
    },
    {
      id: 'settings' as TabType,
      label: 'Ayarlar',
      icon: Settings,
      avatar: userAvatar,
    },
  ];

  return (
    <div className="h-16 border-t border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md px-2 flex items-center justify-around z-30 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 relative transition duration-200 group ${
              isActive ? 'text-rose-500 scale-105' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="relative">
              {tab.avatar ? (
                <div
                  className={`w-6 h-6 rounded-full overflow-hidden border transition ${
                    isActive ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-neutral-700'
                  }`}
                >
                  <img src={tab.avatar} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 transition ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              )}

              {/* Badge indicator */}
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border border-neutral-950 shadow-sm animate-pulse">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </div>

            <span
              className={`text-[10px] mt-1 font-medium tracking-tight ${
                isActive ? 'text-rose-500 font-semibold' : 'text-neutral-400 group-hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </span>

            {/* Glowing active bar */}
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"></span>
            )}
          </button>
        );
      })}
    </div>
  );
};
