import { IconHandClick, IconX } from '@tabler/icons-react';
import { GAME_COPY } from './game-copy';
import type { GameLanguage } from './game-preferences';
import { CatFace } from './cat-face';

type GuideKind = 'action' | 'color' | 'column' | 'lives' | 'space';

type GuideCellProps = {
  blocked?: boolean;
  cat?: boolean;
  className?: string;
};

const GUIDE_KINDS: GuideKind[] = [
  'color',
  'column',
  'space',
  'action',
  'lives',
];

function GuideCell({ blocked, cat, className }: GuideCellProps) {
  const classes = [blocked ? 'blocked' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes || undefined}>
      {cat ? <CatFace className="guide-cat" /> : null}
      {blocked ? <IconX strokeWidth={4} /> : null}
    </span>
  );
}

function GuideVisual({ kind }: { kind: GuideKind }) {
  if (kind === 'color') {
    return (
      <div aria-hidden="true" className="guide-mini-board color-board">
        <GuideCell blocked className="territory-blue" />
        <GuideCell blocked className="territory-blue" />
        <GuideCell className="territory-pink" />
        <GuideCell cat className="territory-blue" />
        <GuideCell className="territory-pink" />
        <GuideCell className="territory-pink" />
        <GuideCell className="territory-green" />
        <GuideCell className="territory-green" />
        <GuideCell className="territory-green" />
      </div>
    );
  }

  if (kind === 'space') {
    return (
      <div aria-hidden="true" className="guide-mini-board space-board">
        <GuideCell blocked />
        <GuideCell blocked />
        <GuideCell blocked />
        <GuideCell blocked />
        <GuideCell cat className="cat-home" />
        <GuideCell blocked />
        <GuideCell blocked />
        <GuideCell blocked />
        <GuideCell blocked />
      </div>
    );
  }

  if (kind === 'column') {
    return (
      <div aria-hidden="true" className="guide-mini-board column-board">
        <GuideCell cat />
        <GuideCell blocked />
        <GuideCell blocked />
        <GuideCell blocked />
        <GuideCell />
        <GuideCell />
        <GuideCell blocked />
        <GuideCell />
        <GuideCell />
      </div>
    );
  }

  if (kind === 'action') {
    return (
      <div aria-hidden="true" className="guide-action-visual">
        <span className="guide-action-row">
          <IconHandClick />
          <b>1×</b>
          <i>
            <IconX strokeWidth={4} />
          </i>
        </span>
        <span className="guide-action-row">
          <IconHandClick />
          <b>2×</b>
          <CatFace />
        </span>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="guide-fish-visual">
      <span>🐟</span>
      <span>🐟</span>
      <span>🐟</span>
    </div>
  );
}

function guideText(kind: GuideKind, language: GameLanguage) {
  const copy = GAME_COPY[language];
  switch (kind) {
    case 'color':
      return { body: copy.guideColorBody, title: copy.guideColorTitle };
    case 'space':
      return { body: copy.guideTouchBody, title: copy.guideTouchTitle };
    case 'column':
      return { body: copy.guideColumnBody, title: copy.guideColumnTitle };
    case 'action':
      return { body: copy.guideActionBody, title: copy.guideActionTitle };
    case 'lives':
      return { body: copy.guideLivesBody, title: copy.guideLivesTitle };
  }
}

export function GameGuideCards({ language }: { language: GameLanguage }) {
  return (
    <div className="guide-card-list">
      {GUIDE_KINDS.map((kind) => {
        const text = guideText(kind, language);
        return (
          <article className="guide-card" key={kind}>
            <div className="guide-visual">
              <GuideVisual kind={kind} />
            </div>
            <div>
              <h2>{text.title}</h2>
              <p>{text.body}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function TutorialVisual({ step }: { step: number }) {
  const visuals: GuideKind[] = ['color', 'column', 'space', 'action', 'lives'];
  return (
    <div className="guide-visual tutorial-visual">
      <GuideVisual kind={visuals[step] ?? 'color'} />
    </div>
  );
}
