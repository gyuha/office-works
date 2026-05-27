import { AlertTriangleIcon } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal/modal';
import { useUsersStore } from '@/sample/users/store/users-store';
import type { User } from '@/sample/users/types/user';
import useModal from '@/stores/modal-store';

interface OpenUserDeleteDialogOptions {
  onDeleted?: () => void;
}

interface UserDeleteDialogContentProps {
  user: User;
  onConfirm: () => void;
}

function UserDeleteDialogContent({ user, onConfirm }: UserDeleteDialogContentProps) {
  const closeModal = useModal((state) => state.closeModal);
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <Modal.Header>Delete user</Modal.Header>
      <Modal.Content>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">This action cannot be undone.</p>
              <p className="text-sm text-destructive/80">
                {fullName} ({user.email}) will be removed from the sample users list.
              </p>
            </div>
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button type="button" variant="outline" size="lg" onClick={closeModal}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" size="lg" onClick={onConfirm}>
          Delete user
        </Button>
      </Modal.Footer>
    </>
  );
}

export function useUserDeleteDialog() {
  const openModal = useModal((state) => state.openModal);
  const closeModal = useModal((state) => state.closeModal);
  const deleteUser = useUsersStore((state) => state.deleteUser);

  return useCallback(
    (user: User, options?: OpenUserDeleteDialogOptions) => {
      openModal({
        size: 'sm',
        backdropDismiss: true,
        custom: (
          <UserDeleteDialogContent
            user={user}
            onConfirm={() => {
              deleteUser(user.id);
              closeModal();
              toast.success('User deleted.');
              options?.onDeleted?.();
            }}
          />
        ),
      });
    },
    [closeModal, deleteUser, openModal]
  );
}
