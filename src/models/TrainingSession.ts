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

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Drill {
  id: string;
  name: string;
  description: string;
  category: DrillCategory;
  durationSeconds: number;
  playersRequired: number;
  equipment: string[];
  instructions: string[];
  difficulty: DifficultyLevel;
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
  difficulty: DifficultyLevel;
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
