// src/models/TrainingSession.ts
import type { RotationExercise } from './RotationExercise';

export type DrillCategory =
  | 'marking'
  | 'kicking'
  | 'ball-handling'
  | 'defence'
  | 'attack'
  | 'fitness'
  | 'goal-kicking'
  | 'rucking';

export const DRILL_CATEGORIES: DrillCategory[] = [
  'marking', 'kicking', 'ball-handling', 'defence',
  'attack', 'fitness', 'goal-kicking', 'rucking',
];

export interface Drill {
  id: string;
  name: string;
  description: string;
  category: DrillCategory;
  durationSeconds: number;
  playersRequired: number;
  equipment: string[];
  instructions: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface SessionDrill {
  drillId: string;
  name: string;
  description: string;
  category: DrillCategory;
  durationSeconds: number;
  restSeconds: number;
  playersRequired: number;
  equipment: string[];
  instructions: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rotationExercise?: RotationExercise;
}

export interface TrainingSession {
  id: string;
  name: string;
  description?: string;
  drills: SessionDrill[];
  totalDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type { RotationExercise };
