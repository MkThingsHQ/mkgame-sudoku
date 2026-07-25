export type GameMode = 'daily' | 'levels';

export type CellState = 'auto-marked' | 'cat' | 'empty' | 'marked';

export type GameSnapshot = {
  cells: CellState[][];
  hearts: number;
};

export type GameScore = {
  date: string;
  level: number;
  mode: GameMode;
  seconds: number;
};

export type GameProgress = {
  activeLevelIndex: number;
  unlockedLevelIndex: number;
};

export type ActiveGameSession = {
  cells: CellState[][];
  date: string;
  elapsedSeconds: number;
  hearts: number;
  hintsRemaining?: number;
  history: GameSnapshot[];
  levelId: number;
  mode: GameMode;
  version: 1;
};

type ActiveGameSessionExpectation = {
  date: string;
  levelId: number;
  mode: GameMode;
  size: number;
};

export const ACTIVE_GAME_SESSION_KEY = 'game-active-session-v1';
export const GAME_PROGRESS_STORAGE_KEY = 'game-progress-v1';
export const GAME_SCORE_STORAGE_KEY = 'game-scores-v1';
export const GAME_TUTORIAL_STORAGE_KEY = 'game-tutorial-seen-v1';

const CELL_STATES = new Set<CellState>([
  'auto-marked',
  'cat',
  'empty',
  'marked',
]);

function isIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isCellState(value: unknown): value is CellState {
  return typeof value === 'string' && CELL_STATES.has(value as CellState);
}

function isBoard(value: unknown, size: number): value is CellState[][] {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every(
      (row) =>
        Array.isArray(row) && row.length === size && row.every(isCellState)
    )
  );
}

function isSnapshot(value: unknown, size: number): value is GameSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<GameSnapshot>;
  return (
    isBoard(snapshot.cells, size) && isIntegerBetween(snapshot.hearts, 0, 3)
  );
}

function isGameScore(value: unknown): value is GameScore {
  if (!value || typeof value !== 'object') return false;
  const score = value as Partial<GameScore>;
  return (
    typeof score.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(score.date) &&
    isIntegerBetween(score.level, 1, Number.MAX_SAFE_INTEGER) &&
    (score.mode === 'daily' || score.mode === 'levels') &&
    isIntegerBetween(score.seconds, 0, Number.MAX_SAFE_INTEGER)
  );
}

function removeLocalStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Browser storage is an optional persistence adapter.
  }
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function readGameProgress(levelCount: number): GameProgress {
  const maximumIndex = Math.max(0, levelCount - 1);
  try {
    const stored = window.localStorage.getItem(GAME_PROGRESS_STORAGE_KEY);
    if (!stored) return { activeLevelIndex: 0, unlockedLevelIndex: 0 };
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
    const progress = parsed as Partial<GameProgress>;
    if (
      !isIntegerBetween(progress.activeLevelIndex, 0, maximumIndex) ||
      !isIntegerBetween(progress.unlockedLevelIndex, 0, maximumIndex)
    ) {
      throw new Error('invalid');
    }
    const unlockedLevelIndex = progress.unlockedLevelIndex;
    return {
      activeLevelIndex: Math.min(progress.activeLevelIndex, unlockedLevelIndex),
      unlockedLevelIndex,
    };
  } catch {
    removeLocalStorageItem(GAME_PROGRESS_STORAGE_KEY);
    return { activeLevelIndex: 0, unlockedLevelIndex: 0 };
  }
}

export function writeGameProgress(progress: GameProgress) {
  try {
    window.localStorage.setItem(
      GAME_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress)
    );
  } catch {
    // The in-memory game remains playable when storage is unavailable.
  }
}

export function readLevelScores(): GameScore[] {
  try {
    const stored = window.localStorage.getItem(GAME_SCORE_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('invalid');
    const scores = parsed
      .filter(isGameScore)
      .filter((score) => score.mode === 'levels')
      .sort((left, right) => left.seconds - right.seconds)
      .slice(0, 20);
    if (scores.length !== parsed.length) writeLevelScores(scores);
    return scores;
  } catch {
    removeLocalStorageItem(GAME_SCORE_STORAGE_KEY);
    return [];
  }
}

export function writeLevelScores(scores: GameScore[]) {
  try {
    window.localStorage.setItem(
      GAME_SCORE_STORAGE_KEY,
      JSON.stringify(scores.filter(isGameScore))
    );
  } catch {
    // The in-memory ranking remains usable when storage is unavailable.
  }
}

export function hasSeenGameTutorial() {
  try {
    return window.localStorage.getItem(GAME_TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markGameTutorialSeen() {
  try {
    window.localStorage.setItem(GAME_TUTORIAL_STORAGE_KEY, 'true');
  } catch {
    // The tutorial can still be dismissed for the current page lifetime.
  }
}

export function readActiveGameSession({
  date,
  levelId,
  mode,
  size,
}: ActiveGameSessionExpectation): ActiveGameSession | null {
  try {
    const stored = window.sessionStorage.getItem(ACTIVE_GAME_SESSION_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
    const session = parsed as Partial<ActiveGameSession>;
    const isValid =
      session.version === 1 &&
      session.mode === mode &&
      session.levelId === levelId &&
      (mode !== 'daily' || session.date === date) &&
      typeof session.date === 'string' &&
      isBoard(session.cells, size) &&
      isIntegerBetween(session.hearts, 0, 3) &&
      (session.hintsRemaining === undefined ||
        isIntegerBetween(session.hintsRemaining, 0, 1)) &&
      isIntegerBetween(session.elapsedSeconds, 0, Number.MAX_SAFE_INTEGER) &&
      Array.isArray(session.history) &&
      session.history.length <= 256 &&
      session.history.every((snapshot) => isSnapshot(snapshot, size));
    if (isValid) return session as ActiveGameSession;
  } catch {
    // Invalid or unavailable session storage should not block the game.
  }
  clearActiveGameSession();
  return null;
}

export function writeActiveGameSession(session: ActiveGameSession) {
  try {
    window.sessionStorage.setItem(
      ACTIVE_GAME_SESSION_KEY,
      JSON.stringify(session)
    );
  } catch {
    // The in-memory game remains playable when storage is unavailable.
  }
}

export function clearActiveGameSession() {
  try {
    window.sessionStorage.removeItem(ACTIVE_GAME_SESSION_KEY);
  } catch {
    // The in-memory game can still reset or exit normally.
  }
}

export function formatGameTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}
