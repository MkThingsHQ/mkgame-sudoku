import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useCanGoBack, useRouter } from '@tanstack/react-router';
import type { MouseEvent } from 'react';

type GamePageHeaderProps = {
  backBehavior?: 'history' | 'home';
  backLabel: string;
  title: string;
};

export function GamePageHeader({
  backBehavior = 'home',
  backLabel,
  title,
}: GamePageHeaderProps) {
  const canGoBack = useCanGoBack();
  const router = useRouter();

  const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (backBehavior !== 'history') return;

    const historyIndex = window.history.state?.__TSR_index;
    if (canGoBack && typeof historyIndex === 'number' && historyIndex > 0) {
      event.preventDefault();
      router.history.back();
    }
  };

  return (
    <header className="game-page-header">
      <Link
        aria-label={backLabel}
        className="round-button"
        onClick={backBehavior === 'history' ? goBack : undefined}
        to="/"
      >
        <IconArrowLeft />
      </Link>
      <h1>{title}</h1>
      <span aria-hidden="true" className="game-page-header-spacer" />
    </header>
  );
}
