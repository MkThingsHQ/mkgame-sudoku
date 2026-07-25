import { createFileRoute } from '@tanstack/react-router';
import { LevelSelectPage } from '@/game/level-select-page';

export const Route = createFileRoute('/levels')({
  head: () => ({ meta: [{ title: 'Choose a level — MimoDoku' }] }),
  component: LevelSelectPage,
});
