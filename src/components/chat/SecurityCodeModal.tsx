import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle, Copy, X } from 'lucide-react';
import { generateSafetyNumber } from '../../utils/crypto';

interface SecurityCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentUid: string;
  otherUserUid: string;
  otherUserName: string;
}

export const SecurityCodeModal: React.FC<SecurityCodeModalProps> = ({
  isOpen,
  onClose,
  chatId,
  currentUid,
  otherUserUid,
  otherUserName,
}) => {
  const [safetyNumber, setSafetyNumber] = useState('...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateSafetyNumber(chatId, currentUid, otherUserUid).then((num) => {
        setSafetyNumber(num);
      });
    }
  }, [isOpen, chatId, currentUid, otherUserUid]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 text-center relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800/60"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white">Uçtan Uca Şifreleme Doğrulama</h3>
        <p className="text-xs text-neutral-400 mt-1">
          {otherUserName} ile aranızdaki mesajlar ve aramalar 256-bit AES-GCM şifreleme ile korunmaktadır.
        </p>

        {/* 12 Digit Safety Number */}
        <div className="my-5 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Güvenlik Doğrulama Kodu
          </div>
          <div className="font-mono text-2xl font-bold tracking-widest text-emerald-400">
            {safetyNumber}
          </div>
          <div className="mt-2 text-[11px] text-neutral-500">
            Karşı tarafın cihazındaki güvenlik koduyla bu kodu karşılaştırarak görüşmenizin güvenliğini doğrulayabilirsiniz.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold text-xs transition"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
