import { React, html } from '../vendor.js';
import useCanvasDpr from '../hooks/useCanvasDpr.js';

const { useEffect, useMemo, useRef } = React;
const TRACK_HEIGHT = 64;

export default function NavigationTrack({ signal, viewport, onSeek }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenRef = useRef(null);
  const { width: cssW, dpr } = useCanvasDpr(containerRef);
  const dragRef = useRef(false);

  const envelopeKey = useMemo(
    () => `${signal.length}_${Math.round(cssW)}_${dpr}`,
    [signal, cssW, dpr],
  );

  useEffect(() => {
    if (cssW <= 0) return;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(TRACK_HEIGHT * dpr));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const baseline = h * 0.6;
    const samplesPerCol = signal.length / w;
    const yScale = (h * 0.42) / 1.6;

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 0; col < w; col++) {
      const s0 = Math.floor(col * samplesPerCol);
      const s1 = Math.min(signal.length, Math.floor((col + 1) * samplesPerCol));
      if (s0 >= signal.length) break;
      let mn = signal[s0];
      let mx = mn;
      for (let i = s0 + 1; i < s1; i++) {
        const v = signal[i];
        if (v < mn) mn = v;
        else if (v > mx) mx = v;
      }
      ctx.moveTo(col + 0.5, baseline - mx * yScale);
      ctx.lineTo(col + 0.5, baseline - mn * yScale);
    }
    ctx.stroke();
    offscreenRef.current = off;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeKey]);

  function redraw() {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off || cssW <= 0) return;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(TRACK_HEIGHT * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${TRACK_HEIGHT}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(off, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const startX = (viewport.startIndex / signal.length) * cssW;
    const widthX = (viewport.samplesPerView / signal.length) * cssW;

    ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
    ctx.fillRect(startX, 0, widthX, TRACK_HEIGHT);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX + 0.5, 0.5, Math.max(2, widthX - 1), TRACK_HEIGHT - 1);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.95)';
    ctx.fillRect(startX, 0, 2, TRACK_HEIGHT);
    ctx.fillRect(startX + widthX - 2, 0, 2, TRACK_HEIGHT);
  }

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, cssW, dpr]);

  const seekFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xCss = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const target = Math.round((xCss / rect.width) * signal.length - viewport.samplesPerView / 2);
    onSeek?.(target);
  };

  const handleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = true;
    seekFromEvent(e);
  };
  const handleMove = (e) => {
    if (!dragRef.current) return;
    seekFromEvent(e);
  };
  const handleUp = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = false;
  };

  return html`
    <div
      ref=${containerRef}
      style=${{ height: TRACK_HEIGHT }}
      className="relative w-full overflow-hidden rounded-lg ring-1 ring-slate-800/70"
    >
      <canvas
        ref=${canvasRef}
        className="block h-full w-full cursor-pointer"
        onPointerDown=${handleDown}
        onPointerMove=${handleMove}
        onPointerUp=${handleUp}
        onPointerCancel=${handleUp}
      />
    </div>
  `;
}
