
'use client';

import { useState, useEffect } from 'react';

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export function RippleEffect() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const newRipple: Ripple = {
        x: e.clientX,
        y: e.clientY,
        id: Date.now(),
      };
      setRipples(prev => [...prev, newRipple]);
    };

    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none">
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute bg-primary/20 rounded-full animate-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          onAnimationEnd={() => setRipples(prev => prev.filter(r => r.id !== ripple.id))}
        />
      ))}
    </div>
  );
}
