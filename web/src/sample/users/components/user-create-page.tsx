import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserForm } from '@/sample/users/components/user-form';
import { type UserFormValues, emptyUserFormValues } from '@/sample/users/schema/user-form-schema';
import { useUsersStore } from '@/sample/users/store/users-store';

export function UserCreatePage() {
  const navigate = useNavigate();
  const createUser = useUsersStore((state) => state.createUser);

  const handleSubmit = (values: UserFormValues) => {
    const user = createUser(values);
    toast.success('User created.');
    void navigate({ to: '/sample/users/$userId', params: { userId: user.id } });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Create user</h1>
        <p className="text-sm text-muted-foreground">
          Add a mock account to the sample admin users table.
        </p>
      </header>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Set the identity, role, and account status for the user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            defaultValues={emptyUserFormValues}
            submitLabel="Create user"
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
