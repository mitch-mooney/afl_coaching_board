// src/components/UI/ScenarioLibrary.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScenarioStore } from '../../store/scenarioStore';
import { useRosterStore } from '../../store/rosterStore';

export function ScenarioLibrary() {
  const { scenarios, loadScenarios, createScenario, deleteScenario } = useScenarioStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadScenarios();
    loadRosters();
  }, [loadScenarios, loadRosters]);

  const handleNew = async () => {
    const id = await createScenario('New Scenario');
    navigate(`/scenario/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Coaching Board</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/rosters')}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
            >
              Team Rosters {rosters.length > 0 && `(${rosters.length})`}
            </button>
            <button
              onClick={handleNew}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold
                         hover:bg-amber-400 text-sm"
            >
              + New Scenario
            </button>
          </div>
        </div>

        {scenarios.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No scenarios yet</p>
            <p className="text-sm mb-6 text-gray-600">
              Create a scenario to place players and recreate match situations
            </p>
            <button
              onClick={handleNew}
              className="px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400"
            >
              Create your first scenario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/scenario/${s.id}`)}
                className="bg-gray-900 rounded-xl p-4 cursor-pointer hover:bg-gray-800
                           transition-colors border border-gray-800 hover:border-amber-500/30"
              >
                <h3 className="font-semibold mb-1 truncate">{s.name}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(s.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-600">
                    {s.phases.length} phase{s.phases.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${s.name}"?`)) deleteScenario(s.id!);
                    }}
                    className="text-xs text-red-500/50 hover:text-red-400 px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
