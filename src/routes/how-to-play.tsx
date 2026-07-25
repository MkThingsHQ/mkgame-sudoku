import { createFileRoute } from '@tanstack/react-router';
import { HowToPlayPage } from '@/game/how-to-play-page';

export const Route = createFileRoute('/how-to-play')({
  head: () => ({ meta: [{ title: 'How to play — MimoDoku' }] }),
  component: HowToPlayPage,
});
