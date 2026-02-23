import { CanvasTexture } from 'three';
import type { AFLTeamPreset, JerseyPattern } from '../data/aflTeams';

const TEX_SIZE = 512;

// Zone boundaries in texture space (UV-mapped: top=collar, bottom=hem, sides=sleeves)
const COLLAR_H = 70;
const HEM_H = 60;
const SLEEVE_W = 90;
const BODY_Y = COLLAR_H;
const BODY_H = TEX_SIZE - COLLAR_H - HEM_H;

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Build SVG <defs> with named patterns for secondary and sleeve colour zones.
// The diagonal-stripe overlay on secondary zones adds a visual texture cue that
// helps differentiate teams even when 3D lighting washes out hue differences.
function buildDefs(team: AFLTeamPreset): string {
  const sleeveColor = team.tertiaryColor ?? team.secondaryColor;
  const secLine = getContrastColor(team.secondaryColor);
  const slvLine = getContrastColor(sleeveColor);

  return `<defs>
    <!-- Diagonal stripe texture for secondary colour zones -->
    <pattern id="secTex" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
      <rect width="14" height="14" fill="${team.secondaryColor}"/>
      <line x1="0" y1="0" x2="0" y2="14" stroke="${secLine}" stroke-width="3" opacity="0.18"/>
    </pattern>
    <!-- Diagonal stripe texture for sleeve/tertiary colour zones -->
    <pattern id="slvTex" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
      <rect width="14" height="14" fill="${sleeveColor}"/>
      <line x1="0" y1="0" x2="0" y2="14" stroke="${slvLine}" stroke-width="3" opacity="0.18"/>
    </pattern>
  </defs>`;
}

// Pattern functions now receive explicit fill strings so they can be either
// a plain hex colour (primary) or a url(#...) texture reference (secondary).
type PatternSVGFn = (
  priFill: string,
  secFill: string,
  S: number,
  bodyY: number,
  bodyH: number,
) => string;

const patternSVG: Record<JerseyPattern, PatternSVGFn> = {
  solid(priFill, _secFill, S, bodyY, bodyH) {
    return `<rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${priFill}"/>`;
  },

  'vertical-stripes'(priFill, secFill, S, bodyY, bodyH) {
    const stripeCount = 6;
    const stripeW = S / stripeCount;
    let els = '';
    for (let i = 0; i < stripeCount; i++) {
      els += `<rect x="${i * stripeW}" y="${bodyY}" width="${stripeW}" height="${bodyH}" fill="${i % 2 === 0 ? priFill : secFill}"/>`;
    }
    return els;
  },

  'horizontal-stripes'(priFill, secFill, S, bodyY, bodyH) {
    const stripeCount = 5;
    const stripeH = bodyH / stripeCount;
    let els = '';
    for (let i = 0; i < stripeCount; i++) {
      els += `<rect x="0" y="${bodyY + i * stripeH}" width="${S}" height="${stripeH}" fill="${i % 2 === 0 ? priFill : secFill}"/>`;
    }
    return els;
  },

  sash(priFill, secFill, S, bodyY, bodyH) {
    const endY = bodyY + bodyH;
    return `
      <rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${priFill}"/>
      <polygon points="0,${bodyY} ${S * 0.4},${bodyY} ${S},${bodyY + bodyH * 0.6} ${S},${endY} ${S * 0.6},${endY} 0,${bodyY + bodyH * 0.4}" fill="${secFill}"/>
    `;
  },

  hoops(priFill, secFill, S, bodyY, bodyH) {
    const hoopCount = 6;
    const hoopH = bodyH / hoopCount;
    let els = '';
    for (let i = 0; i < hoopCount; i++) {
      els += `<rect x="0" y="${bodyY + i * hoopH}" width="${S}" height="${hoopH}" fill="${i % 2 === 0 ? priFill : secFill}"/>`;
    }
    return els;
  },

  vee(priFill, secFill, S, bodyY, bodyH) {
    const midX = S / 2;
    return `
      <rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${priFill}"/>
      <polygon points="0,${bodyY} ${midX},${bodyY + bodyH * 0.5} ${S},${bodyY} ${S},${bodyY + bodyH * 0.3} ${midX},${bodyY + bodyH * 0.7} 0,${bodyY + bodyH * 0.3}" fill="${secFill}"/>
    `;
  },

  yoke(priFill, secFill, S, bodyY, bodyH) {
    const midX = S / 2;
    return `
      <rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${priFill}"/>
      <polygon points="0,${bodyY} ${S},${bodyY} ${S},${bodyY + bodyH * 0.35} ${midX},${bodyY + bodyH * 0.55} 0,${bodyY + bodyH * 0.35}" fill="${secFill}"/>
    `;
  },
};

function buildJerseySVG(team: AFLTeamPreset, playerNumber?: number): string {
  const S = TEX_SIZE;
  const numberColor = getContrastColor(team.primaryColor);

  // Primary zones are plain hex; secondary/sleeve zones use the textured pattern fills
  const priFill = team.primaryColor;
  const secFill = 'url(#secTex)';
  const slvFill = 'url(#slvTex)';

  // Body pattern
  const patternEl = (patternSVG[team.pattern] ?? patternSVG.solid)(priFill, secFill, S, BODY_Y, BODY_H);

  // Sleeve overlays on left and right sides (textured)
  const sleeves = `
    <rect x="0" y="${BODY_Y}" width="${SLEEVE_W}" height="${BODY_H}" fill="${slvFill}"/>
    <rect x="${S - SLEEVE_W}" y="${BODY_Y}" width="${SLEEVE_W}" height="${BODY_H}" fill="${slvFill}"/>
  `;

  // Seam lines between body and sleeves
  const seams = `
    <line x1="${SLEEVE_W}" y1="${BODY_Y}" x2="${SLEEVE_W}" y2="${BODY_Y + BODY_H}" stroke="${team.secondaryColor}" stroke-width="2" opacity="0.35"/>
    <line x1="${S - SLEEVE_W}" y1="${BODY_Y}" x2="${S - SLEEVE_W}" y2="${BODY_Y + BODY_H}" stroke="${team.secondaryColor}" stroke-width="2" opacity="0.35"/>
  `;

  // Collar zone — textured secondary
  const collarEl = `<rect x="0" y="0" width="${S}" height="${COLLAR_H}" fill="${secFill}"/>`;

  // Hem zone — plain primary
  const hemEl = `
    <rect x="0" y="${S - HEM_H}" width="${S}" height="${HEM_H}" fill="${team.primaryColor}"/>
    <line x1="0" y1="${S - HEM_H}" x2="${S}" y2="${S - HEM_H}" stroke="${team.secondaryColor}" stroke-width="3" opacity="0.5"/>
  `;

  // Player number — centered horizontally (UV 0.5 = front face of capsule), upper body
  const numberEl = playerNumber
    ? `<text x="${S / 2}" y="${BODY_Y + BODY_H * 0.42}" font-family="Arial Black, Arial, sans-serif" font-size="88" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="${numberColor}" stroke="#00000055" stroke-width="3">${playerNumber}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    ${buildDefs(team)}
    ${patternEl}
    ${sleeves}
    ${seams}
    ${collarEl}
    ${hemEl}
    ${numberEl}
  </svg>`;
}

const textureCache = new Map<string, CanvasTexture>();

export async function generateJerseySVGTexture(
  team: AFLTeamPreset,
  playerNumber?: number,
): Promise<CanvasTexture> {
  const cacheKey = `${team.id}-${playerNumber ?? 'none'}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  return new Promise((resolve) => {
    const svg = buildJerseySVG(team, playerNumber);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = TEX_SIZE;
      canvas.height = TEX_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const texture = new CanvasTexture(canvas);
      texture.needsUpdate = true;
      textureCache.set(cacheKey, texture);
      resolve(texture);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: simple solid color
      const canvas = document.createElement('canvas');
      canvas.width = TEX_SIZE;
      canvas.height = TEX_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = team.primaryColor;
      ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
      const texture = new CanvasTexture(canvas);
      texture.needsUpdate = true;
      resolve(texture);
    };

    img.src = url;
  });
}

// Legacy sync export kept for any remaining callers — returns plain color texture
export function generateJerseyTexture(team: AFLTeamPreset): CanvasTexture {
  const cacheKey = `${team.id}-sync`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = team.primaryColor;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function clearTextureCache() {
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
}
