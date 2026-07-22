export interface RotationExercise {
  id: string;
  name: string;
  description: string;
  rotationType: RotationType;
  intervalMinutes: number;
  playerPositions: string[]; // Player IDs or 'all'
  targetPositions: PositionMapping[];
}

export type RotationType = 'position' | 'team' | 'mixed';

export interface PositionMapping {
  sourcePosition: string;
  targetPosition: string;
}
