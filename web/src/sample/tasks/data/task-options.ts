import type { TaskLabel, TaskPriority, TaskStatus } from '@/sample/tasks/types/task';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Circle,
  CircleOff,
  HelpCircle,
  Timer,
} from 'lucide-react';

export interface TaskStatusOption {
  value: TaskStatus;
  label: string;
  icon: typeof Circle;
}

export interface TaskLabelOption {
  value: TaskLabel;
  label: string;
}

export interface TaskPriorityOption {
  value: TaskPriority;
  label: string;
  icon: typeof ArrowDown;
}

export const taskStatuses: TaskStatusOption[] = [
  { value: 'backlog', label: 'Backlog', icon: HelpCircle },
  { value: 'todo', label: 'Todo', icon: Circle },
  { value: 'in progress', label: 'In Progress', icon: Timer },
  { value: 'done', label: 'Done', icon: CheckCircle2 },
  { value: 'canceled', label: 'Canceled', icon: CircleOff },
];

export const taskLabels: TaskLabelOption[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'design', label: 'Design' },
];

export const taskPriorities: TaskPriorityOption[] = [
  { value: 'low', label: 'Low', icon: ArrowDown },
  { value: 'medium', label: 'Medium', icon: ArrowRight },
  { value: 'high', label: 'High', icon: ArrowUp },
];
