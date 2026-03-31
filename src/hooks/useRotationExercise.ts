import { useRotationExerciseStore } from '../store/rotationExerciseStore';
import { useEffect } from 'react';

export const useRotationExercise = () => {
  const {
    startExercise,
    pauseExercise,
    resumeExercise,
    stopExercise,
    tick,
    resetExercise,
    formatTime,
    getProgressPercentage,
    currentStepIndex,
    rotationExercise,
  } = useRotationExerciseStore();

  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  return {
    startExercise,
    pauseExercise,
    resumeExercise,
    stopExercise,
    resetExercise,
    formatTime,
    getProgressPercentage,
    currentStepIndex,
    currentStep: rotationExercise.steps[currentStepIndex] ?? null,
    steps: rotationExercise.steps,
    exerciseName: rotationExercise.name,
  };
};
