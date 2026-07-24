import { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter, BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DesktopSiteShell } from './components/DesktopSiteShell';
import { shouldUseHashRouter } from './utils/standalone';

// 所有页面懒加载，确保首页首屏只加载必要代码
// 3D 相关代码（Three.js / @react-three/fiber）只在进入模型详情或编辑器时加载
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ModelListPage = lazy(() => import('./pages/ModelListPage').then(m => ({ default: m.ModelListPage })));
const ModelDetailPage = lazy(() => import('./pages/ModelDetailPage').then(m => ({ default: m.ModelDetailPage })));
const TutorialPage = lazy(() => import('./pages/TutorialPage').then(m => ({ default: m.TutorialPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const LearnPage = lazy(() => import('./pages/LearnPage').then(m => ({ default: m.LearnPage })));
const ShapesPage = lazy(() => import('./pages/ShapesPage').then(m => ({ default: m.ShapesPage })));
const ShapeDetailPage = lazy(() => import('./pages/ShapeDetailPage').then(m => ({ default: m.ShapeDetailPage })));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage').then(m => ({ default: m.ConnectionsPage })));
const StructuresPage = lazy(() => import('./pages/StructuresPage').then(m => ({ default: m.StructuresPage })));
const SafetyPage = lazy(() => import('./pages/SafetyPage').then(m => ({ default: m.SafetyPage })));
const EditorPage = lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-500">
      <div className="animate-pulse">加载中…</div>
    </div>
  );
}

function PublicLayout() {
  return (
    <DesktopSiteShell>
      <Outlet />
    </DesktopSiteShell>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 编辑器：独立全屏工作台，不套网站外壳 */}
        <Route path="/editor" element={<EditorPage />} />

        {/* 普通页面：统一套 DesktopSiteShell */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/list" element={<ModelListPage />} />
          <Route path="/model/:id" element={<ModelDetailPage />} />
          <Route path="/tutorial/:id" element={<TutorialPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/shapes" element={<ShapesPage />} />
          <Route path="/learn/shapes/:shapeId" element={<ShapeDetailPage />} />
          <Route path="/learn/connections" element={<ConnectionsPage />} />
          <Route path="/learn/structures" element={<StructuresPage />} />
          <Route path="/learn/structures/:structureId" element={<StructuresPage />} />
          <Route path="/learn/safety" element={<SafetyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  // 服务端渲染时强制 false 以保持一致；客户端再根据协议决定
  const [useHash, setUseHash] = useState(false);

  useEffect(() => {
    setUseHash(shouldUseHashRouter());
  }, []);

  const Router = useHash ? HashRouter : BrowserRouter;

  return (
    <Router>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </Router>
  );
}

export default App;
