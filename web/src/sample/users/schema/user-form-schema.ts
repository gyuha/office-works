import { z } from 'zod';

import { type User, userRoleSchema, userStatusSchema } from '@/sample/users/types/user';

export const userFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .regex(/^[a-z0-9._-]+$/i, 'Use letters, numbers, dots, dashes, or underscores.'),
  email: z.string().email('Enter a valid email address.'),
  phoneNumber: z.string().min(7, 'Phone number is required.'),
  status: userStatusSchema,
  role: userRoleSchema,
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const emptyUserFormValues: UserFormValues = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phoneNumber: '',
  status: 'active',
  role: 'manager',
};

export function userToFormValues(user: User): UserFormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber,
    status: user.status,
    role: user.role,
  };
}
