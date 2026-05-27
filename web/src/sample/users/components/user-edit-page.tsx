import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserDeleteDialog } from '@/sample/users/components/user-delete-dialog';
import { UserForm } from '@/sample/users/components/user-form';
import { UserNotFound } from '@/sample/users/components/user-not-found';
import { type UserFormValues, userToFormValues } from '@/sample/users/schema/user-form-schema';
import { selectUserById, useUsersStore } from '@/sample/users/store/users-store';

interface UserEditPageProps {
  userId: string;
}

export function UserEditPage({ userId }: UserEditPageProps) {
  const navigate = useNavigate();
  const user = useUsersStore(selectUserById(userId));
  const updateUser = useUsersStore((state) => state.updateUser);
  const openDeleteDialog = useUserDeleteDialog();

  if (!user) {
    return <UserNotFound userId={userId} />;
  }

  const handleSubmit = (values: UserFormValues) => {
    const updatedUser = updateUser(user.id, values);

    if (!updatedUser) {
      toast.error('User could not be updated.');
      return;
    }

    toast.success('User updated.');
    void navigate({ to: '/sample/users/$userId', params: { userId: updatedUser.id } });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Edit user</h1>
        <p className="text-sm text-muted-foreground">
          Update {user.firstName} {user.lastName}'s sample account profile.
        </p>
      </header>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Changes are stored in memory and reset on refresh.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            defaultValues={userToFormValues(user)}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
            onDelete={() =>
              openDeleteDialog(user, {
                onDeleted: () => void navigate({ to: '/sample/users' }),
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
