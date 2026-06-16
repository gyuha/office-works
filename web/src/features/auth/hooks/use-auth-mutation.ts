import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { mockLogin } from '../lib/mock-auth-api';
import { useAuthStore } from '../store/auth.store';
import type { LoginInput } from '../types/auth';

export function useLoginMutation() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (data: LoginInput) => mockLogin(data),
    onSuccess: (response) => {
      setUser(response.user);
      navigate({ to: '/' });
    },
  });
}
