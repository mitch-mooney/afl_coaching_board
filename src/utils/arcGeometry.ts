/** Point on a circle. Degrees, SVG convention (y grows downward). */
export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const a = deg * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** SVG arc path from angle a0 to a1 (degrees), drawn clockwise (sweep-flag 1). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
}
