import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import { HomePage } from './pages/HomePage';
import { ModelListPage } from './pages/ModelListPage';
import { ModelDetailPage } from './pages/ModelDetailPage';
import { TutorialPage } from './pages/TutorialPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/list" element={<ModelListPage />} />
        <Route path="/model/:id" element={<ModelDetailPage />} />
        <Route path="/tutorial/:id" element={<TutorialPage />} />
      </Routes>
    </Router>
  );
}

export default App;
