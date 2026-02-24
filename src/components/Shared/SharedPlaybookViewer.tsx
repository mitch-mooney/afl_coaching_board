import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export function SharedPlaybookViewer() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    // Redirect to the main board with the share token as a query param.
    // MainLayout will detect this and load the shared playbook into the 3D view.
    navigate(`/?loadShared=${token}`, { replace: true });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-900">
      <div className="text-white text-lg">
        {token ? 'Loading shared playbook…' : (
          <div className="text-center">
            <p className="mb-4">Invalid share link.</p>
            <Link to="/" className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition">
              Go to Coaching Board
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
