import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Lock,
  Bell,
  BellOff,
  LogOut,
  Crown,
  Phone,
  Video,
  Info,
  Check,
  Plus,
} from 'lucide-react';
import { Chat, UserProfile } from '../../types';
import {
  updateChat,
  addGroupMembers,
  removeGroupMember,
  searchUsers,
} from '../../firebase/services';
import { DEMO_USERS, useAuth } from '../../context/AuthContext';

interface ChatDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentProfile: UserProfile;
  onOpenSecurityModal: () => void;
  onStartAudioCall: (user: UserProfile) => void;
  onStartVideoCall: (user: UserProfile) => void;
  onLeaveChat?: () => void;
}

export const ChatDetailsModal: React.FC<ChatDetailsModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentProfile,
  onOpenSecurityModal,
  onStartAudioCall,
  onStartVideoCall,
  onLeaveChat,
}) => {
  const { isDemoUser, currentUser } = useAuth();
  const [isMuted, setIsMuted] = useState(chat.isMuted || false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState<UserProfile[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isGroup = chat.type === 'group';
  const isAdmin = isGroup && (chat.adminIds?.includes(currentProfile.uid) || chat.adminIds?.length === 0);

  // Load candidate users when adding member is triggered
  useEffect(() => {
    if (!isAddingMember) return;
    if (currentUser) {
      searchUsers('', currentProfile.uid).then((users) => {
        const notInChat = users.filter((u) => !chat.participants.includes(u.uid));
        setCandidateUsers(notInChat);
      });
    } else {
      const demoCandidates = DEMO_USERS
        .filter((u) => !chat.participants.includes(u.uid))
        .map((u) => ({
          uid: u.uid,
          displayName: u.displayName,
          username: u.username,
          phoneNumber: u.phoneNumber,
          photoURL: u.photoURL,
          bio: u.bio,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }));
      setCandidateUsers(demoCandidates);
    }
  }, [isAddingMember, currentUser, currentProfile.uid, chat.participants]);

  if (!isOpen) return null;

  const handleToggleMute = async () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    if (!isDemoUser) {
      await updateChat(chat.id, { isMuted: nextVal });
    }
  };

  const handleConfirmAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    setLoading(true);
    try {
      if (!isDemoUser) {
        await addGroupMembers(chat.id, chat.participants, selectedToAdd);
      }
      chat.participants.push(...selectedToAdd);
      setIsAddingMember(false);
      setSelectedToAdd([]);
    } catch (e) {
      console.error('Failed to add members:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (uidToRemove: string) => {
    if (!confirm('Bu üyeyi gruptan çıkarmak istediğinize emin misiniz?')) return;
    try {
      if (!isDemoUser) {
        await removeGroupMember(chat.id, chat.participants, uidToRemove);
      }
      chat.participants = chat.participants.filter((p) => p !== uidToRemove);
      onClose();
    } catch (e) {
      console.error('Failed to remove member:', e);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Bu gruptan ayrılmak istediğinize emin misiniz?')) return;
    try {
      if (!isDemoUser) {
        await removeGroupMember(chat.id, chat.participants, currentProfile.uid);
      }
      onClose();
      if (onLeaveChat) onLeaveChat();
    } catch (e) {
      console.error('Failed to leave group:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isGroup ? <Users className="w-5 h-5 text-rose-500" /> : <Info className="w-5 h-5 text-rose-500" />}
            <h3 className="text-sm font-bold text-white">
              {isGroup ? 'Grup Bilgisi' : 'Kişi Bilgisi'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Avatar & Title */}
          <div className="text-center">
            <img
              src={chat.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`}
              alt={chat.name}
              className="w-20 h-20 rounded-full mx-auto object-cover ring-2 ring-rose-500/50 shadow-md mb-2"
            />
            <h4 className="text-base font-bold text-white">{chat.name || 'Sohbet'}</h4>
            {isGroup ? (
              <p className="text-xs text-neutral-400 mt-0.5">
                {chat.participants.length} Katılımcı
              </p>
            ) : (
              <p className="text-xs text-emerald-400 font-medium mt-0.5">
                ● Çevrimiçi
              </p>
            )}
            {chat.description && (
              <p className="text-xs text-neutral-300 mt-2 italic px-3 py-1.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
                "{chat.description}"
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleToggleMute}
              className={`p-2.5 rounded-2xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                isMuted
                  ? 'bg-rose-950/30 border-rose-800/80 text-rose-300'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              {isMuted ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4 text-neutral-400" />}
              <span>{isMuted ? 'Sessize Alındı' : 'Sessize Al'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenSecurityModal();
              }}
              className="p-2.5 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Güvenlik Kodu</span>
            </button>
          </div>

          {/* Group Participants Management */}
          {isGroup && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                <span>Katılımcılar ({chat.participants.length})</span>
                {isAdmin && !isAddingMember && (
                  <button
                    onClick={() => setIsAddingMember(true)}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Üye Ekle
                  </button>
                )}
              </div>

              {/* Add Member Drawer */}
              {isAddingMember && (
                <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>Gruba Eklenecek Kişiler:</span>
                    <button
                      onClick={() => {
                        setIsAddingMember(false);
                        setSelectedToAdd([]);
                      }}
                      className="text-neutral-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {candidateUsers.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-2 text-center">
                      Eklenebilecek yeni kullanıcı bulunamadı.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {candidateUsers.map((u) => {
                        const isSelected = selectedToAdd.includes(u.uid);
                        return (
                          <div
                            key={u.uid}
                            onClick={() => {
                              setSelectedToAdd((prev) =>
                                isSelected ? prev.filter((id) => id !== u.uid) : [...prev, u.uid]
                              );
                            }}
                            className={`p-1.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              isSelected
                                ? 'bg-rose-950/40 border-rose-500/60'
                                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-850'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={u.photoURL}
                                alt={u.displayName}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-xs text-neutral-200">{u.displayName}</span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-neutral-600'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    disabled={selectedToAdd.length === 0 || loading}
                    onClick={handleConfirmAddMembers}
                    className="w-full py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                  >
                    {loading ? 'Ekleniyor...' : `Seçilenleri Ekle (${selectedToAdd.length})`}
                  </button>
                </div>
              )}

              {/* Participants list */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {chat.participants.map((uid) => {
                  const isCurrent = uid === currentProfile.uid;
                  const isUserAdmin = chat.adminIds?.includes(uid);
                  const demoUserMatch = DEMO_USERS.find((d) => d.uid === uid);
                  const name = isCurrent
                    ? `${currentProfile.displayName} (Sen)`
                    : demoUserMatch?.displayName || `Kullanıcı ${uid.slice(0, 6)}`;
                  const photo = isCurrent
                    ? currentProfile.photoURL
                    : demoUserMatch?.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${uid}`;

                  return (
                    <div
                      key={uid}
                      className="p-2 rounded-xl bg-neutral-950/50 border border-neutral-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={photo}
                          alt={name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <span>{name}</span>
                            {isUserAdmin && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/40">
                                <Crown className="w-2.5 h-2.5" /> Yönetici
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {demoUserMatch?.phoneNumber || 'Gizli Numara'}
                          </div>
                        </div>
                      </div>

                      {isAdmin && !isCurrent && (
                        <button
                          onClick={() => handleRemoveMember(uid)}
                          className="p-1 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition"
                          title="Gruptan Çıkar"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Leave group button */}
              <button
                onClick={handleLeaveGroup}
                className="w-full mt-2 py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" /> Gruptan Ayrıl
              </button>
            </div>
          )}

          {/* Encryption explanation note */}
          <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Lock className="w-3.5 h-3.5" />
              <span>BizBize Uçtan Uca Şifreli</span>
            </div>
            <p>
              Bu sohbetteki mesajlar, fotoğraflar, videolar ve ses kayıtları cihazınızda şifrelenir ve yalnızca bu sohbetteki kişiler tarafından çözülebilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
