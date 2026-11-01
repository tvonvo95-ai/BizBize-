import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
  Camera,
  CheckCircle2,
  Info,
  KeyRound,
  LogIn,
  AlertTriangle,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useAuth, DEMO_USERS, DemoProfile } from '../../context/AuthContext';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

const AVATAR_SEEDS = [
  'yigit',
  'elif',
  'can',
  'defne',
  'kaan',
  'selin',
  'murat',
  'deniz',
];

export const AuthModal: React.FC = () => {
  const {
    signInWithGoogle,
    setupPhoneAuth,
    sendPhoneCode,
    verifyPhoneCode,
    loginAsDemoUser,
    updateProfileData,
    profile,
  } = useAuth();

  const [step, setStep] = useState<'method' | 'phone' | 'verify' | 'profile'>('method');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleError, setGoogleError] = useState<{
    code?: string;
    message: string;
    domain?: string;
    solution?: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Profile setup state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('Merhaba! BizBize ❤️ kullanıyorum.');
  const [selectedAvatar, setSelectedAvatar] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Timer for SMS countdown
  useEffect(() => {
    let timer: any;
    if (step === 'verify' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Format Turkish phone number input: 5XX XXX XX XX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('90')) val = val.slice(2);
    if (val.startsWith('0')) val = val.slice(1);
    if (val.length > 10) val = val.slice(0, 10);

    let formatted = val;
    if (val.length > 3 && val.length <= 6) {
      formatted = `${val.slice(0, 3)} ${val.slice(3)}`;
    } else if (val.length > 6 && val.length <= 8) {
      formatted = `${val.slice(0, 3)} ${val.slice(3, 6)} ${val.slice(6)}`;
    } else if (val.length > 8) {
      formatted = `${val.slice(0, 3)} ${val.slice(3, 6)} ${val.slice(6, 8)} ${val.slice(8, 10)}`;
    }
    setPhoneNumber(formatted);
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const rawNumber = phoneNumber.replace(/\s+/g, '');
    if (rawNumber.length < 10) {
      setErrorMessage('Lütfen geçerli 10 haneli bir telefon numarası girin.');
      return;
    }

    const fullPhone = `+90${rawNumber}`;
    setLoading(true);

    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = setupPhoneAuth('recaptcha-container');
      }
      const confResult = await sendPhoneCode(fullPhone, recaptchaVerifierRef.current);
      setConfirmationResult(confResult);
      setStep('verify');
      setCountdown(60);
    } catch (err: any) {
      console.error('Phone auth error:', err);
      // Give helpful Turkish guidance if Firebase Phone Auth is not activated in console
      setErrorMessage(
        'Firebase SMS servisi başlatılamadı veya kota aşıldı. Firebase Console üzerinde Phone Auth sağlayıcısını veya test numarasını ekleyebilirsiniz. Alternatif olarak aşağıdaki "Google ile Giriş" veya "Test Hesapları" ile anında devam edebilirsiniz.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || smsCode.length < 6) {
      setErrorMessage('Lütfen 6 haneli doğrulama kodunu eksiksiz girin.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    try {
      await verifyPhoneCode(confirmationResult, smsCode);
      setStep('profile');
    } catch (err: any) {
      setErrorMessage('Geçersiz veya süresi dolmuş SMS onay kodu.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    setGoogleError(null);
    try {
      await signInWithGoogle();
      // If sign in is successful and profile has default user name, allow them to check profile or it goes directly to app
    } catch (err: any) {
      console.error('Google Sign-in failed with error:', err);
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      let msg = 'Google girişi tamamlanamadı.';
      let solution = '';

      if (err.code === 'auth/unauthorized-domain') {
        msg = `Yetkisiz Alan Adı (auth/unauthorized-domain): Bulunduğunuz "${currentHost}" adresi Firebase Console'da henüz yetkilendirilmemiş.`;
        solution = `Lütfen Firebase Console -> Authentication -> Settings -> "Authorized domains" (Yetkili etki alanları) sekmesine "${currentHost}" adresini ekleyin.`;
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Google Sağlayıcısı Devre Dışı (auth/operation-not-allowed): Firebase projenizde Google oturum açma henüz aktif edilmemiş.';
        solution = 'Firebase Console -> Authentication -> Sign-in method sekmesine gidin, "Google" seçeneğini etkinleştirin ve proje destek e-postanızı seçip kaydedin.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Tarayıcı Açılır Pencereyi (Popup) Engelledi.';
        solution = 'Tarayıcınızın adres çubuğundaki popup engelleme simgesine tıklayıp bu site için açılır pencerelere "Her zaman izin ver"i seçin ve tekrar deneyin.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Giriş penceresi hesap seçimi tamamlanmadan kapatıldı.';
        solution = 'Tekrar "Google ile Hızlı Giriş" butonuna tıklayıp hesabınızı seçebilirsiniz.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        msg = 'Önceki oturum açma isteği iptal edildi.';
        solution = 'Lütfen butona tekrar tıklayın.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Ağ bağlantısı hatası oluştu.';
        solution = 'İnternet bağlantınızı kontrol edip sayfayı yenileyin.';
      } else {
        msg = err.message || 'Google girişi sırasında beklenmeyen bir hata oluştu.';
        solution = 'Lütfen Firebase Console ayarlarınızı ve internet bağlantınızı kontrol edin.';
      }

      setGoogleError({
        code: err.code,
        message: msg,
        domain: currentHost,
        solution,
      });
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyHostname = () => {
    if (googleError?.domain) {
      navigator.clipboard.writeText(googleError.domain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('Lütfen adınızı ve soyadınızı girin.');
      return;
    }
    setLoading(true);
    try {
      await updateProfileData({
        displayName: displayName.trim(),
        username: username.trim() || `kullanici_${Date.now().toString().slice(-4)}`,
        bio: bio.trim(),
        photoURL: selectedAvatar,
      });
    } catch (err) {
      console.error('Profile save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 overflow-y-auto">
      <div id="recaptcha-container"></div>

      {/* Brand Header */}
      <div className="text-center pt-4 pb-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 shadow-lg shadow-rose-600/30 mb-3">
          <span className="text-3xl">❤️</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
          BizBize <span className="text-rose-500">❤️</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
          Türkiye'nin modern, hızlı, renkli ve güvenli mesajlaşma uygulaması
        </p>
      </div>

      {/* Step 1: Method Selection */}
      {step === 'method' && (
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-4 py-4">
          <button
            onClick={() => setStep('phone')}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold flex items-center justify-between shadow-lg shadow-rose-600/20 transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-rose-200" />
              <div className="text-left">
                <div className="text-sm font-semibold">Telefon Numarası ile Giriş</div>
                <div className="text-[11px] text-rose-100/80">+90 Türkiye SMS Doğrulaması</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-200" />
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/80 text-white font-medium flex items-center justify-between transition active:scale-[0.98] disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <div className="text-left">
                <div className="text-sm font-semibold">
                  {loading ? 'Google Hesabı Doğrulanıyor...' : 'Google ile Hızlı Giriş'}
                </div>
                <div className="text-[11px] text-neutral-400">Tek tıkla gerçek hesabına bağlan</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400" />
          </button>

          {/* Google Error & Diagnostic Alert Box */}
          {googleError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs space-y-2.5 animate-in fade-in shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-200 text-sm">Giriş Başarısız Oldu</div>
                    <p className="mt-1 text-neutral-200 text-xs leading-relaxed">{googleError.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleError(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {googleError.solution && (
                <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-[11px] space-y-1.5">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <span>💡 Gerekli Firebase Konsolu Ayarı:</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">{googleError.solution}</p>
                  {googleError.domain && googleError.code === 'auth/unauthorized-domain' && (
                    <div className="mt-2 flex items-center justify-between gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                      <div className="overflow-hidden">
                        <div className="text-[9px] text-neutral-400 font-medium">Eklenecek Alan Adı:</div>
                        <code className="text-rose-400 font-mono text-[11px] break-all select-all font-semibold">
                          {googleError.domain}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={copyHostname}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow flex-shrink-0 active:scale-95 transition"
                      >
                        {copiedDomain ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span>Kopyalandı!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-white" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Demo Switcher for fast evaluation */}
          <div className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-neutral-300">
                Geliştirici & Test Hesapları (Örnek Oturum):
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mb-2">
              Gerçek hesap açmadan arayüzü ve özellikleri denemek isterseniz:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.uid}
                  onClick={() => loginAsDemoUser(demo)}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-rose-500/50 hover:bg-neutral-850 transition text-left group"
                >
                  <img
                    src={demo.photoURL}
                    alt={demo.displayName}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-rose-500/40"
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-neutral-200 group-hover:text-rose-400 truncate">
                      {demo.displayName}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      @{demo.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Phone Input */}
      {step === 'phone' && (
        <form onSubmit={handleSendSms} className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-4 py-2">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-white">Telefon Numaranızı Girin</h2>
            <p className="text-xs text-neutral-400 mt-1">
              BizBize size SMS ile 6 haneli bir onay kodu gönderecektir.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-300">Telefon Numarası</label>
            <div className="flex items-center bg-neutral-900 border border-neutral-700/80 rounded-xl overflow-hidden focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500">
              <span className="px-3.5 py-3 text-sm font-semibold text-neutral-300 bg-neutral-800/80 border-r border-neutral-700/80 flex items-center gap-1.5">
                <span>🇹🇷</span> +90
              </span>
              <input
                type="tel"
                placeholder="5XX XXX XX XX"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="flex-1 px-3 py-3 text-sm bg-transparent text-white outline-none placeholder:text-neutral-500 font-mono tracking-wider"
                autoFocus
                required
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || phoneNumber.replace(/\s+/g, '').length < 10}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-rose-600/20"
          >
            {loading ? 'SMS Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
          </button>

          <button
            type="button"
            onClick={() => setStep('method')}
            className="w-full py-2 text-xs text-neutral-400 hover:text-white transition"
          >
            ← Geri Dön
          </button>
        </form>
      )}

      {/* Step 3: SMS Code Verification */}
      {step === 'verify' && (
        <form onSubmit={handleVerifySms} className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-4 py-2">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-white">SMS Kodunu Girin</h2>
            <p className="text-xs text-neutral-400 mt-1">
              +90 {phoneNumber} numarasına gönderilen 6 haneli kodu yazın.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-300">Doğrulama Kodu</label>
            <div className="flex items-center bg-neutral-900 border border-neutral-700/80 rounded-xl overflow-hidden focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 px-3">
              <KeyRound className="w-5 h-5 text-neutral-400 mr-2" />
              <input
                type="text"
                placeholder="123456"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 py-3 text-center text-lg tracking-widest bg-transparent text-white outline-none font-mono font-bold"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="text-center text-xs text-neutral-400">
            {countdown > 0 ? (
              <span>Yeniden gönder ({countdown}s)</span>
            ) : (
              <button
                type="button"
                onClick={handleSendSms}
                className="text-rose-400 hover:underline font-medium"
              >
                Kodu Tekrar Gönder
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || smsCode.length < 6}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-sm transition"
          >
            {loading ? 'Doğrulanıyor...' : 'Onayla ve Başla'}
          </button>

          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full py-2 text-xs text-neutral-400 hover:text-white transition"
          >
            Numarayı Değiştir
          </button>
        </form>
      )}

      {/* Step 4: Profile Setup */}
      {step === 'profile' && (
        <form onSubmit={handleSaveProfile} className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-4 py-2">
          <div className="text-center mb-1">
            <h2 className="text-lg font-bold text-white">Profilinizi Tamamlayın</h2>
            <p className="text-xs text-neutral-400 mt-1">
              BizBize'deki arkadaşlarınız sizi bu bilgilerle tanıyacak.
            </p>
          </div>

          {/* Avatar Selector */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <img
                src={selectedAvatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-rose-500 shadow-md"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              {AVATAR_SEEDS.map((seed) => {
                const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedAvatar(url)}
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 transition ${
                      selectedAvatar === url ? 'border-rose-500 scale-110' : 'border-neutral-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={seed} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-300">Ad Soyad</label>
              <input
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 text-sm bg-neutral-900 border border-neutral-700/80 rounded-xl text-white outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300">Kullanıcı Adı</label>
              <div className="flex items-center mt-1 px-3 bg-neutral-900 border border-neutral-700/80 rounded-xl focus-within:border-rose-500">
                <span className="text-sm text-neutral-500">@</span>
                <input
                  type="text"
                  placeholder="ahmetyilmaz"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  className="w-full py-2.5 px-1 text-sm bg-transparent text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300">Durum / Hakkımda</label>
              <input
                type="text"
                placeholder="Durum mesajınız..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={100}
                className="w-full mt-1 px-3 py-2.5 text-sm bg-neutral-900 border border-neutral-700/80 rounded-xl text-white outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm transition shadow-lg shadow-rose-600/20"
          >
            {loading ? 'Kaydediliyor...' : 'BizBize ❤️\'ye Başla'}
          </button>
        </form>
      )}

      {/* Footer Security Badges */}
      <div className="pt-4 border-t border-neutral-800/80 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
          <span>Uçtan Uca Şifreli & Güvenli İletişim</span>
        </div>
      </div>
    </div>
  );
};
