import { useSearch } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TeamsLogin } from './teams-login';

export function LoginScreen() {
  const { error } = useSearch({ from: '/login' });
  const [open, setOpen] = useState(error === 'not_member');

  return (
    <>
      <TeamsLogin />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>로그인할 수 없습니다</DialogTitle>
            <DialogDescription>
              등록된 구성원만 로그인할 수 있습니다. 계정 등록은 관리자에게 문의하세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button />}>확인</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
