import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GAME_LEVELS,
  type GameLevel,
  getDailyLevelIndex,
} from '../../src/game/levels';

const VALID_BOARD_SIZES = new Set([5, 6, 7, 8]);

function isPermutation(values: number[], size: number) {
  const seen = new Set(values);
  return (
    values.length === size &&
    seen.size === size &&
    values.every(
      (value) => Number.isInteger(value) && value >= 0 && value < size
    )
  );
}

function assertValidLevel(level: GameLevel) {
  const size = level.solution.length;
  const label = `level ${level.id}`;

  // The board is square: N rows, each N cells wide.
  assert.equal(level.regions.length, size, `${label} row count`);
  assert.ok(
    level.regions.every((row) => row.length === size),
    `${label} row widths`
  );

  // One cat per row is implied by the array shape; the solution must also put
  // exactly one cat in each column, so it has to be a permutation of 0..N-1.
  assert.ok(isPermutation(level.solution, size), `${label} column uniqueness`);

  // Cats may not touch, including diagonally. With one cat per row, only
  // vertically adjacent rows can collide, so their columns must differ by >= 2.
  for (let row = 0; row < size - 1; row += 1) {
    assert.ok(
      Math.abs(level.solution[row] - level.solution[row + 1]) >= 2,
      `${label} cats touch between rows ${row} and ${row + 1}`
    );
  }

  // Region ids span 0..N-1 and every region holds exactly one cat.
  const regionIds = new Set(level.regions.flat());
  assert.equal(regionIds.size, size, `${label} region count`);
  assert.ok(
    [...regionIds].every((id) => Number.isInteger(id) && id >= 0 && id < size),
    `${label} region ids in range`
  );
  const catRegions = level.solution.map(
    (column, row) => level.regions[row][column]
  );
  assert.equal(
    new Set(catRegions).size,
    size,
    `${label} should have one cat per region`
  );
}

describe('sudoku levels', () => {
  it('generates 80 sequentially numbered levels', () => {
    assert.equal(GAME_LEVELS.length, 80);
    assert.deepEqual(
      GAME_LEVELS.map((level) => level.id),
      Array.from({ length: 80 }, (_, index) => index + 1)
    );
  });

  it('only produces boards that satisfy the placement rules', () => {
    for (const level of GAME_LEVELS) {
      assertValidLevel(level);
    }
  });

  it('keeps every board within the supported size range', () => {
    for (const level of GAME_LEVELS) {
      assert.ok(
        VALID_BOARD_SIZES.has(level.solution.length),
        `level ${level.id} has unsupported size ${level.solution.length}`
      );
    }
    // The catalogue is meant to ramp up to the largest boards.
    assert.equal(GAME_LEVELS.at(-1)?.solution.length, 8);
  });
});

describe('daily level selection', () => {
  it('is deterministic and within range', () => {
    for (const date of ['2026-07-25', '2026-01-01', '2030-12-31']) {
      const index = getDailyLevelIndex(date);
      assert.equal(index, getDailyLevelIndex(date));
      assert.ok(
        Number.isInteger(index) && index >= 0 && index < GAME_LEVELS.length,
        `index for ${date} out of range: ${index}`
      );
    }
  });

  it('does not walk through levels in date order', () => {
    // A weak additive hash maps consecutive days onto adjacent levels; a
    // well-distributed hash should scatter them across the catalogue.
    const dayMillis = 86_400_000;
    const start = Date.UTC(2026, 0, 1);
    const indices = Array.from({ length: 60 }, (_, offset) =>
      getDailyLevelIndex(
        new Date(start + offset * dayMillis).toISOString().slice(0, 10)
      )
    );

    const adjacent = indices
      .slice(1)
      .filter((index, position) => Math.abs(index - indices[position]) <= 1);
    assert.ok(
      adjacent.length < 12,
      `too many sequential daily levels: ${adjacent.length}`
    );
    assert.ok(
      new Set(indices).size >= 30,
      `daily levels should vary widely, got ${new Set(indices).size} distinct`
    );
  });
});
