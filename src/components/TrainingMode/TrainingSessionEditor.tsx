import React, { useState } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { useUIStore } from '../../store/uiStore';
import { useConeStore } from '../../store/coneStore';
import { usePlayerStore } from '../../store/playerStore';
import { TimerControls } from './TimerControls';
import { RotationExerciseEditor } from './RotationExerciseEditor';
import { drillLibrary, getDrillById } from '../../data/drillLibrary';
import { DRILL_CATEGORIES, type DrillCategory, type Drill, type SessionDrill } from '../../models/TrainingSession';
import { getDrillBoardLayout } from '../../utils/drillBoardLayout';

const CATEGORY_COLORS: Record<string, string> = {
  marking: '#4fc3f7',
  kicking: '#81c784',
  'ball-handling': '#ffb74d',
  defence: '#e57373',
  attack: '#ff6b00',
  fitness: '#ce93d8',
  'goal-kicking': '#fff176',
  rucking: '#a5d6a7',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '●',
  intermediate: '●●',
  advanced: '●●●',
};

export const TrainingSessionEditor: React.FC = () => {
  const [sessionName, setSessionName] = useState('New Training Session');
  const [drillLibraryOpen, setDrillLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | 'all'>('all');

  const { sessionDrills, addDrill, removeDrill } = useTimerStore();
  const { activeDrillId, setActiveDrillId } = useUIStore();
  const { setEditorTab } = useUIStore();
  const { clearCones, addCone } = useConeStore();
  const { setPreviewPositions } = usePlayerStore();

  const activeDrill: Drill | undefined = activeDrillId ? getDrillById(activeDrillId) : undefined;

  const filteredDrills = drillLibrary.filter((drill) => {
    const matchesCategory = selectedCategory === 'all' || drill.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
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
    setActiveDrillId(drill.id);
    setDrillLibraryOpen(false);
  };

  const handleSetUpOnBoard = () => {
    if (!activeDrill) return;
    const { playerPositions, conePositions } = getDrillBoardLayout(activeDrill);
    setPreviewPositions(playerPositions);
    clearCones();
    conePositions.forEach((pos) => addCone(pos));
    setEditorTab('board');
  };

  const totalMinutes = sessionDrills.reduce(
    (acc, d) => acc + Math.floor(d.durationSeconds / 60),
    0
  );

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#1a1a2e' }}>

      {/* ── Left panel: session plan list ── */}
      <div
        style={{
          width: 320,
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Session name */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            style={{
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              borderBottom: '2px solid #00d4aa',
              outline: 'none',
              width: '100%',
              padding: '3px 0',
              background: 'transparent',
              color: '#fff',
            }}
            placeholder="Session Name"
          />
        </div>

        {/* Drill list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessionDrills.length === 0 && !drillLibraryOpen && (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 13,
              }}
            >
              No drills yet — tap "Add Drill" below
            </div>
          )}
          {sessionDrills.map((d, index) => {
            const isActive = d.drillId === activeDrillId;
            return (
              <div
                key={d.drillId}
                onClick={() => setActiveDrillId(isActive ? null : d.drillId)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  background: isActive
                    ? 'rgba(255,107,0,0.12)'
                    : 'transparent',
                  borderLeft: isActive
                    ? '3px solid #FF6B00'
                    : '3px solid transparent',
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background =
                      'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {index + 1}
                </span>
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#FF6B00' : '#fff' }}
                  >
                    {d.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {Math.floor(d.durationSeconds / 60)} min
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: CATEGORY_COLORS[d.category]
                      ? `${CATEGORY_COLORS[d.category]}22`
                      : 'rgba(255,255,255,0.08)',
                    color: CATEGORY_COLORS[d.category] ?? 'rgba(255,255,255,0.6)',
                  }}
                >
                  {d.playersRequired}p
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDrill(d.drillId);
                    if (isActive) setActiveDrillId(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          {/* Drill library drawer */}
          {drillLibraryOpen && (
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ padding: '10px 14px' }}>
                <input
                  type="text"
                  placeholder="Search drills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.07)',
                    color: '#fff',
                    fontSize: 12,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    marginTop: 8,
                  }}
                >
                  <button
                    onClick={() => setSelectedCategory('all')}
                    style={{
                      padding: '3px 8px',
                      fontSize: 10,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background:
                        selectedCategory === 'all'
                          ? '#00d4aa'
                          : 'rgba(255,255,255,0.1)',
                      color: selectedCategory === 'all' ? '#000' : '#ccc',
                    }}
                  >
                    All
                  </button>
                  {DRILL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 10,
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background:
                          selectedCategory === cat
                            ? CATEGORY_COLORS[cat] ?? '#00d4aa'
                            : 'rgba(255,255,255,0.1)',
                        color: selectedCategory === cat ? '#000' : '#ccc',
                      }}
                    >
                      {cat.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {filteredDrills.map((drill) => (
                  <div
                    key={drill.id}
                    onClick={() => handleAddDrill(drill)}
                    style={{
                      padding: '9px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.background =
                        'rgba(255,255,255,0.05)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
                    }
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        marginBottom: 2,
                      }}
                    >
                      {drill.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.45)',
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <span>{Math.floor(drill.durationSeconds / 60)} min</span>
                      <span>{drill.playersRequired} players</span>
                      <span style={{ color: CATEGORY_COLORS[drill.category] ?? '#ccc' }}>
                        {DIFFICULTY_LABEL[drill.difficulty]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {sessionDrills.length} drill{sessionDrills.length !== 1 ? 's' : ''} · {totalMinutes} min total
            </span>
            <button
              onClick={() => setDrillLibraryOpen((v) => !v)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid rgba(0,212,170,0.4)',
                background: drillLibraryOpen
                  ? 'rgba(0,212,170,0.2)'
                  : 'rgba(0,212,170,0.08)',
                color: '#00d4aa',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {drillLibraryOpen ? '✕ Close' : '+ Add Drill'}
            </button>
          </div>
          <TimerControls timerType="session" />
        </div>
      </div>

      {/* ── Right panel: drill detail ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeDrill ? (
          <>
            {/* Detail header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: `${CATEGORY_COLORS[activeDrill.category] ?? '#fff'}22`,
                    color: CATEGORY_COLORS[activeDrill.category] ?? '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {activeDrill.category.replace('-', ' ')}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {DIFFICULTY_LABEL[activeDrill.difficulty]} {activeDrill.difficulty}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                {activeDrill.name}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                {activeDrill.description}
              </div>
            </div>

            {/* Detail body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
              {/* Stats row */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                    DURATION
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {Math.floor(activeDrill.durationSeconds / 60)} min
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                    PLAYERS
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#00d4aa' }}>
                    {activeDrill.playersRequired}
                  </div>
                </div>
                {activeDrill.equipment.length > 0 && (
                  <div>
                    <div
                      style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}
                    >
                      EQUIPMENT
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.7)',
                        maxWidth: 140,
                      }}
                    >
                      {activeDrill.equipment.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                Instructions
              </div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {activeDrill.instructions.map((step, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.75)',
                      marginBottom: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ol>

              {/* Rotation exercise (collapsed section) */}
              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: 'rgba(0,212,170,0.05)',
                  border: '1px solid rgba(0,212,170,0.15)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                  }}
                >
                  Rotation Exercise
                </div>
                <RotationExerciseEditor />
              </div>
            </div>

            {/* Set up on Board button */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleSetUpOnBoard}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid #FF6B00',
                  background: 'rgba(255,107,0,0.18)',
                  color: '#FF6B00',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                ▶ Set up on Board
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)',
              gap: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32 }}>🏈</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No drill selected</div>
            <div style={{ fontSize: 12 }}>
              Add a drill from the session plan and tap it to see details and set it up on the board
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
