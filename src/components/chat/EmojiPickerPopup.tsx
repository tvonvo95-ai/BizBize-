import React, { useState } from 'react';
import { Smile, Sparkles, Image as ImageIcon, X } from 'lucide-react';

interface EmojiPickerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker?: (stickerUrl: string) => void;
}

const EMOJI_CATEGORIES = {
  '❤️ Sevgi & Kalpler': ['❤️', '💖', '💕', '💗', '💓', '💞', '💘', '💝', '💟', '😍', '🥰', '😘', '😻'],
  '😀 İfadeler': ['😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😎', '🤩', '🥳', '😋', '😜', '🤪', '🤫', '🤔', '🤗'],
  '👍 Jestler & Onay': ['👍', '👏', '🙌', '🙏', '🤝', '✌️', '👌', '🤙', '💪', '👋', '👊', '🔥', '✨', '⭐'],
  '🎉 Kutlama & Ruh Hali': ['🎉', '🎈', '🎁', '🎂', '🥂', '☕', '🌹', '💐', '🌸', '🇹🇷', '🧿', '☕', '☀️', '🌙'],
};

const SAMPLE_STICKERS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=120&auto=format&fit=crop&q=80',
];

export const EmojiPickerPopup: React.FC<EmojiPickerPopupProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectSticker,
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'stickers'>('emoji');

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-16 left-2 right-2 sm:left-4 sm:right-auto sm:w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-3 z-50 flex flex-col max-h-72">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('emoji')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'emoji'
                ? 'bg-rose-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Emojiler
          </button>
          <button
            onClick={() => setActiveTab('stickers')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'stickers'
                ? 'bg-rose-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Çıkartmalar
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {activeTab === 'emoji' ? (
          Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <div key={category}>
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                {category}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSelectEmoji(emoji);
                    }}
                    className="h-8 flex items-center justify-center text-lg hover:bg-neutral-800 rounded-lg transition active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              BizBize Sevimli Çıkartmalar
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_STICKERS.map((stk, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (onSelectSticker) onSelectSticker(stk);
                    onClose();
                  }}
                  className="rounded-xl overflow-hidden border border-neutral-800 hover:border-rose-500 hover:scale-105 transition aspect-square"
                >
                  <img src={stk} alt="Sticker" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
