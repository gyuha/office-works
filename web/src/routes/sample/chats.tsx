import { ChatsPage } from '@/sample/chats/components/chats-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/chats')({
  component: ChatsPage,
});
