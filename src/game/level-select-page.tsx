import { IconCheck, IconLock } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CatFace } from './cat-face';
import { GAME_COPY } from './game-copy';
import { GamePageHeader } from './game-page-header';
import { useGamePreferences } from './game-preferences';
import { readGameProgress } from './game-storage';
import { GAME_LEVELS } from './levels';

export function LevelSelectPage() {
  const { isHydrated, preferences } = useGamePreferences();
  const [unlockedLevelIndex, setUnlockedLevelIndex] = useState(0);
  const copy = GAME_COPY[preferences.language];

  useEffect(() => {
    setUnlockedLevelIndex(
      readGameProgress(GAME_LEVELS.length).unlockedLevelIndex
    );
  }, []);

  return (
    <div
      className="game-app game-inner-page"
      data-hydrated={isHydrated}
      data-testid="level-select"
    >
      <main className="game-shell inner-page-shell menu-page-shell">
        <GamePageHeader backLabel={copy.backToGame} title={copy.chooseLevel} />
        <section
          aria-label={copy.chooseLevel}
          className="standalone-level-grid"
        >
          {GAME_LEVELS.map((level, index) => {
            const locked = index > unlockedLevelIndex;
            const completed = index < unlockedLevelIndex;
            const current = index === unlockedLevelIndex;
            const cardClassName = `standalone-level-card${
              completed ? ' is-completed' : ''
            }${current ? ' is-current' : ''}${locked ? ' is-locked' : ''}`;
            const content = (
              <>
                {completed ? (
                  <span className="level-state-label">
                    {copy.completedLabel}
                  </span>
                ) : null}
                {current ? (
                  <span className="level-state-label">{copy.currentLevel}</span>
                ) : null}
                <strong>{level.id}</strong>
                {locked ? (
                  <IconLock />
                ) : completed ? (
                  <span className="level-complete-seal">
                    <IconCheck />
                  </span>
                ) : (
                  <CatFace />
                )}
                <small>
                  {level.solution.length} × {level.solution.length}
                </small>
              </>
            );
            return locked ? (
              <button
                className={cardClassName}
                disabled
                key={level.id}
                type="button"
              >
                {content}
              </button>
            ) : (
              <Link
                aria-label={`${copy.level} ${level.id}`}
                className={cardClassName}
                key={level.id}
                search={{ level: level.id }}
                to="/play"
              >
                {content}
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
