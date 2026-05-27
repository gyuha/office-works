import { Link } from '@tanstack/react-router';
import { SearchXIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UserNotFoundProps {
  userId: string;
}

export function UserNotFound({ userId }: UserNotFoundProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <Card className="max-w-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <SearchXIcon className="size-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">User not found</h1>
            <p className="text-sm text-muted-foreground">
              No sample user exists for ID <span className="font-mono">{userId}</span>.
            </p>
          </div>
          <Button nativeButton={false} render={<Link to="/sample/users" />}>
            Back to users
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
