import React, { useState } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { RotationExerciseEditor } from './RotationExerciseEditor';
import { TimerControls } from './TimerControls';
import { drillLibrary } from '../../data/drillLibrary';
import { DRILL_CATEGORIES, type DrillCategory, type Drill, type SessionDrill } from '../../models/TrainingSession';
import { usePlayerStore } from '../../store/playerStore';
import { useRotationExercise } from '../../hooks/useRotationExercise';

export const TrainingSessionEditor: React.FC = () => {
  const [sessionName, setSessionName] = useState('New Training Session');
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { sessionDrills, addDrill, removeDrill, setDrillRest } = useTimerStore();
  const { setPreviewPositions } = usePlayerStore();
  const { steps, currentStepIndex } = useRotationExercise();

  const filteredDrills = drillLibrary.filter((drill) => {
    const matchesCategory = selectedCategory === 'all' || drill.category === selectedCategory;
    const matchesSearch =
      drill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddDrill = (drill: Drill) => {
    const sessionDrill: SessionDrill = {
      drillId: drill.id,
      name: drill.name,
      description: drill.description,
      category: drill.category,
      durationSeconds: drill.durationSeconds,
      restSeconds: 0,
      playersRequired: drill.playersRequired,
      equipment: drill.equipment,
      instructions: drill.instructions,
      difficulty: drill.difficulty,
    };
    addDrill(sessionDrill);
  };

  const handlePreviewRotation = () => {
    if (currentStepIndex === -1) return;
    setPreviewPositions([]);
  };

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#1a1a2e' }}>
      {/* Left Panel — Drill Library */}
      <div style={{ width: '360px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#fff' }}>Drill Library</h2>
          <input
            type="text"
            placeholder="Search drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px', borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.2)', marginBottom: '10px',
              boxSizing: 'border-box', background: 'rgba(255,255,255,0.08)', color: '#fff',
            }}
          />
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedCategory === 'all' ? '#00d4aa' : 'rgba(255,255,255,0.1)',
                color: selectedCategory === 'all' ? '#000' : '#ccc',
              }}
            >All</button>
            {DRILL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === cat ? '#00d4aa' : 'rgba(255,255,255,0.1)',
                  color: selectedCategory === cat ? '#000' : '#ccc',
                }}
              >
                {cat.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredDrills.map((drill) => (
            <div
              key={drill.id}
              onClick={() => handleAddDrill(drill)}
              style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff', marginBottom: '3px' }}>{drill.name}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>{drill.description}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                {Math.floor(drill.durationSeconds / 60)} min · {drill.playersRequired} players
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Session Builder */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            style={{
              fontSize: '18px', fontWeight: 700, border: 'none',
              borderBottom: '2px solid #00d4aa', outline: 'none',
              width: '100%', padding: '4px 0', background: 'transparent', color: '#fff',
            }}
            placeholder="Session Name"
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Session Timer */}
          <h3 style={{ marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Timer</h3>
          <TimerControls timerType="session" />

          {/* Drill Queue */}
          <h3 style={{ marginTop: '24px', marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Session Drills {sessionDrills.length > 0 && `(${sessionDrills.length})`}
          </h3>
          {sessionDrills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
              Click drills in the library to add them
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sessionDrills.map((drill, index) => (
                <div
                  key={drill.drillId}
                  style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>
                      {index + 1}. {drill.name}
                    </div>
                    <button
                      onClick={() => removeDrill(drill.drillId)}
                      style={{ padding: '2px 8px', backgroundColor: 'rgba(244,67,54,0.7)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >✕</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {Math.floor(drill.durationSeconds / 60)} min
                    </div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Rest:</label>
                    <input
                      type="number" min="0" max="30"
                      value={Math.floor(drill.restSeconds / 60)}
                      onChange={(e) => setDrillRest(drill.drillId, parseInt(e.target.value || '0') * 60)}
                      style={{ width: '48px', padding: '3px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px' }}
                    />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>min</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drill Timer */}
          <h3 style={{ marginTop: '24px', marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drill Timer</h3>
          <TimerControls timerType="drill" />

          {/* Rotation Exercise */}
          <h3 style={{ marginTop: '24px', marginBottom: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rotation Exercise</h3>
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '8px' }}>
            <RotationExerciseEditor />
            {steps.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  {steps.length} step{steps.length !== 1 ? 's' : ''} · Current: Step {currentStepIndex + 1}
                </div>
                <button
                  onClick={handlePreviewRotation}
                  style={{ padding: '8px 16px', backgroundColor: '#00d4aa', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                >
                  &#9654; Preview on Board
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
