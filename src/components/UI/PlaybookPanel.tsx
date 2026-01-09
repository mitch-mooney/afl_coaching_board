import { useEffect, useState } from 'react';
import { usePlaybookStore } from '../../store/playbookStore';
import { usePlaybook } from '../../hooks/usePlaybook';

export function PlaybookPanel() {
  const { playbooks, isLoading, loadPlaybooks } = usePlaybookStore();
  const { loadScenario } = usePlaybook();
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    loadPlaybooks();
  }, [loadPlaybooks]);
  
  const handleLoad = async (id: number) => {
    try {
      await loadScenario(id);
      setIsOpen(false);
    } catch (error) {
      console.error('Error loading playbook:', error);
      alert('Failed to load playbook. Please try again.');
    }
  };
  
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this playbook?')) {
      try {
        await usePlaybookStore.getState().deletePlaybook(id);
      } catch (error) {
        console.error('Error deleting playbook:', error);
        alert('Failed to delete playbook. Please try again.');
      }
    }
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-4 z-10 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition"
      >
        {isOpen ? '← Close' : '📚 Playbooks'}
      </button>
      
      {isOpen && (
        <div className="absolute top-16 right-4 z-10 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Saved Playbooks</h2>
          
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : playbooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No saved playbooks</div>
          ) : (
            <div className="space-y-2">
              {playbooks.map((playbook) => (
                <div
                  key={playbook.id}
                  className="border rounded p-3 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{playbook.name}</h3>
                      {playbook.description && (
                        <p className="text-sm text-gray-600 mt-1">{playbook.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(playbook.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => playbook.id && handleLoad(playbook.id)}
                      className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => playbook.id && handleDelete(playbook.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
