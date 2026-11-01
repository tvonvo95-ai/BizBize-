import { Chat, Message, Story, UserProfile } from '../types';

export const INITIAL_DEMO_STORIES: Story[] = [
  {
    id: 'story_demo_1',
    userId: 'demo_mehmet_02',
    userName: 'Mehmet Demir',
    userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    text: 'Yeni BizBize ❤️ güncellemesi harika görünüyor! 🚀',
    bgColor: 'from-rose-600 to-pink-600',
    viewers: ['demo_zeynep_03', 'demo_burak_04'],
    expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'story_demo_2',
    userId: 'demo_zeynep_03',
    userName: 'Zeynep Kaya',
    userPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    text: 'İstanbul Boğazı\'nda gün batımı 🌅☕',
    mediaUrl: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=600&auto=format&fit=crop&q=80',
    viewers: ['demo_ayse_01', 'demo_mehmet_02'],
    expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'story_demo_3',
    userId: 'demo_burak_04',
    userName: 'Burak Çelik',
    userPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    text: 'Hafta sonu doğa yürüyüşü hazır mı? 🌲🏕️',
    bgColor: 'from-emerald-600 to-teal-600',
    viewers: ['demo_ayse_01'],
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

export function getDemoChatsForUser(myUid: string): Chat[] {
  return [
    {
      id: 'demo_chat_mehmet',
      type: 'direct',
      participants: [myUid, 'demo_mehmet_02'],
      name: 'Mehmet Demir',
      photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Harika! Hafta sonu kahve içelim mi? ☕',
      lastMessageTimestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      lastMessageSenderId: 'demo_mehmet_02',
      unreadCount: { [myUid]: 1 },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo_chat_zeynep',
      type: 'direct',
      participants: [myUid, 'demo_zeynep_03'],
      name: 'Zeynep Kaya',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Fotoğrafları ve detayları gönderdim 📸',
      lastMessageTimestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      lastMessageSenderId: 'demo_zeynep_03',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo_chat_group_family',
      type: 'group',
      participants: [myUid, 'demo_mehmet_02', 'demo_zeynep_03', 'demo_burak_04'],
      name: 'BizBize Dostlar ❤️',
      photoURL: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=150&auto=format&fit=crop&q=80',
      adminIds: ['demo_ayse_01'],
      description: 'BizBize iletişim ve sohbet grubu',
      lastMessage: 'Burak: Akşam 20:00\'de online arama yapalım!',
      lastMessageTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastMessageSenderId: 'demo_burak_04',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function getDemoMessagesForChat(chatId: string, currentUid: string): Message[] {
  const baseTime = Date.now() - 3600000;
  if (chatId === 'demo_chat_mehmet') {
    return [
      {
        id: 'msg_dm_1',
        chatId,
        senderId: 'demo_mehmet_02',
        senderName: 'Mehmet Demir',
        content: 'Selam! BizBize ❤️ arayüzü gerçekten çok akıcı olmuş.',
        type: 'text',
        status: 'read',
        isEncrypted: true,
        createdAt: new Date(baseTime).toISOString(),
      },
      {
        id: 'msg_dm_2',
        chatId,
        senderId: currentUid,
        senderName: 'Ben',
        content: 'Evet, uçtan uca 256-bit AES şifreleme ve WebRTC sesli/görüntülü görüşme de aktif!',
        type: 'text',
        status: 'read',
        isEncrypted: true,
        createdAt: new Date(baseTime + 600000).toISOString(),
      },
      {
        id: 'msg_dm_3',
        chatId,
        senderId: 'demo_mehmet_02',
        senderName: 'Mehmet Demir',
        content: 'Harika! Hafta sonu kahve içelim mi? ☕',
        type: 'text',
        status: 'delivered',
        isEncrypted: true,
        createdAt: new Date(baseTime + 1800000).toISOString(),
      },
    ];
  } else if (chatId === 'demo_chat_zeynep') {
    return [
      {
        id: 'msg_zy_1',
        chatId,
        senderId: 'demo_zeynep_03',
        senderName: 'Zeynep Kaya',
        content: 'Merhaba, hafta sonu etkinliğinin afişini hazırladım:',
        type: 'text',
        status: 'read',
        isEncrypted: true,
        createdAt: new Date(baseTime).toISOString(),
      },
      {
        id: 'msg_zy_2',
        chatId,
        senderId: 'demo_zeynep_03',
        senderName: 'Zeynep Kaya',
        content: 'Etkinlik Görseli',
        type: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
        status: 'read',
        isEncrypted: false,
        createdAt: new Date(baseTime + 300000).toISOString(),
      },
      {
        id: 'msg_zy_3',
        chatId,
        senderId: 'demo_zeynep_03',
        senderName: 'Zeynep Kaya',
        content: 'Fotoğrafları ve detayları gönderdim 📸',
        type: 'text',
        status: 'read',
        isEncrypted: true,
        createdAt: new Date(baseTime + 600000).toISOString(),
      },
    ];
  }

  return [
    {
      id: 'msg_grp_1',
      chatId,
      senderId: 'demo_burak_04',
      senderName: 'Burak Çelik',
      content: 'Herkese selamlar! Akşam 20:00\'de online sesli arama yapalım mı?',
      type: 'text',
      status: 'read',
      createdAt: new Date(baseTime).toISOString(),
    },
  ];
}
