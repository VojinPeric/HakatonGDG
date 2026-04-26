import { React, html } from '../vendor.js';
import { CATEGORY_BY_TYPE } from '../constants/categories.js';
import useCanvasDpr from '../hooks/useCanvasDpr.js';
import { drawBaseline, drawGrid, drawSignal } from '../utils/ecgRender.js';

const { useEffect, useMemo, useRef } = React;

const LABEL_LANE_HEIGHT = 26;
const LABEL_RADIUS = 9;

export default function EcgCanvas({
  signal,
  labels,
  viewport,
  onPan,
  onZoom,
  onLabelClick,
  visibleTypes,
  height = 320,
  yScale = 80,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { width: cssW, height: cssH, dpr } = useCanvasDpr(containerRef);
  const dragState = useRef(null);

  const visibleSet = useMemo(() => new Set(visibleTypes), [visibleTypes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssW <= 0) return;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const verticalOffset = 80; 
    const traceTop = LABEL_LANE_HEIGHT + verticalOffset;
    const traceHeight = cssH - LABEL_LANE_HEIGHT - verticalOffset;

    drawGrid(ctx, cssW, cssH);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, cssW, LABEL_LANE_HEIGHT);

    ctx.save();
    ctx.translate(0, traceTop);
    //drawBaseline(ctx, cssW, traceHeight);
    drawSignal(ctx, signal, viewport.startIndex, viewport.samplesPerView, cssW, traceHeight, yScale * 1.5);
    ctx.restore();

    const end = viewport.startIndex + viewport.samplesPerView;
    const samplesPerPx = viewport.samplesPerView / cssW;
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < labels.length; i++) {
      const lab = labels[i];
      if (lab.index < viewport.startIndex || lab.index >= end) continue;
      if (!visibleSet.has(lab.type)) continue;
      const cat = CATEGORY_BY_TYPE[lab.type];
      if (!cat) continue;
      const x = (lab.index - viewport.startIndex) / samplesPerPx;
      const y = LABEL_LANE_HEIGHT / 2;

      ctx.strokeStyle = `${cat.hex}55`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, LABEL_LANE_HEIGHT);
      ctx.lineTo(x + 0.5, traceTop + traceHeight / 2);
      ctx.stroke();

      ctx.fillStyle = cat.hex;
      ctx.beginPath();
      ctx.arc(x, y, LABEL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0a0f1a';
      ctx.fillText(lab.type, x, y + 0.5);
    }
  }, [signal, labels, viewport, cssW, cssH, dpr, visibleSet, yScale]);

  const handlePointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const yCss = e.clientY - rect.top;

    if (yCss < LABEL_LANE_HEIGHT) {
      const samplesPerPx = viewport.samplesPerView / rect.width;
      const cursorIndex = viewport.startIndex + xCss * samplesPerPx;
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < labels.length; i++) {
        const lab = labels[i];
        if (
          lab.index < viewport.startIndex ||
          lab.index >= viewport.startIndex + viewport.samplesPerView
        )
          continue;
        if (!visibleSet.has(lab.type)) continue;
        const d = Math.abs(lab.index - cursorIndex);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const hitTolerancePx = LABEL_RADIUS + 2;
      if (bestIdx >= 0 && bestDist / samplesPerPx <= hitTolerancePx) {
        onLabelClick?.(bestIdx);
        return;
      }
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      width: rect.width,
    };
  };

  const handlePointerMove = (e) => {
    const ds = dragState.current;
    if (!ds || ds.pointerId !== e.pointerId) return;
    const dx = e.clientX - ds.lastX;
    if (dx === 0) return;
    ds.lastX = e.clientX;
    const samplesPerPx = viewport.samplesPerView / ds.width;
    onPan?.(-dx * samplesPerPx);
  };

  const handlePointerUp = (e) => {
    const ds = dragState.current;
    if (!ds || ds.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragState.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const anchorFrac = (e.clientX - rect.left) / rect.width;
    const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
    onZoom?.(factor, Math.max(0, Math.min(1, anchorFrac)));
  };

  const handleKey = (e) => {
    const step = viewport.samplesPerView * 0.15;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onPan?.(-step);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onPan?.(step);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      onZoom?.(1 / 1.25, 0.5);
    } else if (e.key === '-') {
      e.preventDefault();
      onZoom?.(1.25, 0.5);
    }
  };

  return html`
    <div
      ref=${containerRef}
      tabIndex=${0}
      onKeyDown=${handleKey}
      style=${{ height }}
      className="relative w-full select-none rounded-lg outline-none ring-1 ring-slate-800/60 focus:ring-cyan-500/40"
    >
      <canvas
        ref=${canvasRef}
        className="block h-full w-full cursor-grab rounded-lg active:cursor-grabbing"
        onPointerDown=${handlePointerDown}
        onPointerMove=${handlePointerMove}
        onPointerUp=${handlePointerUp}
        onPointerCancel=${handlePointerUp}
        onWheel=${handleWheel}
      />
    </div>
  `;
}
