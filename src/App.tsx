import { useEffect, useState, lazy, Suspense } from 'react';
import { HashRouter, BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { ModelListPage } from './pages/ModelListPage';
import { ModelDetailPage } from './pages/ModelDetailPage';
import { TutorialPage } from './pages/TutorialPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LearnPage } from './pages/LearnPage';
import { ShapesPage } from './pages/ShapesPage';
import { ShapeDetailPage } from './pages/ShapeDetailPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { StructuresPage } from './pages/StructuresPage';
import { SafetyPage } from './pages/SafetyPage';
import { shouldUseHashRouter } from './utils/standalone';

// 编辑器懒加载:首页首屏不会加载编辑器及其依赖(@react-three/fiber 等)。
const EditorPage = lazy(() => import('./pages/EditorPage').then((m) => ({ default: m.EditorPage })));

function AppRoutes() {
  return (
    <Routes>
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
      <Route
        path="/editor"
        element={
          <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">正在加载编辑器…</div>}>
            <EditorPage />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
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
