import { create } from 'zustand';

import { users as seededUsers } from '@/sample/users/data/users';
import type { UserFormValues } from '@/sample/users/schema/user-form-schema';
import type { User } from '@/sample/users/types/user';

interface UsersState {
  users: User[];
  createUser: (values: UserFormValues) => User;
  updateUser: (id: string, values: UserFormValues) => User | undefined;
  deleteUser: (id: string) => void;
  resetUsers: () => void;
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `user-${Date.now().toString(36)}`;
}

function cloneSeedUsers(): User[] {
  return seededUsers.map((user) => ({ ...user }));
}

export const useUsersStore = create<UsersState>((set) => ({
  users: cloneSeedUsers(),
  createUser: (values) => {
    const now = new Date();
    const user: User = {
      id: createId(),
      ...values,
      username: values.username.toLowerCase(),
      email: values.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ users: [user, ...state.users] }));

    return user;
  },
  updateUser: (id, values) => {
    let updatedUser: User | undefined;

    set((state) => ({
      users: state.users.map((user) => {
        if (user.id !== id) {
          return user;
        }

        updatedUser = {
          ...user,
          ...values,
          username: values.username.toLowerCase(),
          email: values.email.toLowerCase(),
          updatedAt: new Date(),
        };

        return updatedUser;
      }),
    }));

    return updatedUser;
  },
  deleteUser: (id) => {
    set((state) => ({ users: state.users.filter((user) => user.id !== id) }));
  },
  resetUsers: () => {
    set({ users: cloneSeedUsers() });
  },
}));

export function selectUserById(id: string): (state: UsersState) => User | undefined {
  return (state) => state.users.find((user) => user.id === id);
}
