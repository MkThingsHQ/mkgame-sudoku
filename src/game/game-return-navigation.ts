export type GameReturnSearch = {
  level?: number;
  mode?: 'daily';
  returnTo?: 'play';
};

export type GameReturnTarget = Pick<GameReturnSearch, 'level' | 'mode'>;

export function validateGameReturnSearch(
  search: Record<string, unknown>
): GameReturnSearch {
  const rawLevel =
    typeof search.level === 'number'
      ? search.level
      : typeof search.level === 'string'
        ? Number(search.level)
        : undefined;

  return {
    level:
      rawLevel !== undefined && Number.isFinite(rawLevel)
        ? Math.max(1, Math.trunc(rawLevel))
        : undefined,
    mode: search.mode === 'daily' ? 'daily' : undefined,
    returnTo: search.returnTo === 'play' ? 'play' : undefined,
  };
}
