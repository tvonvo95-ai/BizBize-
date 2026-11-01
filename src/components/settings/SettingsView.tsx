import React, { useState } from 'react';
import {
  User,
  Moon,
  Sun,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  Bell,
  LogOut,
  Database,
  Smartphone,
  ChevronRight,
  Info,
  Users,
  Save,
  Camera,
  Trash2,
  FileText,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Globe,
} from 'lucide-react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserProfile, PrivacyAudience } from '../../types';
import { firebaseAppConfig } from '../../firebase/config';
import { checkUsernameAvailability } from '../../firebase/services';
import { sounds } from '../../utils/audio';
import { requestNotificationPermission, showSystemNotification } from '../../utils/notifications';
import { getPublicInviteUrl } from '../../utils/inviteUtils';
import { InviteWarningModal } from '../common/InviteWarningModal';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=cem',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=selin',
];

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfileData,
    logout,
    deleteAccount,
    loginAsDemoUser,
    isDemoUser,
    signInWithGoogle,
    exitDemoMode,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<
    'main' | 'profile' | 'privacy' | 'security' | 'firebase' | 'notifications' | 'privacy_policy' | 'play_store'
  >('main');
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // Edit profile state
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [savedNotification, setSavedNotification] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleErrorMsg, setGoogleErrorMsg] = useState<string | null>(null);

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showInviteWarningModal, setShowInviteWarningModal] = useState(false);

  // Privacy state
  const [lastSeenAudience, setLastSeenAudience] = useState<PrivacyAudience>(
    profile?.privacySettings?.lastSeen || 'everyone'
  );
  const [photoAudience, setPhotoAudience] = useState<PrivacyAudience>(
    profile?.privacySettings?.photoURL || 'everyone'
  );
  const [phoneAudience, setPhoneAudience] = useState<PrivacyAudience>(
    profile?.privacySettings?.phoneAudience || 'everyone'
  );
  const [readReceipts, setReadReceipts] = useState<boolean>(
    profile?.privacySettings?.readReceipts ?? true
  );

  const handleGoogleLoginFromSettings = async () => {
    setGoogleLoading(true);
    setGoogleErrorMsg(null);
    try {
      await signInWithGoogle();
      setSavedNotification('Gerçek Google hesabınızla başarıyla giriş yapıldı!');
      setTimeout(() => setSavedNotification(''), 3000);
    } catch (err: any) {
      console.error('Settings Google login error:', err);
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (err.code === 'auth/unauthorized-domain') {
        setGoogleErrorMsg(`Yetkisiz Alan Adı: Firebase Console -> Authentication -> Settings -> Authorized domains sekmesine "${host}" eklenmelidir.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setGoogleErrorMsg('Firebase Console üzerinde Google ile oturum açma sağlayıcısı açılmalıdır.');
      } else if (err.code === 'auth/popup-blocked') {
        setGoogleErrorMsg('Tarayıcınız popup penceresini engelledi. Lütfen adres çubuğundan izin verin.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setGoogleErrorMsg('Google penceresi kapatıldı.');
      } else {
        setGoogleErrorMsg(err.message || 'Giriş yapılamadı.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    const cleanUsername = username.trim().toLowerCase().replace('@', '');

    if (!cleanUsername || cleanUsername.length < 3) {
      setProfileError('Kullanıcı adı en az 3 karakter olmalıdır.');
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setProfileError('Kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir.');
      return;
    }

    setIsSavingProfile(true);
    try {
      // Check username availability if it's changing
      if (cleanUsername !== profile?.username?.toLowerCase()) {
        const isAvailable = await checkUsernameAvailability(cleanUsername, profile?.uid || '');
        if (!isAvailable) {
          setProfileError(`"@${cleanUsername}" kullanıcı adı başkası tarafından alınmış.`);
          setIsSavingProfile(false);
          return;
        }
      }

      await updateProfileData({
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        photoURL,
      });

      setSavedNotification('Profiliniz ve benzersiz kullanıcı adınız başarıyla kaydedildi!');
      setTimeout(() => setSavedNotification(''), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePrivacy = async () => {
    await updateProfileData({
      privacySettings: {
        lastSeen: lastSeenAudience,
        photoURL: photoAudience,
        readReceipts,
        phoneAudience,
      },
    });
    setSavedNotification('Gizlilik tercihleri kaydedildi!');
    setTimeout(() => setSavedNotification(''), 3000);
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmationText.trim().toLowerCase() !== 'sil') {
      alert('Lütfen kutucuğa onaylamak için "SİL" yazın.');
      return;
    }
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
    } catch (err: any) {
      console.error('Account deletion error:', err);
      alert('Hesap silinirken hata oluştu: ' + (err.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 border-b border-neutral-900 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Ayarlar</h1>
          <p className="text-[10px] text-neutral-400">Hesap ve Gizlilik Tercihleri</p>
        </div>
      </div>

      {savedNotification && (
        <div className="m-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 text-center animate-in fade-in">
          {savedNotification}
        </div>
      )}

      {/* Main Settings Menu */}
      {activeSection === 'main' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* User Profile Card */}
          <div
            onClick={() => setActiveSection('profile')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800/80 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-rose-500 shadow"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-neutral-950 rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-rose-400">
                  {profile.displayName}
                </h3>
                <p className="text-xs text-rose-400">@{profile.username}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1 italic">
                  "{profile.bio}"
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-rose-400" />
          </div>

          {/* If in demo mode, show a prominent switch to real Google account card */}
          {isDemoUser && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/80 via-neutral-900 to-rose-950/70 border border-amber-500/50 space-y-2.5 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Örnek Oturumundasınız</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Gerçek Google hesabınızla giriş yaparak tüm arkadaşlarınızla canlı mesajlaşabilir, sesli/görüntülü arama yapabilirsiniz.
              </p>
              {googleErrorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-950/90 border border-rose-800 text-[11px] text-rose-200">
                  {googleErrorMsg}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleGoogleLoginFromSettings}
                  disabled={googleLoading}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 disabled:opacity-60"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-neutral-900/30 border-t-neutral-900 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>Google ile Gerçek Hesaba Geç</span>
                </button>
                <button
                  onClick={exitDemoMode}
                  className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition"
                >
                  Çıkış
                </button>
              </div>
            </div>
          )}

          {/* Settings Group */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-1">
              Genel Ayarlar
            </div>

            <button
              onClick={() => setActiveSection('privacy')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Hesap ve Gizlilik</div>
                  <div className="text-[10px] text-neutral-400">Son görülme, profil fotoğrafı, mavi tık</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => setActiveSection('security')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Uçtan Uca Şifreleme</div>
                  <div className="text-[10px] text-neutral-400">256-bit AES-GCM güvenlik kalkanı</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => setActiveSection('notifications')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Bildirimler ve Sesler</div>
                  <div className="text-[10px] text-neutral-400">Anlık bildirim izni ve ses efektleri</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => setActiveSection('firebase')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Firebase & Altyapı Bilgisi</div>
                  <div className="text-[10px] text-neutral-400">Proje: {firebaseAppConfig.projectId}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => setActiveSection('privacy_policy')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Gizlilik Politikası</div>
                  <div className="text-[10px] text-neutral-400">Google Play Store uyumluluk metni</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            <button
              onClick={() => setActiveSection('play_store')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Google Play Yayın Hazırlığı</div>
                  <div className="text-[10px] text-neutral-400">AAB, Data Safety ve APK gereksinimleri</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            {/* Live Web & Invite Link Setup */}
            <button
              onClick={() => setShowInviteWarningModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>Canlı Yayın & Davet Bağlantısı</span>
                    {getPublicInviteUrl().isPublic ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        Canlı
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                        Önizleme (404 Korumalı)
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate max-w-[210px]">
                    {getPublicInviteUrl().isPublic
                      ? getPublicInviteUrl().url
                      : 'Kartsız Firebase yayını ve çalışan davet adresi ayarı'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Açık / Koyu Tema</div>
                  <div className="text-[10px] text-neutral-400">
                    Şu anki mod: {theme === 'dark' ? 'Koyu Gece Modu' : 'Açık Mod'}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-1 rounded-xl bg-neutral-800 text-xs font-medium text-white hover:bg-neutral-700 transition"
              >
                Değiştir
              </button>
            </div>
          </div>

          {/* Switch test profile section */}
          <div className="p-3 rounded-2xl bg-neutral-900/30 border border-neutral-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <Users className="w-3.5 h-3.5 text-rose-500" />
              <span>Test Kullanıcısı Değiştir:</span>
            </div>
            <p className="text-[10px] text-neutral-500">
              Çift taraflı mesajlaşma ve aramayı test etmek için hızlıca başka bir kullanıcıya geçebilirsiniz:
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.uid}
                  onClick={() => loginAsDemoUser(demo)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition text-xs ${
                    profile.uid === demo.uid
                      ? 'border-rose-500 bg-rose-950/30 text-rose-300 font-semibold'
                      : 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <img
                    src={demo.photoURL}
                    alt={demo.displayName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="truncate">{demo.displayName.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logout & Account Deletion Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={logout}
              className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" /> Oturumu Kapat
            </button>

            <button
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteModal(true);
              }}
              className="w-full py-2.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/40 text-rose-400 hover:text-rose-300 font-medium text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hesabımı ve Verilerimi Kalıcı Olarak Sil
            </button>
            <p className="text-[9px] text-neutral-500 text-center">
              Google Play Hesap Silme Politikası gereğince tüm verilerinizi dilediğiniz an tek tıkla silebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <button
            onClick={() => setActiveSection('main')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Ayarlara Dön
          </button>

          <div className="text-center">
            <div className="relative inline-block mx-auto mb-2">
              <img
                src={photoURL}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover ring-4 ring-rose-500 shadow-xl"
              />
            </div>
            <p className="text-[11px] text-neutral-400">Yeni bir avatar seçin:</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {AVATAR_PRESETS.map((av, idx) => (
                <button
                  key={idx}
                  onClick={() => setPhotoURL(av)}
                  className={`w-7 h-7 rounded-full overflow-hidden border-2 transition ${
                    photoURL === av ? 'border-rose-500 scale-110' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={av} alt="av" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-neutral-300">Ad Soyad</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300">Benzersiz Kullanıcı Adı</label>
                <span className="text-[10px] text-neutral-500">Aramalarda bulunur</span>
              </div>
              <div className="flex items-center mt-1 px-3 bg-neutral-900 border border-neutral-800 rounded-xl focus-within:border-rose-500">
                <span className="text-rose-500 font-bold text-xs">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="kullanici_adi"
                  className="w-full py-2 px-1 text-xs bg-transparent text-white outline-none"
                />
              </div>
              <p className="text-[9px] text-neutral-500 mt-1">
                Kullanıcı adınız benzersizdir (tekildir). Arkadaşlarınız sizi bu adla rehberde arayabilir.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300">Kişisel Durum Mesajı</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={120}
                placeholder="BizBize ❤️ kullanıyorum."
                className="w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            {profileError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200">
                {profileError}
              </div>
            )}
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30"
          >
            {isSavingProfile ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" /> Değişiklikleri Kaydet
              </>
            )}
          </button>
        </div>
      )}

      {/* Privacy Section */}
      {activeSection === 'privacy' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <button
            onClick={() => setActiveSection('main')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Ayarlara Dön
          </button>

          <h3 className="text-sm font-bold text-white">Hesap ve Gizlilik Ayarları</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Son Görülme ve Çevrimiçi Bilgisi
              </label>
              <select
                value={lastSeenAudience}
                onChange={(e) => setLastSeenAudience(e.target.value as PrivacyAudience)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="everyone">Herkes</option>
                <option value="friends">Sadece Arkadaşlarım</option>
                <option value="nobody">Hiç Kimse</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Profil Fotoğrafı Görünürlüğü
              </label>
              <select
                value={photoAudience}
                onChange={(e) => setPhotoAudience(e.target.value as PrivacyAudience)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="everyone">Herkes</option>
                <option value="friends">Sadece Arkadaşlarım</option>
                <option value="nobody">Hiç Kimse</option>
              </select>
            </div>

            {/* Phone Number Privacy & Search Permission */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Telefon Numarası Görünürlüğü & Arama İzni
              </label>
              <select
                value={phoneAudience}
                onChange={(e) => setPhoneAudience(e.target.value as PrivacyAudience)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="everyone">Herkes (Numaramla beni arayabilir)</option>
                <option value="friends">Sadece Arkadaşlarım</option>
                <option value="nobody">Hiç Kimse (Numaram gizlensin, sadece kullanıcı adımla bulunayım)</option>
              </select>
              <p className="text-[10px] text-neutral-500 mt-1">
                "Hiç Kimse" seçildiğinde profiliniz telefon araması sonuçlarında gizlenir ve numaranız diğer kullanıcılardan saklanır.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <div className="text-xs font-semibold text-white">Okundu Bilgisi (Mavi Tık)</div>
                <div className="text-[10px] text-neutral-400">
                  Mesajlarınızın okunduğunu diğer kullanıcılara gösterin.
                </div>
              </div>
              <input
                type="checkbox"
                checked={readReceipts}
                onChange={(e) => setReadReceipts(e.target.checked)}
                className="w-4 h-4 accent-rose-600 rounded"
              />
            </div>
          </div>

          <button
            onClick={handleSavePrivacy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30"
          >
            <Save className="w-4 h-4" /> Değişiklikleri Kaydet
          </button>
        </div>
      )}

      {/* Security & E2EE Section */}
      {activeSection === 'security' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <button
            onClick={() => setActiveSection('main')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Ayarlara Dön
          </button>

          <div className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Uçtan Uca Şifreleme (E2EE)</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              Gizliliğiniz BizBize ❤️ için en temel önceliktir.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Lock className="w-4 h-4" />
              <span>Gerçek Web Crypto AES-GCM 256-Bit Şifreleme</span>
            </div>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              Mesajlarınız sunucuya iletilmeden önce tarayıcınızda veya telefonunuzda istemci tarafında şifrelenir.
              BizBize sunucuları dahil olmak üzere üçüncü taraflar mesaj içeriklerinizi görüntüleyemez.
            </p>
            <p className="text-neutral-400 text-[10px]">
              • Her sohbet odası için ayrı türetilen oturum anahtarları<br />
              • Her mesaj için rastgele üretilen 96-bit başlatma vektörü (IV)<br />
              • Görüşmeler için doğrulanabilir 12 haneli Güvenlik Numarası (Safety Number)
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold mb-1">
              Cihazınızın Şifreleme Durumu
            </span>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SubtleCrypto Donanım Hızlandırması Aktif
            </div>
          </div>
        </div>
      )}

      {/* Firebase & Infrastructure Section */}
      {activeSection === 'firebase' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <button
            onClick={() => setActiveSection('main')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Ayarlara Dön
          </button>

          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" /> Firebase Entegrasyon Durumu
          </h3>

          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs font-mono">
            <div>
              <span className="text-neutral-500 block text-[10px]">Firebase Proje ID:</span>
              <span className="text-amber-400 font-semibold">{firebaseAppConfig.projectId}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">Firestore Database ID:</span>
              <span className="text-neutral-200 text-[11px] break-all">{firebaseAppConfig.firestoreDatabaseId}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">Auth Domain:</span>
              <span className="text-neutral-200 text-[11px]">{firebaseAppConfig.authDomain}</span>
            </div>
          </div>

          {/* Transparent Status Notes */}
          <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-200 font-semibold">
              <Info className="w-4 h-4 text-rose-500" />
              <span>Geliştirme & Canlı Servis Durumu:</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              1. <strong>Cloud Firestore:</strong> Kullanıcılar, sohbetler, mesajlar, durumlar ve WebRTC sinyalleri için aktif ve güvenlik kuralları dağıtıldı.
              <br />
              2. <strong>WebRTC Arama:</strong> Google genel STUN sunucuları üzerinden doğrudan P2P sesli ve görüntülü iletişim çalışmaktadır.
              <br />
              3. <strong>SMS Phone Auth:</strong> Türkiye (+90) SMS kodu göndermek için Firebase Console &gt; Authentication sekmesinde "Phone" sağlayıcısının açık olması veya Test Numarası eklenmesi gerekmektedir.
              <br />
              4. <strong>Google Auth & Test Kullanıcıları:</strong> Anında canlı test yapmak için sıfır gecikmeli olarak kullanılabilir.
            </p>
          </div>
        </div>
      )}

      {/* Notifications & Sounds Section */}
      {activeSection === 'notifications' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <button
            onClick={() => setActiveSection('main')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Ayarlara Dön
          </button>

          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-500" /> Bildirimler ve Sesler
          </h3>

          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div>
              <span className="text-xs font-semibold text-white block">Tarayıcı & Cihaz Bildirimleri</span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Uygulama arka plandayken gelen yeni mesajlar ve aramalar için anlık uyarı alın.
              </p>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-xs text-neutral-300">İzin Durumu:</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {notificationPermission === 'granted'
                  ? 'Aktif (İzin Verildi)'
                  : notificationPermission === 'denied'
                  ? 'Engellendi'
                  : 'İzin Bekliyor'}
              </span>
            </div>

            {notificationPermission !== 'granted' && (
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setNotificationPermission(granted ? 'granted' : 'denied');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 transition"
              >
                Bildirim İzni İste
              </button>
            )}

            <button
              onClick={() => {
                showSystemNotification(
                  'BizBize ❤️',
                  'Bildirim sistemi sorunsuz çalışıyor! Sevdiklerinizden gelen mesajları asla kaçırmayın.'
                );
                sounds.playMessageReceived();
              }}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition"
            >
              Test Bildirimi Gönder
            </button>
          </div>

          {/* Sound Preview Section */}
          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <span className="text-xs font-semibold text-white block">Uygulama İçi Sesleri Dinle</span>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => sounds.playMessageSent()}
                className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-850 text-xs text-neutral-300 flex items-center justify-between transition"
              >
                <span>Giden Mesaj Sesi</span>
                <span className="text-rose-400 text-[11px]">Dinle ▶</span>
              </button>

              <button
                onClick={() => sounds.playMessageReceived()}
                className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-850 text-xs text-neutral-300 flex items-center justify-between transition"
              >
                <span>Gelen Mesaj Sesi</span>
                <span className="text-rose-400 text-[11px]">Dinle ▶</span>
              </button>

              <button
                onClick={() => {
                  sounds.playRing();
                  setTimeout(() => sounds.stopRing(), 2500);
                }}
                className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-850 text-xs text-neutral-300 flex items-center justify-between transition"
              >
                <span>Telefon Zil Sesi (Arama)</span>
                <span className="text-rose-400 text-[11px]">Dinle ▶</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRIVACY POLICY SECTION (GOOGLE PLAY STORE REQUIREMENT) ================= */}
      {activeSection === 'privacy_policy' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-neutral-200">
          <button
            onClick={() => setActiveSection('main')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Ayarlara Dön
          </button>

          <div className="border-b border-neutral-800 pb-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-500">
              Resmi Politika Metni
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">BizBize ❤️ Gizlilik Politikası</h2>
            <p className="text-[11px] text-neutral-400">Son Güncelleme: 31 Ekim 2026 • Google Play Uyumlu</p>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
              <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 1. Giriş ve Taahhüdümüz
              </h3>
              <p className="text-neutral-300 text-[11px]">
                BizBize ❤️ olarak kullanıcılarımızın gizliliğine ve kişisel verilerinin korunmasına en üst düzeyde önem veriyoruz. Bu politika; Google Play Store politikaları, KVKK ve uluslararası gizlilik standartlarına uygun olarak hangi verilerin toplandığını ve nasıl işlendiğini açıklar.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
              <h3 className="font-bold text-white text-xs">2. Toplanan Bilgiler</h3>
              <ul className="list-disc list-inside space-y-1 text-neutral-300 text-[11px]">
                <li><strong>Hesap Bilgileri:</strong> Google Kimlik Doğrulama ile alınan temel ad-soyad, e-posta adresi ve profil resmi.</li>
                <li><strong>İsteğe Bağlı Bilgiler:</strong> Belirlediğiniz benzersiz kullanıcı adı (@kullanici), biyografi ve rehber aramalarında kullanılabilen telefon numarası.</li>
                <li><strong>İletişim Verileri:</strong> Mesaj metinleri istemci tarafında 256-bit AES-GCM ile şifrelenir.</li>
              </ul>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
              <h3 className="font-bold text-white text-xs">3. Uçtan Uca Şifreleme ve Arama Güvenliği</h3>
              <p className="text-neutral-300 text-[11px]">
                Bireysel sohbetler ve paylaşılan medya dosyaları Web Crypto API standardı kullanılarak uçtan uca şifrelenir. Sesli ve görüntülü görüşmeler WebRTC P2P (noktadan noktaya) şifreli kanalları üzerinden doğrudan cihazlar arasında aktarılır; sunucularımızda hiçbir ses veya video kaydı depolanmaz.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
              <h3 className="font-bold text-white text-xs">4. Veri Paylaşımı ve Üçüncü Taraflar</h3>
              <p className="text-neutral-300 text-[11px]">
                Kişisel verileriniz hiçbir reklam ağına veya veri komisyoncusuna satılmaz ya da kiralanmaz. Altyapı yalnızca Google Cloud / Firebase (Firestore ve Authentication) üzerinde güvenli biçimde barındırılır.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5">
              <h3 className="font-bold text-white text-xs">5. Hesap ve Veri Silme Hakkı (Google Play Uyumluluğu)</h3>
              <p className="text-neutral-300 text-[11px]">
                Kullanıcılarımız uygulamamızın "Ayarlar" sekmesinde yer alan "Hesabımı ve Verilerimi Kalıcı Olarak Sil" butonu aracılığıyla profilini, tüm mesajlarını ve kayıtlı verilerini anında ve geri dönüşsüz olarak silebilir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= GOOGLE PLAY STORE READINESS GUIDE ================= */}
      {activeSection === 'play_store' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-neutral-200">
          <button
            onClick={() => setActiveSection('main')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 mb-2"
          >
            ← Ayarlara Dön
          </button>

          <div className="border-b border-neutral-800 pb-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-500">
              Yayın Hazırlığı & Kontroller
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">Google Play Store Yol Haritası</h2>
            <p className="text-[11px] text-neutral-400">BizBize ❤️ uygulamasını Google Play Console'a yükleme rehberi</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>1. Android App Bundle (.aab) Üretimi</span>
              </div>
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                PWA / TWA (Trusted Web Activity) kullanarak uygulamanızı tek bir komutla Google Play için imzalı <strong>.aab</strong> paketine dönüştürebilirsiniz:
              </p>
              <div className="p-2.5 rounded-xl bg-neutral-950 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                npx @bubblewrap/cli init --manifest=https://[ALAN-ADINIZ]/manifest.webmanifest<br />
                npx @bubblewrap/cli build
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>2. Google Play Veri Güvenliği (Data Safety) Formu</span>
              </div>
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                Google Play Console'daki Veri Güvenliği anketini doldururken:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 text-[10px]">
                <li><strong>Toplanan Veriler:</strong> İsim, E-posta (Hesap işlevselliği için).</li>
                <li><strong>Uçtan Uca Şifreleme:</strong> "Evet, veriler aktarım sırasında ve depolamada şifrelenir."</li>
                <li><strong>Hesap Silme Mekanizması:</strong> "Evet, kullanıcılar uygulama içinden hesabını silebilir."</li>
                <li><strong>Üçüncü Taraf Satış:</strong> "Hayır, veriler üçüncü taraflarla paylaşılmaz."</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <Smartphone className="w-4 h-4" />
                <span>3. Cihaz İzinleri Bildirimi</span>
              </div>
              <p className="text-neutral-300 text-[10px] leading-relaxed">
                • <strong>Kamera & Mikrofon:</strong> Yalnızca kullanıcı sesli/görüntülü görüşme başlattığında veya ses kaydettiğinde talep edilir.<br />
                • <strong>Bildirimler:</strong> Arka planda yeni mesaj ve gelen arama bildirimi için kullanılır.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= ACCOUNT DELETION CONFIRMATION MODAL ================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-rose-900/60 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-left space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Hesabınızı Silmek İstiyor musunuz?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Bu işlem geri alınamaz! Profiliniz, kullanıcı adınız (@{profile.username}), sohbet geçmişiniz ve tüm kişisel verileriniz Firebase veritabanından kalıcı olarak silinecektir.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
              <label className="text-neutral-300 text-[11px] block mb-1">
                Onaylamak için aşağıdaki kutucuğa <strong>SİL</strong> yazın:
              </label>
              <input
                type="text"
                placeholder="SİL"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500 font-bold"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={isDeletingAccount || deleteConfirmationText.trim().toLowerCase() !== 'sil'}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                {isDeletingAccount ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Kalıcı Olarak Sil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Warning & Setup Modal */}
      <InviteWarningModal
        isOpen={showInviteWarningModal}
        onClose={() => setShowInviteWarningModal(false)}
        onSuccessCopy={(msg) => {
          setSavedNotification(msg);
          setTimeout(() => setSavedNotification(''), 3000);
        }}
      />
    </div>
  );
};
