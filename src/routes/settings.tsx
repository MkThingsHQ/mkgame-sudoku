import { createFileRoute } from '@tanstack/react-router';
import { GameSettingsPage } from '@/game/game-settings-page';

export const Route = createFileRoute('/settings')({
  head: () => ({ meta: [{ title: 'Game settings — MimoDoku' }] }),
  component: GameSettingsPage,
});
