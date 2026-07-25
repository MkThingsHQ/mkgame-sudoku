import { createFileRoute } from '@tanstack/react-router';
import { RankingPage } from '@/game/ranking-page';

export const Route = createFileRoute('/ranking')({
  head: () => ({ meta: [{ title: 'Ranking — MimoDoku' }] }),
  component: RankingPage,
});
