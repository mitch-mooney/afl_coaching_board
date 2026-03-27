import { describe, it, expect } from 'vitest';
import {
  getFormationById,
  PRE_BUILT_FORMATIONS,
} from '../formations';
import type { PlayerPosition } from '../../types/Formation';

// Helper: get Team 1 3D position by role
function getTeam1Pos(formationId: string, role: string): PlayerPosition {
  const f = getFormationById(formationId);
  if (!f) throw new Error(`Formation ${formationId} not found`);
  const p = f.positions.find((pos) => pos.teamId === 'team1' && pos.role === role);
  if (!p) throw new Error(`Role ${role} not found in ${formationId}`);
  return p;
}

// 3D position = [pos.z, 0, pos.x], so:
function rawZ(p: PlayerPosition) { return p.position[0]; }  // formation z = goal axis
function rawX(p: PlayerPosition) { return p.position[2]; }  // formation x = wing axis

describe('CENTRE_BOUNCE formation', () => {
  it('Ruck (R) is at centre (both axes ≈ 0)', () => {
    const rk = getTeam1Pos('centre-bounce', 'R');
    expect(rawZ(rk)).toBeCloseTo(0, 0);
    expect(rawX(rk)).toBeCloseTo(0, 1);
  });

  it('Centre (C) is at 6 o\'clock (+z ≈ 5)', () => {
    const c = getTeam1Pos('centre-bounce', 'C');
    expect(rawZ(c)).toBeCloseTo(5, 0);
    expect(rawX(c)).toBeCloseTo(0, 1);
  });

  it('RR is at 3 o\'clock (+x ≈ 5)', () => {
    const rr = getTeam1Pos('centre-bounce', 'RR');
    expect(rawZ(rr)).toBeCloseTo(0, 0);
    expect(rawX(rr)).toBeCloseTo(5, 0);
  });

  it('RO is at 9 o\'clock (-x ≈ -5)', () => {
    const ro = getTeam1Pos('centre-bounce', 'RO');
    expect(rawZ(ro)).toBeCloseTo(0, 0);
    expect(rawX(ro)).toBeLessThan(-4);
  });

  it('Wings are on centre square boundary (|x| ≈ 25)', () => {
    const wl = getTeam1Pos('centre-bounce', 'W');
    expect(Math.abs(rawX(wl))).toBeCloseTo(25, 1);
  });

  it('FF is inside 50m arc (z > 32.5)', () => {
    const ff = getTeam1Pos('centre-bounce', 'FF');
    expect(rawZ(ff)).toBeGreaterThan(32.5);
  });

  it('FB is inside own 50m arc (z < -32.5)', () => {
    const fb = getTeam1Pos('centre-bounce', 'FB');
    expect(rawZ(fb)).toBeLessThan(-32.5);
  });
});

describe('KICK_IN_PRESSING formation', () => {
  it('is included in PRE_BUILT_FORMATIONS', () => {
    expect(PRE_BUILT_FORMATIONS.find((f) => f.id === 'kick-in-pressing')).toBeTruthy();
  });

  it('FF (Line 1) is 20m from opposition goal (z ≈ 62.5)', () => {
    const ff = getTeam1Pos('kick-in-pressing', 'FF');
    expect(rawZ(ff)).toBeCloseTo(62.5, 0);
  });

  it('CHF (Line 2) is 35m from opposition goal (z ≈ 47.5)', () => {
    const chf = getTeam1Pos('kick-in-pressing', 'CHF');
    expect(rawZ(chf)).toBeCloseTo(47.5, 0);
  });

  it('C (Line 3) is 52m from opposition goal (z ≈ 30.5)', () => {
    const c = getTeam1Pos('kick-in-pressing', 'C');
    expect(rawZ(c)).toBeCloseTo(30.5, 0);
  });
});

describe('KICK_IN_KICKING formation', () => {
  it('is included in PRE_BUILT_FORMATIONS', () => {
    expect(PRE_BUILT_FORMATIONS.find((f) => f.id === 'kick-in-kicking')).toBeTruthy();
  });

  it('FB (kicker) is near own goal (z < -70)', () => {
    const fb = getTeam1Pos('kick-in-kicking', 'FB');
    expect(rawZ(fb)).toBeLessThan(-70);
  });

  it('FF (receiver) is in forward half (z > 32.5)', () => {
    const ff = getTeam1Pos('kick-in-kicking', 'FF');
    expect(rawZ(ff)).toBeGreaterThan(32.5);
  });
});
