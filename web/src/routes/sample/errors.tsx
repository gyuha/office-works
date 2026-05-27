import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample/errors')({
  component: Outlet,
});
