import { createFileRoute } from '@tanstack/react-router';
import { validateGameReturnSearch } from '@/game/game-return-navigation';
import { HowToPlayPage } from '@/game/how-to-play-page';

export const Route = createFileRoute('/how-to-play')({
  validateSearch: validateGameReturnSearch,
  head: () => ({ meta: [{ title: 'How to play — MimoDoku' }] }),
  component: HowToPlayRoute,
});

function HowToPlayRoute() {
  const search = Route.useSearch();
  const returnToPlay =
    search.returnTo === 'play'
      ? { level: search.level, mode: search.mode }
      : undefined;

  return <HowToPlayPage returnToPlay={returnToPlay} />;
}
