import { createFileRoute } from '@tanstack/react-router';
import { GameSettingsPage } from '@/game/game-settings-page';
import { validateGameReturnSearch } from '@/game/game-return-navigation';

export const Route = createFileRoute('/settings')({
  validateSearch: validateGameReturnSearch,
  head: () => ({ meta: [{ title: 'Game settings — MimoDoku' }] }),
  component: GameSettingsRoute,
});

function GameSettingsRoute() {
  const search = Route.useSearch();
  const returnToPlay =
    search.returnTo === 'play'
      ? { level: search.level, mode: search.mode }
      : undefined;

  return <GameSettingsPage returnToPlay={returnToPlay} />;
}
