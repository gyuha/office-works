import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { chats } from '@/sample/chats/data/chats';
import type {
  SampleChatConversation,
  SampleChatMessage,
  SampleChatStatus,
} from '@/sample/chats/types/chat';
import { sampleBrandUser } from '@/sample/lib/branding';
import type { TFunction } from 'i18next';
import {
  MessageCircle,
  MessagesSquare,
  Paperclip,
  Search,
  SendHorizontal,
  Smile,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const channelLabelKeys: Record<SampleChatConversation['channel'], string> = {
  sales: 'chats.channel.sales',
  support: 'chats.channel.support',
  product: 'chats.channel.product',
  operations: 'chats.channel.operations',
};

const priorityMeta: Record<
  SampleChatConversation['priority'],
  { labelKey: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  low: { labelKey: 'chats.priority.low', variant: 'outline' },
  medium: { labelKey: 'chats.priority.medium', variant: 'secondary' },
  high: { labelKey: 'chats.priority.high', variant: 'default' },
};

const statusClasses: Record<SampleChatStatus, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-muted-foreground',
};

const timeFormatter = new Intl.DateTimeFormat('en', {
  hour: 'numeric',
  minute: '2-digit',
});

export function ChatsPage() {
  const { t } = useTranslation('sample');
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<SampleChatConversation[]>(() => chats);
  const [selectedConversationId, setSelectedConversationId] = useState(conversations[0]?.id ?? '');
  const [draftMessage, setDraftMessage] = useState('');

  const filteredChats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const searchableText = [
        conversation.participant.name,
        conversation.participant.email,
        conversation.participant.role,
        conversation.topic,
        t(channelLabelKeys[conversation.channel]),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [conversations, query, t]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId) ??
      filteredChats[0] ??
      conversations[0],
    [conversations, filteredChats, selectedConversationId]
  );

  const handleSendMessage = () => {
    const body = draftMessage.trim();
    if (body.length === 0 || !selectedConversation) {
      return;
    }

    const targetId = selectedConversation.id;
    const newMessage: SampleChatMessage = {
      id: `${targetId}-message-${Date.now()}`,
      conversationId: targetId,
      authorId: 'sample-admin',
      body,
      createdAt: new Date().toISOString(),
      read: true,
    };

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === targetId
          ? { ...conversation, messages: [...conversation.messages, newMessage] }
          : conversation
      )
    );
    setDraftMessage('');
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <ChatsHeader
        conversationCount={conversations.length}
        unreadCount={getUnreadCount(conversations)}
        t={t}
      />

      <section className="grid min-h-[680px] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessagesSquare className="size-4 text-primary" aria-hidden />
              {t('chats.conversations')}
            </CardTitle>
            <div className="relative">
              <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={t('chats.search')}
                className="pl-8"
                aria-label={t('chats.searchLabel')}
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[590px] overflow-y-auto p-0">
            {filteredChats.length > 0 ? (
              <div className="divide-y">
                {filteredChats.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    selected={conversation.id === selectedConversation.id}
                    onSelect={() => setSelectedConversationId(conversation.id)}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <ChatsEmptyState t={t} />
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 overflow-hidden p-0">
          <div className="flex min-h-0 flex-1 flex-col">
            <ConversationHeader conversation={selectedConversation} t={t} />
            <MessageList conversation={selectedConversation} />
            <MessageComposer
              value={draftMessage}
              onChange={setDraftMessage}
              onSubmit={handleSendMessage}
              t={t}
            />
          </div>
        </Card>
      </section>
    </main>
  );
}

function ChatsHeader({
  conversationCount,
  unreadCount,
  t,
}: { conversationCount: number; unreadCount: number; t: TFunction<'sample'> }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <MessageCircle className="size-4" aria-hidden />
          <span>{t('chats.eyebrow')}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('chats.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('chats.description')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <MetricCard label={t('chats.conversations')} value={conversationCount.toString()} />
        <MetricCard label={t('chats.unread')} value={unreadCount.toString()} />
      </div>
    </header>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="font-semibold text-2xl">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function ConversationListItem({
  conversation,
  selected,
  onSelect,
  t,
}: {
  conversation: SampleChatConversation;
  selected: boolean;
  onSelect: () => void;
  t: TFunction<'sample'>;
}) {
  const lastMessage = conversation.messages.at(-1);
  const unreadCount = conversation.messages.filter((message) => !message.read).length;

  return (
    <button
      type="button"
      className={cn(
        'flex w-full gap-3 p-4 text-left transition-colors hover:bg-muted/60',
        selected ? 'bg-muted' : 'bg-card'
      )}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <ParticipantAvatar conversation={conversation} />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-sm">{conversation.participant.name}</span>
          {lastMessage ? (
            <span className="shrink-0 text-muted-foreground text-xs">
              {formatMessageTime(lastMessage.createdAt)}
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-2">
          <Badge variant="outline">{t(channelLabelKeys[conversation.channel])}</Badge>
          {unreadCount > 0 ? <Badge>{t('chats.newMessages', { count: unreadCount })}</Badge> : null}
        </span>
        <span className="block truncate text-muted-foreground text-xs">{conversation.topic}</span>
        {lastMessage ? (
          <span className="block truncate text-muted-foreground text-xs">{lastMessage.body}</span>
        ) : null}
      </span>
    </button>
  );
}

function ParticipantAvatar({ conversation }: { conversation: SampleChatConversation }) {
  return (
    <span className="relative shrink-0">
      <Avatar className="size-10 border">
        <AvatarImage src={conversation.participant.avatarUrl} alt="" />
        <AvatarFallback>{conversation.participant.initials}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          'absolute right-0 bottom-0 size-3 rounded-full border-2 border-background',
          statusClasses[conversation.participant.status]
        )}
        aria-label={conversation.participant.status}
      />
    </span>
  );
}

function ConversationHeader({
  conversation,
  t,
}: { conversation: SampleChatConversation; t: TFunction<'sample'> }) {
  const priority = priorityMeta[conversation.priority];

  return (
    <header className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <ParticipantAvatar conversation={conversation} />
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{conversation.participant.name}</h2>
          <p className="truncate text-muted-foreground text-sm">{conversation.participant.role}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{t(channelLabelKeys[conversation.channel])}</Badge>
        <Badge variant={priority.variant}>
          {t('chats.priorityLabel', { priority: t(priority.labelKey) })}
        </Badge>
      </div>
    </header>
  );
}

function MessageList({ conversation }: { conversation: SampleChatConversation }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [conversation.id, conversation.messages.length]);

  return (
    <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4">
      {conversation.messages.map((message) => (
        <ChatBubble key={message.id} message={message} conversation={conversation} />
      ))}
    </div>
  );
}

function ChatBubble({
  message,
  conversation,
}: { message: SampleChatMessage; conversation: SampleChatConversation }) {
  const fromAdmin = message.authorId === 'sample-admin';
  const authorName = fromAdmin ? sampleBrandUser.name : conversation.participant.name;

  return (
    <div className={cn('flex gap-3', fromAdmin ? 'justify-end' : 'justify-start')}>
      {!fromAdmin ? <ParticipantAvatar conversation={conversation} /> : null}
      <div
        className={cn('max-w-[78%] space-y-1', fromAdmin ? 'items-end text-right' : 'items-start')}
      >
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>{authorName}</span>
          <span>{formatMessageTime(message.createdAt)}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
            fromAdmin
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md border bg-card text-card-foreground'
          )}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

function MessageComposer({
  value,
  onChange,
  onSubmit,
  t,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  t: TFunction<'sample'>;
}) {
  const disabled = value.trim().length === 0;

  return (
    <form
      className="border-t bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
        <Button type="button" variant="ghost" size="icon" aria-label={t('chats.attachFile')}>
          <Paperclip className="size-4" aria-hidden />
        </Button>
        <Input
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={t('chats.writeReply')}
          className="border-0 shadow-none focus-visible:ring-0"
          aria-label={t('chats.writeReply')}
        />
        <Button type="button" variant="ghost" size="icon" aria-label={t('chats.addReaction')}>
          <Smile className="size-4" aria-hidden />
        </Button>
        <Button type="submit" size="icon" aria-label={t('chats.sendMessage')} disabled={disabled}>
          <SendHorizontal className="size-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}

function ChatsEmptyState({ t }: { t: TFunction<'sample'> }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-2 p-8 text-center">
      <MessagesSquare className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="font-semibold">{t('chats.emptyTitle')}</h2>
      <p className="text-muted-foreground text-sm">{t('chats.emptyDescription')}</p>
    </div>
  );
}

function getUnreadCount(conversations: SampleChatConversation[]): number {
  return conversations.reduce(
    (total, conversation) =>
      total + conversation.messages.filter((message) => !message.read).length,
    0
  );
}

function formatMessageTime(value: string): string {
  return timeFormatter.format(new Date(value));
}
