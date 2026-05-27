import { z } from 'zod';

export const taskStatusSchema = z.enum(['backlog', 'todo', 'in progress', 'done', 'canceled']);

export const taskLabelSchema = z.enum(['bug', 'feature', 'documentation', 'enhancement', 'design']);

export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: taskStatusSchema,
  label: taskLabelSchema,
  priority: taskPrioritySchema,
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskLabel = z.infer<typeof taskLabelSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type Task = z.infer<typeof taskSchema>;
