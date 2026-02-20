import { CanvasTexture } from 'three';
import type { AFLTeamPreset, JerseyPattern } from '../data/aflTeams';

const TEX_SIZE = 128;

const patternDrawers: Record<JerseyPattern, (ctx: CanvasRenderingContext2D, team: AFLTeamPreset) => void> = {
  solid(ctx, team) {
    ctx.fillStyle = team.primaryColor;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  },

  'vertical-stripes'(ctx, team) {
    const stripeCount = 5;
    const stripeW = TEX_SIZE / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? team.primaryColor : team.secondaryColor;
      ctx.fillRect(i * stripeW, 0, stripeW, TEX_SIZE);
    }
  },

  'horizontal-stripes'(ctx, team) {
    const stripeCount = 5;
    const stripeH = TEX_SIZE / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? team.primaryColor : team.secondaryColor;
      ctx.fillRect(0, i * stripeH, TEX_SIZE, stripeH);
    }
  },

  sash(ctx, team) {
    ctx.fillStyle = team.primaryColor;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    ctx.fillStyle = team.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(TEX_SIZE * 0.4, 0);
    ctx.lineTo(TEX_SIZE, TEX_SIZE * 0.6);
    ctx.lineTo(TEX_SIZE, TEX_SIZE);
    ctx.lineTo(TEX_SIZE * 0.6, TEX_SIZE);
    ctx.lineTo(0, TEX_SIZE * 0.4);
    ctx.closePath();
    ctx.fill();
  },

  hoops(ctx, team) {
    const hoopCount = 6;
    const hoopH = TEX_SIZE / hoopCount;
    for (let i = 0; i < hoopCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? team.primaryColor : team.secondaryColor;
      ctx.fillRect(0, i * hoopH, TEX_SIZE, hoopH);
    }
  },

  vee(ctx, team) {
    ctx.fillStyle = team.primaryColor;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    ctx.fillStyle = team.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(TEX_SIZE / 2, TEX_SIZE * 0.5);
    ctx.lineTo(TEX_SIZE, 0);
    ctx.lineTo(TEX_SIZE, TEX_SIZE * 0.3);
    ctx.lineTo(TEX_SIZE / 2, TEX_SIZE * 0.7);
    ctx.lineTo(0, TEX_SIZE * 0.3);
    ctx.closePath();
    ctx.fill();
  },

  yoke(ctx, team) {
    ctx.fillStyle = team.primaryColor;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    ctx.fillStyle = team.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(TEX_SIZE, 0);
    ctx.lineTo(TEX_SIZE, TEX_SIZE * 0.35);
    ctx.lineTo(TEX_SIZE / 2, TEX_SIZE * 0.55);
    ctx.lineTo(0, TEX_SIZE * 0.35);
    ctx.closePath();
    ctx.fill();
  },
};

const textureCache = new Map<string, CanvasTexture>();

export function generateJerseyTexture(team: AFLTeamPreset): CanvasTexture {
  const cached = textureCache.get(team.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  const drawer = patternDrawers[team.pattern] ?? patternDrawers.solid;
  drawer(ctx, team);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(team.id, texture);
  return texture;
}

export function clearTextureCache() {
  textureCache.forEach(tex => tex.dispose());
  textureCache.clear();
}
