// src/components/Board/hud/BoardHud.tsx
import { useState } from 'react';
import { SetupPod } from './SetupPod';
import { CameraPod } from './CameraPod';
import { PlayFab } from './PlayFab';

type Pod = 'setup' | 'camera' | null;

export function BoardHud() {
  const [pod, setPod] = useState<Pod>(null);
  return (
    <>
      <SetupPod open={pod === 'setup'} onToggle={() => setPod((p) => (p === 'setup' ? null : 'setup'))} />
      <PlayFab />
      <CameraPod open={pod === 'camera'} onToggle={() => setPod((p) => (p === 'camera' ? null : 'camera'))} />
    </>
  );
}
