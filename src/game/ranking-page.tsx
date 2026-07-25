import { IconTrophy } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { CatFace } from './cat-face';
import { GAME_COPY } from './game-copy';
import { GamePageHeader } from './game-page-header';
import { useGamePreferences } from './game-preferences';
import {
  formatGameTime,
  type GameScore,
  readLevelScores,
} from './game-storage';

export function RankingPage() {
  const { isHydrated, preferences } = useGamePreferences();
  const [scores, setScores] = useState<GameScore[]>([]);
  const copy = GAME_COPY[preferences.language];

  useEffect(() => {
    setScores(readLevelScores());
  }, []);

  return (
    <div
      className="game-app game-inner-page"
      data-hydrated={isHydrated}
      data-testid="ranking-page"
    >
      <main className="game-shell inner-page-shell menu-page-shell">
        <GamePageHeader backLabel={copy.backToGame} title={copy.leaderboard} />
        <p className="menu-page-summary">{copy.localRanking}</p>
        {scores.length === 0 ? (
          <section className="standalone-empty-ranking">
            <CatFace />
            <IconTrophy />
            <p>{copy.noScores}</p>
          </section>
        ) : (
          <ol className="standalone-score-list">
            {scores.slice(0, 20).map((score, index) => (
              <li
                key={`${score.date}-${score.level}-${score.seconds}-${index}`}
              >
                <strong>{index + 1}</strong>
                <CatFace />
                <span>
                  <b>{`${copy.level} ${score.level}`}</b>
                  <small>{score.date}</small>
                </span>
                <time>{formatGameTime(score.seconds)}</time>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
