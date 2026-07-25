import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { GameReturnTarget } from './game-return-navigation';

type GamePageHeaderProps = {
  backLabel: string;
  returnToPlay?: GameReturnTarget;
  title: string;
};

export function GamePageHeader({
  backLabel,
  returnToPlay,
  title,
}: GamePageHeaderProps) {
  return (
    <header className="game-page-header">
      {returnToPlay ? (
        <Link
          aria-label={backLabel}
          className="round-button"
          replace
          search={returnToPlay}
          to="/play"
        >
          <IconArrowLeft />
        </Link>
      ) : (
        <Link aria-label={backLabel} className="round-button" to="/">
          <IconArrowLeft />
        </Link>
      )}
      <h1>{title}</h1>
      <span aria-hidden="true" className="game-page-header-spacer" />
    </header>
  );
}
