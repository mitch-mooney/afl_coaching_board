import { describe, it, expect } from 'vitest';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import { createTeamPlayers, type Player } from '../../models/PlayerModel';
import type { Annotation } from '../../store/annotationStore';
import type { BoardSnapshot } from '../boardSnapshot';
import { isPointInField, STANDARD_BOUNDARY } from '../fieldGeometry';
import {
  withoutPlayer,
  withoutPlayers,
  atFullStrength,
  placePlayer,
  teamAppearance,
} from '../boardPlacement';

function player(teamId: Player['teamId'], number: number): Player {
  return {
    id: `${teamId}-player-${number}`,
    teamId,
    position: [number, 0, number],
    rotation: 0,
    color: '#ffffff',
    number,
  };
}

/** `count` players of one team, numbered from `from` upward. */
function side(teamId: Player['teamId'], count: number, from = 1): Player[] {
  return Array.from({ length: count }, (_, i) => player(teamId, from + i));
}

const blue1 = player('team1', 1);
const red1 = player('team2', 1);
const blue1Path = createMovementPath(blue1.id, 'player', [1, 0, 1], [10, 0, 1], 2, 'path-blue1');
const red1Path = createMovementPath(red1.id, 'player', [1, 0, 1], [1, 0, 10], 2, 'path-red1');
const ballPath = createMovementPath('ball-1', 'ball', [0, 0, 0], [0, 0, 20], 1, 'path-ball');
const anAnnotation: Annotation = {
  id: 'a1',
  type: 'arrow',
  points: [[0, 0], [1, 1]],
  color: '#ffff00',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const board: BoardSnapshot = {
  players: [blue1, red1],
  paths: [blue1Path, ballPath, red1Path],
  annotations: [anAnnotation],
  camera: { position: [1, 2, 3], target: [4, 5, 6], zoom: 2 },
  ball: createBall([0, 0.5, 0], { assignedPlayerId: blue1.id }),
  cones: [{ id: 'c1', position: [8, 0, 8] }],
};

describe('withoutPlayer', () => {
  it('removes that player and no one else', () => {
    const removed = withoutPlayer(board, blue1.id);

    expect(removed.players).toEqual([red1]);
  });

  it('drops every path whose entity is that player and keeps every other, the ball\'s included', () => {
    const blue1Again = createMovementPath(blue1.id, 'player', [10, 0, 1], [20, 0, 1], 2, 'path-blue1-b');
    const twoPaths = { ...board, paths: [blue1Path, ballPath, blue1Again, red1Path] };

    const removed = withoutPlayer(twoPaths, blue1.id);

    expect(removed.paths).toEqual([ballPath, red1Path]);
  });

  it('releases the ball when it was assigned to that player, keeping it on the board', () => {
    const removed = withoutPlayer(board, blue1.id);

    expect(removed.ball).not.toBeNull();
    expect(removed.ball!.assignedPlayerId).toBeUndefined();
    expect(removed.ball!.position).toEqual([0, 0.5, 0]);
  });

  it('leaves the ball alone, by reference, when someone else holds it', () => {
    const removed = withoutPlayer(board, red1.id);

    expect(removed.ball).toBe(board.ball);
    expect(removed.ball!.assignedPlayerId).toBe(blue1.id);
  });

  it('leaves a null ball null', () => {
    expect(withoutPlayer({ ...board, ball: null }, blue1.id).ball).toBeNull();
  });

  it('hands the same snapshot back by reference when the player is not on the board', () => {
    expect(withoutPlayer(board, 'team1-player-99')).toBe(board);
  });

  it('carries annotations, cones and the camera through by reference and leaves the input alone', () => {
    const removed = withoutPlayer(board, blue1.id);

    expect(removed.annotations).toBe(board.annotations);
    expect(removed.cones).toBe(board.cones);
    expect(removed.camera).toBe(board.camera);
    expect(board.players).toHaveLength(2);
    expect(board.paths).toHaveLength(3);
    expect(board.ball!.assignedPlayerId).toBe(blue1.id);
  });
});

describe('withoutPlayers', () => {
  it('removes every player and every path that belongs to a player', () => {
    const cleared = withoutPlayers(board);

    expect(cleared.players).toEqual([]);
    expect(cleared.paths).toEqual([ballPath]);
  });
});

describe('withoutPlayers: what survives', () => {
  it('releases the ball but keeps it on the board', () => {
    const cleared = withoutPlayers(board);

    expect(cleared.ball).not.toBeNull();
    expect(cleared.ball!.assignedPlayerId).toBeUndefined();
    expect(cleared.ball!.position).toEqual([0, 0.5, 0]);
  });

  it('carries annotations, cones and the camera through by reference', () => {
    const cleared = withoutPlayers(board);

    expect(cleared.annotations).toBe(board.annotations);
    expect(cleared.cones).toBe(board.cones);
    expect(cleared.camera).toBe(board.camera);
  });

  it('leaves a null ball null', () => {
    expect(withoutPlayers({ ...board, ball: null }).ball).toBeNull();
  });

  it('is pure: the input snapshot is not mutated', () => {
    withoutPlayers(board);

    expect(board.players).toHaveLength(2);
    expect(board.paths).toHaveLength(3);
    expect(board.ball!.assignedPlayerId).toBe(blue1.id);
  });
});

describe('atFullStrength', () => {
  const withPlayers = (players: Player[]): BoardSnapshot => ({ ...board, players });

  it('is true at 18 and 18', () => {
    expect(atFullStrength(withPlayers([...side('team1', 18), ...side('team2', 18)]))).toBe(true);
  });

  it('is false at 17 and 18', () => {
    expect(atFullStrength(withPlayers([...side('team1', 17), ...side('team2', 18)]))).toBe(false);
  });

  it('is false at 18 and 19: a bench-numbered board is not at full strength', () => {
    expect(atFullStrength(withPlayers([...side('team1', 18), ...side('team2', 19)]))).toBe(false);
  });

  it('is false on an empty board', () => {
    expect(atFullStrength(withPlayers([]))).toBe(false);
  });
});


describe('placePlayer: numbering', () => {
  const empty: BoardSnapshot = { ...board, players: [] };
  const blue = { color: '#0066cc', teamPresetId: undefined };
  const at = (snap: BoardSnapshot, x: number, z: number) =>
    placePlayer(snap, 'team1', [x, z], blue, STANDARD_BOUNDARY);

  it('gives the first player on an empty board #1, and the next #2', () => {
    const one = at(empty, 0, 0);
    const two = at(one, 10, 0);

    expect(one.players.map((p) => p.number)).toEqual([1]);
    expect(two.players.map((p) => p.number)).toEqual([1, 2]);
  });

  it('fills the lowest free number, not the one after the highest', () => {
    const three = at(at(at(empty, 0, 0), 10, 0), 20, 0);
    const without2 = { ...three, players: three.players.filter((p) => p.number !== 2) };

    const refilled = at(without2, 30, 0);

    // Append order: the refilled #2 is the newest player, not the second.
    expect(refilled.players.map((p) => p.number)).toEqual([1, 3, 2]);
  });

  it('counts each team on its own', () => {
    const full = { ...empty, players: side('team1', 18) };

    const placed = placePlayer(full, 'team2', [0, 0], blue, STANDARD_BOUNDARY);

    expect(placed.players).toHaveLength(19);
    expect(placed.players[18]).toMatchObject({ teamId: 'team2', number: 1 });
  });

  it('fills 1 to 18 and then hands the same snapshot back by reference', () => {
    let snap = empty;
    for (let i = 0; i < 18; i++) snap = at(snap, i, 0);

    expect(snap.players.map((p) => p.number)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    );

    const refused = at(snap, 50, 0);
    expect(refused).toBe(snap);
  });

  it('derives the id from team and number in the seeded form', () => {
    const placed = at({ ...empty, players: side('team1', 3) }, 0, 0);

    expect(placed.players[3].id).toBe('team1-player-4');
  });

  it('follows the seeding skin tone rotation by number', () => {
    let snap = empty;
    for (let i = 0; i < 6; i++) snap = at(snap, i, 0);

    expect(snap.players.map((p) => p.skinTone)).toEqual(
      createTeamPlayers('team1', '#000000', 6).map((p) => p.skinTone),
    );
  });
});

describe('placePlayer: where and which way', () => {
  const noPlayers: BoardSnapshot = { ...board, players: [] };
  const red = { color: '#cc0000', teamPresetId: undefined };

  it('stands the player on the tapped point, on the ground', () => {
    const placed = placePlayer(noPlayers, 'team2', [12, -7], red, STANDARD_BOUNDARY);

    expect(placed.players[0].position).toEqual([12, 0, -7]);
  });

  it('faces the ball when the board has one, under rotation 0 facing +z', () => {
    const withBall = { ...noPlayers, ball: createBall([10, 0.5, 10]) };

    const placed = placePlayer(withBall, 'team2', [0, 10], red, STANDARD_BOUNDARY);

    // The ball is straight along +x from the player: the same angle
    // dragMath.facingRotation gives for that step.
    expect(placed.players[0].rotation).toBeCloseTo(Math.atan2(10, 0));
  });

  it('faces the ground centre when the board has no ball', () => {
    const placed = placePlayer({ ...noPlayers, ball: null }, 'team2', [0, 10], red, STANDARD_BOUNDARY);

    // The centre is straight along -z from the player.
    expect(placed.players[0].rotation).toBeCloseTo(Math.atan2(0, -10));
  });

  it('lands a point outside the boundary inside it', () => {
    const placed = placePlayer(noPlayers, 'team2', [200, 90], red, STANDARD_BOUNDARY);
    const [x, , z] = placed.players[0].position;

    expect(isPointInField(200, 90, STANDARD_BOUNDARY)).toBe(false);
    expect(isPointInField(x, z, STANDARD_BOUNDARY)).toBe(true);
  });

  it('applies the appearance: colour and preset id', () => {
    const placed = placePlayer(
      noPlayers,
      'team2',
      [0, 0],
      { color: '#FFD200', teamPresetId: 'richmond' },
      STANDARD_BOUNDARY,
    );

    expect(placed.players[0]).toMatchObject({ color: '#FFD200', teamPresetId: 'richmond' });
  });

  it('gives no name and no position code', () => {
    const placed = placePlayer(noPlayers, 'team2', [0, 0], red, STANDARD_BOUNDARY);

    expect(placed.players[0].playerName).toBeUndefined();
    expect(placed.players[0].positionName).toBeUndefined();
  });

  it('carries every other slice through by reference and leaves the input alone', () => {
    const placed = placePlayer(board, 'team1', [0, 0], red, STANDARD_BOUNDARY);

    expect(placed.paths).toBe(board.paths);
    expect(placed.annotations).toBe(board.annotations);
    expect(placed.cones).toBe(board.cones);
    expect(placed.camera).toBe(board.camera);
    expect(placed.ball).toBe(board.ball);
    expect(board.players).toHaveLength(2);
  });
});

describe('teamAppearance', () => {
  it('reads the preset primary colour and id when a preset is chosen', () => {
    expect(teamAppearance('team1', 'richmond')).toEqual({ color: '#FFD200', teamPresetId: 'richmond' });
  });

  it('falls back to the team default with no preset', () => {
    expect(teamAppearance('team1', null)).toEqual({ color: '#0066cc', teamPresetId: undefined });
    expect(teamAppearance('team2', null)).toEqual({ color: '#cc0000', teamPresetId: undefined });
  });

  it('treats an unknown preset id as no preset', () => {
    expect(teamAppearance('team2', 'not-a-team')).toEqual({ color: '#cc0000', teamPresetId: undefined });
  });
});
