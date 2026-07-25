import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
export type GameLanguage = 'en' | 'zh';

export type GamePreferences = {
  autoMark: boolean;
  haptics: boolean;
  language: GameLanguage;
  music: boolean;
  reducedMotion: boolean;
  sound: boolean;
};

type GamePreferencesContextValue = {
  isHydrated: boolean;
  preferences: GamePreferences;
  updatePreference: <Key extends keyof GamePreferences>(
    key: Key,
    value: GamePreferences[Key]
  ) => void;
};

export const GAME_PREFERENCES_STORAGE_KEY = 'game-preferences-v1';

function createDefaultPreferences(): GamePreferences {
  return {
    autoMark: true,
    haptics: true,
    language:
      typeof navigator !== 'undefined' &&
      navigator.language.toLowerCase().startsWith('zh')
        ? 'zh'
        : 'en',
    music: true,
    reducedMotion: false,
    sound: true,
  };
}

const GamePreferencesContext =
  createContext<GamePreferencesContextValue | null>(null);

export function GamePreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(createDefaultPreferences);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawPreferences = window.localStorage.getItem(
        GAME_PREFERENCES_STORAGE_KEY
      );
      if (rawPreferences) {
        const parsed: unknown = JSON.parse(rawPreferences);
        if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
        const stored = parsed as Partial<GamePreferences>;
        setPreferences((current) => ({
          autoMark:
            typeof stored.autoMark === 'boolean'
              ? stored.autoMark
              : current.autoMark,
          haptics:
            typeof stored.haptics === 'boolean'
              ? stored.haptics
              : current.haptics,
          language:
            stored.language === 'zh' || stored.language === 'en'
              ? stored.language
              : current.language,
          music:
            typeof stored.music === 'boolean'
              ? stored.music
              : typeof stored.sound === 'boolean'
                ? stored.sound
                : current.music,
          reducedMotion:
            typeof stored.reducedMotion === 'boolean'
              ? stored.reducedMotion
              : current.reducedMotion,
          sound:
            typeof stored.sound === 'boolean' ? stored.sound : current.sound,
        }));
      }
    } catch {
      try {
        window.localStorage.removeItem(GAME_PREFERENCES_STORAGE_KEY);
      } catch {
        // Defaults keep the game usable when browser storage is unavailable.
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(
        GAME_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences)
      );
    } catch {
      // Keep the in-memory preferences when storage is unavailable.
    }
  }, [isHydrated, preferences]);

  useEffect(() => {
    document.documentElement.lang =
      preferences.language === 'zh' ? 'zh-CN' : 'en';
  }, [preferences.language]);

  const value = useMemo<GamePreferencesContextValue>(
    () => ({
      isHydrated,
      preferences,
      updatePreference: (key, value) => {
        setPreferences((current) => ({ ...current, [key]: value }));
      },
    }),
    [isHydrated, preferences]
  );

  return (
    <GamePreferencesContext.Provider value={value}>
      {children}
    </GamePreferencesContext.Provider>
  );
}

export function useGamePreferences() {
  const context = useContext(GamePreferencesContext);
  if (!context) {
    throw new Error(
      'useGamePreferences must be used inside GamePreferencesProvider'
    );
  }
  return context;
}
