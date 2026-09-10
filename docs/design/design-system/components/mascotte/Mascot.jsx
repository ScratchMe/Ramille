import React from 'react';
// Source : src/components/mascot.tsx + src/types/mascot.ts — géométrie calculée, compensation optique, feuille seule < 28.
const LEAF_PATH = 'M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z';
const NOMINAL_SIZE = 42, MIN_FACE = 28, MAX_K = 1.5, POS_SHARE = 0.2, CY = 58, AX = 50;
const NOMINAL_FACE = {
  calm: { eyes: 'dots', eyeSpread: 11, eyeShiftX: 0, eyeY: 50, eyeRadius: 4.2, eyeArcHalfWidth: 5, eyeArcDepth: 0, mouthHalfWidth: 8, mouthY: 62, mouthDepth: 3, blushSpread: 17, blushY: 60, blushRadius: 5, blushOpacity: 0.55 },
  happy: { eyes: 'happy', eyeSpread: 11, eyeShiftX: 0, eyeY: 49, eyeRadius: 4.2, eyeArcHalfWidth: 5, eyeArcDepth: -2.5, mouthHalfWidth: 10, mouthY: 60, mouthDepth: 6, blushSpread: 17, blushY: 59, blushRadius: 5.4, blushOpacity: 0.6 },
  encouraging: { eyes: 'soft', eyeSpread: 11, eyeShiftX: 0, eyeY: 51, eyeRadius: 4.2, eyeArcHalfWidth: 4, eyeArcDepth: 1.5, mouthHalfWidth: 7, mouthY: 63, mouthDepth: 1.5, blushSpread: 17, blushY: 60, blushRadius: 5, blushOpacity: 0.55 },
  thinking: { eyes: 'dots', eyeSpread: 11, eyeShiftX: -1, eyeY: 47, eyeRadius: 4.2, eyeArcHalfWidth: 5, eyeArcDepth: 0, mouthHalfWidth: 5, mouthY: 63, mouthDepth: 0, blushSpread: 17, blushY: 61, blushRadius: 4.6, blushOpacity: 0.4 },
  resting: { eyes: 'soft', eyeSpread: 11, eyeShiftX: 0, eyeY: 50, eyeRadius: 4.2, eyeArcHalfWidth: 5, eyeArcDepth: 2.5, mouthHalfWidth: 6, mouthY: 63, mouthDepth: 1.5, blushSpread: 17, blushY: 60, blushRadius: 5, blushOpacity: 0.5 },
};
const r = (v) => Math.round(v * 100) / 100;
const quad = (cx, hw, y, d) => 'M' + r(cx - hw) + ',' + r(y) + ' Q' + r(cx) + ',' + r(y + d * 2) + ' ' + r(cx + hw) + ',' + r(y);
export function opticalScale(size) { return size >= NOMINAL_SIZE ? 1 : Math.min(NOMINAL_SIZE / Math.max(size, 1), MAX_K); }
export function mascotFaceGeometry(mood, size) {
  const f = NOMINAL_FACE[mood] || NOMINAL_FACE.calm;
  const k = opticalScale(size), kp = 1 + (k - 1) * POS_SHARE;
  const eyeY = CY + (f.eyeY - CY) * kp, mouthY = CY + (f.mouthY - CY) * kp, blushY = CY + (f.blushY - CY) * kp;
  const spread = f.eyeSpread * kp, shift = f.eyeShiftX * kp;
  const sides = [-1, 1];
  return {
    visible: size >= MIN_FACE, eyes: f.eyes,
    eyeCircles: sides.map((s) => ({ cx: r(AX + s * r(spread) + shift), cy: r(eyeY), r: r(f.eyeRadius * k) })),
    eyeArcs: sides.map((s) => quad(AX + s * r(spread) + shift, f.eyeArcHalfWidth * k, eyeY, f.eyeArcDepth * k)),
    eyeStrokeWidth: r(3.4 * k), mouthPath: quad(AX, f.mouthHalfWidth * k, mouthY, f.mouthDepth * k), mouthStrokeWidth: r(3.2 * k),
    blushCircles: sides.map((s) => ({ cx: AX + s * r(f.blushSpread), cy: r(blushY), r: r(f.blushRadius * kp) })),
    blushOpacity: f.blushOpacity, veinStrokeWidth: r(4 * k),
  };
}
let uid = 0;
export function Mascot({ mood = 'calm', size = 40, tilt = 0, animated = false, style, accessory }) {
  const face = mascotFaceGeometry(mood, size);
  const id = React.useMemo(() => 'leaf-' + (++uid), []);
  const t = Math.max(-12, Math.min(12, tilt));
  return (
    <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size, transform: 'rotate(' + t + 'deg)', animation: animated ? 'ramille-breathe 2.8s ease-in-out infinite' : 'none', flexShrink: 0, ...style }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs><clipPath id={id}><path d={LEAF_PATH} /></clipPath></defs>
        <path d={LEAF_PATH} fill="var(--color-accent)" />
        <path d="M50,18 C46,26 46,32 50,38" stroke="var(--color-mascot-vein)" strokeWidth={face.veinStrokeWidth} strokeLinecap="round" fill="none" opacity={0.55} />
        {face.visible && (
          <g clipPath={'url(#' + id + ')'}>
            {face.blushCircles.map((b, i) => <circle key={'b' + i} cx={b.cx} cy={b.cy} r={b.r} fill="var(--color-accent-muted)" opacity={face.blushOpacity} />)}
            {face.eyes === 'dots'
              ? face.eyeCircles.map((e, i) => <circle key={'e' + i} cx={e.cx} cy={e.cy} r={e.r} fill="var(--color-mascot-ink)" />)
              : face.eyeArcs.map((d, i) => <path key={'e' + i} d={d} stroke="var(--color-mascot-ink)" strokeWidth={face.eyeStrokeWidth} strokeLinecap="round" fill="none" />)}
            <path d={face.mouthPath} stroke="var(--color-mascot-ink)" strokeWidth={face.mouthStrokeWidth} strokeLinecap="round" fill="none" />
          </g>
        )}
        {face.visible && accessory}
      </svg>
    </span>
  );
}
