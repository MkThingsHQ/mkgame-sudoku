import { useEffect, useRef } from 'react';
import { useGamePreferences } from './game-preferences';

const GAME_MUSIC_SOURCE = '/audio/mimodoku-gameplay-loop.ogg';
const GAME_MUSIC_VOLUME = 0.14;

export function GameMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isHydrated, preferences } = useGamePreferences();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isHydrated) return;

    audio.volume = GAME_MUSIC_VOLUME;

    if (!preferences.music) {
      audio.pause();
      return;
    }

    const startMusic = () => {
      void audio.play().catch(() => undefined);
    };

    void audio.play().catch(() => undefined);
    window.addEventListener('pointerdown', startMusic, { capture: true });
    window.addEventListener('keydown', startMusic, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', startMusic, { capture: true });
      window.removeEventListener('keydown', startMusic, { capture: true });
    };
  }, [isHydrated, preferences.music]);

  return (
    // biome-ignore lint/a11y/useMediaCaption: This is instrumental background music with no speech to caption.
    <audio
      data-testid="game-background-music"
      loop
      preload="auto"
      ref={audioRef}
      src={GAME_MUSIC_SOURCE}
    />
  );
}
