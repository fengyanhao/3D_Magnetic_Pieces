import { ArrowLeft, Home } from 'lucide-react';
import { Header } from '../components/Header';

export function NotFoundPage() {
  return (
    <div className="container min-h-screen flex flex-col">
      <Header title="页面未找到" />
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 safe-area-bottom">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl font-bold text-gray-300">404</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">哎呀，页面丢了！</h1>
        <p className="text-gray-500 text-center mb-8">
          我们找不到您要访问的页面。<br />
          可能是地址有误，或者页面已经移动了。
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href="/"
            className="flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-xl font-medium transition-colors hover:bg-primary-600"
          >
            <Home className="w-5 h-5" />
            返回首页
          </a>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium transition-colors hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
            返回上一页
          </button>
        </div>
      </main>
    </div>
  );
}
