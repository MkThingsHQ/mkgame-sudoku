import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatGameTime, getLocalDateKey } from '../../src/game/game-storage';

describe('game storage helpers', () => {
  it('formats seconds as m:ss with a zero-padded remainder', () => {
    assert.equal(formatGameTime(0), '0:00');
    assert.equal(formatGameTime(9), '0:09');
    assert.equal(formatGameTime(75), '1:15');
    assert.equal(formatGameTime(600), '10:00');
  });

  it('builds a zero-padded local date key', () => {
    assert.equal(getLocalDateKey(new Date(2026, 0, 5)), '2026-01-05');
    assert.equal(getLocalDateKey(new Date(2026, 11, 31)), '2026-12-31');
  });
});
