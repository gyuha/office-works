import { TasksPage } from '@/sample/tasks/components/tasks-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/tasks')({
  component: TasksPage,
});
