import { useMemo } from 'react';
import { BackSide, CanvasTexture } from 'three';

/**
 * Generates a pixelated AFL stadium crowd texture onto a canvas.
 * The texture wraps the interior of the sky-sphere: the equatorial band
 * (UV v ≈ 0.35–0.65) becomes the crowd stands; above is a floodlit night sky.
 */
function generateCrowdTexture(): HTMLCanvasElement {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Night sky (upper 40% of texture = v > 0.6 on the sphere) ──────────────
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  skyGrad.addColorStop(0, '#01020a');
  skyGrad.addColorStop(0.6, '#04060f');
  skyGrad.addColorStop(1, '#080e1c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.42);

  // Floodlight glow blobs (4 lights evenly spaced around the dome)
  const lightPositions = [0.12, 0.38, 0.62, 0.88];
  for (const lx of lightPositions) {
    const x = lx * W, y = H * 0.06;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 90);
    grad.addColorStop(0, 'rgba(255,252,240,1.0)');
    grad.addColorStop(0.05, 'rgba(255,240,180,0.9)');
    grad.addColorStop(0.2, 'rgba(200,170,80,0.3)');
    grad.addColorStop(1, 'rgba(50,80,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Lower dome — smooth dark gradient (stadium stands are 3D geometry now) ──
  const lowerGrad = ctx.createLinearGradient(0, H * 0.38, 0, H);
  lowerGrad.addColorStop(0, '#080e1c');
  lowerGrad.addColorStop(0.4, '#04060a');
  lowerGrad.addColorStop(1, '#010204');
  ctx.fillStyle = lowerGrad;
  ctx.fillRect(0, H * 0.38, W, H * 0.62);

  return canvas;
}

/**
 * Stadium sky dome — large inverted sphere with a pixelated crowd texture.
 * Wraps a procedurally-generated canvas texture around the scene.
 */
export function SkyDome() {
  const texture = useMemo(() => {
    const canvas = generateCrowdTexture();
    return new CanvasTexture(canvas);
  }, []);

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[800, 48, 24]} />
      <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} />
    </mesh>
  );
}
