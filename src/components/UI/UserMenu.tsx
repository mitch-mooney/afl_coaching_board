import { useAuthStore } from '../../store/authStore';

export function UserMenu() {
  const { user, signOut, isConfigured } = useAuthStore();

  if (!isConfigured || !user) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-600 truncate max-w-[180px]">{user.email}</span>
      <button
        onClick={signOut}
        className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition touch-manipulation"
      >
        Sign Out
      </button>
    </div>
  );
}
