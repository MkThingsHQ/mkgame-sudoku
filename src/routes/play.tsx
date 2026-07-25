import { createFileRoute } from '@tanstack/react-router';
import { GameplayPage } from '@/game/gameplay-page';

type PlaySearch = {
  level?: number;
  mode?: 'daily';
};

export const Route = createFileRoute('/play')({
  validateSearch: (search: Record<string, unknown>): PlaySearch => ({
    level:
      typeof search.level === 'number'
        ? search.level
        : typeof search.level === 'string'
          ? Number(search.level)
          : undefined,
    mode: search.mode === 'daily' ? 'daily' : undefined,
  }),
  component: GamePlayRoute,
});

function GamePlayRoute() {
  const search = Route.useSearch();
  return (
    <GameplayPage
      initialLevelId={search.level}
      initialMode={search.mode ?? 'levels'}
    />
  );
}
