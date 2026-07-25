import {
  IconArrowBackUp,
  IconArrowLeft,
  IconBulb,
  IconClock,
  IconDoorExit,
  IconHandClick,
  IconQuestionMark,
  IconRefresh,
  IconSettings,
  IconX,
} from '@tabler/icons-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { triggerHapticFeedback } from '@/lib/haptics';
import { CatFace } from './cat-face';
import { GAME_COPY } from './game-copy';
import { TutorialVisual } from './game-guide';
import { useGamePreferences } from './game-preferences';
import {
  clearActiveGameSession,
  type CellState,
  formatGameTime,
  type GameSnapshot,
  type GameMode,
  type GameScore,
  getLocalDateKey,
  hasSeenGameTutorial,
  markGameTutorialSeen,
  readActiveGameSession,
  readGameProgress,
  readLevelScores,
  writeActiveGameSession,
  writeGameProgress,
  writeLevelScores,
} from './game-storage';
import { GAME_LEVELS, getDailyLevelIndex, REGION_COLORS } from './levels';

type ToolMode = 'cat' | 'mark';
const HINTS_PER_GAME = 1;
type BoardMotionKind =
  | 'erase'
  | 'hint'
  | 'mark'
  | 'mistake'
  | 'place'
  | 'reset'
  | 'undo';

type BoardMotion = {
  cellKey?: string;
  fishIndex?: number;
  id: number;
  kind: BoardMotionKind;
  markOrder: Record<string, number>;
};

function createEmptyBoard(size: number): CellState[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'empty' as const)
  );
}

function cloneBoard(cells: CellState[][]): CellState[][] {
  return cells.map((row) => [...row]);
}

function applyCat(
  cells: CellState[][],
  row: number,
  column: number,
  regions: number[][]
): CellState[][] {
  const catRegion = regions[row]?.[column];

  return cells.map((currentRow, rowIndex) =>
    currentRow.map((cell, columnIndex) => {
      if (rowIndex === row && columnIndex === column) return 'cat';
      if (cell === 'cat') return cell;

      const sharesRow = rowIndex === row;
      const sharesColumn = columnIndex === column;
      const sharesRegion = regions[rowIndex]?.[columnIndex] === catRegion;
      const touches =
        Math.abs(rowIndex - row) <= 1 && Math.abs(columnIndex - column) <= 1;

      return sharesRow || sharesColumn || sharesRegion || touches
        ? 'auto-marked'
        : cell;
    })
  );
}

function getNewMarkOrder(
  before: CellState[][],
  after: CellState[][],
  catRow: number,
  catColumn: number
): Record<string, number> {
  return before
    .flatMap((row, rowIndex) =>
      row.flatMap((cell, columnIndex) =>
        cell !== 'auto-marked' &&
        after[rowIndex]?.[columnIndex] === 'auto-marked'
          ? [
              {
                column: columnIndex,
                distance: Math.max(
                  Math.abs(rowIndex - catRow),
                  Math.abs(columnIndex - catColumn)
                ),
                row: rowIndex,
              },
            ]
          : []
      )
    )
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.row - right.row ||
        left.column - right.column
    )
    .reduce<Record<string, number>>((order, cell, index) => {
      order[`${cell.row}-${cell.column}`] = index;
      return order;
    }, {});
}

type GameplayPageProps = {
  initialLevelId?: number;
  initialMode?: GameMode;
};

export function GameplayPage({
  initialLevelId = 1,
  initialMode = 'levels',
}: GameplayPageProps) {
  const navigate = useNavigate();
  const { isHydrated: preferencesHydrated, preferences } = useGamePreferences();
  const copy = GAME_COPY[preferences.language];
  const [today, setToday] = useState<string | null>(null);
  const dailyDate = today ?? '1970-01-01';
  const dailyLevelIndex = getDailyLevelIndex(dailyDate);
  const normalizedInitialLevelId =
    Number.isFinite(initialLevelId) && initialLevelId >= 1
      ? Math.trunc(initialLevelId)
      : 1;
  const requestedLevelIndex = Math.min(
    normalizedInitialLevelId - 1,
    GAME_LEVELS.length - 1
  );
  const initialLevelIndex =
    initialMode === 'daily' ? dailyLevelIndex : requestedLevelIndex;
  const [activeLevelIndex, setActiveLevelIndex] = useState(initialLevelIndex);
  const [unlockedLevelIndex, setUnlockedLevelIndex] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>(initialMode);
  const [cells, setCells] = useState<CellState[][]>(() =>
    createEmptyBoard(GAME_LEVELS[initialLevelIndex]?.solution.length ?? 5)
  );
  const [hearts, setHearts] = useState(3);
  const [hintsRemaining, setHintsRemaining] = useState(HINTS_PER_GAME);
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>('mark');
  const [announcement, setAnnouncement] = useState<string>(copy.doubleTap);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [boardMotion, setBoardMotion] = useState<BoardMotion>({
    id: 0,
    kind: 'reset',
    markOrder: {},
  });
  const clickTimers = useRef<Map<string, number>>(new Map());
  const hasRecordedScore = useRef(false);
  const motionSequence = useRef(0);

  const level = GAME_LEVELS[activeLevelIndex] ?? GAME_LEVELS[0];
  const size = level?.solution.length ?? 5;

  const catCount = useMemo(
    () => cells.flat().filter((cell) => cell === 'cat').length,
    [cells]
  );
  const isComplete = catCount === size;
  const tutorialSteps = [
    {
      body: copy.guideColorBody,
      title: copy.guideColorTitle,
    },
    {
      body: copy.guideColumnBody,
      title: copy.guideColumnTitle,
    },
    {
      body: copy.guideTouchBody,
      title: copy.guideTouchTitle,
    },
    {
      body: copy.guideActionBody,
      title: copy.guideActionTitle,
    },
    {
      body: copy.guideLivesBody,
      title: copy.guideLivesTitle,
    },
  ];
  const tutorialContent = tutorialSteps[tutorialStep] ?? tutorialSteps[0];
  const lastTutorialStep = tutorialSteps.length - 1;

  useEffect(() => {
    setToday(getLocalDateKey());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setAnnouncement(copy.doubleTap);
  }, [copy.doubleTap]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    setShowTutorial(!hasSeenGameTutorial());
  }, [preferencesHydrated]);

  useEffect(() => {
    if (!today) return;
    const progress = readGameProgress(GAME_LEVELS.length);
    const requestedLevelIsUnavailable =
      initialMode === 'levels' &&
      (normalizedInitialLevelId > GAME_LEVELS.length ||
        requestedLevelIndex > progress.unlockedLevelIndex);

    if (requestedLevelIsUnavailable) {
      void navigate({ replace: true, to: '/levels' });
      return;
    }

    const activeLevel =
      initialMode === 'daily' ? dailyLevelIndex : requestedLevelIndex;
    const nextLevel = GAME_LEVELS[activeLevel] ?? GAME_LEVELS[0];
    const nextSize = nextLevel?.solution.length ?? 5;
    const session = readActiveGameSession({
      date: today,
      levelId: nextLevel?.id ?? 1,
      mode: initialMode,
      size: nextSize,
    });

    setUnlockedLevelIndex(progress.unlockedLevelIndex);
    setActiveLevelIndex(activeLevel);
    setGameMode(initialMode);
    if (session) {
      setCells(session.cells);
      setHearts(session.hearts);
      setHintsRemaining(session.hintsRemaining ?? HINTS_PER_GAME);
      setHistory(session.history);
      const navigation = window.performance
        .getEntriesByType('navigation')
        .at(0) as PerformanceNavigationTiming | undefined;
      setElapsedSeconds(
        navigation?.type === 'reload' ? 0 : session.elapsedSeconds
      );
    } else {
      setCells(createEmptyBoard(nextSize));
      setHearts(3);
      setHintsRemaining(HINTS_PER_GAME);
      setHistory([]);
      setElapsedSeconds(0);
    }
    setIsSessionReady(true);
  }, [
    dailyLevelIndex,
    initialMode,
    navigate,
    normalizedInitialLevelId,
    requestedLevelIndex,
    today,
  ]);

  useEffect(() => {
    if (!isSessionReady || !today) return;
    if (isComplete || hearts === 0) {
      clearActiveGameSession();
      return;
    }
    writeActiveGameSession({
      cells,
      date: today,
      elapsedSeconds,
      hearts,
      hintsRemaining,
      history,
      levelId: level.id,
      mode: gameMode,
      version: 1,
    });
  }, [
    cells,
    elapsedSeconds,
    gameMode,
    hearts,
    hintsRemaining,
    history,
    isComplete,
    isSessionReady,
    level.id,
    today,
  ]);

  useEffect(() => {
    if (
      !isSessionReady ||
      isComplete ||
      hearts === 0 ||
      showExitConfirmation ||
      showResetConfirmation
    ) {
      return;
    }
    const timer = window.setInterval(
      () => setElapsedSeconds((current) => current + 1),
      1000
    );
    return () => window.clearInterval(timer);
  }, [
    hearts,
    isComplete,
    isSessionReady,
    showExitConfirmation,
    showResetConfirmation,
  ]);

  useEffect(() => {
    if (!isComplete && hearts > 0) {
      setShowResult(false);
      return;
    }

    const delay = preferences.reducedMotion ? 0 : isComplete ? 900 : 560;
    const timer = window.setTimeout(() => setShowResult(true), delay);
    return () => window.clearTimeout(timer);
  }, [hearts, isComplete, preferences.reducedMotion]);

  useEffect(() => {
    if (!isSessionReady || !isComplete) return;
    if (gameMode === 'daily') return;

    if (!hasRecordedScore.current) {
      hasRecordedScore.current = true;
      const score: GameScore = {
        date: dailyDate,
        level: level.id,
        mode: gameMode,
        seconds: elapsedSeconds,
      };
      const nextScores = [...readLevelScores(), score]
        .sort((left, right) => left.seconds - right.seconds)
        .slice(0, 20);
      writeLevelScores(nextScores);
    }

    const nextUnlocked = Math.min(
      Math.max(unlockedLevelIndex, activeLevelIndex + 1),
      GAME_LEVELS.length - 1
    );
    setUnlockedLevelIndex(nextUnlocked);
    writeGameProgress({
      activeLevelIndex,
      unlockedLevelIndex: nextUnlocked,
    });
  }, [
    activeLevelIndex,
    elapsedSeconds,
    gameMode,
    isComplete,
    isSessionReady,
    level.id,
    dailyDate,
    unlockedLevelIndex,
  ]);

  useEffect(() => {
    return () => {
      for (const timer of clickTimers.current.values()) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  function saveSnapshot() {
    setHistory((current) => [...current, { cells: cloneBoard(cells), hearts }]);
  }

  function triggerBoardMotion(
    motion: Omit<BoardMotion, 'id' | 'markOrder'> & {
      markOrder?: Record<string, number>;
    }
  ) {
    motionSequence.current += 1;
    setBoardMotion({
      id: motionSequence.current,
      markOrder: {},
      ...motion,
    });
  }

  function playFeedback(kind: 'complete' | 'hint' | 'mistake' | 'move') {
    if (preferences.haptics) {
      const vibration =
        kind === 'mistake'
          ? [45, 35, 45]
          : kind === 'complete'
            ? [20, 35, 20, 35, 55]
            : kind === 'hint'
              ? [12, 22, 18]
              : 18;
      triggerHapticFeedback(vibration);
    }

    if (kind === 'complete' || !preferences.sound) return;

    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const notes =
      kind === 'mistake'
        ? [190, 145]
        : kind === 'hint'
          ? [620, 840]
          : [520, 650];
    const noteLength = 0.09;

    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * (noteLength * 0.75);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === 'mistake' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + noteLength);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + noteLength);
    });

    window.setTimeout(
      () => void context.close(),
      Math.ceil((notes.length * noteLength + 0.12) * 1000)
    );
  }

  function finishTutorial() {
    markGameTutorialSeen();
    setShowTutorial(false);
    setTutorialStep(0);
  }

  function resetLevel() {
    setCells(createEmptyBoard(size));
    setHearts(3);
    setHistory([]);
    setElapsedSeconds(0);
    hasRecordedScore.current = false;
    setShowResult(false);
    triggerBoardMotion({ kind: 'reset' });
    setAnnouncement(copy.doubleTap);
    clearActiveGameSession();
  }

  function openGameSettings() {
    void navigate({
      search: {
        level: gameMode === 'levels' ? level.id : undefined,
        mode: gameMode === 'daily' ? 'daily' : undefined,
        returnTo: 'play',
      },
      to: '/settings',
    });
  }

  function confirmReset() {
    setShowResetConfirmation(false);
    resetLevel();
  }

  function exitGame() {
    setShowExitConfirmation(false);
    clearActiveGameSession();
    if (gameMode === 'daily') {
      void navigate({ to: '/' });
      return;
    }
    void navigate({ to: '/levels' });
  }

  function requestExit() {
    const hasActiveProgress = history.length > 0 && !isComplete && hearts > 0;

    if (hasActiveProgress) {
      setShowExitConfirmation(true);
      return;
    }

    exitGame();
  }

  function markCell(row: number, column: number) {
    if (isComplete || hearts === 0 || cells[row]?.[column] === 'cat') return;
    saveSnapshot();
    const wasMarked = cells[row]?.[column] === 'marked';
    const nextCells = cells.map((currentRow, rowIndex) =>
      currentRow.map((cell, columnIndex) => {
        if (rowIndex !== row || columnIndex !== column) return cell;
        return cell === 'marked' ? 'empty' : 'marked';
      })
    );
    setCells(nextCells);
    triggerBoardMotion({
      cellKey: `${row}-${column}`,
      kind: wasMarked ? 'erase' : 'mark',
      markOrder: wasMarked ? {} : { [`${row}-${column}`]: 0 },
    });
    playFeedback('move');
  }

  function placeCat(row: number, column: number, isHint = false) {
    if (isComplete || hearts === 0 || cells[row]?.[column] === 'cat') return;
    saveSnapshot();

    if (level.solution[row] !== column) {
      const nextHearts = Math.max(0, hearts - 1);
      setHearts(nextHearts);
      triggerBoardMotion({
        cellKey: `${row}-${column}`,
        fishIndex: nextHearts,
        kind: 'mistake',
      });
      setAnnouncement(copy.invalid);
      playFeedback('mistake');
      return;
    }

    const nextCells = preferences.autoMark
      ? applyCat(cells, row, column, level.regions)
      : cells.map((currentRow, rowIndex) =>
          currentRow.map((cell, columnIndex) =>
            rowIndex === row && columnIndex === column ? 'cat' : cell
          )
        );
    const nextCatCount = nextCells
      .flat()
      .filter((cell) => cell === 'cat').length;
    setCells(nextCells);
    triggerBoardMotion({
      cellKey: `${row}-${column}`,
      kind: isHint ? 'hint' : 'place',
      markOrder: preferences.autoMark
        ? getNewMarkOrder(cells, nextCells, row, column)
        : {},
    });
    setAnnouncement(isHint ? copy.hintUsed : copy.catPlaced);
    playFeedback(nextCatCount === size ? 'complete' : isHint ? 'hint' : 'move');
  }

  function scheduleCellAction(row: number, column: number) {
    if (toolMode === 'cat') {
      placeCat(row, column);
      return;
    }

    const key = `${row}-${column}`;
    const existingTimer = clickTimers.current.get(key);
    if (existingTimer) window.clearTimeout(existingTimer);

    const timer = window.setTimeout(() => {
      markCell(row, column);
      clickTimers.current.delete(key);
    }, 220);
    clickTimers.current.set(key, timer);
  }

  function handleDoubleClick(row: number, column: number) {
    const key = `${row}-${column}`;
    const timer = clickTimers.current.get(key);
    if (timer) window.clearTimeout(timer);
    clickTimers.current.delete(key);
    placeCat(row, column);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setCells(cloneBoard(previous.cells));
    setHearts(previous.hearts);
    setHistory((current) => current.slice(0, -1));
    setShowResult(false);
    triggerBoardMotion({ kind: 'undo' });
    setAnnouncement(copy.undo);
    playFeedback('move');
  }

  function showHint() {
    if (hintsRemaining <= 0) return;
    const row = level.solution.findIndex(
      (column, rowIndex) => cells[rowIndex]?.[column] !== 'cat'
    );
    const column = level.solution[row];
    if (row < 0 || column === undefined) return;
    setHintsRemaining((current) => Math.max(0, current - 1));
    placeCat(row, column, true);
  }

  function continueGame() {
    if (gameMode === 'daily') {
      setCells(createEmptyBoard(size));
      setHearts(3);
      setHintsRemaining(HINTS_PER_GAME);
      setHistory([]);
      setElapsedSeconds(0);
      hasRecordedScore.current = false;
      setShowResult(false);
      triggerBoardMotion({ kind: 'reset' });
      setAnnouncement(copy.doubleTap);
      clearActiveGameSession();
      return;
    }

    if (activeLevelIndex < GAME_LEVELS.length - 1) {
      const nextIndex = activeLevelIndex + 1;
      setUnlockedLevelIndex((current) => Math.max(current, nextIndex));
      setActiveLevelIndex(nextIndex);
      setCells(createEmptyBoard(GAME_LEVELS[nextIndex]?.solution.length ?? 5));
      setHearts(3);
      setHintsRemaining(HINTS_PER_GAME);
      setHistory([]);
      setElapsedSeconds(0);
      hasRecordedScore.current = false;
      setShowResult(false);
      triggerBoardMotion({ kind: 'reset' });
      setAnnouncement(copy.doubleTap);
      clearActiveGameSession();
      writeGameProgress({
        activeLevelIndex: nextIndex,
        unlockedLevelIndex: Math.max(unlockedLevelIndex, nextIndex),
      });
      void navigate({
        replace: true,
        search: { level: nextIndex + 1 },
        to: '/play',
      });
      return;
    }

    setCells(createEmptyBoard(size));
    setHearts(3);
    setHintsRemaining(HINTS_PER_GAME);
    setHistory([]);
    setElapsedSeconds(0);
    hasRecordedScore.current = false;
    setShowResult(false);
    triggerBoardMotion({ kind: 'reset' });
    clearActiveGameSession();
  }

  return (
    <div
      className="game-app"
      data-hydrated={isHydrated && isSessionReady}
      data-reduced-motion={preferences.reducedMotion}
      data-session-ready={isSessionReady}
      data-testid="game-app"
    >
      <div className="game-shell">
        <header className="game-header">
          <button
            aria-label={copy.exitGame}
            className="round-button"
            onClick={requestExit}
            type="button"
          >
            <IconArrowLeft />
          </button>
          <div className="level-title">
            {gameMode === 'daily'
              ? copy.dailyPuzzle
              : `${copy.level} ${level.id}`}
          </div>
          <button
            aria-label={copy.settings}
            className="round-button"
            onClick={openGameSettings}
            type="button"
          >
            <IconSettings />
          </button>
        </header>

        <section aria-label={copy.gameStatus} className="game-status">
          <div className="status-pill cat-progress">
            <CatFace className="status-cat" />
            <strong>{catCount}</strong>
            <span>/{size}</span>
          </div>
          <div
            aria-label={copy.fishRemaining(hearts)}
            className="status-pill fish-status"
            role="img"
          >
            {Array.from({ length: 3 }, (_, index) => {
              const isLosing =
                boardMotion.kind === 'mistake' &&
                boardMotion.fishIndex === index;
              return (
                <span
                  aria-hidden="true"
                  className={`fish${index < hearts ? ' active' : ''}${isLosing ? ' losing' : ''}`}
                  data-fish-effect={isLosing ? 'lost' : undefined}
                  key={isLosing ? `${index}-${boardMotion.id}` : index}
                >
                  🐟
                </span>
              );
            })}
          </div>
        </section>

        <div className="game-board-meta">
          <div className="game-timer">
            <IconClock />
            <span>{copy.time}</span>
            <strong>{formatGameTime(elapsedSeconds)}</strong>
          </div>
          <Link
            className="game-help-link"
            search={{
              level: gameMode === 'levels' ? level.id : undefined,
              mode: gameMode === 'daily' ? 'daily' : undefined,
              returnTo: 'play',
            }}
            to="/how-to-play"
          >
            {copy.help}
            <IconQuestionMark />
          </Link>
        </div>

        <fieldset
          aria-label={copy.puzzleBoard(level.id)}
          className={`puzzle-board${isComplete ? ' board-complete' : ''}${hearts === 0 ? ' board-failed' : ''}`}
          data-motion={boardMotion.kind}
          data-motion-id={boardMotion.id}
          data-size={size}
          style={{ '--board-size': size } as React.CSSProperties}
        >
          {level.regions.map((regionRow, rowIndex) =>
            regionRow.map((region, columnIndex) => {
              const state = cells[rowIndex]?.[columnIndex] ?? 'empty';
              const isMarked = state === 'marked' || state === 'auto-marked';
              const cellKey = `${rowIndex}-${columnIndex}`;
              const isLatestCat =
                state === 'cat' && boardMotion.cellKey === cellKey;
              const isMistake =
                boardMotion.kind === 'mistake' &&
                boardMotion.cellKey === cellKey;
              const markOrder = boardMotion.markOrder[cellKey];
              return (
                <button
                  aria-label={copy.puzzleCell(
                    level.id,
                    rowIndex + 1,
                    columnIndex + 1,
                    copy.cellStates[state]
                  )}
                  className={`puzzle-cell ${state}${isLatestCat ? ` latest-cat ${boardMotion.kind}` : ''}${isMistake ? ' latest-mistake' : ''}`}
                  data-cell-effect={
                    isMistake
                      ? 'mistake'
                      : isLatestCat
                        ? boardMotion.kind
                        : markOrder === undefined
                          ? undefined
                          : 'mark'
                  }
                  data-testid={`cell-${rowIndex}-${columnIndex}`}
                  key={cellKey}
                  onClick={() => scheduleCellAction(rowIndex, columnIndex)}
                  onDoubleClick={() => handleDoubleClick(rowIndex, columnIndex)}
                  onKeyDown={(event) => {
                    if (event.key.toLowerCase() === 'c') {
                      event.preventDefault();
                      placeCat(rowIndex, columnIndex);
                    }
                  }}
                  style={
                    {
                      '--cat-order': rowIndex,
                      '--cell-color': REGION_COLORS[region],
                      '--mark-order': markOrder ?? 0,
                    } as React.CSSProperties
                  }
                  type="button"
                >
                  {state === 'cat' ? (
                    <span
                      className={`board-cat-wrap${isLatestCat ? ' is-arriving' : ''}${boardMotion.kind === 'hint' && isLatestCat ? ' is-hint' : ''}${isComplete ? ' is-celebrating' : ''}`}
                      data-cat-effect={
                        isLatestCat
                          ? boardMotion.kind === 'hint'
                            ? 'hint'
                            : 'landing'
                          : isComplete
                            ? 'celebrating'
                            : undefined
                      }
                    >
                      <span aria-hidden="true" className="cat-landing-ring" />
                      <CatFace className="board-cat" />
                      <span aria-hidden="true" className="cat-sparkles">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  ) : null}
                  {isMarked ? (
                    <span
                      className={`cell-mark-wrap ${state === 'marked' ? 'is-manual' : 'is-auto'}${markOrder === undefined ? '' : ' is-new'}`}
                      data-mark-order={markOrder}
                    >
                      <IconX aria-hidden="true" className="cell-mark" />
                    </span>
                  ) : null}
                  {isMistake ? (
                    <span
                      aria-hidden="true"
                      className="cell-mistake-effect"
                      key={`mistake-${boardMotion.id}`}
                    >
                      <IconX />
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
          {boardMotion.kind === 'undo' ? (
            <span
              aria-hidden="true"
              className="board-undo-effect"
              key={`undo-${boardMotion.id}`}
            />
          ) : null}
        </fieldset>

        <output aria-live="polite" className="game-announcement">
          <IconHandClick aria-hidden="true" />
          {announcement}
        </output>

        <nav aria-label={copy.gameControls} className="game-controls">
          <button
            className={toolMode === 'mark' ? 'control active' : 'control'}
            onClick={() => setToolMode('mark')}
            type="button"
          >
            <span className="control-icon mark-icon">
              <IconX />
            </span>
            {copy.mark}
          </button>
          <button
            className={toolMode === 'cat' ? 'control active' : 'control'}
            onClick={() => setToolMode('cat')}
            type="button"
          >
            <span className="control-icon">
              <CatFace />
            </span>
            {copy.cat}
          </button>
          <button
            className="control"
            disabled={history.length === 0}
            onClick={undo}
            type="button"
          >
            <span className="control-icon">
              <IconArrowBackUp />
            </span>
            {copy.undo}
          </button>
          <button
            aria-label={copy.hintRemaining(hintsRemaining)}
            className={`control${boardMotion.kind === 'hint' ? ' feedback-hint' : ''}`}
            disabled={hintsRemaining === 0 || isComplete || hearts === 0}
            onClick={showHint}
            type="button"
          >
            <span className="control-icon hint-control-icon">
              <IconBulb />
              <small aria-hidden="true" className="hint-count-badge">
                {hintsRemaining}
              </small>
            </span>
            {copy.hint}
          </button>
          <button
            className="control"
            onClick={() => setShowResetConfirmation(true)}
            type="button"
          >
            <span className="control-icon">
              <IconRefresh />
            </span>
            {copy.reset}
          </button>
        </nav>

        {showResetConfirmation ? (
          <div
            className="game-overlay reset-confirmation-overlay"
            role="presentation"
          >
            <section
              aria-labelledby="reset-puzzle-title"
              aria-modal="true"
              className="reset-confirmation-card"
              role="dialog"
            >
              <span aria-hidden="true" className="reset-confirmation-icon">
                <IconRefresh />
              </span>
              <h2 id="reset-puzzle-title">{copy.resetConfirm}</h2>
              <p>{copy.resetBody}</p>
              <div className="reset-confirmation-actions">
                <button
                  className="primary-game-button"
                  onClick={() => setShowResetConfirmation(false)}
                  type="button"
                >
                  {copy.keepPlaying}
                </button>
                <button
                  className="exit-game-button"
                  onClick={confirmReset}
                  type="button"
                >
                  {copy.resetGame}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {showExitConfirmation ? (
          <div
            className="game-overlay exit-confirmation-overlay"
            role="presentation"
          >
            <section
              aria-labelledby="exit-puzzle-title"
              aria-modal="true"
              className="exit-confirmation-card"
              role="dialog"
            >
              <span aria-hidden="true" className="exit-confirmation-icon">
                <IconDoorExit />
              </span>
              <h2 id="exit-puzzle-title">{copy.exitTitle}</h2>
              <p>{copy.exitBody}</p>
              <div className="exit-confirmation-actions">
                <button
                  className="primary-game-button"
                  onClick={() => setShowExitConfirmation(false)}
                  type="button"
                >
                  {copy.keepPlaying}
                </button>
                <button
                  className="exit-game-button"
                  onClick={exitGame}
                  type="button"
                >
                  {copy.exitGame}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {showTutorial ? (
          <div className="game-overlay tutorial-overlay" role="presentation">
            <section
              aria-label={copy.tutorialProgress}
              aria-modal="true"
              className="tutorial-card"
              role="dialog"
            >
              <TutorialVisual step={tutorialStep} />
              <h2>{tutorialContent.title}</h2>
              <p>{tutorialContent.body}</p>
              <div className="tutorial-actions">
                <div aria-hidden="true" className="tutorial-dots">
                  {tutorialSteps.map((step, index) => (
                    <span
                      className={index === tutorialStep ? 'active' : ''}
                      key={step.title}
                    />
                  ))}
                </div>
                <button
                  className="tutorial-next-button"
                  onClick={() =>
                    tutorialStep === lastTutorialStep
                      ? finishTutorial()
                      : setTutorialStep((current) => current + 1)
                  }
                  type="button"
                >
                  {tutorialStep === lastTutorialStep
                    ? copy.playNow
                    : copy.nextTutorial}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {showResult ? (
          <div className="game-overlay completion-overlay" role="presentation">
            {isComplete ? (
              <div aria-hidden="true" className="celebration-burst">
                {Array.from({ length: 20 }, (_, index) => (
                  <i
                    key={index}
                    style={{ '--particle-index': index } as React.CSSProperties}
                  />
                ))}
              </div>
            ) : null}
            <section
              aria-modal="true"
              className={`completion-card ${isComplete ? 'success' : 'failure'}`}
              role="dialog"
            >
              {isComplete ? (
                <div aria-hidden="true" className="celebration-feast">
                  <span className="celebration-snack-fish">🐟</span>
                  <span className="celebration-feast-spark one">✦</span>
                  <span className="celebration-feast-spark two">✦</span>
                  <span className="celebration-feast-spark three">✦</span>
                  <span className="celebration-feast-spark four">✦</span>
                  <div className="celebration-cat">
                    <CatFace />
                  </div>
                </div>
              ) : (
                <div className="celebration-cat failure-cat">
                  <CatFace />
                </div>
              )}
              <p className="eyebrow">MIMODOKU</p>
              <h2>
                {isComplete
                  ? copy.completionTitle(hearts, hintsRemaining === 0)
                  : copy.gameOver}
              </h2>
              <p>{isComplete ? copy.completedBody : copy.gameOverBody}</p>
              <button
                className="primary-game-button"
                onClick={isComplete ? continueGame : resetLevel}
                type="button"
              >
                {isComplete
                  ? gameMode === 'daily'
                    ? copy.next
                    : activeLevelIndex < GAME_LEVELS.length - 1
                      ? copy.continue
                      : copy.next
                  : copy.restart}
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
