'use client';

import { useEffect, useRef } from 'react';

export function ClickSound() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const playSound = () => {
      audioRef.current?.play().catch(error => console.error("Click sound playback failed:", error));
    };

    document.body.addEventListener('click', playSound);

    return () => {
      document.body.removeEventListener('click', playSound);
    };
  }, []);

  return <audio ref={audioRef} src="/sounds/click.mp3" preload="auto" />;
}
