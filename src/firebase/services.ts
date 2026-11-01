import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';
import { UserProfile, Chat, Message, Story, CallRecord, Friendship } from '../types';

// ================= USERS =================

export async function createOrUpdateUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<UserProfile> {
  const payload: UserProfile = {
    uid: profile.uid,
    displayName: profile.displayName || 'BizBize Kullanıcısı',
    username: profile.username || `kullanici_${profile.uid.slice(0, 6)}`,
    phoneNumber: profile.phoneNumber || '',
    photoURL: profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`,
    bio: profile.bio || 'Merhaba! BizBize ❤️ kullanıyorum.',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    privacySettings: profile.privacySettings || {
      lastSeen: 'everyone',
      photoURL: 'everyone',
      readReceipts: true,
      phoneAudience: 'everyone',
    },
    blockedUsers: profile.blockedUsers || [],
    createdAt: profile.createdAt || new Date().toISOString(),
  };

  if (!auth.currentUser) {
    return payload;
  }
  const path = `users/${profile.uid}`;
  try {
    const userRef = doc(db, 'users', profile.uid);
    const existingSnap = await getDoc(userRef);

    if (!existingSnap.exists()) {
      await setDoc(userRef, payload);
    } else {
      await updateDoc(userRef, {
        displayName: payload.displayName,
        username: payload.username,
        phoneNumber: payload.phoneNumber,
        photoURL: payload.photoURL,
        bio: payload.bio,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        ...(payload.privacySettings ? { privacySettings: payload.privacySettings } : {}),
      });
    }

    return payload;
  } catch (error) {
    console.warn('Firestore user profile write notice (using memory payload):', error);
    return payload;
  }
}

export async function checkUsernameAvailability(username: string, currentUid: string): Promise<boolean> {
  const clean = username.trim().toLowerCase().replace('@', '');
  if (!clean || clean.length < 3) return false;
  try {
    const q = query(collection(db, 'users'), where('username', '==', clean));
    const snap = await getDocs(q);
    if (snap.empty) return true;
    // If only matching document is current user, it's available for them
    return snap.docs.every((d) => d.id === currentUid);
  } catch (error) {
    console.warn('Username check error:', error);
    return true; // fallback
  }
}

export async function deleteUserAccount(uid: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Yalnızca kendi hesabınızı silebilirsiniz.');
  }
  const path = `users/${uid}`;
  try {
    // 1. Delete user document from Firestore
    await deleteDoc(doc(db, 'users', uid));
    // 2. Delete Firebase Auth user account
    await auth.currentUser.delete();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.warn('Could not fetch user profile from Firestore:', error);
    return null;
  }
}

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  if (!auth.currentUser) return () => {};
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      callback(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function setUserOnlineStatus(uid: string, isOnline: boolean) {
  if (!auth.currentUser) return;
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      isOnline,
      lastSeen: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Could not update online status:', error);
  }
}

export async function searchUsers(searchTerm: string, currentUid: string): Promise<UserProfile[]> {
  if (!auth.currentUser) return [];
  const path = 'users';
  try {
    const cleanSearch = searchTerm.trim().toLowerCase().replace('@', '');
    const snap = await getDocs(collection(db, 'users'));
    const results: UserProfile[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile;
      // Strictly ignore current user and any demo profiles
      if (data.uid !== currentUid && !data.uid.startsWith('demo_')) {
        const matchesUsername = data.username?.toLowerCase().includes(cleanSearch);
        const matchesName = data.displayName?.toLowerCase().includes(cleanSearch);
        
        // Privacy check for phone number
        const phoneAudience = data.privacySettings?.phoneAudience || 'everyone';
        let phoneMatches = false;
        let sanitizedPhone = data.phoneNumber;

        if (phoneAudience === 'nobody') {
          // Hidden from search and display
          phoneMatches = false;
          sanitizedPhone = '';
        } else {
          // If everyone, or not nobody, allow phone search
          phoneMatches = Boolean(
            data.phoneNumber &&
            cleanSearch.length > 3 &&
            data.phoneNumber.replace(/\s+/g, '').includes(cleanSearch.replace(/\s+/g, ''))
          );
        }

        if (matchesUsername || matchesName || phoneMatches) {
          results.push({
            ...data,
            phoneNumber: phoneAudience === 'nobody' ? undefined : data.phoneNumber,
          });
        }
      }
    });

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// ================= CHATS =================

export function subscribeToUserChats(uid: string, callback: (chats: Chat[]) => void) {
  if (!auth.currentUser) return () => {};
  const path = 'chats';
  try {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', uid)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const chats: Chat[] = [];
        snapshot.forEach((d) => chats.push({ id: d.id, ...d.data() } as Chat));
        // Sort by updatedAt desc in memory
        chats.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        callback(chats);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function getOrCreateDirectChat(currentUid: string, otherUser: UserProfile): Promise<Chat> {
  const path = 'chats';
  try {
    // Check if a direct chat between these two already exists
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'direct'),
      where('participants', 'array-contains', currentUid)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if ((data.participants as string[])?.includes(otherUser.uid)) {
        return { ...(data as Chat), id: docSnap.id };
      }
    }

    // Otherwise create new direct chat
    const newChatId = [currentUid, otherUser.uid].sort().join('_');
    const newChat: Chat = {
      id: newChatId,
      type: 'direct',
      participants: [currentUid, otherUser.uid],
      name: otherUser.displayName,
      photoURL: otherUser.photoURL,
      lastMessage: 'Sohbet başladı ✨',
      lastMessageTimestamp: new Date().toISOString(),
      lastMessageSenderId: currentUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'chats', newChatId), newChat);
    return newChat;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function createGroupChat(
  creatorUid: string,
  groupName: string,
  participantUids: string[],
  groupPhotoURL?: string,
  description?: string
): Promise<Chat> {
  const path = 'chats';
  try {
    const allParticipants = Array.from(new Set([creatorUid, ...participantUids]));
    const newChatId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newGroup: Chat = {
      id: newChatId,
      type: 'group',
      participants: allParticipants,
      name: groupName,
      photoURL: groupPhotoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`,
      adminIds: [creatorUid],
      description: description || 'BizBize Grubu',
      lastMessage: 'Grup oluşturuldu 🎉',
      lastMessageTimestamp: new Date().toISOString(),
      lastMessageSenderId: creatorUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'chats', newChatId), newGroup);
    return newGroup;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateChat(chatId: string, updates: Partial<Chat>): Promise<void> {
  if (!auth.currentUser) return;
  const path = `chats/${chatId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addGroupMembers(chatId: string, currentParticipants: string[], newUids: string[]): Promise<void> {
  const merged = Array.from(new Set([...currentParticipants, ...newUids]));
  await updateChat(chatId, { participants: merged });
}

export async function removeGroupMember(chatId: string, currentParticipants: string[], uidToRemove: string): Promise<void> {
  const filtered = currentParticipants.filter((p) => p !== uidToRemove);
  await updateChat(chatId, { participants: filtered });
}

// ================= MESSAGES =================

export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
  if (!auth.currentUser) return () => {};
  const path = `chats/${chatId}/messages`;
  try {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((d) => messages.push({ id: d.id, ...d.data() } as Message));
        callback(messages);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function sendMessage(
  chatId: string,
  messageData: Omit<Message, 'id' | 'status' | 'createdAt'>
) {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const fullMessage: Message = {
    ...messageData,
    id: messageId,
    status: 'sent',
    createdAt: new Date().toISOString(),
  };

  if (!auth.currentUser) {
    return fullMessage;
  }

  const path = `chats/${chatId}/messages`;
  try {
    // 1. Write message
    await setDoc(doc(db, 'chats', chatId, 'messages', messageId), fullMessage);

    // 2. Update parent chat lastMessage
    const previewText =
      messageData.type === 'text'
        ? messageData.content
        : messageData.type === 'image'
        ? '📷 Fotoğraf'
        : messageData.type === 'audio'
        ? '🎤 Sesli Mesaj'
        : messageData.type === 'video'
        ? '🎥 Video'
        : '📎 Dosya';

    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: previewText,
      lastMessageTimestamp: fullMessage.createdAt,
      lastMessageSenderId: fullMessage.senderId,
      updatedAt: fullMessage.createdAt,
    });

    return fullMessage;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateMessageStatus(chatId: string, messageId: string, status: Message['status']) {
  if (!auth.currentUser) return;
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { status });
  } catch (error) {
    console.warn('Status update non-critical:', error);
  }
}

export async function deleteMessage(chatId: string, messageId: string, forEveryone: boolean) {
  if (!auth.currentUser) return;
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    if (forEveryone) {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        deleted: true,
        deletedForEveryone: true,
        content: 'Bu mesaj silindi 🚫',
      });
    } else {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        deleted: true,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function editMessage(chatId: string, messageId: string, newContent: string) {
  if (!auth.currentUser) return;
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      content: newContent,
      edited: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ================= STORIES =================

export function subscribeToStories(callback: (stories: Story[]) => void) {
  if (!auth.currentUser) return () => {};
  const path = 'stories';
  try {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const stories: Story[] = [];
        const now = new Date().toISOString();
        snapshot.forEach((d) => {
          const data = { id: d.id, ...d.data() } as Story;
          // Keep stories that are within 24 hours
          if (!data.expiresAt || data.expiresAt > now) {
            stories.push(data);
          }
        });
        callback(stories);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function publishStory(story: Omit<Story, 'id' | 'viewers' | 'expiresAt' | 'createdAt'>) {
  const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const newStory: Story = {
    ...story,
    id: storyId,
    viewers: [],
    createdAt: now.toISOString(),
    expiresAt,
  };

  if (!auth.currentUser) {
    return newStory;
  }

  const path = 'stories';
  try {
    await setDoc(doc(db, 'stories', storyId), newStory);
    return newStory;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markStoryViewed(storyId: string, viewerUid: string) {
  if (!auth.currentUser) return;
  const path = `stories/${storyId}`;
  try {
    await updateDoc(doc(db, 'stories', storyId), {
      viewers: arrayUnion(viewerUid),
    });
  } catch (error) {
    console.warn('markStoryViewed error:', error);
  }
}

// ================= WEBRTC CALLS =================

export function subscribeToIncomingCalls(currentUid: string, callback: (call: CallRecord | null) => void) {
  if (!auth.currentUser) return () => {};
  const path = 'calls';
  try {
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUid),
      where('status', '==', 'ringing')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          callback({ id: docSnap.id, ...docSnap.data() } as CallRecord);
        } else {
          callback(null);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export function subscribeToCall(callId: string, callback: (call: CallRecord | null) => void) {
  if (!auth.currentUser) return () => {};
  const path = `calls/${callId}`;
  return onSnapshot(
    doc(db, 'calls', callId),
    (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as CallRecord) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function initiateCall(
  caller: UserProfile,
  receiver: UserProfile,
  callType: 'audio' | 'video',
  offerSdp?: any
): Promise<CallRecord> {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const callData: CallRecord = {
    id: callId,
    callerId: caller.uid,
    callerName: caller.displayName,
    callerPhoto: caller.photoURL,
    receiverId: receiver.uid,
    receiverName: receiver.displayName,
    receiverPhoto: receiver.photoURL,
    callType,
    status: 'ringing',
    offer: offerSdp ? JSON.stringify(offerSdp) : null,
    createdAt: new Date().toISOString(),
  };

  if (!auth.currentUser) {
    return callData;
  }

  const path = 'calls';
  try {
    await setDoc(doc(db, 'calls', callId), callData);
    return callData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateCallStatus(callId: string, status: CallRecord['status'], answerSdp?: any) {
  if (!auth.currentUser) return;
  const path = `calls/${callId}`;
  try {
    const payload: any = { status };
    if (answerSdp) {
      payload.answer = JSON.stringify(answerSdp);
    }
    if (status === 'ended' || status === 'rejected' || status === 'missed') {
      payload.endedAt = new Date().toISOString();
    }
    await updateDoc(doc(db, 'calls', callId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToCallHistory(currentUid: string, callback: (calls: CallRecord[]) => void) {
  if (!auth.currentUser) return () => {};
  const path = 'calls';
  try {
    const q1 = query(collection(db, 'calls'), where('callerId', '==', currentUid));
    const q2 = query(collection(db, 'calls'), where('receiverId', '==', currentUid));

    let callerCalls: CallRecord[] = [];
    let receiverCalls: CallRecord[] = [];

    const emit = () => {
      const callsMap = new Map<string, CallRecord>();
      callerCalls.forEach((d) => callsMap.set(d.id, d));
      receiverCalls.forEach((d) => callsMap.set(d.id, d));
      const list = Array.from(callsMap.values());
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(list);
    };

    const unsub1 = onSnapshot(
      q1,
      (snap1) => {
        callerCalls = snap1.docs.map((d) => ({ id: d.id, ...d.data() } as CallRecord));
        emit();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );

    const unsub2 = onSnapshot(
      q2,
      (snap2) => {
        receiverCalls = snap2.docs.map((d) => ({ id: d.id, ...d.data() } as CallRecord));
        emit();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );

    return () => {
      unsub1();
      unsub2();
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

// ================= FRIENDSHIPS =================

export async function sendFriendRequest(requesterId: string, recipientId: string) {
  if (!auth.currentUser) return undefined;
  const path = 'friendships';
  try {
    const id = `friend_${[requesterId, recipientId].sort().join('_')}`;
    const friendship: Friendship = {
      id,
      requesterId,
      recipientId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'friendships', id), friendship);
    return friendship;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateFriendshipStatus(friendshipId: string, status: 'accepted' | 'blocked') {
  if (!auth.currentUser) return;
  const path = `friendships/${friendshipId}`;
  try {
    await updateDoc(doc(db, 'friendships', friendshipId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeFriendship(friendshipId: string) {
  if (!auth.currentUser) return;
  const path = `friendships/${friendshipId}`;
  try {
    await deleteDoc(doc(db, 'friendships', friendshipId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToFriendships(uid: string, callback: (friends: Friendship[]) => void) {
  if (!auth.currentUser) return () => {};
  const path = 'friendships';
  try {
    const q1 = query(collection(db, 'friendships'), where('requesterId', '==', uid));
    const q2 = query(collection(db, 'friendships'), where('recipientId', '==', uid));

    let list1: Friendship[] = [];
    let list2: Friendship[] = [];

    const emit = () => {
      const map = new Map<string, Friendship>();
      list1.forEach((d) => map.set(d.id, d));
      list2.forEach((d) => map.set(d.id, d));
      callback(Array.from(map.values()));
    };

    const unsub1 = onSnapshot(
      q1,
      (snap1) => {
        list1 = snap1.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship));
        emit();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );

    const unsub2 = onSnapshot(
      q2,
      (snap2) => {
        list2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship));
        emit();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );

    return () => {
      unsub1();
      unsub2();
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}
