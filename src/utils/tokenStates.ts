/**
 * tokenStates: the states a Player token shows, and which token draws over
 * which. Pure, so the scene only paints what this decides.
 */

/**
 * The Floodlight ring outside a token's band. `full` marks the selected player
 * and the Carrier; `hover` marks the token a dropped ball would go to, the
 * state the box figure shows by turning white.
 */
export type TokenRing = 'none' | 'full' | 'hover';

export function tokenRing({
  selected,
  carrier,
  dropTarget,
  hovered,
}: {
  selected: boolean;
  carrier: boolean;
  dropTarget: boolean;
  hovered: boolean;
}): TokenRing {
  if (selected || carrier) return 'full';
  if (dropTarget || hovered) return 'hover';
  return 'none';
}

/**
 * Where each token sits in the stack where tokens overlap, keyed by player id:
 * 0 at the bottom, one place per player. The rest keep the board's order, so
 * a tight cluster draws the same way every frame; the Carrier goes above them
 * and the selected player above everyone.
 */
export function tokenStacking(
  playerIds: string[],
  { selectedId, carrierId }: { selectedId: string | null; carrierId: string | null },
): Record<string, number> {
  const raised = (id: string) => (id === selectedId ? 2 : id === carrierId ? 1 : 0);
  // Array.prototype.sort is stable, so equals keep the board's order.
  const stacked = [...playerIds].sort((a, b) => raised(a) - raised(b));
  return Object.fromEntries(stacked.map((id, place) => [id, place]));
}
