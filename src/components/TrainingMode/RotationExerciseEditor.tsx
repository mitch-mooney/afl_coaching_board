import React, { useState, useMemo } from 'react';
import { useRotationExerciseStore } from '../../store/rotationExerciseStore';
import { usePlayerStore } from '../../store/playerStore';

export const RotationExerciseEditor: React.FC = () => {
  const {
    rotationExercise,
    addRotationStep,
    updateRotationStep,
    removeRotationStep,
    moveRotationStep,
  } = useRotationExerciseStore();

  const { getActivePlayers } = usePlayerStore();

  const activePlayers = useMemo(() => getActivePlayers(), [getActivePlayers]);

  const [newStepType, setNewStepType] = useState<'all' | 'position'>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('');

  const handleAddStep = () => {
    if (newStepType === 'all') {
      addRotationStep('all');
    } else if (selectedPosition) {
      addRotationStep('position', selectedPosition);
    }
    setNewStepType('all');
    setSelectedPosition('');
  };

  const handleStepChange = (index: number, field: keyof typeof rotationExercise.steps[0], value: any) => {
    updateRotationStep(index, { [field]: value });
  };

  const positions = useMemo(() => {
    const positionSet = new Set<string>();
    activePlayers.forEach(player => {
      if (player.positionName) positionSet.add(player.positionName);
    });
    return Array.from(positionSet);
  }, [activePlayers]);

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ marginBottom: '16px' }}>Rotation Exercise Steps</h2>

      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '12px' }}>Add New Step</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Step Type
            </label>
            <select
              value={newStepType}
              onChange={(e) => setNewStepType(e.target.value as 'all' | 'position')}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="all">Rotate All Players</option>
              <option value="position">Rotate by Position</option>
            </select>
          </div>

          {newStepType === 'position' && (
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                Position
              </label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="">Select a position</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleAddStep}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Add Step
          </button>
        </div>
      </div>

      {rotationExercise.steps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
          No rotation steps added yet. Add a step above to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rotationExercise.steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                padding: '16px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => moveRotationStep(index, index - 1)}
                  disabled={index === 0}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: index === 0 ? '#e0e0e0' : '#2196f3',
                    color: index === 0 ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveRotationStep(index, index + 1)}
                  disabled={index === rotationExercise.steps.length - 1}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: index === rotationExercise.steps.length - 1 ? '#e0e0e0' : '#2196f3',
                    color: index === rotationExercise.steps.length - 1 ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: index === rotationExercise.steps.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↓
                </button>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', marginRight: '8px' }}>
                    Type:
                  </label>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {step.type === 'all' ? 'All Players' : `Position: ${step.position}`}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', marginRight: '8px' }}>
                    Target Position:
                  </label>
                  <input
                    type="text"
                    value={step.targetPosition}
                    onChange={(e) => handleStepChange(index, 'targetPosition', e.target.value)}
                    placeholder="e.g., Full Back, Centre Half Forward"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      width: '300px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => removeRotationStep(step.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rotationExercise.steps.length > 0 && (
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '8px' }}>Exercise Summary</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#2e7d32' }}>
            {rotationExercise.steps.length} rotation step(s) configured
          </p>
        </div>
      )}
    </div>
  );
};
