import {
  IconDeviceMobile,
  IconLanguage,
  IconMusic,
  IconSparkles,
  IconVolume,
  IconWand,
} from '@tabler/icons-react';
import { GAME_COPY } from './game-copy';
import { GamePageHeader } from './game-page-header';
import { type GamePreferences, useGamePreferences } from './game-preferences';

type BooleanPreference = Exclude<keyof GamePreferences, 'language'>;

const SETTING_ROWS: Array<{
  description:
    | 'autoMarkDescription'
    | 'hapticsDescription'
    | 'musicDescription'
    | 'reducedMotionDescription'
    | 'soundDescription';
  icon: typeof IconVolume;
  key: BooleanPreference;
  label: 'autoMark' | 'haptics' | 'music' | 'reducedMotion' | 'sound';
}> = [
  {
    description: 'musicDescription',
    icon: IconMusic,
    key: 'music',
    label: 'music',
  },
  {
    description: 'soundDescription',
    icon: IconVolume,
    key: 'sound',
    label: 'sound',
  },
  {
    description: 'hapticsDescription',
    icon: IconDeviceMobile,
    key: 'haptics',
    label: 'haptics',
  },
  {
    description: 'autoMarkDescription',
    icon: IconWand,
    key: 'autoMark',
    label: 'autoMark',
  },
  {
    description: 'reducedMotionDescription',
    icon: IconSparkles,
    key: 'reducedMotion',
    label: 'reducedMotion',
  },
];

export function GameSettingsPage() {
  const { isHydrated, preferences } = useGamePreferences();
  const copy = GAME_COPY[preferences.language];

  return (
    <div
      className="game-app game-inner-page"
      data-hydrated={isHydrated}
      data-reduced-motion={preferences.reducedMotion}
      data-testid="game-settings"
    >
      <main className="game-shell inner-page-shell">
        <GamePageHeader
          backBehavior="history"
          backLabel={copy.backToGame}
          title={copy.settings}
        />
        <GameSettingsControls />
      </main>
    </div>
  );
}

export function GameSettingsControls() {
  const { preferences, updatePreference } = useGamePreferences();
  const copy = GAME_COPY[preferences.language];

  return (
    <>
      <section aria-labelledby="language-heading" className="settings-section">
        <div className="settings-section-title">
          <IconLanguage />
          <h2 id="language-heading">{copy.language}</h2>
        </div>
        <fieldset
          className="language-picker"
          aria-labelledby="language-heading"
        >
          <button
            aria-pressed={preferences.language === 'en'}
            onClick={() => updatePreference('language', 'en')}
            type="button"
          >
            <span>EN</span>
            <strong>English</strong>
          </button>
          <button
            aria-pressed={preferences.language === 'zh'}
            onClick={() => updatePreference('language', 'zh')}
            type="button"
          >
            <span>中</span>
            <strong>中文</strong>
          </button>
        </fieldset>
      </section>

      <section
        aria-labelledby="preferences-heading"
        className="settings-section"
      >
        <div className="settings-section-title">
          <IconSparkles />
          <h2 id="preferences-heading">{copy.preferences}</h2>
        </div>
        <div className="settings-list">
          {SETTING_ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <button
                aria-pressed={preferences[row.key]}
                className="setting-row"
                key={row.key}
                onClick={() => updatePreference(row.key, !preferences[row.key])}
                type="button"
              >
                <span className="setting-icon">
                  <Icon />
                </span>
                <span className="setting-copy">
                  <strong>{copy[row.label]}</strong>
                  <small>{copy[row.description]}</small>
                </span>
                <span className={preferences[row.key] ? 'toggle on' : 'toggle'}>
                  <span />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
