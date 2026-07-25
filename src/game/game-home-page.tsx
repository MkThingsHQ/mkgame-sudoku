import {
  IconCalendar,
  IconChevronRight,
  IconFish,
  IconHelpCircle,
  IconLayoutGrid,
  IconSettings,
  IconTrophy,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { GAME_COPY } from './game-copy';
import { useGamePreferences } from './game-preferences';

export function GameHomePage() {
  const { isHydrated, preferences } = useGamePreferences();
  const copy = GAME_COPY[preferences.language];

  return (
    <div
      className="game-app game-home"
      data-hydrated={isHydrated}
      data-reduced-motion={preferences.reducedMotion}
      data-testid="game-home"
    >
      <main className="game-shell home-shell">
        <nav aria-label="Game home actions" className="home-topbar">
          <Link className="home-corner-link" to="/how-to-play">
            <IconHelpCircle />
            <span>{copy.help}</span>
          </Link>
          <Link className="home-corner-link" to="/settings">
            <IconSettings />
            <span>{copy.homeSettings}</span>
          </Link>
        </nav>

        <section className="game-logo" aria-label="MimoDoku">
          <div className="logo-cat-wrap">
            <span aria-hidden="true" className="logo-spark one">
              ✦
            </span>
            <span aria-hidden="true" className="logo-cat">
              <img
                alt=""
                className="logo-cat-state happy"
                data-cat-logo="mimodoku-head-v2-happy"
                data-cat-version="head-v2"
                draggable={false}
                src="/images/mimodoku-cat-happy.png"
              />
              <img
                alt=""
                className="logo-cat-state wink"
                data-cat-logo="mimodoku-head-v2-wink"
                data-cat-version="head-v2"
                draggable={false}
                src="/images/mimodoku-cat-wink.png"
              />
            </span>
            <span aria-hidden="true" className="logo-spark two">
              ✦
            </span>
          </div>
          <div className="wordmark-stage">
            <span
              aria-hidden="true"
              className="wordmark-territory-cluster cluster-left"
            >
              <i className="wordmark-territory-tile aqua">×</i>
              <i className="wordmark-territory-tile pink" />
              <i className="wordmark-territory-tile green" />
            </span>
            <h1
              aria-label="MimoDoku"
              className="mimodoku-wordmark"
              data-wordmark-style="puzzle-arcade"
            >
              <span aria-hidden="true" className="wordmark-letter">
                <span className="wordmark-glyph">M</span>
              </span>
              <span aria-hidden="true" className="wordmark-letter">
                <span className="wordmark-glyph">i</span>
              </span>
              <span aria-hidden="true" className="wordmark-letter">
                <span className="wordmark-glyph">m</span>
              </span>
              <span
                aria-hidden="true"
                className="wordmark-letter wordmark-o wordmark-fish-o"
              >
                <span className="wordmark-glyph">o</span>
                <span className="wordmark-fish-school">
                  <IconFish className="wordmark-fish" />
                  <IconFish className="wordmark-fish" />
                  <IconFish className="wordmark-fish" />
                </span>
              </span>
              <span aria-hidden="true" className="wordmark-letter">
                <span className="wordmark-glyph">D</span>
              </span>
              <span
                aria-hidden="true"
                className="wordmark-letter wordmark-o wordmark-cat-o"
              >
                <span className="wordmark-glyph">o</span>
                <i className="wordmark-cat-feature">
                  <i className="wordmark-cat-eye left" />
                  <i className="wordmark-cat-eye right" />
                  <i className="wordmark-cat-nose" />
                </i>
              </span>
              <span aria-hidden="true" className="wordmark-letter">
                <span className="wordmark-glyph">k</span>
              </span>
              <span aria-hidden="true" className="wordmark-letter">
                <span className="wordmark-glyph">u</span>
              </span>
            </h1>
            <span
              aria-hidden="true"
              className="wordmark-territory-cluster cluster-right"
            >
              <i className="wordmark-territory-tile yellow" />
              <i className="wordmark-territory-tile violet">×</i>
            </span>
          </div>
          <span>{copy.homeSubtitle}</span>
        </section>

        <nav aria-label={copy.gameModes} className="home-mode-list">
          <Link className="home-mode-button levels" to="/levels">
            <span className="home-mode-icon">
              <IconLayoutGrid />
            </span>
            <span className="home-mode-copy">
              <strong>{copy.levels}</strong>
              <small>{copy.totalLevels}</small>
            </span>
            <IconChevronRight className="home-mode-arrow" />
          </Link>
          <Link
            className="home-mode-button daily"
            search={{ mode: 'daily' }}
            to="/play"
          >
            <span className="home-mode-icon">
              <IconCalendar />
            </span>
            <span className="home-mode-copy">
              <strong>{copy.dailyPuzzle}</strong>
              <small>{copy.openDaily}</small>
            </span>
            <IconChevronRight className="home-mode-arrow" />
          </Link>
          <Link className="home-mode-button ranking" to="/ranking">
            <span className="home-mode-icon">
              <IconTrophy />
            </span>
            <span className="home-mode-copy">
              <strong>{copy.leaderboard}</strong>
              <small>{copy.openRanking}</small>
            </span>
            <IconChevronRight className="home-mode-arrow" />
          </Link>
        </nav>

        <div aria-hidden="true" className="home-fish-trail">
          <span>🐟</span>
          <span>🐟</span>
          <span>🐟</span>
          <span>🐟</span>
          <span>🐟</span>
          <span>🐟</span>
          <span>🐟</span>
          <span>🐟</span>
          <span>🐟</span>
        </div>
      </main>
    </div>
  );
}
