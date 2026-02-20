import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedPlaybook, type SharedPlaybook } from '../../services/sharingService';

export function SharedPlaybookViewer() {
  const { token } = useParams<{ token: string }>();
  const [shared, setShared] = useState<SharedPlaybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    getSharedPlaybook(token).then((data) => {
      if (data) {
        setShared(data);
      } else {
        setError('Playbook not found or link has expired.');
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading shared playbook...</div>
      </div>
    );
  }

  if (error || !shared) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Link Expired or Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'This shared playbook is no longer available.'}</p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Go to Coaching Board
          </Link>
        </div>
      </div>
    );
  }

  const playbook = shared.playbook_data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{playbook.name}</h1>
            {playbook.description && (
              <p className="text-sm text-gray-500">{playbook.description}</p>
            )}
          </div>
          <Link
            to="/"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            Open Coaching Board
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Shared video player */}
        {shared.video_url && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Video</h2>
            <video
              src={shared.video_url}
              controls
              className="w-full rounded-lg shadow-lg bg-black"
            >
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {/* Playbook data summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-medium mb-4">Players ({playbook.playerPositions?.length || 0})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {playbook.playerPositions?.map((player: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: player.color }}
                >
                  {player.number}
                </span>
                <span className="truncate">
                  {player.playerName || `Player ${player.number}`}
                  {player.positionName && ` (${player.positionName})`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {shared.expires_at && (
          <p className="mt-4 text-sm text-gray-400 text-center">
            This link expires {new Date(shared.expires_at).toLocaleDateString()}
          </p>
        )}
      </main>
    </div>
  );
}
