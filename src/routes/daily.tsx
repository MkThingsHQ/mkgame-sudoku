import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/daily')({
  beforeLoad: () => {
    throw redirect({ search: { mode: 'daily' }, to: '/play' });
  },
});
