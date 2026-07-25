import { createFileRoute } from '@tanstack/react-router';
import { GameHomePage } from '@/game/game-home-page';

export const Route = createFileRoute('/')({
  component: GameHomePage,
});
