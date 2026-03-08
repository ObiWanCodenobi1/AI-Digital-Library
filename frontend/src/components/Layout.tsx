import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-700' : 'hover:bg-blue-600';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-500 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">
              AI Digital Library
            </Link>
            <nav className="flex gap-4 items-center">
              <Link
                to="/"
                className={`px-4 py-2 rounded transition ${isActive('/')}`}
              >
                Home
              </Link>
              <Link
                to="/search"
                className={`px-4 py-2 rounded transition ${isActive('/search')}`}
              >
                Search
              </Link>
              <Link
                to="/browse"
                className={`px-4 py-2 rounded transition ${isActive('/browse')}`}
              >
                Browse
              </Link>
              {isAuthenticated && (
                <Link
                  to="/library"
                  className={`px-4 py-2 rounded transition ${isActive('/library')}`}
                >
                  My Library
                </Link>
              )}
              
              {isAuthenticated ? (
                <div className="flex items-center gap-4 ml-4 border-l border-blue-400 pl-4">
                  <span className="text-sm">
                    Welcome, {user?.name || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-800 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 ml-4 border-l border-blue-400 pl-4">
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-800 transition"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 rounded bg-white text-blue-600 hover:bg-gray-100 transition"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="container mx-auto px-4 py-6 text-center">
          <p>&copy; 2024 AI Digital Library. Powered by AWS Bedrock.</p>
        </div>
      </footer>
    </div>
  );
}
