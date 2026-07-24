import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-12 md:py-20">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Search className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-300 mb-2">404</h1>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">页面未找到</h2>
        <p className="text-gray-500 max-w-md mb-8">
          您访问的页面可能已被移除、更名，或者暂时不可用。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-primary-500 text-white py-3 px-6 rounded-xl font-medium transition-colors hover:bg-primary-600"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 px-6 rounded-xl font-medium transition-colors hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
            返回上一页
          </button>
        </div>
      </div>
    </div>
  );
}
