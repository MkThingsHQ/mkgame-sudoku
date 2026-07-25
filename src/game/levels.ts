export type GameLevel = {
  id: number;
  regions: number[][];
  solution: number[];
};

/**
 * Each solution entry is the cat column for that row. Region maps are
 * contiguous, contain exactly one solved cat, and have a single solution
 * under the row/column/non-touching rules.
 */
const BASE_LEVELS: GameLevel[] = [
  {
    id: 1,
    solution: [1, 3, 0, 2, 4],
    regions: [
      [2, 0, 0, 1, 1],
      [2, 1, 1, 1, 4],
      [2, 1, 1, 1, 4],
      [2, 1, 3, 1, 4],
      [2, 1, 1, 4, 4],
    ],
  },
  {
    id: 2,
    solution: [4, 1, 3, 0, 2],
    regions: [
      [1, 1, 1, 0, 0],
      [1, 1, 2, 2, 0],
      [2, 2, 2, 2, 0],
      [3, 4, 4, 0, 0],
      [3, 3, 4, 0, 0],
    ],
  },
  {
    id: 3,
    solution: [5, 3, 1, 4, 2, 0],
    regions: [
      [1, 1, 1, 1, 0, 0],
      [1, 1, 1, 1, 1, 3],
      [2, 2, 4, 1, 3, 3],
      [2, 2, 4, 1, 3, 3],
      [2, 4, 4, 3, 3, 3],
      [5, 4, 4, 3, 3, 3],
    ],
  },
  {
    id: 4,
    solution: [5, 0, 4, 1, 3, 6, 2],
    regions: [
      [3, 3, 3, 3, 0, 0, 0],
      [1, 3, 3, 2, 2, 0, 0],
      [3, 3, 3, 3, 2, 0, 0],
      [3, 3, 3, 2, 2, 5, 5],
      [3, 3, 3, 4, 2, 5, 5],
      [3, 3, 3, 3, 3, 3, 5],
      [6, 6, 6, 3, 3, 3, 5],
    ],
  },
  {
    id: 5,
    solution: [4, 1, 5, 2, 6, 3, 7, 0],
    regions: [
      [3, 1, 0, 0, 0, 2, 2, 2],
      [3, 1, 0, 0, 0, 2, 2, 2],
      [3, 3, 3, 5, 5, 2, 2, 2],
      [3, 3, 3, 5, 5, 2, 2, 2],
      [5, 5, 5, 5, 5, 2, 4, 6],
      [5, 5, 5, 5, 2, 2, 4, 6],
      [5, 5, 5, 5, 5, 5, 6, 6],
      [7, 7, 5, 5, 5, 6, 6, 6],
    ],
  },
  {
    id: 6,
    solution: [3, 6, 2, 5, 1, 4, 0, 7],
    regions: [
      [2, 2, 2, 0, 0, 0, 1, 3],
      [2, 2, 2, 0, 0, 0, 1, 3],
      [2, 2, 2, 5, 5, 3, 3, 3],
      [2, 2, 2, 5, 5, 3, 3, 3],
      [6, 4, 2, 5, 5, 5, 5, 5],
      [6, 4, 2, 2, 5, 5, 5, 5],
      [6, 6, 5, 5, 5, 5, 5, 5],
      [6, 6, 6, 5, 5, 5, 7, 7],
    ],
  },
];

type BoardTransform = 'horizontal' | 'identity' | 'rotate' | 'vertical';

function transformLevel(
  level: GameLevel,
  id: number,
  transform: BoardTransform
): GameLevel {
  const size = level.solution.length;
  const colorOffset = (id - 1) % size;
  const remapColors = (regions: number[][]) =>
    regions.map((row) => row.map((region) => (region + colorOffset) % size));

  if (transform === 'horizontal') {
    return {
      id,
      regions: remapColors(level.regions.map((row) => [...row].reverse())),
      solution: level.solution.map((column) => size - 1 - column),
    };
  }

  if (transform === 'vertical') {
    return {
      id,
      regions: remapColors([...level.regions].reverse()),
      solution: [...level.solution].reverse(),
    };
  }

  if (transform === 'rotate') {
    return {
      id,
      regions: remapColors(
        [...level.regions].reverse().map((row) => [...row].reverse())
      ),
      solution: [...level.solution]
        .reverse()
        .map((column) => size - 1 - column),
    };
  }

  return {
    id,
    regions: remapColors(level.regions),
    solution: [...level.solution],
  };
}

const TRANSFORMS: BoardTransform[] = [
  'identity',
  'horizontal',
  'vertical',
  'rotate',
];

function getBaseLevelIndex(index: number) {
  if (index < 8) return index % 3;
  if (index < 28) return 2 + (index % 2);
  return 4 + (index % 2);
}

/**
 * The store experience advertises endless progression. Eighty deterministic
 * levels are provided here using symmetry-preserving transformations of
 * verified single-solution boards. Later levels steadily increase board size.
 */
export const GAME_LEVELS: GameLevel[] = Array.from(
  { length: 80 },
  (_, index) => {
    const baseLevel = BASE_LEVELS[getBaseLevelIndex(index)] ?? BASE_LEVELS[0];
    const transform = TRANSFORMS[Math.floor(index / 2) % TRANSFORMS.length];
    return transformLevel(baseLevel, index + 1, transform ?? 'identity');
  }
);

export function getDailyLevelIndex(date: string) {
  const hash = [...date].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
  return hash % GAME_LEVELS.length;
}

export const REGION_COLORS = [
  '#79c96b',
  '#f3c451',
  '#ec7fa5',
  '#74a8dc',
  '#a68fd4',
  '#d98661',
  '#55c0c4',
  '#d08ac1',
  '#b6d85e',
];
