import React, { useEffect, useRef } from 'react';

export const SiteBackgroundWave: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let scrollY = window.scrollY || 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Handle Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Parallax on scroll (~0.35x scroll speed)
    const handleScroll = () => {
      scrollY = window.scrollY || 0;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Subtle drift on mousemove (few pixels)
    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 24; // +/- 12px
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 16; // +/- 8px
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let t = 0;

    const drawFrame = () => {
      if (!ctx) return;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const parallaxOffset = (scrollY * 0.35) % height;

      // Ribbon 1: Flowing deep silver ribbon (ambient ~6% opacity)
      ctx.beginPath();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(242, 244, 245, 0.06)';

      const baseY1 = (height * 0.38 - parallaxOffset * 0.5 + height) % height + mouseY;
      for (let x = -50; x <= width + 50; x += 6) {
        const nx = x / width;
        const y =
          baseY1 +
          Math.sin(nx * 4.2 + t * 0.4) * 55 +
          Math.cos(nx * 2.1 - t * 0.25) * 35;
        if (x === -50) ctx.moveTo(x + mouseX, y);
        else ctx.lineTo(x + mouseX, y);
      }
      ctx.stroke();

      // Ribbon 2: Subtle secondary wave with soft orange-red brand hint (~5% opacity)
      ctx.beginPath();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(255, 71, 19, 0.05)';

      const baseY2 = (height * 0.65 - parallaxOffset * 0.8 + height) % height + mouseY * 1.5;
      for (let x = -50; x <= width + 50; x += 6) {
        const nx = x / width;
        const y =
          baseY2 +
          Math.sin(nx * 3.5 - t * 0.3) * 65 +
          Math.cos(nx * 5.0 + t * 0.35) * 25;
        if (x === -50) ctx.moveTo(x - mouseX * 0.8, y);
        else ctx.lineTo(x - mouseX * 0.8, y);
      }
      ctx.stroke();

      // Ribbon 3: Low harmonic resonance wave (~4% opacity)
      ctx.beginPath();
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(155, 163, 168, 0.04)';

      const baseY3 = (height * 0.85 - parallaxOffset * 0.3 + height) % height;
      for (let x = -50; x <= width + 50; x += 8) {
        const nx = x / width;
        const y =
          baseY3 +
          Math.sin(nx * 6.0 + t * 0.5) * 30 +
          Math.cos(nx * 1.8 - t * 0.15) * 45;
        if (x === -50) ctx.moveTo(x + mouseX * 0.5, y);
        else ctx.lineTo(x + mouseX * 0.5, y);
      }
      ctx.stroke();
    };

    if (prefersReducedMotion) {
      drawFrame();
      return;
    }

    const loop = () => {
      t += 0.008;
      drawFrame();
      animId = requestAnimationFrame(loop);
    };

    // Visibility change handler — pauses RAF when tab is backgrounded
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else {
        if (!animId) {
          animId = requestAnimationFrame(loop);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animId = requestAnimationFrame(loop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
      style={{ display: 'block' }}
    />
  );
});
