import { useMemo } from 'react';
import { BackSide, CanvasTexture } from 'three';
import { withAlpha } from '../../theme/tokens';
import { skyColours } from './nightGround';

/**
 * Paints the night sky onto a canvas. The texture wraps the interior of the
 * sky-sphere: above the horizon is the night sky with the towers' glow in it,
 * below is a dark gradient behind the stands (which are 3D geometry in `Field`).
 * Colours are the night ground's `skyColours`.
 */
function generateSkyTexture(): HTMLCanvasElement {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Night sky (upper 40% of texture = v > 0.6 on the sphere) ──────────────
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  skyGrad.addColorStop(0, skyColours.zenith);
  skyGrad.addColorStop(1, skyColours.horizon);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.42);

  // Glow from the four towers, evenly spaced around the dome
  const lightPositions = [0.12, 0.38, 0.62, 0.88];
  for (const lx of lightPositions) {
    const x = lx * W, y = H * 0.06;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 90);
    grad.addColorStop(0, withAlpha(skyColours.lamp, 1));
    grad.addColorStop(0.05, withAlpha(skyColours.lamp, 0.85));
    grad.addColorStop(0.2, withAlpha(skyColours.lamp, 0.22));
    grad.addColorStop(1, withAlpha(skyColours.lamp, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Lower dome — smooth dark gradient behind the stands ──
  const lowerGrad = ctx.createLinearGradient(0, H * 0.38, 0, H);
  lowerGrad.addColorStop(0, skyColours.horizon);
  lowerGrad.addColorStop(1, skyColours.below);
  ctx.fillStyle = lowerGrad;
  ctx.fillRect(0, H * 0.38, W, H * 0.62);

  return canvas;
}

/**
 * Stadium sky dome — large inverted sphere with the night sky painted inside.
 */
export function SkyDome() {
  const texture = useMemo(() => {
    const canvas = generateSkyTexture();
    return new CanvasTexture(canvas);
  }, []);

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[800, 48, 24]} />
      <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} />
    </mesh>
  );
}
