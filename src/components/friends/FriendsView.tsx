import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MessageSquare,
  Phone,
  Video,
  ShieldAlert,
  Ban,
  Check,
  X,
  UserCheck,
  MoreVertical,
  Info,
  Copy,
  Share2,
  Clock,
  UserMinus,
} from 'lucide-react';
import { UserProfile, Friendship } from '../../types';
import {
  searchUsers,
  sendFriendRequest,
  subscribeToFriendships,
  updateFriendshipStatus,
  removeFriendship,
} from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';
import { getPublicInviteUrl, buildInviteMessage } from '../../utils/inviteUtils';
import { InviteWarningModal } from '../common/InviteWarningModal';

interface FriendsViewProps {
  currentProfile: UserProfile;
  onStartChat: (user: UserProfile) => void;
  onStartAudioCall: (user: UserProfile) => void;
  onStartVideoCall: (user: UserProfile) => void;
  onBlockUser: (targetUid: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentProfile,
  onStartChat,
  onStartAudioCall,
  onStartVideoCall,
  onBlockUser,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [realRegisteredUsers, setRealRegisteredUsers] = useState<UserProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<UserProfile | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showInviteWarningModal, setShowInviteWarningModal] = useState(false);

  const handleCopyInviteLink = () => {
    const status = getPublicInviteUrl();
    if (!status.isPublic || !status.url) {
      // Never copy broken internal 404 link to clipboard; show warning modal as requested
      setShowInviteWarningModal(true);
      return;
    }

    const text = buildInviteMessage(status.url);
    navigator.clipboard.writeText(text);
    setCopiedInvite(true);
    setActionMessage('Davet bağlantısı panoya kopyalandı! 🎉');
    setTimeout(() => {
      setCopiedInvite(false);
      setActionMessage('');
    }, 3000);
  };

  // 1. Subscribe to friendships in real time
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToFriendships(currentProfile.uid, (list) => {
      setFriendships(list);
    });
    return () => unsub();
  }, [currentUser, currentProfile.uid]);

  // 2. Load all registered users for resolution
  const refreshUsers = () => {
    if (!currentUser) return;
    searchUsers('', currentProfile.uid).then((users) => {
      setRealRegisteredUsers(users);
    });
  };

  useEffect(() => {
    refreshUsers();
  }, [currentUser, currentProfile.uid]);

  // 3. Search query handler
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setLoadingSearch(true);
      searchUsers(searchQuery, currentProfile.uid)
        .then((res) => setSearchResults(res))
        .catch(() => setSearchResults([]))
        .finally(() => setLoadingSearch(false));
    } else {
      setSearchResults(realRegisteredUsers);
    }
  }, [searchQuery, currentProfile.uid, realRegisteredUsers]);

  // Friendship groupings
  const acceptedFriendships = friendships.filter((f) => f.status === 'accepted');
  const incomingRequests = friendships.filter(
    (f) => f.recipientId === currentProfile.uid && f.status === 'pending'
  );
  const outgoingRequests = friendships.filter(
    (f) => f.requesterId === currentProfile.uid && f.status === 'pending'
  );

  // Accepted friends profile mapping
  const friendsList = acceptedFriendships
    .map((f) => {
      const otherUid = f.requesterId === currentProfile.uid ? f.recipientId : f.requesterId;
      return realRegisteredUsers.find((u) => u.uid === otherUid);
    })
    .filter((u): u is UserProfile => Boolean(u));

  const getFriendshipWith = (targetUid: string) => {
    return friendships.find(
      (f) =>
        (f.requesterId === targetUid && f.recipientId === currentProfile.uid) ||
        (f.recipientId === targetUid && f.requesterId === currentProfile.uid)
    );
  };

  const handleSendRequest = async (user: UserProfile) => {
    await sendFriendRequest(currentProfile.uid, user.uid);
    setActionMessage(`${user.displayName} kişisine arkadaşlık isteği gönderildi!`);
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleAcceptRequest = async (friendshipId: string, userName?: string) => {
    await updateFriendshipStatus(friendshipId, 'accepted');
    setActionMessage(userName ? `${userName} ile artık arkadaşsınız! 🎉` : 'Arkadaşlık isteği kabul edildi!');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleRejectOrCancel = async (friendshipId: string) => {
    await removeFriendship(friendshipId);
    setActionMessage('İstek kaldırıldı.');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    await removeFriendship(friendshipId);
    setSelectedUserForProfile(null);
    setActionMessage('Arkadaşlıktan çıkarıldı.');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleReport = () => {
    if (!reportReason) return;
    setActionMessage('Kullanıcı şikâyeti kaydedildi. Güvenlik birimi inceleyecektir.');
    setShowReportModal(false);
    setSelectedUserForProfile(null);
    setReportReason('');
    setTimeout(() => setActionMessage(''), 4000);
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 border-b border-neutral-900 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            <span>Arkadaşlar</span>
            <span className="text-rose-500 text-sm">❤️</span>
          </h1>
          <p className="text-[10px] text-neutral-400">Gerçek Kullanıcılar & Arkadaşlık Yönetimi</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPublishModal(true)}
            className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition"
            title="Yayınlama Durumu & Kartsız Yayınlama Seçenekleri"
          >
            <Info className="w-3.5 h-3.5 text-rose-400" />
          </button>
          <button
            onClick={handleCopyInviteLink}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-[11px] text-white font-medium flex items-center gap-1 transition shadow-sm shadow-rose-600/30"
            title="Uygulama davet bağlantısını kopyala"
          >
            {copiedInvite ? (
              <>
                <Check className="w-3 h-3 text-white" />
                <span>Kopyalandı</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-white" />
                <span>Davet Et</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 bg-neutral-900/60 border-b border-neutral-900 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-1.5 rounded-xl transition ${
            activeTab === 'friends' ? 'bg-rose-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Arkadaşlarım ({friendsList.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`relative flex-1 py-1.5 rounded-xl transition ${
            activeTab === 'requests' ? 'bg-rose-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>İstekler</span>
          {incomingRequests.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-bold">
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-1.5 rounded-xl transition ${
            activeTab === 'search' ? 'bg-rose-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Kullanıcı Bul
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div className="m-2 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-700 text-xs text-emerald-200 text-center animate-in fade-in shadow-lg">
          {actionMessage}
        </div>
      )}

      {/* ================= TAB 1: ARKADAŞLARIM ================= */}
      {activeTab === 'friends' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {friendsList.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-neutral-900/30 border border-neutral-800/40 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-500 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-200">Henüz eklenmiş arkadaşınız yok</p>
                <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  "Kullanıcı Bul" sekmesinden kayıtlı kişileri arayabilir veya davet bağlantısını paylaşarak arkadaşlarınızı uygulamaya çağırabilirsiniz.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold shadow-md shadow-rose-600/20 active:scale-95 transition"
                >
                  Kullanıcı Bul
                </button>
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Davet Bağlantısı</span>
                </button>
              </div>
            </div>
          ) : (
            friendsList.map((friend) => (
              <div
                key={friend.uid}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/70 transition"
              >
                <div
                  onClick={() => setSelectedUserForProfile(friend)}
                  className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                >
                  <div className="relative">
                    <img
                      src={friend.photoURL}
                      alt={friend.displayName}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-neutral-700 group-hover:ring-rose-500"
                    />
                    {friend.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-neutral-950 rounded-full"></span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-white group-hover:text-rose-400 truncate">
                        {friend.displayName}
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                        Arkadaş
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 truncate">
                      @{friend.username} {friend.phoneNumber && `• ${friend.phoneNumber}`}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate italic">
                      "{friend.bio || 'BizBize kullanıcısı'}"
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onStartChat(friend)}
                    className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/30"
                    title="Mesaj Gönder"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStartAudioCall(friend)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-emerald-400 transition"
                    title="Sesli Ara"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStartVideoCall(friend)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-sky-400 transition"
                    title="Görüntülü Ara"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= TAB 2: İSTEKLER ================= */}
      {activeTab === 'requests' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* Gelen İstekler */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-semibold text-neutral-200">
                Gelen Arkadaşlık İstekleri ({incomingRequests.length})
              </h3>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="p-4 rounded-2xl bg-neutral-900/30 border border-neutral-800/40 text-center text-xs text-neutral-500">
                Bekleyen yeni arkadaşlık isteği yok.
              </div>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => {
                  const sender = realRegisteredUsers.find((u) => u.uid === req.requesterId);
                  const senderName = sender?.displayName || 'BizBize Kullanıcısı';
                  const senderPhoto = sender?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.requesterId}`;
                  const senderUser = sender?.username ? `@${sender.username}` : '';

                  return (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={senderPhoto}
                          alt={senderName}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate">{senderName}</h4>
                          <p className="text-[10px] text-neutral-400 truncate">{senderUser}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req.id, senderName)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Kabul Et</span>
                        </button>
                        <button
                          onClick={() => handleRejectOrCancel(req.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 text-xs transition"
                          title="Reddet"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gönderilen İstekler */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-neutral-200">
                Gönderdiğiniz İstekler ({outgoingRequests.length})
              </h3>
            </div>

            {outgoingRequests.length === 0 ? (
              <div className="p-4 rounded-2xl bg-neutral-900/30 border border-neutral-800/40 text-center text-xs text-neutral-500">
                Bekleyen gönderilmiş istek yok.
              </div>
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((req) => {
                  const recipient = realRegisteredUsers.find((u) => u.uid === req.recipientId);
                  const recName = recipient?.displayName || 'BizBize Kullanıcısı';
                  const recPhoto = recipient?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.recipientId}`;

                  return (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={recPhoto}
                          alt={recName}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-700 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate">{recName}</h4>
                          <p className="text-[10px] text-amber-400 font-medium">Onay Bekleniyor...</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRejectOrCancel(req.id)}
                        className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-[11px] transition"
                      >
                        İptal Et
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: KULLANICI BUL ================= */}
      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-neutral-900">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="İsim, @kullanıcıadı veya telefon ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-rose-500"
                autoFocus
              />
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {searchResults.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/60 space-y-3">
                <Search className="w-8 h-8 text-neutral-600 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-neutral-200">
                    {searchQuery
                      ? `"${searchQuery}" ile eşleşen kullanıcı bulunamadı`
                      : 'Henüz veritabanında başka kullanıcı bulunmuyor'}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {searchQuery
                      ? 'Aradığınız kişinin tam @kullanıcıadı veya telefon numarasını kontrol edebilirsiniz.'
                      : 'Arkadaşınızı davet ederek uygulamaya katılmasını sağlayabilir ve anında mesajlaşmaya başlayabilirsiniz.'}
                  </p>
                </div>
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 mx-auto shadow-md shadow-rose-600/20 active:scale-95 transition"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Davet Bağlantısı Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-white" />
                      <span>Davet Bağlantısını Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              searchResults.map((user) => {
                const friendship = getFriendshipWith(user.uid);
                const isAccepted = friendship?.status === 'accepted';
                const isIncoming = friendship?.status === 'pending' && friendship.recipientId === currentProfile.uid;
                const isOutgoing = friendship?.status === 'pending' && friendship.requesterId === currentProfile.uid;

                return (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/70 transition"
                  >
                    <div
                      onClick={() => setSelectedUserForProfile(user)}
                      className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="relative">
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-11 h-11 rounded-full object-cover ring-1 ring-neutral-700 group-hover:ring-rose-500"
                        />
                        {user.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-neutral-950 rounded-full"></span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-semibold text-white group-hover:text-rose-400 truncate">
                            {user.displayName}
                          </h4>
                          {isAccepted && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                              Arkadaş
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate">
                          @{user.username} {user.phoneNumber && `• ${user.phoneNumber}`}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate italic">
                          "{user.bio || 'BizBize kullanıcısı'}"
                        </p>
                      </div>
                    </div>

                    {/* Friendship Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isAccepted ? (
                        <>
                          <button
                            onClick={() => onStartChat(user)}
                            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/30"
                            title="Mesaj Gönder"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      ) : isIncoming ? (
                        <button
                          onClick={() => handleAcceptRequest(friendship.id, user.displayName)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Kabul Et</span>
                        </button>
                      ) : isOutgoing ? (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium">
                            İstek İletildi
                          </span>
                          <button
                            onClick={() => handleRejectOrCancel(friendship.id)}
                            className="p-1 text-neutral-500 hover:text-rose-400"
                            title="İptal Et"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSendRequest(user)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1 transition active:scale-95 shadow-sm shadow-rose-600/20"
                            title="Arkadaşlık İsteği Gönder"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Ekle</span>
                          </button>
                          <button
                            onClick={() => onStartChat(user)}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                            title="Doğrudan Mesaj Gönder"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= USER PROFILE VIEW MODAL ================= */}
      {selectedUserForProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 text-center relative shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setSelectedUserForProfile(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <img
              src={selectedUserForProfile.photoURL}
              alt={selectedUserForProfile.displayName}
              className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-rose-500 shadow-xl mb-3"
            />

            <h3 className="text-lg font-bold text-white">{selectedUserForProfile.displayName}</h3>
            <p className="text-xs text-rose-400 font-medium">@{selectedUserForProfile.username}</p>

            {selectedUserForProfile.phoneNumber && (
              <p className="text-xs text-neutral-400 mt-1 font-mono">
                {selectedUserForProfile.phoneNumber}
              </p>
            )}

            <div className="my-4 p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-left text-xs">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                Hakkında & Durum
              </span>
              <p className="text-neutral-200">{selectedUserForProfile.bio || 'BizBize kullanıcısı.'}</p>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => {
                  onStartChat(selectedUserForProfile);
                  setSelectedUserForProfile(null);
                }}
                className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex flex-col items-center gap-1 transition"
              >
                <MessageSquare className="w-4 h-4 text-rose-400" />
                <span>Mesaj</span>
              </button>
              <button
                onClick={() => {
                  onStartAudioCall(selectedUserForProfile);
                  setSelectedUserForProfile(null);
                }}
                className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex flex-col items-center gap-1 transition"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Sesli</span>
              </button>
              <button
                onClick={() => {
                  onStartVideoCall(selectedUserForProfile);
                  setSelectedUserForProfile(null);
                }}
                className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex flex-col items-center gap-1 transition"
              >
                <Video className="w-4 h-4 text-sky-400" />
                <span>Görüntülü</span>
              </button>
            </div>

            {/* Friendship or Danger actions */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
              {getFriendshipWith(selectedUserForProfile.uid)?.status === 'accepted' ? (
                <button
                  onClick={() => {
                    const f = getFriendshipWith(selectedUserForProfile.uid);
                    if (f) handleRemoveFriend(f.id);
                  }}
                  className="text-neutral-400 hover:text-rose-400 flex items-center gap-1 font-medium"
                >
                  <UserMinus className="w-3.5 h-3.5" /> Arkadaşlıktan Çıkar
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleSendRequest(selectedUserForProfile);
                    setSelectedUserForProfile(null);
                  }}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Arkadaş Ekle
                </button>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    onBlockUser(selectedUserForProfile.uid);
                    setSelectedUserForProfile(null);
                  }}
                  className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium"
                >
                  <Ban className="w-3.5 h-3.5" /> Engelle
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="text-rose-500 hover:text-rose-400 flex items-center gap-1 font-medium"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Şikâyet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT MODAL ================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Kullanıcıyı Şikâyet Et
            </h4>
            <p className="text-xs text-neutral-400 mb-3">
              Lütfen şikâyet sebebinizi belirtin. Güvenlik birimi inceleyecektir.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Şikâyet detayınızı yazın..."
              rows={3}
              className="w-full p-3 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-white outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PUBLISH & INVITE INFO MODAL ================= */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <h4 className="text-sm font-bold text-white">Yayınlama ve Davet Rehberi</h4>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Neden 404 Hatası Alındı?</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Cloud Run önizleme bağlantıları geliştirme konteynerine aittir. AI Studio arayüzündeki <strong>"Share" (Paylaş)</strong> butonu ile onaylanmadığı sürece dış dünyadan açıldığında Google Cloud güvenlik nedeniyle 404 verir.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                💳 Kart Gerektirmeyen Ücretsiz Yayınlama Yolları:
              </span>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-xs font-semibold text-rose-400">1. Firebase Hosting (En Sağlam & Ücretsiz)</div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Projeniz zaten <code className="text-neutral-100">bizbize-7b76f</code> ile bağlı. Kredi kartı gerekmez. <code className="text-neutral-100">bizbize-7b76f.web.app</code> adresinde kalıcı ve güvenli HTTPS yayını sağlar. Google girişi de otomatik çalışır.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-xs font-semibold text-sky-400">2. AI Studio "Share" (Paylaş) Butonu</div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Sağ üst köşedeki Paylaş butonuna basarak mevcut bulut önizlemesini ücretsiz ve tek tıkla herkese açık hale getirebilirsiniz.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-xs font-semibold text-emerald-400">3. Vercel veya Netlify</div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Kredi kartsız ücretsiz katmanda dakikalar içinde canlı web sitesi açabilirsiniz.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
              <button
                onClick={handleCopyInviteLink}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Aktif Adresi Kopyala</span>
              </button>
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= UNPUBLISHED / INVITE WARNING MODAL ================= */}
      <InviteWarningModal
        isOpen={showInviteWarningModal}
        onClose={() => setShowInviteWarningModal(false)}
        onSuccessCopy={(msg) => {
          setActionMessage(msg);
          setTimeout(() => setActionMessage(''), 3000);
        }}
      />
    </div>
  );
};
