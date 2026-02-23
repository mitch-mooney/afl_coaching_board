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

type PatternSVGFn = (
  team: AFLTeamPreset,
  S: number,
  bodyY: number,
  bodyH: number,
) => string;

const patternSVG: Record<JerseyPattern, PatternSVGFn> = {
  solid(team, S, bodyY, bodyH) {
    return `<rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${team.primaryColor}"/>`;
  },

  'vertical-stripes'(team, S, bodyY, bodyH) {
    const stripeCount = 6;
    const stripeW = S / stripeCount;
    let els = '';
    for (let i = 0; i < stripeCount; i++) {
      els += `<rect x="${i * stripeW}" y="${bodyY}" width="${stripeW}" height="${bodyH}" fill="${i % 2 === 0 ? team.primaryColor : team.secondaryColor}"/>`;
    }
    return els;
  },

  'horizontal-stripes'(team, S, bodyY, bodyH) {
    const stripeCount = 5;
    const stripeH = bodyH / stripeCount;
    let els = '';
    for (let i = 0; i < stripeCount; i++) {
      els += `<rect x="0" y="${bodyY + i * stripeH}" width="${S}" height="${stripeH}" fill="${i % 2 === 0 ? team.primaryColor : team.secondaryColor}"/>`;
    }
    return els;
  },

  sash(team, S, bodyY, bodyH) {
    const endY = bodyY + bodyH;
    return `
      <rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${team.primaryColor}"/>
      <polygon points="0,${bodyY} ${S * 0.4},${bodyY} ${S},${bodyY + bodyH * 0.6} ${S},${endY} ${S * 0.6},${endY} 0,${bodyY + bodyH * 0.4}" fill="${team.secondaryColor}"/>
    `;
  },

  hoops(team, S, bodyY, bodyH) {
    const hoopCount = 6;
    const hoopH = bodyH / hoopCount;
    let els = '';
    for (let i = 0; i < hoopCount; i++) {
      els += `<rect x="0" y="${bodyY + i * hoopH}" width="${S}" height="${hoopH}" fill="${i % 2 === 0 ? team.primaryColor : team.secondaryColor}"/>`;
    }
    return els;
  },

  vee(team, S, bodyY, bodyH) {
    const midX = S / 2;
    return `
      <rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${team.primaryColor}"/>
      <polygon points="0,${bodyY} ${midX},${bodyY + bodyH * 0.5} ${S},${bodyY} ${S},${bodyY + bodyH * 0.3} ${midX},${bodyY + bodyH * 0.7} 0,${bodyY + bodyH * 0.3}" fill="${team.secondaryColor}"/>
    `;
  },

  yoke(team, S, bodyY, bodyH) {
    const midX = S / 2;
    return `
      <rect x="0" y="${bodyY}" width="${S}" height="${bodyH}" fill="${team.primaryColor}"/>
      <polygon points="0,${bodyY} ${S},${bodyY} ${S},${bodyY + bodyH * 0.35} ${midX},${bodyY + bodyH * 0.55} 0,${bodyY + bodyH * 0.35}" fill="${team.secondaryColor}"/>
    `;
  },
};

function buildJerseySVG(team: AFLTeamPreset, playerNumber?: number): string {
  const S = TEX_SIZE;
  const sleeveColor = team.tertiaryColor ?? team.secondaryColor;
  const numberColor = getContrastColor(team.primaryColor);

  // Body pattern (fills full body zone including sleeve area)
  const patternEl = (patternSVG[team.pattern] ?? patternSVG.solid)(team, S, BODY_Y, BODY_H);

  // Sleeve overlays on left and right sides
  const sleeves = `
    <rect x="0" y="${BODY_Y}" width="${SLEEVE_W}" height="${BODY_H}" fill="${sleeveColor}" opacity="0.85"/>
    <rect x="${S - SLEEVE_W}" y="${BODY_Y}" width="${SLEEVE_W}" height="${BODY_H}" fill="${sleeveColor}" opacity="0.85"/>
  `;

  // Seam lines between body and sleeves
  const seams = `
    <line x1="${SLEEVE_W}" y1="${BODY_Y}" x2="${SLEEVE_W}" y2="${BODY_Y + BODY_H}" stroke="${team.secondaryColor}" stroke-width="2" opacity="0.35"/>
    <line x1="${S - SLEEVE_W}" y1="${BODY_Y}" x2="${S - SLEEVE_W}" y2="${BODY_Y + BODY_H}" stroke="${team.secondaryColor}" stroke-width="2" opacity="0.35"/>
  `;

  // Collar zone (top of texture = top of torso in UV space)
  const collarEl = `<rect x="0" y="0" width="${S}" height="${COLLAR_H}" fill="${team.secondaryColor}"/>`;

  // Hem zone (bottom of texture = bottom of torso)
  const hemEl = `
    <rect x="0" y="${S - HEM_H}" width="${S}" height="${HEM_H}" fill="${team.primaryColor}"/>
    <line x1="0" y1="${S - HEM_H}" x2="${S}" y2="${S - HEM_H}" stroke="${team.secondaryColor}" stroke-width="3" opacity="0.5"/>
  `;

  // Player number — centered horizontally (UV 0.5 = front face of capsule), upper body
  const numberEl = playerNumber
    ? `<text x="${S / 2}" y="${BODY_Y + BODY_H * 0.42}" font-family="Arial Black, Arial, sans-serif" font-size="88" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="${numberColor}" stroke="#00000055" stroke-width="3">${playerNumber}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
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
