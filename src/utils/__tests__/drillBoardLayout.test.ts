import { describe, it, expect } from 'vitest';
import { getDrillBoardLayout } from '../drillBoardLayout';
import type { Drill } from '../../models/TrainingSession';

const makeDrill = (overrides: Partial<Drill>): Drill => ({
  id: 'test-1',
  name: 'Test Drill',
  description: 'desc',
  category: 'marking',
  durationSeconds: 600,
  playersRequired: 6,
  equipment: [],
  instructions: [],
  difficulty: 'beginner',
  ...overrides,
});

describe('getDrillBoardLayout', () => {
  it('returns the correct number of player positions', () => {
    const drill = makeDrill({ playersRequired: 6 });
    const { playerPositions } = getDrillBoardLayout(drill);
    expect(playerPositions).toHaveLength(6);
  });

  it('splits players evenly between team A and team B', () => {
    const drill = makeDrill({ playersRequired: 6 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const teamA = playerPositions.filter(p => p.teamId === 'team1');
    const teamB = playerPositions.filter(p => p.teamId === 'team2');
    expect(teamA).toHaveLength(3);
    expect(teamB).toHaveLength(3);
  });

  it('handles odd playersRequired — extra player goes to team A', () => {
    const drill = makeDrill({ playersRequired: 5 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const teamA = playerPositions.filter(p => p.teamId === 'team1');
    const teamB = playerPositions.filter(p => p.teamId === 'team2');
    expect(teamA).toHaveLength(3);
    expect(teamB).toHaveLength(2);
  });

  it('each player position has required Player fields', () => {
    const drill = makeDrill({ playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    for (const p of playerPositions) {
      expect(typeof p.id).toBe('string');
      expect(p.position).toHaveLength(3);
      expect(p.position[1]).toBe(0); // y = 0
      expect(p.rotation).toBeDefined();
      expect(p.color).toBeDefined();
    }
  });

  it('returns no cones when equipment has no cones', () => {
    const drill = makeDrill({ equipment: ['footballs'] });
    const { conePositions } = getDrillBoardLayout(drill);
    expect(conePositions).toHaveLength(0);
  });

  it('returns cones when equipment includes cones', () => {
    const drill = makeDrill({ equipment: ['cones'] });
    const { conePositions } = getDrillBoardLayout(drill);
    expect(conePositions.length).toBeGreaterThanOrEqual(4);
  });

  it('places attack drill players in forward 50 (positive x)', () => {
    const drill = makeDrill({ category: 'attack', playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const allInForward50 = playerPositions.every(p => p.position[0] > 20);
    expect(allInForward50).toBe(true);
  });

  it('places defence drill players in back 50 (negative x)', () => {
    const drill = makeDrill({ category: 'defence', playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const allInBack50 = playerPositions.every(p => p.position[0] < -20);
    expect(allInBack50).toBe(true);
  });

  it('places rucking drill players near centre', () => {
    const drill = makeDrill({ category: 'rucking', playersRequired: 4 });
    const { playerPositions } = getDrillBoardLayout(drill);
    const allNearCentre = playerPositions.every(p => Math.abs(p.position[0]) < 20);
    expect(allNearCentre).toBe(true);
  });

  it('cone positions are valid [x, y, z] tuples with y = 0', () => {
    const drill = makeDrill({ equipment: ['cones'] });
    const { conePositions } = getDrillBoardLayout(drill);
    for (const pos of conePositions) {
      expect(pos).toHaveLength(3);
      expect(pos[1]).toBe(0);
    }
  });
});
