import { useEffect } from 'react';
import confetti from 'canvas-confetti';

/**
 * Confetti — fires a confetti burst when `active` becomes true.
 *
 * Props:
 *   active    {boolean} — trigger confetti on true
 *   type      {'burst' | 'fireworks' | 'side'} — animation style (default 'burst')
 *   duration  {number}  — fireworks duration ms (default 2500)
 *   colors    {string[]}— particle colors
 */
export default function Confetti({
  active = false,
  type = 'burst',
  duration = 2500,
  colors = ['#6366f1', '#818cf8', '#10b981', '#f59e0b', '#ffffff'],
}) {
  useEffect(() => {
    if (!active) return;

    if (type === 'burst') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });
    } else if (type === 'fireworks') {
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else if (type === 'side') {
      confetti({ particleCount: 50, angle: 60, spread: 50, origin: { x: 0 }, colors });
      confetti({ particleCount: 50, angle: 120, spread: 50, origin: { x: 1 }, colors });
    }
  }, [active]);

  return null;
}
