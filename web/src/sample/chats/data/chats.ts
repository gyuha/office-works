import type {
  SampleChatConversation,
  SampleChatMessage,
  SampleChatParticipant,
} from '@/sample/chats/types/chat';
import { Faker, en, ko } from '@faker-js/faker';

const CHAT_SEED = 42;
const PARTICIPANT_COUNT = 8;
const BASE_TIMESTAMP = Date.UTC(2026, 4, 10, 9, 30, 0);

const roles = [
  'Customer Success Manager',
  'Product Designer',
  'Support Lead',
  'Operations Analyst',
  'Account Executive',
  'Platform Engineer',
] as const;

const topics = [
  'Enterprise onboarding checklist',
  'Billing workspace migration',
  'Incident follow-up notes',
  'Quarterly success review',
  'Data export request',
  'Feature preview feedback',
  'Security questionnaire',
  'Support escalation handoff',
] as const;

const messageTemplates = [
  'Can you review the latest notes and confirm the next owner?',
  'I updated the workspace timeline with the pending blockers.',
  'The customer asked for a concise status update before end of day.',
  'We should attach the audit log and the rollout checklist to this thread.',
  'I will coordinate with the team and circle back with the final answer.',
  'The current plan looks safe if we keep the migration window unchanged.',
] as const;

function createFaker(): Faker {
  const faker = new Faker({ locale: [ko, en] });
  faker.seed(CHAT_SEED);

  return faker;
}

function createInitials(firstName: string, lastName: string): string {
  return `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();
}

function createParticipant(faker: Faker, index: number): SampleChatParticipant {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = `${lastName}${firstName}`;

  return {
    id: `participant-${index + 1}`,
    name,
    role: roles[index % roles.length],
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    avatarUrl: faker.image.avatar(),
    initials: createInitials(firstName, lastName),
    status: faker.helpers.arrayElement(['online', 'away', 'offline'] as const),
  };
}

function createMessages(
  faker: Faker,
  conversationId: string,
  participantId: string,
  count: number
): SampleChatMessage[] {
  return Array.from({ length: count }, (_, index) => {
    const fromParticipant = index % 2 === 0;
    const minutesAgo = (count - index) * faker.number.int({ min: 8, max: 34 });

    return {
      id: `${conversationId}-message-${index + 1}`,
      conversationId,
      authorId: fromParticipant ? participantId : 'sample-admin',
      body: faker.helpers.arrayElement(messageTemplates),
      createdAt: new Date(BASE_TIMESTAMP - minutesAgo * 60_000).toISOString(),
      read: index < count - 1 || !fromParticipant,
    };
  });
}

export function generateChats(): SampleChatConversation[] {
  const faker = createFaker();

  return Array.from({ length: PARTICIPANT_COUNT }, (_, index) => {
    const participant = createParticipant(faker, index);
    const conversationId = `conversation-${index + 1}`;

    return {
      id: conversationId,
      participant,
      topic: topics[index % topics.length],
      channel: faker.helpers.arrayElement(['sales', 'support', 'product', 'operations'] as const),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
      messages: createMessages(
        faker,
        conversationId,
        participant.id,
        faker.number.int({ min: 4, max: 7 })
      ),
    };
  });
}

export const chats: SampleChatConversation[] = generateChats();
