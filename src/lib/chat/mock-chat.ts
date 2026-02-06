/**
 * Mock chat data — will be replaced with Supabase Realtime.
 */

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  adId: string;
  adTitle: string;
  adImage: string | null;
  adPrice: number | null;
  buyerId: string;
  sellerId: string;
  otherUser: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    phone: string;
    isOnline: boolean;
    lastSeen: string | null;
  };
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

const DEV_USER_ID = "dev-00000000-0000-0000-0000-000000000000";

const now = Date.now();
const min = 60000;
const hour = 3600000;
const day = 86400000;

export const mockConversations: ChatConversation[] = [
  {
    id: "conv-1",
    adId: "rec-2",
    adTitle: "تويوتا كورولا 2022 — 30,000 كم — فابريكا",
    adImage: null,
    adPrice: 420000,
    buyerId: DEV_USER_ID,
    sellerId: "user-1",
    otherUser: {
      id: "user-1",
      displayName: "محمد أحمد",
      avatarUrl: null,
      phone: "01012345678",
      isOnline: true,
      lastSeen: null,
    },
    lastMessage: "أيوا متاحة، تحب تيجي تعاينها؟",
    lastMessageAt: new Date(now - 5 * min).toISOString(),
    unreadCount: 2,
  },
  {
    id: "conv-2",
    adId: "rec-1",
    adTitle: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    adImage: null,
    adPrice: 48000,
    buyerId: DEV_USER_ID,
    sellerId: "user-2",
    otherUser: {
      id: "user-2",
      displayName: "سارة محمود",
      avatarUrl: null,
      phone: "01198765432",
      isOnline: false,
      lastSeen: new Date(now - 2 * hour).toISOString(),
    },
    lastMessage: "تمام، هبعتلك الموقع على واتساب",
    lastMessageAt: new Date(now - 3 * hour).toISOString(),
    unreadCount: 0,
  },
  {
    id: "conv-3",
    adId: "rec-5",
    adTitle: "سلسلة ذهب عيار 21 — 15 جرام — جديدة",
    adImage: null,
    adPrice: 75000,
    buyerId: DEV_USER_ID,
    sellerId: "user-3",
    otherUser: {
      id: "user-3",
      displayName: "أحمد سمير",
      avatarUrl: null,
      phone: "01234567890",
      isOnline: false,
      lastSeen: new Date(now - 1 * day).toISOString(),
    },
    lastMessage: "السعر نهائي يا باشا",
    lastMessageAt: new Date(now - 1 * day).toISOString(),
    unreadCount: 1,
  },
  {
    id: "conv-4",
    adId: "rec-3",
    adTitle: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    adImage: null,
    adPrice: null,
    buyerId: "user-4",
    sellerId: DEV_USER_ID,
    otherUser: {
      id: "user-4",
      displayName: "كريم وليد",
      avatarUrl: null,
      phone: "01555555555",
      isOnline: true,
      lastSeen: null,
    },
    lastMessage: "ممكن نتقابل في التجمع؟",
    lastMessageAt: new Date(now - 30 * min).toISOString(),
    unreadCount: 0,
  },
];

const mockMessagesMap: Record<string, ChatMessage[]> = {
  "conv-1": [
    {
      id: "msg-1-1",
      conversationId: "conv-1",
      senderId: DEV_USER_ID,
      content: "السلام عليكم",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 15 * min).toISOString(),
    },
    {
      id: "msg-1-2",
      conversationId: "conv-1",
      senderId: DEV_USER_ID,
      content: "السيارة لسه متاحة؟",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 14 * min).toISOString(),
    },
    {
      id: "msg-1-3",
      conversationId: "conv-1",
      senderId: "user-1",
      content: "وعليكم السلام",
      imageUrl: null,
      isRead: false,
      createdAt: new Date(now - 6 * min).toISOString(),
    },
    {
      id: "msg-1-4",
      conversationId: "conv-1",
      senderId: "user-1",
      content: "أيوا متاحة، تحب تيجي تعاينها؟",
      imageUrl: null,
      isRead: false,
      createdAt: new Date(now - 5 * min).toISOString(),
    },
  ],
  "conv-2": [
    {
      id: "msg-2-1",
      conversationId: "conv-2",
      senderId: DEV_USER_ID,
      content: "الموبايل فيه أي خدوش؟",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 4 * hour).toISOString(),
    },
    {
      id: "msg-2-2",
      conversationId: "conv-2",
      senderId: "user-2",
      content: "لا والله زي الجديد بالظبط",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 3.5 * hour).toISOString(),
    },
    {
      id: "msg-2-3",
      conversationId: "conv-2",
      senderId: DEV_USER_ID,
      content: "ممكن نتقابل فين؟",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 3.2 * hour).toISOString(),
    },
    {
      id: "msg-2-4",
      conversationId: "conv-2",
      senderId: "user-2",
      content: "تمام، هبعتلك الموقع على واتساب",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 3 * hour).toISOString(),
    },
  ],
  "conv-3": [
    {
      id: "msg-3-1",
      conversationId: "conv-3",
      senderId: DEV_USER_ID,
      content: "ممكن تنزل في السعر شوية؟",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 1.1 * day).toISOString(),
    },
    {
      id: "msg-3-2",
      conversationId: "conv-3",
      senderId: "user-3",
      content: "السعر نهائي يا باشا",
      imageUrl: null,
      isRead: false,
      createdAt: new Date(now - 1 * day).toISOString(),
    },
  ],
  "conv-4": [
    {
      id: "msg-4-1",
      conversationId: "conv-4",
      senderId: "user-4",
      content: "مرحباً، مهتم بالموبايل",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 1 * hour).toISOString(),
    },
    {
      id: "msg-4-2",
      conversationId: "conv-4",
      senderId: DEV_USER_ID,
      content: "أهلاً، الموبايل متاح",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 50 * min).toISOString(),
    },
    {
      id: "msg-4-3",
      conversationId: "conv-4",
      senderId: "user-4",
      content: "ممكن نتقابل في التجمع؟",
      imageUrl: null,
      isRead: true,
      createdAt: new Date(now - 30 * min).toISOString(),
    },
  ],
};

/** Fetch all conversations for current user */
export async function fetchConversations(): Promise<ChatConversation[]> {
  await new Promise((r) => setTimeout(r, 400));
  return [...mockConversations].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() -
      new Date(a.lastMessageAt).getTime(),
  );
}

/** Fetch messages for a conversation */
export async function fetchMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockMessagesMap[conversationId] || [];
}

/** Fetch a single conversation by ID */
export async function fetchConversation(
  conversationId: string,
): Promise<ChatConversation | null> {
  await new Promise((r) => setTimeout(r, 200));
  return mockConversations.find((c) => c.id === conversationId) || null;
}

/** Find or create a conversation for an ad */
export async function findOrCreateConversation(
  adId: string,
): Promise<ChatConversation | null> {
  await new Promise((r) => setTimeout(r, 200));
  // Check if conversation already exists for this ad
  const existing = mockConversations.find((c) => c.adId === adId);
  if (existing) return existing;
  // In real app, would create via Supabase. For now, redirect to first conversation
  return mockConversations[0] || null;
}

/** Get total unread count across all conversations */
export function getTotalUnreadCount(): number {
  return mockConversations.reduce((sum, c) => sum + c.unreadCount, 0);
}
