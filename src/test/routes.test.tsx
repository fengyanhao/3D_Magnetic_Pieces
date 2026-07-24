import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { ModelListPage } from '../pages/ModelListPage';
import { ModelDetailPage } from '../pages/ModelDetailPage';
import { TutorialPage } from '../pages/TutorialPage';
import { NotFoundPage } from '../pages/NotFoundPage';

describe('路由测试', () => {
  it('首页路由正常渲染', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getAllByRole('heading', { name: /亲子磁力片/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('模型列表路由正常渲染', () => {
    render(
      <MemoryRouter initialEntries={['/list']}>
        <Routes>
          <Route path="/list" element={<ModelListPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/搜索模型名称/i)).toBeInTheDocument();
  });

  it('模型详情路由正常渲染', () => {
    render(
      <MemoryRouter initialEntries={['/model/house-1']}>
        <Routes>
          <Route path="/model/:id" element={<ModelDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
    const headings = screen.getAllByRole('heading');
    expect(headings.some((h) => h.textContent?.includes('温馨小房子'))).toBe(true);
  });

  it('教程页面路由正常渲染', () => {
    render(
      <MemoryRouter initialEntries={['/tutorial/house-1']}>
        <Routes>
          <Route path="/tutorial/:id" element={<TutorialPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getAllByText(/第 1 \/ 3 步/i).length).toBeGreaterThanOrEqual(1);
  });

  it('未知路由显示404页面', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-path']}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/404/i)).toBeInTheDocument();
    expect(screen.getByText(/页面未找到/i)).toBeInTheDocument();
  });
});
