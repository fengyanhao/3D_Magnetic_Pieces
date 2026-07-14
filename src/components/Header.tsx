import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export function Header({ title, showBack = true }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.pathname === '/') return;
    navigate(-1);
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <header className="safe-area-top bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {showBack && location.pathname !== '/' && (
            <button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-800">{title}</h1>
        </div>
        <button
          onClick={handleHome}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Home className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </header>
  );
}
