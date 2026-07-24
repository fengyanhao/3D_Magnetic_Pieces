import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Home, LayoutGrid, BookOpen, Hexagon, Pencil, ChevronRight } from 'lucide-react';
import { ReactNode, useMemo } from 'react';

interface DesktopSiteShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

const navItems = [
  { path: '/', label: '首页', exact: true },
  { path: '/list', label: '方案库' },
  { path: '/learn/shapes', label: '磁力片百科' },
  { path: '/learn', label: '教学中心' },
];

function useBreadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  return useMemo(() => {
    if (pathname === '/') return [];

    const crumbs: { label: string; path?: string }[] = [{ label: '首页', path: '/' }];

    if (pathname === '/list') {
      crumbs.push({ label: '方案库' });
    } else if (pathname.startsWith('/model/')) {
      crumbs.push({ label: '方案库', path: '/list' });
      crumbs.push({ label: '方案详情' });
    } else if (pathname.startsWith('/tutorial/')) {
      crumbs.push({ label: '方案库', path: '/list' });
      crumbs.push({ label: '方案详情' });
      crumbs.push({ label: '分步教学' });
    } else if (pathname === '/learn') {
      crumbs.push({ label: '教学中心' });
    } else if (pathname === '/learn/shapes') {
      crumbs.push({ label: '教学中心', path: '/learn' });
      crumbs.push({ label: '基础形状' });
    } else if (pathname.startsWith('/learn/shapes/')) {
      crumbs.push({ label: '教学中心', path: '/learn' });
      crumbs.push({ label: '基础形状', path: '/learn/shapes' });
      crumbs.push({ label: '形状详情' });
    } else if (pathname === '/learn/connections') {
      crumbs.push({ label: '教学中心', path: '/learn' });
      crumbs.push({ label: '基础连接' });
    } else if (pathname === '/learn/structures') {
      crumbs.push({ label: '教学中心', path: '/learn' });
      crumbs.push({ label: '基础结构' });
    } else if (pathname.startsWith('/learn/structures/')) {
      crumbs.push({ label: '教学中心', path: '/learn' });
      crumbs.push({ label: '基础结构', path: '/learn/structures' });
      crumbs.push({ label: '结构详情' });
    } else if (pathname === '/learn/safety') {
      crumbs.push({ label: '教学中心', path: '/learn' });
      crumbs.push({ label: '安全与维护' });
    } else {
      crumbs.push({ label: '当前页面' });
    }

    return crumbs;
  }, [pathname]);
}

export function DesktopSiteShell({ children, hideNav = false }: DesktopSiteShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();
  const pathname = location.pathname;

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(item.path + '/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-50">
      {/* 桌面端顶部导航 */}
      {!hideNav && (
        <header className="hidden md:block sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-800 tracking-tight">亲子磁力片</span>
              </Link>

              {/* 主导航 */}
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* 编辑器入口 */}
              <Link
                to="/editor"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors shrink-0"
              >
                <Pencil className="w-4 h-4" />
                编辑器
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* 面包屑（桌面端） */}
      {breadcrumbs.length > 0 && !hideNav && (
        <div className="hidden md:block bg-white border-b border-gray-100">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-2.5">
            <nav className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                  {crumb.path ? (
                    <Link to={crumb.path} className="text-gray-500 hover:text-primary-600 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-800 font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 桌面端页脚 */}
      {!hideNav && (
        <footer className="hidden md:block bg-white border-t border-gray-100 mt-auto">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">亲子磁力片</span>
              </div>
              <nav className="flex items-center gap-6 text-sm text-gray-500">
                <Link to="/" className="hover:text-gray-700 transition-colors">首页</Link>
                <Link to="/list" className="hover:text-gray-700 transition-colors">方案库</Link>
                <Link to="/learn" className="hover:text-gray-700 transition-colors">教学中心</Link>
                <Link to="/editor" className="hover:text-gray-700 transition-colors">编辑器</Link>
              </nav>
              <p className="text-xs text-gray-400">亲子磁力片教程网站</p>
            </div>
          </div>
        </footer>
      )}

      {/* 移动端底部导航 */}
      {!hideNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom z-50">
          <div className="max-w-md mx-auto flex items-center justify-around py-2">
            <button
              onClick={() => navigate('/')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                pathname === '/' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[11px] font-medium">首页</span>
            </button>
            <button
              onClick={() => navigate('/learn')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                pathname.startsWith('/learn') ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[11px] font-medium">学堂</span>
            </button>
            <button
              onClick={() => navigate('/list')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                pathname === '/list' || pathname.startsWith('/model/') ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[11px] font-medium">作品</span>
            </button>
            <button
              onClick={() => navigate('/learn/shapes')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                pathname.startsWith('/learn/shapes') ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Hexagon className="w-5 h-5" />
              <span className="text-[11px] font-medium">百科</span>
            </button>
          </div>
        </nav>
      )}

      {/* 移动端底部导航占位 */}
      {!hideNav && <div className="md:hidden h-14" />}
    </div>
  );
}
