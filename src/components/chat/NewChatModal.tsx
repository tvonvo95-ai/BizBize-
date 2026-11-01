import React, { useState, useEffect } from 'react';
import { X, Search, Users, UserCheck, MessageSquare, Plus, Check, Copy, Share2 } from 'lucide-react';
import { UserProfile, Chat } from '../../types';
import { searchUsers, getOrCreateDirectChat, createGroupChat } from '../../firebase/services';
import { DEMO_USERS, useAuth } from '../../context/AuthContext';
import { getPublicInviteUrl, buildInviteMessage } from '../../utils/inviteUtils';
import { InviteWarningModal } from '../common/InviteWarningModal';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onChatCreated: (chat: Chat) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onChatCreated,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<UserProfile[]>([]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [showInviteWarningModal, setShowInviteWarningModal] = useState(false);

  // Suggested demo profiles ONLY for demo testing mode (when not authenticated with Firebase)
  const demoProfiles = DEMO_USERS.filter((u) => u.uid !== currentProfile.uid).map((u) => ({
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

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setLoading(true);
      if (currentUser) {
        // Real user search on Firestore: Never include demo users
        searchUsers(searchQuery, currentProfile.uid)
          .then((res) => {
            setSearchResults(res);
          })
          .catch((err) => {
            console.error('Error searching users:', err);
            setSearchResults([]);
          })
          .finally(() => setLoading(false));
      } else {
        const matches = demoProfiles.filter(
          (u) =>
            u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.phoneNumber.includes(searchQuery)
        );
        setSearchResults(matches);
        setLoading(false);
      }
    } else {
      if (currentUser) {
        // Fetch only real registered users from Firestore
        searchUsers('', currentProfile.uid)
          .then((res) => {
            setSearchResults(res);
          })
          .catch(() => setSearchResults([]));
      } else {
        setSearchResults(demoProfiles);
      }
    }
  }, [searchQuery, currentProfile.uid, currentUser]);

  if (!isOpen) return null;

  const handleCopyInviteLink = () => {
    const status = getPublicInviteUrl();
    if (!status.isPublic || !status.url) {
      // Do NOT copy broken internal link! Show warning modal instead
      setShowInviteWarningModal(true);
      return;
    }

    const text = buildInviteMessage(status.url);
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleStartDirectChat = async (targetUser: UserProfile) => {
    setLoading(true);
    try {
      const chat = await getOrCreateDirectChat(currentProfile.uid, targetUser);
      onChatCreated(chat);
      onClose();
    } catch (err) {
      console.error('Error starting direct chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroupParticipant = (user: UserProfile) => {
    if (selectedParticipants.some((p) => p.uid === user.uid)) {
      setSelectedParticipants((prev) => prev.filter((p) => p.uid !== user.uid));
    } else {
      setSelectedParticipants((prev) => [...prev, user]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedParticipants.length === 0) return;
    setLoading(true);
    try {
      const chat = await createGroupChat(
        currentProfile.uid,
        groupName.trim(),
        selectedParticipants.map((p) => p.uid)
      );
      onChatCreated(chat);
      onClose();
    } catch (err) {
      console.error('Error creating group chat:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 text-neutral-100 flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('direct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'direct'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Yeni Sohbet
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'group'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Grup Oluştur
            </button>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Direct Chat */}
        {activeTab === 'direct' && (
          <div className="flex-1 flex flex-col overflow-hidden pt-3 space-y-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="İsim, @kullanıcıadı veya telefon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-rose-500"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                {searchQuery ? 'Arama Sonuçları' : 'Önerilen Kişiler'}
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-6 px-3 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl space-y-3 my-2">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-850 border border-neutral-750 flex items-center justify-center text-rose-500 mx-auto">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-200">
                      {searchQuery
                        ? `"${searchQuery}" ile eşleşen kullanıcı bulunamadı`
                        : 'Henüz başka kayıtlı kullanıcı yok'}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      {searchQuery
                        ? 'Kullanıcının tam @kullanıcıadı veya telefon numarasını girdiğinizden emin olun.'
                        : 'Arkadaşınızı davet ederek Google ile giriş yapmasını sağlayabilir ve anında mesajlaşmaya başlayabilirsiniz.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-rose-600/20"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Davet Bağlantısı Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-white" />
                        <span>Uygulama Bağlantısını Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleStartDirectChat(user)}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 hover:border-rose-500/50 hover:bg-neutral-800/60 transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700 group-hover:ring-rose-500"
                        />
                        {user.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-neutral-900 rounded-full"></span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white group-hover:text-rose-400 truncate">
                            {user.displayName}
                          </span>
                          {user.uid.startsWith('demo_') ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                              Örnek
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                              Kayıtlı
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          @{user.username} {user.phoneNumber && `• ${user.phoneNumber}`}
                        </div>
                      </div>
                    </div>
                    <MessageSquare className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Group Creation */}
        {activeTab === 'group' && (
          <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden pt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-300">Grup Adı</label>
              <input
                type="text"
                placeholder="Örn: Hafta Sonu Planı 🌴"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={40}
                className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                required
              />
            </div>

            {/* Selected pill badges */}
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto p-1 bg-neutral-950/60 rounded-xl">
                {selectedParticipants.map((p) => (
                  <span
                    key={p.uid}
                    onClick={() => handleToggleGroupParticipant(p)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600/30 text-rose-300 text-[10px] font-medium border border-rose-500/40 cursor-pointer hover:bg-rose-600/50"
                  >
                    {p.displayName} <X className="w-2.5 h-2.5" />
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Grup Üyelerini Seçin ({selectedParticipants.length})
              </div>

              {searchResults.map((user: UserProfile) => {
                const isSelected = selectedParticipants.some((p) => p.uid === user.uid);
                return (
                  <div
                    key={user.uid}
                    onClick={() => handleToggleGroupParticipant(user)}
                    className={`flex items-center justify-between p-2 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-950/30 border-rose-500/60'
                        : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">{user.displayName}</div>
                        <div className="text-[10px] text-neutral-400">@{user.username}</div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-rose-600 border-rose-600 text-white'
                          : 'border-neutral-700 bg-neutral-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={loading || !groupName.trim() || selectedParticipants.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/20"
            >
              {loading ? 'Grup Oluşturuluyor...' : `Grubu Oluştur (${selectedParticipants.length + 1} Kişi)`}
            </button>
          </form>
        )}
      </div>

      <InviteWarningModal
        isOpen={showInviteWarningModal}
        onClose={() => setShowInviteWarningModal(false)}
        onSuccessCopy={() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2500);
        }}
      />
    </div>
  );
};
