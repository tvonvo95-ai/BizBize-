export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'connected' | 'ended' | 'rejected' | 'missed';
export type PrivacyAudience = 'everyone' | 'friends' | 'nobody';

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  phoneNumber?: string;
  photoURL?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: string;
  publicKey?: string;
  createdAt: string;
  privacySettings?: {
    lastSeen: PrivacyAudience;
    photoURL: PrivacyAudience;
    readReceipts: boolean;
    phoneAudience?: PrivacyAudience;
  };
  blockedUsers?: string[];
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  name?: string;
  photoURL?: string;
  adminIds?: string[];
  description?: string;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  lastMessageSenderId?: string;
  unreadCount?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  isMuted?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  status: MessageStatus;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  isEncrypted?: boolean;
  iv?: string;
  deleted?: boolean;
  deletedForEveryone?: boolean;
  edited?: boolean;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text?: string;
  mediaUrl?: string;
  bgColor?: string;
  viewers: string[];
  expiresAt: string;
  createdAt: string;
}

export interface CallRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  callType: CallType;
  status: CallStatus;
  duration?: number;
  createdAt: string;
  endedAt?: string;
  offer?: any;
  answer?: any;
}

export interface Friendship {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
}
