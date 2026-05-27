export type SampleChatStatus = 'online' | 'away' | 'offline';

export interface SampleChatParticipant {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarUrl: string;
  initials: string;
  status: SampleChatStatus;
}

export interface SampleChatMessage {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface SampleChatConversation {
  id: string;
  participant: SampleChatParticipant;
  topic: string;
  channel: 'sales' | 'support' | 'product' | 'operations';
  priority: 'low' | 'medium' | 'high';
  messages: SampleChatMessage[];
}
