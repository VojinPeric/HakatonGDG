import { useCallback, useState } from 'react';

// Encapsulates pan/zoom state for the primary ECG viewer.
// startIndex / samplesPerView are clamped against `total`.
export default function useEcgViewport(total, initialSamplesPerView) {
  const [viewport, setViewport] = useState(() => ({
    startIndex: 0,
    samplesPerView: Math.min(initialSamplesPerView, total),
  }));

  const clampStart = useCallback(
    (start, samples) => {
      const maxStart = Math.max(0, total - samples);
      return Math.round(Math.min(Math.max(0, start), maxStart));
    },
    [total],
  );

  const setStart = useCallback(
    (start) => {
      setViewport((vp) => ({ ...vp, startIndex: clampStart(start, vp.samplesPerView) }));
    },
    [clampStart],
  );

  const panBy = useCallback(
    (deltaSamples) => {
      setViewport((vp) => ({
        ...vp,
        startIndex: clampStart(vp.startIndex + deltaSamples, vp.samplesPerView),
      }));
    },
    [clampStart],
  );

  // anchorFrac: 0..1 location of zoom anchor in current viewport.
  const zoomAt = useCallback(
    (factor, anchorFrac = 0.5) => {
      setViewport((vp) => {
        const minSamples = 200;
        const maxSamples = total;
        let next = Math.round(vp.samplesPerView * factor);
        next = Math.max(minSamples, Math.min(maxSamples, next));
        const anchorIndex = vp.startIndex + vp.samplesPerView * anchorFrac;
        let nextStart = Math.round(anchorIndex - next * anchorFrac);
        const maxStart = Math.max(0, total - next);
        nextStart = Math.min(Math.max(0, nextStart), maxStart);
        return { startIndex: nextStart, samplesPerView: next };
      });
    },
    [total],
  );

  const setSamplesPerView = useCallback(
    (samples) => {
      setViewport((vp) => {
        const clamped = Math.max(200, Math.min(total, Math.round(samples)));
        return { ...vp, samplesPerView: clamped, startIndex: clampStart(vp.startIndex, clamped) };
      });
    },
    [clampStart, total],
  );

  const centerOn = useCallback(
    (index) => {
      setViewport((vp) => ({
        ...vp,
        startIndex: clampStart(index - Math.round(vp.samplesPerView / 2), vp.samplesPerView),
      }));
    },
    [clampStart],
  );

  return { viewport, setStart, panBy, zoomAt, setSamplesPerView, centerOn };
}
