import { describe, it, expect } from 'vitest';
import { tokenRing, tokenStacking } from '../tokenStates';

const quiet = { selected: false, carrier: false, dropTarget: false, hovered: false };

describe('tokenRing', () => {
  it('rings nobody in particular with nothing', () => {
    expect(tokenRing(quiet)).toBe('none');
  });

  it('rings the selected player in full Floodlight', () => {
    expect(tokenRing({ ...quiet, selected: true })).toBe('full');
  });

  it('rings the Carrier in full Floodlight', () => {
    expect(tokenRing({ ...quiet, carrier: true })).toBe('full');
  });

  it('marks the drop target with the hover ring, as the figure turns white under it', () => {
    expect(tokenRing({ ...quiet, dropTarget: true })).toBe('hover');
    expect(tokenRing({ ...quiet, hovered: true })).toBe('hover');
  });

  it('lets selection and possession outrank hover', () => {
    expect(tokenRing({ ...quiet, selected: true, dropTarget: true })).toBe('full');
    expect(tokenRing({ ...quiet, carrier: true, hovered: true })).toBe('full');
  });
});

describe('tokenStacking', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('stacks the rest in board order, so the order never shuffles', () => {
    expect(tokenStacking(ids, { selectedId: null, carrierId: null })).toEqual({ a: 0, b: 1, c: 2, d: 3 });
  });

  it('puts the Carrier above everyone else', () => {
    const order = tokenStacking(ids, { selectedId: null, carrierId: 'a' });
    expect(order.a).toBeGreaterThan(Math.max(order.b, order.c, order.d));
  });

  it('puts the selected player above everyone, the Carrier included', () => {
    const order = tokenStacking(ids, { selectedId: 'b', carrierId: 'a' });
    expect(order.b).toBeGreaterThan(order.a);
    expect(order.a).toBeGreaterThan(Math.max(order.c, order.d));
  });

  it('keeps the rest in board order around the raised ones', () => {
    const order = tokenStacking(ids, { selectedId: 'b', carrierId: 'a' });
    expect(order.c).toBeLessThan(order.d);
  });

  it('gives every player a different place, even when selected and Carrier are one', () => {
    const order = tokenStacking(ids, { selectedId: 'c', carrierId: 'c' });
    expect(new Set(Object.values(order)).size).toBe(ids.length);
    expect(order.c).toBe(3);
  });

  it('ignores a selection or Carrier the board does not hold', () => {
    expect(tokenStacking(ids, { selectedId: 'gone', carrierId: 'ball-x' })).toEqual({ a: 0, b: 1, c: 2, d: 3 });
  });
});
