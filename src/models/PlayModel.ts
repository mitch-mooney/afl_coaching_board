import type { Player } from './PlayerModel';
import type { MovementPath } from './PathModel';
import type { Ball } from './BallModel';
import type { Cone } from '../store/coneStore';

export interface LinkedVideoMoment {
  videoId: number;          // ++id PK from VideoImportDB.videos
  startTime: number;        // seconds from video start
  endTime: number;          // seconds; always > startTime
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ET';
  label?: string;           // max 40 chars, optional event label
}

export interface PlayPhase {
  id: string;
  label: string;
  playerPositions: Player[];
  paths: MovementPath[];
  annotations: unknown[];       // typed further when annotations model is stable
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  } | null;
  /** The match ball. Optional/absent on Plays saved before ball capture. */
  ball?: Ball | null;
  /** Placed drill cones. Optional/absent on Plays saved before cone capture. */
  cones?: Cone[];
}

export interface Play {
  id?: number;                  // Dexie auto-increment integer
  name: string;
  createdAt: string;            // ISO timestamp
  updatedAt: string;
  // FK to TeamRoster.id (Dexie integer PK — simpler than UUID strings)
  team1RosterId: number | null;
  team2RosterId: number | null;
  phases: PlayPhase[];
  videoBlobId?: number;
  tags?: string[];
  linkedVideoMoment?: LinkedVideoMoment;
  playbookId?: number;          // FK → Playbook.id; always set post-migration
}
