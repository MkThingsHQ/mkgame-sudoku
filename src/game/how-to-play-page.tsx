import { GAME_COPY } from './game-copy';
import { GameGuideCards } from './game-guide';
import { GamePageHeader } from './game-page-header';
import { useGamePreferences } from './game-preferences';

export function HowToPlayPage() {
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
          backBehavior="history"
          backLabel={copy.backToGame}
          title={copy.howToPlay}
        />

        <GameGuideCards language={preferences.language} />
      </main>
    </div>
  );
}
