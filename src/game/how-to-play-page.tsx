import { GAME_COPY } from './game-copy';
import { GameGuideCards } from './game-guide';
import { GamePageHeader } from './game-page-header';
import { useGamePreferences } from './game-preferences';
import type { GameReturnTarget } from './game-return-navigation';

type HowToPlayPageProps = {
  returnToPlay?: GameReturnTarget;
};

export function HowToPlayPage({ returnToPlay }: HowToPlayPageProps) {
  const { isHydrated, preferences } = useGamePreferences();
  const copy = GAME_COPY[preferences.language];

  return (
    <div
      className="game-app game-inner-page"
      data-hydrated={isHydrated}
      data-reduced-motion={preferences.reducedMotion}
      data-testid="how-to-play"
    >
      <main className="game-shell inner-page-shell">
        <GamePageHeader
          backLabel={copy.backToGame}
          returnToPlay={returnToPlay}
          title={copy.howToPlay}
        />

        <GameGuideCards language={preferences.language} />
      </main>
    </div>
  );
}
