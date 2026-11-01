import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  ExternalLink,
  Check,
  Copy,
  Globe,
  Share2,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  getCustomPublicUrl,
  setCustomPublicUrl,
  getDefaultFirebaseHostingUrl,
  getPublicInviteUrl,
  buildInviteMessage,
} from '../../utils/inviteUtils';

interface InviteWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessCopy?: (msg: string) => void;
}

export const InviteWarningModal: React.FC<InviteWarningModalProps> = ({
  isOpen,
  onClose,
  onSuccessCopy,
}) => {
  const defaultFirebaseUrl = getDefaultFirebaseHostingUrl();
  const currentCustom = getCustomPublicUrl();
  const [customInput, setCustomInput] = useState(currentCustom || '');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUseFirebaseDefault = () => {
    setCustomInput(defaultFirebaseUrl);
    setCustomPublicUrl(defaultFirebaseUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveAndCopy = () => {
    if (!customInput.trim()) return;
    setCustomPublicUrl(customInput.trim());
    const validState = getPublicInviteUrl();
    if (validState.isPublic && validState.url) {
      const text = buildInviteMessage(validState.url);
      navigator.clipboard.writeText(text);
      setCopied(true);
      if (onSuccessCopy) {
        onSuccessCopy('Canlı yayın bağlantısı panoya kopyalandı! 🎉');
      }
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    }
  };

  const handleClear = () => {
    setCustomPublicUrl(null);
    setCustomInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Geçerli Yayın Adresi Bulunamadı</h3>
              <p className="text-[10px] text-amber-400/90 font-medium">Bağlantı kopyalanmadı (404 önlendi)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason card */}
        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/50 space-y-1.5 text-xs text-amber-200">
          <div className="font-semibold flex items-center gap-1.5 text-amber-300">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Neden 404 Hatası Alınıyor?</span>
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Şu anki adresiniz (<code>ais-dev...</code> veya <code>aistudio.google.com</code>) AI Studio'nun size özel geliştirici önizleme oturumudur.
            Başka bir telefonda veya tarayıcıda bu oturum bulunmadığı için Google güvenlik nedeniyle erişimi reddeder ve <strong>404 Sayfa Bulunamadı</strong> hatası verir.
          </p>
        </div>

        {/* Free publish options */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
            💳 Kart Gerektirmeyen Çözüm & Yayın Seçenekleri:
          </span>

          {/* Option 1: Firebase Hosting */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <Globe className="w-3.5 h-3.5" />
                <span>1. Firebase Hosting (Kartsız & Ücretsiz)</span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Firebase projeniz (<code className="text-neutral-100 font-mono">bizbize-7b76f</code>) hazırdır. Yayınlandığında uygulamanız kalıcı olarak şu adreste çalışır:
            </p>
            <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px]">
              <span className="font-mono text-emerald-400 truncate">{defaultFirebaseUrl}</span>
              <button
                onClick={handleUseFirebaseDefault}
                className="ml-2 px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-[10px] flex-shrink-0 shadow transition"
              >
                Bu Adresi Kullan
              </button>
            </div>
            {saveSuccess && (
              <p className="text-[10px] text-emerald-400 font-medium">✓ Firebase adresi yayın bağlantısı olarak ayarlandı.</p>
            )}
          </div>

          {/* Option 2: AI Studio Share */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <Share2 className="w-3.5 h-3.5" />
              <span>2. AI Studio "Share" (Paylaş) Butonu</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              AI Studio arayüzündeki sağ üst <strong>"Share"</strong> butonuna basarak önizlemenizi herkese açık paylaşılabilir bir bağlantı haline getirebilirsiniz.
            </p>
          </div>
        </div>

        {/* Custom URL Input */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
            Veya Yayınladığınız Canlı Web Adresini Girin:
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              placeholder="https://bizbize-7b76f.web.app"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white outline-none focus:border-rose-500 font-mono"
            />
            {currentCustom && (
              <button
                onClick={handleClear}
                title="Sıfırla"
                className="px-2 py-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white text-xs"
              >
                Sil
              </button>
            )}
          </div>
          <p className="text-[10px] text-neutral-500">
            Adresi kaydettiğinizde tüm "Davet Et" butonları bu çalışan bağlantıyı paylaşır.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSaveAndCopy}
            disabled={!customInput.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Kaydet & Kopyala</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
