import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  ShieldCheck,
  Search,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  MicOff,
  Send,
  Lock,
  Unlock,
  Check,
  CheckCheck,
  CornerUpLeft,
  Trash2,
  Edit2,
  X,
  Play,
  Pause,
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Chat, Message, UserProfile } from '../../types';
import {
  subscribeToMessages,
  sendMessage,
  updateMessageStatus,
  deleteMessage,
  editMessage,
} from '../../firebase/services';
import { EmojiPickerPopup } from './EmojiPickerPopup';
import { SecurityCodeModal } from './SecurityCodeModal';
import { ChatDetailsModal } from './ChatDetailsModal';
import { deriveChatKey, encryptMessage, decryptMessage } from '../../utils/crypto';
import { sounds } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';
import { getDemoMessagesForChat } from '../../data/demoData';

interface ChatRoomProps {
  chat: Chat;
  currentProfile: UserProfile;
  onBack: () => void;
  onStartAudioCall: (receiver: UserProfile) => void;
  onStartVideoCall: (receiver: UserProfile) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  chat,
  currentProfile,
  onBack,
  onStartAudioCall,
  onStartVideoCall,
}) => {
  const { isDemoUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [inputText, setInputText] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isE2EEEnabled, setIsE2EEEnabled] = useState(true);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  // Initialize E2EE Key
  useEffect(() => {
    deriveChatKey(chat.id).then((key) => {
      cryptoKeyRef.current = key;
    });
  }, [chat.id]);

  // Subscribe to messages in this chat
  useEffect(() => {
    if (isDemoUser) {
      const demoMsgs = getDemoMessagesForChat(chat.id, currentProfile.uid);
      setMessages(demoMsgs);
      return;
    }

    const unsub = subscribeToMessages(chat.id, async (msgs) => {
      setMessages(msgs);

      // Decrypt any encrypted messages
      if (cryptoKeyRef.current) {
        const decryptedMap: Record<string, string> = {};
        for (const msg of msgs) {
          if (msg.isEncrypted && msg.iv) {
            const plain = await decryptMessage(msg.content, msg.iv, cryptoKeyRef.current);
            decryptedMap[msg.id] = plain;
          }
        }
        setDecryptedMessages((prev) => ({ ...prev, ...decryptedMap }));
      }

      // Mark unread messages as read
      msgs.forEach((m) => {
        if (m.senderId !== currentProfile.uid && m.status !== 'read') {
          updateMessageStatus(chat.id, m.id, 'read');
        }
      });
    });

    return () => unsub();
  }, [chat.id, currentProfile.uid, isDemoUser]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Target user for 1-on-1 chats
  const otherParticipantUid = chat.participants.find((p) => p !== currentProfile.uid) || '';
  const dummyReceiver: UserProfile = {
    uid: otherParticipantUid,
    displayName: chat.name || 'Sohbet',
    username: 'kullanici',
    photoURL: chat.photoURL,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Handle Send Message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    sounds.playMessageSent();
    const textToSend = inputText.trim();
    setInputText('');

    if (editingMessage) {
      await editMessage(chat.id, editingMessage.id, textToSend);
      setEditingMessage(null);
      return;
    }

    let finalContent = textToSend;
    let ivString: string | undefined = undefined;
    let encryptedFlag = false;

    // Encrypt with Web Crypto AES-GCM if E2EE is enabled
    if (isE2EEEnabled && cryptoKeyRef.current) {
      try {
        const encResult = await encryptMessage(textToSend, cryptoKeyRef.current);
        finalContent = encResult.cipherText;
        ivString = encResult.iv;
        encryptedFlag = true;
      } catch (err) {
        console.warn('Encryption fallback:', err);
      }
    }

    if (isDemoUser) {
      const demoMsg: Message = {
        id: `msg_demo_${Date.now()}`,
        chatId: chat.id,
        senderId: currentProfile.uid,
        senderName: currentProfile.displayName,
        senderPhoto: currentProfile.photoURL,
        content: finalContent,
        type: 'text',
        isEncrypted: encryptedFlag,
        iv: ivString,
        status: 'delivered',
        replyTo: replyTarget
          ? {
              id: replyTarget.id,
              senderName: replyTarget.senderName,
              content: decryptedMessages[replyTarget.id] || replyTarget.content,
            }
          : undefined,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, demoMsg]);
      setReplyTarget(null);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === demoMsg.id ? { ...m, status: 'read' } : m))
        );
      }, 1000);

      if (chat.type === 'direct') {
        setTimeout(() => {
          sounds.playMessageReceived();
          const replyMsg: Message = {
            id: `msg_auto_${Date.now()}`,
            chatId: chat.id,
            senderId: otherParticipantUid,
            senderName: chat.name || 'Arkadaş',
            senderPhoto: chat.photoURL,
            content: `Harika! Mesajını aldım: "${textToSend.slice(0, 30)}" ❤️`,
            type: 'text',
            isEncrypted: isE2EEEnabled,
            status: 'read',
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, replyMsg]);
        }, 1800);
      }
      return;
    }

    await sendMessage(chat.id, {
      chatId: chat.id,
      senderId: currentProfile.uid,
      senderName: currentProfile.displayName,
      senderPhoto: currentProfile.photoURL,
      content: finalContent,
      type: 'text',
      isEncrypted: encryptedFlag,
      iv: ivString,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            senderName: replyTarget.senderName,
            content: decryptedMessages[replyTarget.id] || replyTarget.content,
          }
        : undefined,
    });

    setReplyTarget(null);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const fileType = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'audio'
        : 'file';

      sounds.playMessageSent();

      if (isDemoUser) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_demo_${Date.now()}`,
            chatId: chat.id,
            senderId: currentProfile.uid,
            senderName: currentProfile.displayName,
            senderPhoto: currentProfile.photoURL,
            content: file.name,
            type: fileType,
            mediaUrl: dataUrl,
            fileName: file.name,
            fileSize: file.size,
            status: 'read',
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      await sendMessage(chat.id, {
        chatId: chat.id,
        senderId: currentProfile.uid,
        senderName: currentProfile.displayName,
        senderPhoto: currentProfile.photoURL,
        content: file.name,
        type: fileType,
        mediaUrl: dataUrl,
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Voice Recording with MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          sounds.playMessageSent();

          if (isDemoUser) {
            setMessages((prev) => [
              ...prev,
              {
                id: `msg_demo_${Date.now()}`,
                chatId: chat.id,
                senderId: currentProfile.uid,
                senderName: currentProfile.displayName,
                senderPhoto: currentProfile.photoURL,
                content: 'Sesli Mesaj',
                type: 'audio',
                mediaUrl: base64Audio,
                duration: recordingSeconds,
                status: 'read',
                createdAt: new Date().toISOString(),
              },
            ]);
            return;
          }

          await sendMessage(chat.id, {
            chatId: chat.id,
            senderId: currentProfile.uid,
            senderName: currentProfile.displayName,
            senderPhoto: currentProfile.photoURL,
            content: 'Sesli Mesaj',
            type: 'audio',
            mediaUrl: base64Audio,
            duration: recordingSeconds,
          });
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Mikrofon erişimi reddedildi veya bulunamadı.');
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (cancel) {
        audioChunksRef.current = [];
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecordingSeconds(0);
      } else {
        mediaRecorderRef.current.stop();
      }
    }
  };

  // Audio Playback
  const togglePlayAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
        setPlayingAudioId(msgId);
        audioPlayerRef.current.onended = () => setPlayingAudioId(null);
      }
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery) return true;
    const text = decryptedMessages[m.id] || m.content;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Header */}
      <div className="h-16 px-3 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={() => setIsDetailsOpen(true)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition"
            title="Sohbet ve Katılımcı Bilgileri"
          >
            <div className="relative">
              <img
                src={chat.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`}
                alt={chat.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700"
              />
              {chat.type === 'direct' && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-neutral-900 rounded-full"></span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[200px]">
                  {chat.name || 'BizBize Sohbet'}
                </h2>
                {isE2EEEnabled && (
                  <span
                    className="text-emerald-400"
                    title="Uçtan Uca Şifreleme Aktif"
                  >
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </div>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                {chat.type === 'group' ? `${chat.participants.length} Katılımcı` : 'Çevrimiçi'}
              </p>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-neutral-300">
          <button
            onClick={() => onStartAudioCall(dummyReceiver)}
            className="p-2 rounded-full hover:bg-neutral-800 hover:text-rose-400 transition"
            title="Sesli Arama (WebRTC)"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStartVideoCall(dummyReceiver)}
            className="p-2 rounded-full hover:bg-neutral-800 hover:text-rose-400 transition"
            title="Görüntülü Arama (WebRTC)"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-full hover:bg-neutral-800 transition ${
              isSearching ? 'text-rose-500' : 'hover:text-white'
            }`}
            title="Mesajlarda Ara"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Güvenlik Kodu"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar in Chat */}
      {isSearching && (
        <div className="p-2 bg-neutral-900 border-b border-neutral-800 flex items-center gap-2 animate-in slide-in-from-top-2">
          <input
            type="text"
            placeholder="Bu sohbette ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500"
            autoFocus
          />
          <button
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}
            className="text-neutral-400 hover:text-white text-xs px-2"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px]">
        {/* E2EE Info Banner */}
        <div className="flex justify-center my-2">
          <div
            onClick={() => setIsSecurityModalOpen(true)}
            className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-[10px] text-neutral-300 shadow cursor-pointer transition"
          >
            <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span>
              Mesajlar ve aramalar <strong>BizBize uçtan uca şifreleme</strong> ile korunmaktadır. Doğrulamak için tıklayın.
            </span>
          </div>
        </div>

        {/* Message Items */}
        {filteredMessages.map((msg) => {
          const isMe = msg.senderId === currentProfile.uid;
          const displayContent = decryptedMessages[msg.id] || msg.content;
          const time = new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-2.5 shadow-md relative transition ${
                  isMe
                    ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-600 text-white rounded-tr-none'
                    : 'bg-neutral-900 border border-neutral-800/80 text-neutral-100 rounded-tl-none'
                }`}
              >
                {/* Quoted Reply Block */}
                {msg.replyTo && (
                  <div
                    className={`mb-1.5 p-1.5 rounded-lg border-l-2 text-[10px] ${
                      isMe
                        ? 'bg-black/20 border-white/80 text-rose-100'
                        : 'bg-neutral-950/60 border-rose-500 text-neutral-300'
                    }`}
                  >
                    <span className="font-semibold block">{msg.replyTo.senderName}</span>
                    <span className="line-clamp-1 opacity-90">{msg.replyTo.content}</span>
                  </div>
                )}

                {/* Media: Image */}
                {msg.type === 'image' && msg.mediaUrl && (
                  <div className="rounded-xl overflow-hidden mb-1.5 border border-white/10">
                    <img
                      src={msg.mediaUrl}
                      alt="Görsel"
                      className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95"
                      onClick={() => window.open(msg.mediaUrl, '_blank')}
                    />
                  </div>
                )}

                {/* Media: Audio / Voice Note */}
                {msg.type === 'audio' && msg.mediaUrl && (
                  <div className="flex items-center gap-2 py-1 pr-2">
                    <button
                      onClick={() => togglePlayAudio(msg.id, msg.mediaUrl!)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow ${
                        isMe ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1 flex flex-col justify-center">
                      {/* Fake audio waveform bars */}
                      <div className="flex items-center gap-0.5 h-4">
                        {[12, 20, 8, 24, 16, 28, 10, 22, 14, 18, 26, 12].map((h, i) => (
                          <span
                            key={i}
                            style={{ height: `${h}px` }}
                            className={`w-1 rounded-full transition-all ${
                              playingAudioId === msg.id
                                ? 'bg-rose-400 animate-pulse'
                                : isMe
                                ? 'bg-white/60'
                                : 'bg-neutral-600'
                            }`}
                          ></span>
                        ))}
                      </div>
                      <span className="text-[9px] opacity-80 mt-0.5">
                        {msg.duration ? `${msg.duration} sn` : 'Sesli Mesaj'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Media: Video */}
                {msg.type === 'video' && msg.mediaUrl && (
                  <div className="rounded-xl overflow-hidden mb-1.5 border border-white/10 bg-black">
                    <video
                      src={msg.mediaUrl}
                      controls
                      playsInline
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                )}

                {/* Media: Document / File */}
                {msg.type === 'file' && (
                  <a
                    href={msg.mediaUrl || '#'}
                    download={msg.fileName || 'dosya'}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2.5 p-2 rounded-xl mb-1.5 border transition ${
                      isMe
                        ? 'bg-black/20 border-white/20 hover:bg-black/30 text-white'
                        : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800/80 text-neutral-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{msg.fileName || msg.content}</div>
                      <div className="text-[10px] opacity-75">
                        {msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : 'Dosya'} • İndir
                      </div>
                    </div>
                  </a>
                )}

                {/* Text Content */}
                {msg.type === 'text' && (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {msg.deleted ? (
                      <span className="italic opacity-60 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Bu mesaj silindi
                      </span>
                    ) : (
                      displayContent
                    )}
                  </p>
                )}

                {/* Meta details footer */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                    isMe ? 'text-rose-100/80' : 'text-neutral-400'
                  }`}
                >
                  {msg.isEncrypted && (
                    <span title="Uçtan Uca Şifreli">
                      <Lock className="w-2.5 h-2.5 text-emerald-300" />
                    </span>
                  )}
                  {msg.edited && <span>(düzenlendi)</span>}
                  <span>{time}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <span title="Okundu">
                          <CheckCheck className="w-3 h-3 text-cyan-200" />
                        </span>
                      ) : msg.status === 'delivered' ? (
                        <span title="İletildi">
                          <CheckCheck className="w-3 h-3 text-white/80" />
                        </span>
                      ) : (
                        <span title="Gönderildi">
                          <Check className="w-3 h-3 text-white/60" />
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Message Quick Actions Hover */}
              <div className="hidden group-hover:flex items-center gap-1.5 mt-0.5 px-1 text-neutral-400 text-[10px]">
                <button
                  onClick={() => setReplyTarget(msg)}
                  className="hover:text-white flex items-center gap-0.5"
                  title="Yanıtla"
                >
                  <CornerUpLeft className="w-3 h-3" /> Yanıtla
                </button>
                {isMe && !msg.deleted && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMessage(msg);
                        setInputText(displayContent);
                      }}
                      className="hover:text-white flex items-center gap-0.5"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3 h-3" /> Düzenle
                    </button>
                    <button
                      onClick={() => deleteMessage(chat.id, msg.id, true)}
                      className="hover:text-rose-400 flex items-center gap-0.5"
                      title="Herkesten Sil"
                    >
                      <Trash2 className="w-3 h-3" /> Sil
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyTarget && (
        <div className="px-3 py-1.5 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 border-l-2 border-rose-500 pl-2">
            <span className="text-[11px] text-rose-400 font-semibold">
              {replyTarget.senderName} kişisine yanıt:
            </span>
            <span className="text-[11px] text-neutral-300 truncate max-w-[200px]">
              {decryptedMessages[replyTarget.id] || replyTarget.content}
            </span>
          </div>
          <button onClick={() => setReplyTarget(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="px-3 py-1.5 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs">
            <Edit2 className="w-3.5 h-3.5" /> Mesajı Düzenliyorsunuz
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      <EmojiPickerPopup
        isOpen={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
        onSelectSticker={async (stkUrl) => {
          sounds.playMessageSent();
          await sendMessage(chat.id, {
            chatId: chat.id,
            senderId: currentProfile.uid,
            senderName: currentProfile.displayName,
            senderPhoto: currentProfile.photoURL,
            content: 'Çıkartma',
            type: 'image',
            mediaUrl: stkUrl,
          });
        }}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Bottom Input Bar */}
      <div className="p-2 bg-neutral-900/95 border-t border-neutral-800/80 flex items-center gap-1.5 z-20">
        {/* Toggle E2EE */}
        <button
          type="button"
          onClick={() => setIsE2EEEnabled(!isE2EEEnabled)}
          className={`p-2 rounded-xl transition ${
            isE2EEEnabled
              ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
          title={isE2EEEnabled ? 'Uçtan Uca Şifreleme Açık' : 'Şifreleme Kapalı'}
        >
          {isE2EEEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setIsEmojiOpen(!isEmojiOpen)}
          className={`p-2 rounded-xl transition ${
            isEmojiOpen ? 'text-rose-500 bg-neutral-800' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-neutral-400 hover:text-white rounded-xl transition"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input / Live Voice Recording view */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-neutral-950 border border-rose-600/50 rounded-2xl px-3 py-2 animate-pulse">
            <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold">
              <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping"></span>
              Ses Kaydediliyor... ({recordingSeconds}s)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="p-1 rounded-full bg-rose-600 text-white"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex-1 flex items-center">
            <input
              type="text"
              placeholder={isE2EEEnabled ? '🔒 Uçtan uca şifreli mesaj yaz...' : 'Mesaj yaz...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-rose-500"
            />
          </form>
        )}

        {/* Send or Voice Record Action */}
        {inputText.trim() ? (
          <button
            onClick={() => handleSend()}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30 transition active:scale-95 flex-shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={isRecording ? () => stopRecording(false) : startRecording}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 flex-shrink-0 ${
              isRecording
                ? 'bg-rose-600 text-white animate-bounce'
                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
            }`}
            title="Sesli Mesaj Kaydet"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Security Verification Modal */}
      <SecurityCodeModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        chatId={chat.id}
        currentUid={currentProfile.uid}
        otherUserUid={otherParticipantUid}
        otherUserName={chat.name || 'Kullanıcı'}
      />

      {/* Chat / Group Details Modal */}
      <ChatDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        chat={chat}
        currentProfile={currentProfile}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onStartAudioCall={onStartAudioCall}
        onStartVideoCall={onStartVideoCall}
        onLeaveChat={onBack}
      />
    </div>
  );
};
