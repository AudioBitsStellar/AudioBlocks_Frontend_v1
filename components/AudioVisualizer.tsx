'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  analyserNode?: AnalyserNode;
  isEnabled?: boolean;
}

export const AudioVisualizer = ({ analyserNode, isEnabled = true }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isEnabled || !analyserNode || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyserNode.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight: number;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] || 0) / 255;

        ctx.fillStyle = `hsl(${(i / bufferLength) * 360}, 100%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight * canvas.height, barWidth, barHeight * canvas.height);

        x += barWidth + 1;
      }
    };

    draw();

    const handleVisibilityChange = () => {
      if (document.hidden && animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      } else if (!document.hidden && animationRef.current === null) {
        draw();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [analyserNode, isEnabled, prefersReducedMotion]);

  if (prefersReducedMotion || !isEnabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      height={200}
      width={800}
    />
  );
};
