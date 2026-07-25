import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { GameMusic } from '@/game/game-music';
import { GamePreferencesProvider } from '@/game/game-preferences';
import gameCss from '@/game/game.css?url';
import gameMotionCss from '@/game/game-motion.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no',
      },
      { title: 'MimoDoku' },
      {
        name: 'description',
        content:
          'A calming cat-placement logic puzzle with colorful regions and daily challenges.',
      },
      { name: 'theme-color', content: '#8d11df' },
      { property: 'og:image', content: '/og.png' },
    ],
    links: [
      { rel: 'stylesheet', href: gameCss },
      { rel: 'stylesheet', href: gameMotionCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  return (
    <GamePreferencesProvider>
      <GameMusic />
      <main id="main-content" className="game-shell-main">
        <Outlet />
      </main>
    </GamePreferencesProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <div className="game-app">
      <main className="game-shell standalone-shell">
        <section className="settings-section not-found-card">
          <h1>Page not found</h1>
          <Link className="primary-button" to="/">
            Back to MimoDoku
          </Link>
        </section>
      </main>
    </div>
  );
}
