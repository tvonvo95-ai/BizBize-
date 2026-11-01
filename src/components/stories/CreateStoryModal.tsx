import React, { useState, useRef } from 'react';
import { X, Camera, Type, Palette, Send } from 'lucide-react';
import { UserProfile } from '../../types';
import { publishStory } from '../../firebase/services';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
}

const GRADIENTS = [
  'from-rose-600 to-pink-600',
  'from-indigo-600 to-purple-600',
  'from-amber-500 to-rose-600',
  'from-emerald-600 to-teal-600',
  'from-blue-600 to-cyan-600',
  'from-fuchsia-600 to-pink-500',
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
}) => {
  const [mode, setMode] = useState<'text' | 'photo'>('text');
  const [text, setText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setMode('photo');
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!text.trim() && !photoDataUrl) return;
    setLoading(true);

    try {
      await publishStory({
        userId: currentProfile.uid,
        userName: currentProfile.displayName,
        userPhoto: currentProfile.photoURL,
        text: text.trim(),
        mediaUrl: photoDataUrl || undefined,
        bgColor: selectedGradient,
      });
      onClose();
    } catch (err) {
      console.error('Story publish failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in zoom-in-95">
      {/* Top Controls */}
      <div className="flex items-center justify-between text-white pt-2">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('text')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
              mode === 'text' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            <Type className="w-4 h-4" /> Metin
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
              mode === 'photo' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            <Camera className="w-4 h-4" /> Fotoğraf
          </button>
        </div>

        <button
          onClick={handlePublish}
          disabled={loading || (!text.trim() && !photoDataUrl)}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold text-xs disabled:opacity-50 flex items-center gap-1 shadow-md shadow-rose-600/30"
        >
          <Send className="w-3.5 h-3.5" /> Paylaş
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Story Canvas */}
      <div className="flex-1 my-4 rounded-3xl overflow-hidden relative flex items-center justify-center p-6 border border-white/10 shadow-2xl">
        {mode === 'photo' && photoDataUrl ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <img
              src={photoDataUrl}
              alt="Story"
              className="w-full h-full object-cover rounded-2xl"
            />
            <input
              type="text"
              placeholder="Başlık ekle..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur border border-white/20 rounded-xl px-4 py-2 text-sm text-white placeholder:text-neutral-400 outline-none"
            />
          </div>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-tr ${selectedGradient} rounded-2xl flex flex-col items-center justify-center p-6 text-center`}
          >
            <textarea
              placeholder="Bugün ne düşünüyorsun?..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={250}
              className="w-full bg-transparent text-white placeholder:text-white/60 text-xl font-bold text-center outline-none resize-none"
              rows={4}
              autoFocus
            />
            <span className="text-[11px] text-white/70 mt-2">24 saat sonra kaybolacak ⏳</span>
          </div>
        )}
      </div>

      {/* Color Palette Switcher (Text mode) */}
      {mode === 'text' && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {GRADIENTS.map((grad, i) => (
            <button
              key={i}
              onClick={() => setSelectedGradient(grad)}
              className={`w-7 h-7 rounded-full bg-gradient-to-tr ${grad} border-2 transition ${
                selectedGradient === grad ? 'border-white scale-110 shadow-lg' : 'border-transparent'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
