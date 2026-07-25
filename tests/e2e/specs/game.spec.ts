import { expect, type Page, test } from '@playwright/test';
import { GAME_LEVELS, getDailyLevelIndex } from '../../../src/game/levels';

const FIRST_LEVEL_SOLUTION = [1, 3, 0, 2, 4] as const;

async function clearGameStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function openGame(page: Page, options: { showTutorial?: boolean } = {}) {
  if (!options.showTutorial) {
    await page.evaluate(() =>
      window.localStorage.setItem('game-tutorial-seen-v1', 'true')
    );
  }
  await page.goto('/play?level=1');
  await expect(page.getByTestId('game-app')).toHaveAttribute(
    'data-hydrated',
    'true'
  );
}

async function completeTutorial(page: Page) {
  const tutorial = page.getByRole('dialog', { name: 'Tutorial step' });
  await expect(tutorial.locator('.tutorial-skip')).toHaveCount(0);
  for (let step = 0; step < 4; step += 1) {
    await tutorial.getByRole('button', { name: 'Next' }).click();
  }
  await tutorial.getByRole('button', { name: 'Start playing' }).click();
  await expect(tutorial).toHaveCount(0);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
}

async function expectPathname(page: Page, pathname: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
}

async function expectOnlyNewCatLogos(page: Page) {
  const logos = await page.locator('[data-cat-logo]').evaluateAll((elements) =>
    elements.map((logo) => ({
      source: logo.getAttribute('src'),
      version: logo.getAttribute('data-cat-version'),
    }))
  );

  expect(logos.length).toBeGreaterThan(0);
  expect(
    logos.every(
      ({ source, version }) =>
        version === 'head-v2' &&
        (source === '/images/mimodoku-cat-happy.png' ||
          source === '/images/mimodoku-cat-wink.png')
    )
  ).toBe(true);
}

async function expectUnifiedPageHeader(page: Page, title: string) {
  const header = page.locator('.game-page-header');
  await expect(header).toHaveCount(1);
  await expect(header.getByRole('heading', { name: title })).toBeVisible();
  await expect(header.locator('.eyebrow, .cat-face')).toHaveCount(0);
  await expect(header.locator('svg')).toHaveCount(1);
  await expect(header.locator('.game-page-header-spacer')).toHaveCount(1);
}

async function expectHeaderContentGap(page: Page, contentSelector: string) {
  const gap = await page.evaluate((selector) => {
    const header = document.querySelector('.game-page-header');
    const content = document.querySelector(selector);
    if (!header || !content) throw new Error('Header content is missing');

    return (
      content.getBoundingClientRect().top -
      header.getBoundingClientRect().bottom
    );
  }, contentSelector);

  expect(gap).toBeGreaterThanOrEqual(20);
}

async function expectGuideCardsToContainContent(page: Page) {
  const overflowingCards = await page
    .locator('.guide-card')
    .evaluateAll((cards) =>
      cards.flatMap((card, index) => {
        const bounds = card.getBoundingClientRect();
        const contentEscapes = Array.from(card.querySelectorAll('*')).some(
          (element) => {
            const contentBounds = element.getBoundingClientRect();
            if (contentBounds.width === 0 || contentBounds.height === 0) {
              return false;
            }
            return (
              contentBounds.left < bounds.left - 1 ||
              contentBounds.right > bounds.right + 1 ||
              contentBounds.top < bounds.top - 1 ||
              contentBounds.bottom > bounds.bottom + 1
            );
          }
        );

        return contentEscapes ? [index + 1] : [];
      })
    );

  expect(overflowingCards).toEqual([]);
}

async function expectRuleGuideVisualsToMatch(page: Page) {
  const sizes = await page.locator('.guide-mini-board').evaluateAll((boards) =>
    boards.slice(0, 3).map((board) => ({
      blocked: board.querySelectorAll(':scope > .blocked').length,
      board: {
        borderRadius: Number.parseFloat(getComputedStyle(board).borderRadius),
        height: board.getBoundingClientRect().height,
        width: board.getBoundingClientRect().width,
      },
      cat:
        board.querySelector('.guide-cat')?.getBoundingClientRect().width ?? 0,
      cells: Array.from(board.querySelectorAll(':scope > span')).map((cell) => {
        const bounds = cell.getBoundingClientRect();
        return {
          blocked: cell.classList.contains('blocked'),
          cat: Boolean(cell.querySelector('.guide-cat')),
          height: bounds.height,
          width: bounds.width,
        };
      }),
      container: {
        borderRadius: Number.parseFloat(
          getComputedStyle(board.parentElement as Element).borderRadius
        ),
        height: board.parentElement?.getBoundingClientRect().height ?? 0,
        width: board.parentElement?.getBoundingClientRect().width ?? 0,
      },
    }))
  );

  expect(sizes).toHaveLength(3);
  expect(sizes.map((size) => size.blocked)).toEqual([2, 4, 8]);
  expect(new Set(sizes.map((size) => size.container.width)).size).toBe(1);
  expect(new Set(sizes.map((size) => size.board.width)).size).toBe(1);
  expect(new Set(sizes.map((size) => size.cat)).size).toBe(1);
  expect(
    sizes[1]?.cells.flatMap((cell, index) => (cell.cat ? [index] : []))
  ).toEqual([0]);
  expect(
    sizes[1]?.cells.flatMap((cell, index) => (cell.blocked ? [index] : []))
  ).toEqual([1, 2, 3, 6]);
  for (const size of sizes) {
    expect(size.board.height).toBe(size.board.width);
    expect(Math.abs(size.container.height - size.container.width)).toBeLessThan(
      0.1
    );
    expect(size.container.height - size.board.height).toBeGreaterThanOrEqual(
      20
    );
    expect(
      Math.abs(size.container.borderRadius - size.board.borderRadius)
    ).toBeLessThanOrEqual(2);
    expect(size.cells).toHaveLength(9);
    const widths = size.cells.map((cell) => cell.width);
    const heights = size.cells.map((cell) => cell.height);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.1);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.1);
    for (const cell of size.cells) {
      expect(Math.abs(cell.height - cell.width)).toBeLessThan(0.1);
    }
  }
}

async function expectGuideXIconsToBeCentered(page: Page) {
  const offsets = await page
    .locator('.guide-mini-board .blocked, .guide-action-row i')
    .evaluateAll((squares) =>
      squares.map((square) => {
        const icon = square.querySelector('svg');
        if (!icon) return null;

        const squareBounds = square.getBoundingClientRect();
        const iconBounds = icon.getBoundingClientRect();
        return {
          x:
            iconBounds.left +
            iconBounds.width / 2 -
            (squareBounds.left + squareBounds.width / 2),
          y:
            iconBounds.top +
            iconBounds.height / 2 -
            (squareBounds.top + squareBounds.height / 2),
        };
      })
    );

  expect(offsets).toHaveLength(15);
  for (const offset of offsets) {
    expect(offset).not.toBeNull();
    expect(Math.abs(offset?.x ?? Number.POSITIVE_INFINITY)).toBeLessThan(0.1);
    expect(Math.abs(offset?.y ?? Number.POSITIVE_INFINITY)).toBeLessThan(0.1);
  }
}

test.describe('MimoDoku game', () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
  });

  test('home exposes help, settings, and three game modes', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByTestId('game-home')).toHaveAttribute(
      'data-hydrated',
      'true'
    );
    await expect(page.getByRole('heading', { name: 'MimoDoku' })).toBeVisible();
    await expect(
      page.getByText('A cozy Sudoku puzzle for clever cat lovers.')
    ).toBeVisible();
    await expect(page.locator('.game-logo > p')).toHaveCount(0);
    await expect(page.locator('.logo-cat-state.happy')).toHaveAttribute(
      'src',
      '/images/mimodoku-cat-happy.png'
    );
    await expect(page.locator('.logo-cat-state.wink')).toHaveAttribute(
      'src',
      '/images/mimodoku-cat-wink.png'
    );
    const wordmark = page.locator('.mimodoku-wordmark');
    await expect(wordmark).toHaveAttribute(
      'data-wordmark-style',
      'puzzle-arcade'
    );
    await expect(wordmark).toHaveCSS('font-family', /MimoDoku Display/);
    await expect(wordmark.locator('.wordmark-letter')).toHaveCount(8);
    await expect(wordmark.locator('.wordmark-glyph')).toHaveCount(8);
    await expect(page.locator('.wordmark-territory-tile')).toHaveCount(5);
    await expect(page.locator('.wordmark-fish-o')).toHaveCount(1);
    await expect(page.locator('.wordmark-fish')).toHaveCount(3);
    await expect(page.locator('.wordmark-cat-o')).toHaveCount(1);
    await expect(page.locator('.wordmark-cat-eye')).toHaveCount(2);
    await expect(page.locator('.wordmark-cat-nose')).toHaveCount(1);
    const wordmarkStyle = await wordmark
      .locator('.wordmark-glyph')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          filter: style.filter,
          stroke: style.webkitTextStrokeWidth,
        };
      });
    expect(Number.parseFloat(wordmarkStyle.stroke)).toBeGreaterThanOrEqual(1);
    expect(wordmarkStyle.filter).not.toBe('none');
    await expect
      .poll(() =>
        page
          .locator('.wordmark-fish-school')
          .evaluate((fish) => getComputedStyle(fish).animationName)
      )
      .toBe('wordmark-fish-swim');
    await expect
      .poll(() =>
        page
          .locator('.logo-cat-state.wink')
          .evaluate((logo) => getComputedStyle(logo).animationName)
      )
      .toBe('logo-cat-wink');
    await expectOnlyNewCatLogos(page);
    await expect(page.getByRole('link', { name: 'How to play' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Levels/ })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Daily Puzzle/ })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Ranking/ })).toBeVisible();
  });

  test('keeps the home mascot stable after repeated navigation', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-home')).toHaveAttribute(
      'data-hydrated',
      'true'
    );

    for (let visit = 0; visit < 4; visit += 1) {
      await page.getByRole('link', { name: 'How to play' }).click();
      await page.getByRole('link', { name: 'Back to game' }).click();
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.getByRole('link', { name: 'Back to game' }).click();
    }

    await expect(page.locator('.logo-cat')).toHaveCount(1);
    await expect(page.locator('.logo-cat-state.happy')).toHaveCount(1);
    await expect(page.locator('.logo-cat-state.wink')).toHaveCount(1);
    expect(
      await page
        .locator('.logo-cat')
        .evaluate((logo) => logo.getAnimations().length)
    ).toBe(1);
    expect(
      await page
        .locator('.logo-cat-state.wink')
        .evaluate((logo) => logo.getAnimations().length)
    ).toBe(1);

    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: /Reduce motion/ }).click();
    await page.getByRole('link', { name: 'Back to game' }).click();
    await expect(page.getByTestId('game-home')).toHaveAttribute(
      'data-reduced-motion',
      'true'
    );

    for (let visit = 0; visit < 3; visit += 1) {
      await page.getByRole('link', { name: 'How to play' }).click();
      await page.getByRole('link', { name: 'Back to game' }).click();
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.getByRole('link', { name: 'Back to game' }).click();
    }

    for (const selector of ['.logo-cat', '.logo-cat-state.wink']) {
      await expect(page.locator(selector)).toHaveCount(1);
      expect(
        await page
          .locator(selector)
          .evaluate((element) => element.getAnimations().length)
      ).toBe(0);
    }
    await expect(page.locator('.wordmark-fish')).toHaveCount(3);
    expect(
      await page
        .locator('.wordmark-fish')
        .evaluateAll((fish) =>
          fish.map((element) => element.getAnimations().length)
        )
    ).toEqual([0, 0, 0]);
  });

  test('uses one title-only header across every secondary page', async ({
    page,
  }) => {
    for (const [path, title] of [
      ['/levels', 'Choose a level'],
      ['/ranking', 'Ranking'],
      ['/how-to-play', 'How to play'],
      ['/settings', 'Game settings'],
    ] as const) {
      await page.goto(path);
      await expectUnifiedPageHeader(page, title);
      if (path === '/how-to-play') {
        await expectHeaderContentGap(page, '.guide-card-list');
      }
      if (path === '/settings') {
        await expectHeaderContentGap(page, '.settings-section');
      }
    }
  });

  test('guides a first-time player through every core rule', async ({
    page,
  }) => {
    await openGame(page, { showTutorial: true });

    const tutorial = page.getByRole('dialog', { name: 'Tutorial step' });
    await expect(tutorial.locator('.tutorial-skip')).toHaveCount(0);
    const visualShape = await tutorial
      .locator('.tutorial-visual')
      .evaluate((visual) => {
        const bounds = visual.getBoundingClientRect();
        const styles = getComputedStyle(visual);
        const board = visual.querySelector('.guide-mini-board');
        if (!board) throw new Error('Tutorial rule board is missing');
        const boardBounds = board.getBoundingClientRect();
        const boardStyles = getComputedStyle(board);
        return {
          boardBorderRadius: Number.parseFloat(boardStyles.borderTopLeftRadius),
          boardHeight: boardBounds.height,
          boardWidth: boardBounds.width,
          borderRadius: Number.parseFloat(styles.borderTopLeftRadius),
          height: bounds.height,
          width: bounds.width,
        };
      });
    expect(Math.abs(visualShape.width - visualShape.height)).toBeLessThan(0.1);
    expect(visualShape.boardWidth).toBe(88);
    expect(visualShape.boardHeight).toBe(88);
    expect(visualShape.height - visualShape.boardHeight).toBeGreaterThanOrEqual(
      20
    );
    expect(
      Math.abs(visualShape.borderRadius - visualShape.boardBorderRadius)
    ).toBeLessThanOrEqual(2);
    await expect(tutorial.locator('.eyebrow')).toHaveCount(0);
    await expect(tutorial.locator('.tutorial-orbit')).toHaveCount(0);
    await expect(
      tutorial.getByRole('heading', { name: 'One cat in every color' })
    ).toBeVisible();
    await expect(tutorial).toContainText(
      'Every connected color territory must contain exactly one cat.'
    );
    await expect(tutorial.locator('.guide-mini-board > span')).toHaveCount(9);
    await expect(tutorial.locator('.guide-mini-board .blocked')).toHaveCount(2);
    await expect(tutorial.locator('.tutorial-dots span')).toHaveCount(5);

    const dotsBox = await tutorial.locator('.tutorial-dots').boundingBox();
    const buttonBox = await tutorial
      .getByRole('button', { name: 'Next' })
      .boundingBox();
    expect(dotsBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(
      (buttonBox?.y ?? 0) - ((dotsBox?.y ?? 0) + (dotsBox?.height ?? 0))
    ).toBeGreaterThanOrEqual(20);

    await tutorial.getByRole('button', { name: 'Next' }).click();
    await expect(
      tutorial.getByRole('heading', {
        name: 'One cat in each row and column',
      })
    ).toBeVisible();
    await expect(tutorial).toContainText(
      'Each row and column can contain only one cat.'
    );
    await expect(tutorial.locator('.guide-mini-board .blocked')).toHaveCount(4);

    await tutorial.getByRole('button', { name: 'Next' }).click();
    await expect(
      tutorial.getByRole('heading', { name: 'Cats cannot be adjacent' })
    ).toBeVisible();
    await expect(tutorial).toContainText(
      'Cats cannot occupy horizontally, vertically, or diagonally adjacent cells.'
    );
    await expect(tutorial.locator('.guide-mini-board .blocked')).toHaveCount(8);

    await tutorial.getByRole('button', { name: 'Next' }).click();
    await expect(
      tutorial.getByRole('heading', { name: 'Mark your deductions' })
    ).toBeVisible();
    await expect(tutorial).toContainText(
      'Click once to add an X. Double-click a tile—or select Cat—to place a cat.'
    );
    await tutorial.getByRole('button', { name: 'Next' }).click();
    await expect(
      tutorial.getByRole('heading', { name: 'Only three chances' })
    ).toBeVisible();
    await expect(tutorial.locator('.guide-fish-visual span')).toHaveCount(3);
    await expect(tutorial.locator('.guide-fish-visual')).toContainText(
      '🐟🐟🐟'
    );
    await tutorial.getByRole('button', { name: 'Start playing' }).click();

    await expect(tutorial).toBeHidden();
    await page.reload();
    await expect(
      page.getByRole('dialog', { name: 'Tutorial step' })
    ).toHaveCount(0);
  });

  test('keeps the complete gameplay guide available from the board', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'How to play' }).click();

    await expect(page).toHaveURL(/\/how-to-play$/);
    await expect(page.getByTestId('how-to-play')).toHaveAttribute(
      'data-hydrated',
      'true'
    );
    await expect(
      page.getByRole('heading', { name: 'How to play', exact: true })
    ).toBeVisible();
    await expect(page.locator('.inner-page-intro')).toHaveCount(0);
    await expect(page.locator('.game-page-header .eyebrow')).toHaveCount(0);
    for (const heading of [
      'One cat in every color',
      'One cat in each row and column',
      'Cats cannot be adjacent',
      'Mark your deductions',
      'Only three chances',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    await expect(page.getByRole('link', { name: 'Start playing' })).toHaveCount(
      0
    );
    await page.getByRole('link', { name: 'Back to game' }).click();
    await expectPathname(page, '/');
  });

  test('contains every guide card at phone width in both languages', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/how-to-play');
    await expect(
      page.getByText(
        'Cats cannot occupy horizontally, vertically, or diagonally adjacent cells.'
      )
    ).toBeVisible();
    await expectGuideCardsToContainContent(page);
    await expectRuleGuideVisualsToMatch(page);
    await expectGuideXIconsToBeCentered(page);
    await expectOnlyNewCatLogos(page);
    await expect(page.locator('.guide-fish-visual span')).toHaveCount(3);
    await expect(page.locator('.guide-fish-visual')).toContainText('🐟🐟🐟');

    await expect(page.getByRole('link', { name: 'Start playing' })).toHaveCount(
      0
    );

    await page.goto('/settings');
    await expect(page.getByTestId('game-settings')).toHaveAttribute(
      'data-hydrated',
      'true'
    );
    await page.getByRole('button', { name: '中文' }).click();
    await page.goto('/how-to-play');
    await expect(
      page.getByRole('heading', { name: '玩法介绍', exact: true })
    ).toBeVisible();
    await expect(page.locator('.inner-page-intro')).toHaveCount(0);
    await expect(
      page.getByText('每种颜色领地中只能放一只猫咪。')
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '同行同列各一只猫' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '只有三次机会' })
    ).toBeVisible();
    await expect(
      page.getByText('放错一只猫会失去一条小鱼，失去三条小鱼后需要重来。')
    ).toBeVisible();
    await expect(
      page.getByText('任意两只猫咪都不能放在横向、纵向或斜向相邻的格子里。')
    ).toBeVisible();
    await expectGuideCardsToContainContent(page);
    await expectRuleGuideVisualsToMatch(page);
    await expectGuideXIconsToBeCentered(page);
  });

  test('renders in an isolated game shell', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await openGame(page);

    await expect(page.getByTestId('game-app')).toBeVisible();
    await expectOnlyNewCatLogos(page);
    await expect(page.locator('.level-title')).toHaveText('Level 1');
    await expect(
      page.getByRole('group', { name: 'Level 1 puzzle board' })
    ).toBeVisible();
    await expect(page.locator('header nav')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Open TanStack Devtools' })
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('persists language and preferences from the independent settings page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Settings' }).click();

    const settings = page.getByTestId('game-settings');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(settings).toHaveAttribute('data-hydrated', 'true');
    await expect(
      page.getByRole('heading', { name: 'Game settings', exact: true })
    ).toBeVisible();
    await expect(page.locator('.game-page-header .eyebrow')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Restore defaults/ })
    ).toHaveCount(0);
    await expect(page.locator('.inner-page-intro')).toHaveCount(0);
    await expect(page.getByTestId('tanstarter-credit')).toHaveCount(0);

    const music = page.getByRole('button', { name: /Background music/ });
    const sound = page.getByRole('button', { name: /Sound effects/ });
    await expect(music).toHaveAttribute('aria-pressed', 'true');
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await music.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Reduce motion/ }).click();
    await page.getByRole('button', { name: '中文' }).click();

    await expect(
      page.getByRole('heading', { name: '游戏设置', exact: true })
    ).toBeVisible();
    await expect(
      page.getByText('放猫后自动标记不能放猫的格子。')
    ).toBeVisible();
    await expect(settings).toHaveAttribute('data-reduced-motion', 'true');
    await page.getByRole('link', { name: '返回游戏' }).click();
    await expect(page.getByRole('link', { name: /关卡/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: /每日挑战/ })).toBeVisible();
    await expect(page.getByText('给聪明猫奴的治愈系数独游戏。')).toBeVisible();
    await page.evaluate(() => {
      window.localStorage.setItem('game-tutorial-seen-v1', 'true');
    });
    await page.goto('/play?level=1');
    await expect(page.getByTestId('game-app')).toHaveAttribute(
      'data-hydrated',
      'true'
    );
    await expect(page.getByRole('region', { name: '游戏状态' })).toBeVisible();
    await expect(
      page.getByRole('img', { name: '还剩 3 条小鱼' })
    ).toBeVisible();
    await expect(
      page.getByRole('group', { name: '第 1 关棋盘' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: '第 1 关，第 1 行，第 1 列，空白',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: '游戏操作' })
    ).toBeVisible();
    await page.getByRole('button', { name: '游戏设置' }).click();
    await expect(
      page.getByRole('button', { name: /背景音乐/ })
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: /音效/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByRole('button', { name: '中文' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('keeps automatic X marks visible when motion is reduced', async ({
    page,
  }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('game-settings')).toHaveAttribute(
      'data-hydrated',
      'true'
    );

    const autoMark = page.getByRole('button', {
      name: /Automatic X marks/,
    });
    const reducedMotion = page.getByRole('button', {
      name: /Reduce motion/,
    });
    await expect(autoMark).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByText('Mark impossible cells after placing a cat.')
    ).toBeVisible();

    await reducedMotion.click();
    await expect(reducedMotion).toHaveAttribute('aria-pressed', 'true');
    await expect(autoMark).toHaveAttribute('aria-pressed', 'true');
    await reducedMotion.click();
    await expect(reducedMotion).toHaveAttribute('aria-pressed', 'false');
    await expect(autoMark).toHaveAttribute('aria-pressed', 'true');
    await reducedMotion.click();
    await expect(reducedMotion).toHaveAttribute('aria-pressed', 'true');

    await openGame(page);
    await page.getByTestId('cell-0-1').dblclick();

    const inferredMarks = page.locator('.cell-mark-wrap.is-new');
    expect(await inferredMarks.count()).toBeGreaterThan(3);
    const dashOffsets = await inferredMarks
      .locator('.cell-mark path')
      .evaluateAll((paths) =>
        paths.map((path) => getComputedStyle(path).strokeDashoffset)
      );
    expect(dashOffsets.every((offset) => Number.parseFloat(offset) === 0)).toBe(
      true
    );
  });

  test('uses browser haptics with a Safari fallback when enabled', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const hapticWindow = window as Window & {
        __mimoDokuHaptics?: Array<number | number[]>;
      };
      hapticWindow.__mimoDokuHaptics = [];
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        value: (pattern: number | number[]) => {
          hapticWindow.__mimoDokuHaptics?.push(pattern);
          return true;
        },
      });
    });

    await openGame(page);
    await page.getByTestId('cell-0-1').dblclick();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __mimoDokuHaptics?: Array<number | number[]>;
              }
            ).__mimoDokuHaptics
        )
      )
      .toEqual([18]);

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        value: undefined,
      });
    });
    await page.getByTestId('cell-1-3').dblclick();
    const fallback = page.locator('input[data-haptic-fallback="true"]');
    await expect(fallback).toBeChecked();

    await page.getByRole('button', { name: 'Game settings' }).click();
    await page.getByRole('button', { name: /Haptic feedback/ }).click();
    await page.getByRole('link', { name: 'Back to game' }).click();
    await page.getByTestId('cell-2-0').dblclick();
    await expect(fallback).toBeChecked();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __mimoDokuHaptics?: Array<number | number[]>;
              }
            ).__mimoDokuHaptics
        )
      )
      .toEqual([18]);
  });

  test('plays a lightweight music loop and pauses it from settings', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('game-home')).toHaveAttribute(
      'data-hydrated',
      'true'
    );

    const asset = await page.request.get('/audio/mimodoku-gameplay-loop.ogg');
    expect(asset.ok()).toBe(true);
    expect((await asset.body()).byteLength).toBeLessThan(300_000);

    const music = page.getByTestId('game-background-music');
    await expect(music).toHaveAttribute(
      'src',
      '/audio/mimodoku-gameplay-loop.ogg'
    );
    await expect(music).toHaveAttribute('loop', '');
    await expect
      .poll(() => music.evaluate((audio: HTMLAudioElement) => audio.volume))
      .toBe(0.14);

    await page.getByRole('link', { name: /Levels/ }).click();
    await expect
      .poll(() =>
        page
          .getByTestId('game-background-music')
          .evaluate((audio: HTMLAudioElement) => audio.paused)
      )
      .toBe(false);

    await page.goto('/settings');
    await expect(page.getByTestId('game-settings')).toHaveAttribute(
      'data-hydrated',
      'true'
    );
    await expect(
      page.getByRole('button', { name: /Sound effects/ })
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Background music/ }).click();
    await expect
      .poll(() =>
        page
          .getByTestId('game-background-music')
          .evaluate((audio: HTMLAudioElement) => audio.paused)
      )
      .toBe(true);
  });

  test('marks, places, undoes, and resets moves', async ({ page }) => {
    await openGame(page);

    await expect(
      page.getByText('Click once to mark; double-click to place a cat.')
    ).toBeVisible();
    await expect(page.locator('.game-announcement svg')).toBeVisible();

    const firstCell = page.getByTestId('cell-0-0');
    const solvedCell = page.getByTestId('cell-0-1');
    await firstCell.click();
    await expect(firstCell).toHaveClass(/marked/);
    await expect(firstCell.locator('.cell-mark-wrap')).toHaveAttribute(
      'data-mark-order',
      '0'
    );
    await expect
      .poll(() =>
        firstCell
          .locator('.cell-mark-wrap')
          .evaluate((mark) => getComputedStyle(mark).animationName)
      )
      .toBe('mark-stamp');

    await solvedCell.dblclick();
    await expect(solvedCell).toHaveClass(/cat/);
    await expect(solvedCell.locator('.board-cat-wrap')).toHaveAttribute(
      'data-cat-effect',
      'landing'
    );
    await expect
      .poll(() =>
        solvedCell
          .locator('.board-cat-wrap')
          .evaluate((cat) => getComputedStyle(cat).animationName)
      )
      .toBe('cat-land');
    await expect(firstCell).toHaveClass(/auto-marked/);
    await expect(firstCell.locator('.cell-mark-wrap')).toHaveClass(/is-auto/);

    const inferredMarks = page.locator('.cell-mark-wrap.is-new');
    expect(await inferredMarks.count()).toBeGreaterThan(3);
    const markTiming = await inferredMarks.evaluateAll((marks) =>
      marks.map((mark) => ({
        animation: getComputedStyle(mark).animationName,
        delay: Number.parseFloat(getComputedStyle(mark).animationDelay),
        order: Number(mark.getAttribute('data-mark-order')),
      }))
    );
    expect(
      markTiming.every(({ animation }) => animation === 'mark-stamp')
    ).toBe(true);
    expect(
      markTiming.map(({ order }) => order).sort((left, right) => left - right)
    ).toEqual(Array.from({ length: markTiming.length }, (_, index) => index));
    expect(new Set(markTiming.map(({ delay }) => delay)).size).toBeGreaterThan(
      2
    );

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(solvedCell).toHaveClass(/empty/);
    await expect(firstCell).toHaveClass(/marked/);
    await expect(page.locator('.puzzle-board')).toHaveAttribute(
      'data-motion',
      'undo'
    );
    await expect
      .poll(() =>
        page
          .locator('.board-undo-effect')
          .evaluate((effect) => getComputedStyle(effect).animationName)
      )
      .toBe('board-undo-wave');

    await page.getByRole('button', { name: 'Reset' }).click();
    await page
      .getByRole('dialog', { name: 'Start over?' })
      .getByRole('button', { name: 'Reset puzzle' })
      .click();
    await expect(firstCell).toHaveClass(/empty/);
  });

  test('uses all three chances and restores them after restart', async ({
    page,
  }) => {
    await openGame(page);

    const fishStatus = page.getByRole('img', {
      name: '3 fish remaining',
    });
    const fishCenterOffsets = await fishStatus
      .locator('.fish')
      .evaluateAll((fish) => {
        const status = fish[0]?.parentElement?.getBoundingClientRect();
        if (!status) return { horizontal: Number.NaN, vertical: [] };
        const fishBounds = fish.map((item) => item.getBoundingClientRect());
        const statusCenter = status.top + status.height / 2;
        const left = Math.min(...fishBounds.map((bounds) => bounds.left));
        const right = Math.max(...fishBounds.map((bounds) => bounds.right));
        return {
          horizontal: (left + right) / 2 - (status.left + status.width / 2),
          vertical: fishBounds.map(
            (bounds) => bounds.top + bounds.height / 2 - statusCenter
          ),
        };
      });
    expect(fishCenterOffsets.vertical).toHaveLength(3);
    expect(
      Math.max(...fishCenterOffsets.vertical.map((offset) => Math.abs(offset)))
    ).toBeLessThanOrEqual(0.5);
    expect(Math.abs(fishCenterOffsets.horizontal)).toBeLessThanOrEqual(0.5);

    for (const hearts of [2, 1, 0]) {
      await page.getByTestId('cell-0-0').dblclick();
      await expect(
        page.getByRole('img', { name: `${hearts} fish remaining` })
      ).toBeVisible();
      await expect(page.getByTestId('cell-0-0')).toHaveAttribute(
        'data-cell-effect',
        'mistake'
      );
      await expect
        .poll(() =>
          page
            .locator('.cell-mistake-effect')
            .evaluate((effect) => getComputedStyle(effect).animationName)
        )
        .toBe('rejected-cell');
      await expect
        .poll(() =>
          page
            .locator('.fish-status')
            .locator('[data-fish-effect="lost"]')
            .evaluate((fish) => getComputedStyle(fish).animationName)
        )
        .toBe('fish-lost');
    }

    const gameOver = page.getByRole('dialog');
    await expect(
      gameOver.getByRole('heading', { name: 'Out of fish' })
    ).toBeVisible();
    await expect
      .poll(() =>
        gameOver.evaluate((card) => getComputedStyle(card).animationName)
      )
      .toBe('failure-card-in');
    await gameOver.getByRole('button', { name: 'Try again' }).click();
    await expect(
      page.getByRole('img', { name: '3 fish remaining' })
    ).toBeVisible();
    await expect(page.getByTestId('cell-0-0')).toHaveClass(/empty/);
  });

  test('completing a level unlocks the next level', async ({ page }) => {
    await openGame(page);

    for (const [row, column] of FIRST_LEVEL_SOLUTION.entries()) {
      await page.getByTestId(`cell-${row}-${column}`).dblclick();
      if (row === 1) {
        const sameTerritoryCell = page.getByTestId('cell-4-2');
        await expect(sameTerritoryCell).toHaveClass(/marked/);
        await expect(sameTerritoryCell).toHaveAttribute(
          'data-cell-effect',
          'mark'
        );
      }
    }

    await expect(page.locator('.puzzle-board')).toHaveClass(/board-complete/);
    await expect(page.locator('.board-cat-wrap.is-celebrating')).toHaveCount(5);
    await expect
      .poll(() =>
        page
          .locator('.board-cat-wrap.is-celebrating')
          .first()
          .evaluate((cat) => getComputedStyle(cat).animationName)
      )
      .toContain('cat-celebrate');
    const completion = page.getByRole('dialog');
    await expect(
      completion.getByRole('heading', { name: 'Perfect!' })
    ).toBeVisible();
    await expect(page.locator('.celebration-burst i')).toHaveCount(20);
    await expect(completion.locator('.celebration-feast')).toHaveCount(1);
    await expect(completion.locator('.celebration-snack-fish')).toHaveCount(1);
    await expect(completion.locator('.celebration-feast-spark')).toHaveCount(4);
    await expect
      .poll(() =>
        completion.evaluate((card) => getComputedStyle(card).animationName)
      )
      .toBe('result-card-in');
    await completion.getByRole('button', { name: /Next level/ }).click();

    await expect(page.locator('.level-title')).toHaveText('Level 2');
    await expect(page).toHaveURL(/level=2/);
    await page.reload();
    await expect(page.locator('.level-title')).toHaveText('Level 2');
  });

  test('completes the daily puzzle without adding it to level rankings', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() =>
      window.localStorage.setItem('game-tutorial-seen-v1', 'true')
    );
    await page.getByRole('link', { name: /Daily Puzzle/ }).click();
    await expect(page).toHaveURL(/\/play\?mode=daily$/);
    await expect(page.getByTestId('daily-challenge')).toHaveCount(0);
    await expect(page.locator('.level-title')).toHaveText('Daily Puzzle');
    await expectOnlyNewCatLogos(page);

    const today = await page.evaluate(() => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    const dailyLevel = GAME_LEVELS[getDailyLevelIndex(today)];
    expect(dailyLevel).toBeDefined();
    for (const [row, column] of dailyLevel?.solution.entries() ?? []) {
      await page.getByTestId(`cell-${row}-${column}`).dblclick();
    }

    const completion = page.getByRole('dialog');
    await expect(
      completion.getByRole('heading', { name: 'Perfect!' })
    ).toBeVisible();
    const resultCopy = completion.locator(':scope > p:not(.eyebrow)');
    const playAgain = completion.getByRole('button', { name: 'Play again' });
    const [copyBox, buttonBox] = await Promise.all([
      resultCopy.boundingBox(),
      playAgain.boundingBox(),
    ]);
    expect(copyBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(
      (buttonBox?.y ?? 0) - ((copyBox?.y ?? 0) + (copyBox?.height ?? 0))
    ).toBeGreaterThanOrEqual(32);
    const playAgainStyle = await playAgain.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        borderBottomWidth: style.borderBottomWidth,
        borderRadius: style.borderRadius,
        borderStyle: style.borderStyle,
        boxShadow: style.boxShadow,
        minHeight: style.minHeight,
      };
    });
    expect(playAgainStyle.backgroundColor).toBe('rgb(141, 17, 223)');
    expect(playAgainStyle.borderBottomWidth).not.toBe('0px');
    expect(playAgainStyle.borderRadius).toBe('17px');
    expect(playAgainStyle.borderStyle).toBe('solid');
    expect(playAgainStyle.boxShadow).not.toBe('none');
    expect(Number.parseFloat(playAgainStyle.minHeight)).toBeGreaterThanOrEqual(
      54
    );
    await playAgain.click();
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('game-scores-v1'))
      )
      .toBeNull();
    await page.goto('/ranking');
    await expectOnlyNewCatLogos(page);
    await expect(page.locator('.standalone-score-list')).toHaveCount(0);
    await expect(page.getByText('Daily Puzzle')).toHaveCount(0);
  });

  test('redirects the legacy daily page to today’s board', async ({ page }) => {
    await page.goto('/daily');
    await expect(page).toHaveURL(/\/play\?mode=daily$/);
    await expect(page.locator('.level-title')).toHaveText('Daily Puzzle');
    await expect(page.getByTestId('daily-challenge')).toHaveCount(0);
  });

  test('returns from secondary pages without losing the active board', async ({
    page,
  }) => {
    await openGame(page);
    const markedCell = page.getByTestId('cell-0-0');
    await markedCell.click();
    await expect(markedCell).toHaveClass(/marked/);

    await page.getByRole('link', { name: 'How to play' }).click();
    await expect(page).toHaveURL(/\/how-to-play$/);
    await page.getByRole('link', { name: 'Back to game' }).click();
    await expect(page).toHaveURL(/\/play\?level=1$/);
    await expect(markedCell).toHaveClass(/marked/);

    await page.getByRole('button', { name: 'Game settings' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    const settings = page.getByTestId('game-settings');
    await expect(settings).toBeVisible();
    await settings.getByRole('button', { name: /Sound effects/ }).click();
    await settings.getByRole('link', { name: 'Back to game' }).click();

    await expect(settings).toHaveCount(0);
    await expect(page).toHaveURL(/\/play\?level=1$/);
    await expect(markedCell).toHaveClass(/marked/);

    await page.getByTestId('cell-1-1').dblclick();
    await expect(page.locator('.fish.active')).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('.fish.active')).toHaveCount(3);
    await page.evaluate(() => {
      const key = 'game-active-session-v1';
      const session = JSON.parse(window.sessionStorage.getItem(key) ?? '{}');
      window.sessionStorage.setItem(
        key,
        JSON.stringify({ ...session, elapsedSeconds: 45 })
      );
    });
    await page.reload();
    await expect(page.getByTestId('cell-0-0')).toHaveClass(/marked/);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await expect(page.locator('.game-timer strong')).toHaveText(/^0:0[0-1]$/);
  });

  test('discards malformed and stale daily sessions safely', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem('game-tutorial-seen-v1', 'true');
      window.sessionStorage.setItem(
        'game-active-session-v1',
        JSON.stringify({
          cells: [['cat']],
          date: '2000-01-01',
          elapsedSeconds: -1,
          hearts: 99,
          history: [],
          levelId: 1,
          mode: 'daily',
          version: 1,
        })
      );
    });

    await page.goto('/play?mode=daily');
    await expect(page.getByTestId('game-app')).toHaveAttribute(
      'data-session-ready',
      'true'
    );
    await expect(page.locator('.puzzle-cell.cat')).toHaveCount(0);
    await expect(page.locator('.fish.active')).toHaveCount(3);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.sessionStorage.getItem('game-active-session-v1')
        )
      )
      .not.toContain('2000-01-01');
  });

  test('only confirms before leaving an active puzzle', async ({ page }) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Exit game' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Exit this puzzle?' })
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/levels$/);

    await openGame(page);
    const markedCell = page.getByTestId('cell-0-0');
    await markedCell.click();
    await expect(markedCell).toHaveClass(/marked/);

    await page.getByRole('button', { name: 'Exit game' }).click();
    const exitDialog = page.getByRole('dialog', {
      name: 'Exit this puzzle?',
    });
    await expect(exitDialog).toBeVisible();
    await exitDialog.getByRole('button', { name: 'Continue playing' }).click();
    await expect(exitDialog).toHaveCount(0);
    await expect(markedCell).toHaveClass(/marked/);

    await page.getByRole('button', { name: 'Exit game' }).click();
    await exitDialog.getByRole('button', { name: 'Exit game' }).click();
    await expect(page).toHaveURL(/\/levels$/);

    await page.goto('/play?mode=daily');
    await expect(page.getByTestId('game-app')).toHaveAttribute(
      'data-hydrated',
      'true'
    );
    await page.locator('.puzzle-cell.empty').first().click();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await page.getByRole('button', { name: 'Exit game' }).click();
    await page
      .getByRole('dialog', { name: 'Exit this puzzle?' })
      .getByRole('button', { name: 'Exit game' })
      .click();
    await expectPathname(page, '/');
  });

  test('animates hints and honors reduced-motion preferences', async ({
    page,
  }) => {
    await openGame(page);

    await page.getByRole('button', { name: 'Hint, 1 remaining' }).click();
    const hintedCat = page.locator('[data-cat-effect="hint"]');
    await expect(hintedCat).toHaveCount(1);
    await expect
      .poll(() =>
        hintedCat.evaluate((cat) => getComputedStyle(cat).animationName)
      )
      .toBe('cat-land');
    await expect
      .poll(() =>
        hintedCat
          .locator('.cat-landing-ring')
          .evaluate((ring) => getComputedStyle(ring).animationName)
      )
      .toBe('hint-ring');
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: 'Hint, 0 remaining' })
          .locator('.control-icon')
          .evaluate((icon) => getComputedStyle(icon).animationName)
      )
      .toBe('hint-control-pulse');
    const exhaustedHintButton = page.getByRole('button', {
      name: 'Hint, 0 remaining',
    });
    await expect(exhaustedHintButton).toBeDisabled();
    await expect(exhaustedHintButton).toHaveText(/0\s*Hint$/);

    await page.evaluate(() => {
      const key = 'game-preferences-v1';
      const preferences = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      window.localStorage.setItem(
        key,
        JSON.stringify({ ...preferences, reducedMotion: true })
      );
    });
    await page.reload();
    await expect(page.getByTestId('game-app')).toHaveAttribute(
      'data-reduced-motion',
      'true'
    );
    await expect(page.getByTestId('cell-0-1')).toHaveClass(/cat/);
    await page.getByTestId('cell-1-3').dblclick();

    const motionDurations = await page
      .locator('.board-cat-wrap.is-arriving, .cell-mark-wrap.is-new')
      .evaluateAll((elements) =>
        elements.map((element) =>
          Number.parseFloat(getComputedStyle(element).animationDuration)
        )
      );
    expect(motionDurations.length).toBeGreaterThan(1);
    expect(motionDurations.every((duration) => duration <= 0.001)).toBe(true);
    await expect(page.getByTestId('cell-1-3')).toHaveClass(/cat/);
  });

  test('limits every puzzle to one persistent hint', async ({ page }) => {
    await openGame(page);

    await page.getByRole('button', { name: 'Hint, 1 remaining' }).click();

    const exhaustedHint = page.getByRole('button', {
      name: 'Hint, 0 remaining',
    });
    await expect(exhaustedHint).toBeDisabled();
    await expect(exhaustedHint.locator('.hint-count-badge')).toHaveText('0');

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(exhaustedHint).toBeDisabled();

    await page.reload();
    await expect(exhaustedHint).toBeDisabled();

    await page.getByRole('button', { name: 'Reset' }).click();
    await page
      .getByRole('dialog', { name: 'Start over?' })
      .getByRole('button', { name: 'Reset puzzle' })
      .click();
    await expect(exhaustedHint).toBeDisabled();

    for (const [row, column] of FIRST_LEVEL_SOLUTION.entries()) {
      await page.getByTestId(`cell-${row}-${column}`).dblclick();
    }
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Next level' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Hint, 1 remaining' })
    ).toBeEnabled();
  });

  test('removes legacy daily times from the level ranking', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'game-scores-v1',
        JSON.stringify([
          { date: '2026-07-14', level: 3, mode: 'daily', seconds: 12 },
          { date: '2026-07-15', level: 1, mode: 'levels', seconds: 25 },
        ])
      );
    });
    await page.goto('/ranking');

    await expect(page.locator('.standalone-score-list')).toContainText(
      'Level 1'
    );
    await expect(page.locator('.standalone-score-list')).not.toContainText(
      'Daily Puzzle'
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          JSON.parse(window.localStorage.getItem('game-scores-v1') ?? '[]')
        )
      )
      .toEqual([{ date: '2026-07-15', level: 1, mode: 'levels', seconds: 25 }]);
  });

  test('offers all 80 progression levels with future levels locked', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Levels/ }).click();
    await expect(page).toHaveURL(/\/levels$/);
    const levelSelect = page.getByTestId('level-select');
    await expect(levelSelect).toHaveAttribute('data-hydrated', 'true');
    await expectOnlyNewCatLogos(page);
    await expect(levelSelect.locator('.standalone-level-card')).toHaveCount(80);
    await expect(
      levelSelect.locator('.standalone-level-card').filter({ hasText: '80' })
    ).toBeDisabled();
    await levelSelect.getByRole('link', { name: 'Level 1' }).click();
    await expect(page).toHaveURL(/\/play\?level=1$/);

    await page.evaluate(() => {
      window.localStorage.setItem(
        'game-progress-v1',
        JSON.stringify({ activeLevelIndex: 4, unlockedLevelIndex: 4 })
      );
    });
    await page.goto('/play?level=6');
    await expect(page).toHaveURL(/\/levels$/);
    await expect(page.getByTestId('level-select')).toBeVisible();
  });

  test('leaves the level selector for home instead of reopening a level', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem('game-tutorial-seen-v1', 'true');
      window.localStorage.setItem(
        'game-progress-v1',
        JSON.stringify({ activeLevelIndex: 2, unlockedLevelIndex: 2 })
      );
    });
    await page.reload();

    for (let visit = 0; visit < 2; visit += 1) {
      await page.getByRole('link', { name: /Levels/ }).click();
      await page.getByRole('link', { name: 'Level 3' }).click();
      await expect(page).toHaveURL(/\/play\?level=3$/);

      await page.getByRole('button', { name: 'Exit game' }).click();
      await expect(page).toHaveURL(/\/levels$/);

      await page.getByRole('link', { name: 'Back to game' }).click();
      await expectPathname(page, '/');
    }
  });

  test('keeps the full game journey usable on a mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expectNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'How to play' }).click();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('link', { name: 'Back to game' }).click();
    await expectPathname(page, '/');

    await page.getByRole('link', { name: 'Settings' }).click();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('link', { name: 'Back to game' }).click();
    await expectPathname(page, '/');

    await page.getByRole('link', { name: /Levels/ }).click();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('link', { name: 'Level 1' }).click();
    await completeTutorial(page);

    await expect(
      page.getByRole('group', { name: 'Level 1 puzzle board' })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Game controls' })
    ).toBeVisible();
    await expect(page.locator('.cat-hill, .footer-cat')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
