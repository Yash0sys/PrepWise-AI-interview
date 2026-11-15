import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MediaPermissionModal from '../components/MediaPermissionModal';

const RootLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="root-layout">
      {/* Camera & Mic access prompt immediately after login */}
      <MediaPermissionModal />

      <nav className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
          <h2 className="text-primary-100">PrepWise</h2>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-light-100 max-sm:hidden">
              {user.name || user.email}
            </span>
            <button
              onClick={logout}
              className="text-xs bg-dark-200 hover:bg-dark-300 text-primary-200 border border-primary-200/30 px-3.5 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>

      <Outlet />
    </div>
  );
};

export default RootLayout;
