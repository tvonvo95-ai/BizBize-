import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({ children }) => {
  const [isPhoneView, setIsPhoneView] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-0 md:p-4 select-none">
      {/* Top Floating View Switcher (Desktop only) */}
      <div className="hidden md:flex items-center gap-2 mb-3 bg-neutral-800/80 backdrop-blur border border-neutral-700/60 rounded-full px-4 py-1.5 shadow-xl text-xs">
        <span className="text-neutral-400 font-medium">Görünüm:</span>
        <button
          onClick={() => setIsPhoneView(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition ${
            isPhoneView
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Mobil Telefon
        </button>
        <button
          onClick={() => setIsPhoneView(false)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition ${
            !isPhoneView
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Geniş Ekran
        </button>
      </div>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col overflow-hidden ${
          isPhoneView
            ? 'max-w-[430px] h-[100dvh] md:h-[860px] md:rounded-[44px] md:border-[10px] md:border-neutral-800 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] md:ring-1 md:ring-neutral-700'
            : 'max-w-5xl h-[100dvh] md:h-[90vh] md:rounded-2xl md:border md:border-neutral-800 shadow-2xl'
        } bg-neutral-950 relative`}
      >
        {/* Dynamic Island / Status Bar for Phone Mockup */}
        {isPhoneView && (
          <div className="h-10 px-6 flex items-center justify-between text-[13px] font-semibold tracking-tight text-neutral-200 bg-neutral-950/80 backdrop-blur z-40 select-none">
            <span>{currentTime || '12:30'}</span>
            {/* Dynamic Island Pill */}
            <div className="hidden md:block w-24 h-4 bg-neutral-900 rounded-full border border-neutral-800/80"></div>
            <div className="flex items-center gap-1.5 text-neutral-300">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Inner Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>
      </div>
    </div>
  );
};
