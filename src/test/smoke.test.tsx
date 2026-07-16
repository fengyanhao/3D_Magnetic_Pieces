import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { HomePage } from '../pages/HomePage';
import { ModelListPage } from '../pages/ModelListPage';
import { ModelDetailPage } from '../pages/ModelDetailPage';
import { TutorialPage } from '../pages/TutorialPage';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('浏览器冒烟测试', () => {
  it('首页不是空白页，有主要内容', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /亲子磁力片/i })).toBeInTheDocument();
    expect(screen.getByText(/精选推荐/i)).toBeInTheDocument();
    expect(document.body.textContent?.trim().length).toBeGreaterThan(10);
  });

  it('模型列表页能加载，有模型卡片', () => {
    render(
      <MemoryRouter initialEntries={['/list']}>
        <Routes>
          <Route path="/list" element={<ModelListPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/模型列表/i)).toBeInTheDocument();
    const cards = screen.getAllByRole('button');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('模型详情页 house-1 能加载', () => {
    render(
      <MemoryRouter initialEntries={['/model/house-1']}>
        <Routes>
          <Route path="/model/:id" element={<ModelDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
    const headings = screen.getAllByRole('heading');
    expect(headings.some((h) => h.textContent?.includes('温馨小房子'))).toBe(true);
    expect(screen.getAllByText(/开始搭建/i).length).toBeGreaterThan(0);
  });

  it('教程页 house-1 能加载', () => {
    render(
      <MemoryRouter initialEntries={['/tutorial/house-1']}>
        <Routes>
          <Route path="/tutorial/:id" element={<TutorialPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getAllByText(/第 1 \/ 3 步/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/本步新增零件/i)).toBeInTheDocument();
  });

  it('无效教程 ID 显示错误页，不会白屏', () => {
    render(
      <MemoryRouter initialEntries={['/tutorial/not-a-model']}>
        <Routes>
          <Route path="/tutorial/:id" element={<TutorialPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getAllByText(/未找到该模型/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/浏览模型列表/i)).toBeInTheDocument();
  });

  it('从有效教程切换到无效 ID 不触发 Hooks 顺序错误', () => {
    function NavigateButton({ to, label }: { to: string; label: string }) {
      const navigate = useNavigate();
      return (
        <button onClick={() => navigate(to)} aria-label={label}>
          {label}
        </button>
      );
    }

    render(
      <MemoryRouter initialEntries={['/tutorial/house-1']}>
        <Routes>
          <Route
            path="/tutorial/:id"
            element={
              <div>
                <NavigateButton to="/tutorial/not-a-model" label="go-to-invalid" />
                <TutorialPage />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText(/第 1 \/ 3 步/i).length).toBeGreaterThan(0);

    act(() => {
      screen.getByLabelText('go-to-invalid').click();
    });

    expect(screen.getAllByText(/未找到该模型/i).length).toBeGreaterThan(0);

    const errorCalls = (console.error as Mock).mock.calls as unknown[][];
    const hookError = errorCalls.some((call: unknown[]) =>
      call.some(
        (arg: unknown) =>
          typeof arg === 'string' &&
          (arg.includes('Rendered fewer hooks than expected') ||
            arg.includes('Rendered more hooks than expected') ||
            arg.includes('Hooks can only be called'))
      )
    );
    expect(hookError).toBe(false);
  });

  it('应用级 ErrorBoundary 能捕获组件错误，不白屏', () => {
    function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
      if (shouldThrow) {
        throw new Error('test error');
      }
      return <div>normal content</div>;
    }

    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText(/出了点小问题/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /返回首页/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /刷新页面/i })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ErrorBoundary>
          <Bomb shouldThrow={false} />
        </ErrorBoundary>
      </MemoryRouter>
    );
  });

  it('页面没有 Vite 错误覆盖层元素', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    const viteOverlay = document.querySelector('vite-error-overlay');
    expect(viteOverlay).toBeNull();

    const errorOverlay = document.querySelector('[data-testid="vite-error-overlay"]');
    expect(errorOverlay).toBeNull();
  });

  it('控制台没有运行时 error（除了预期的 ErrorBoundary 测试）', () => {
    vi.restoreAllMocks();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    const runtimeErrors = errorSpy.mock.calls.filter((call) =>
      call.some(
        (arg) =>
          typeof arg === 'string' &&
          (arg.includes('Error:') ||
            arg.includes('Uncaught') ||
            arg.includes('Warning:') ||
            arg.includes('Failed to') ||
            arg.includes('is not defined'))
      )
    );

    expect(runtimeErrors.length).toBe(0);
    errorSpy.mockRestore();
  });
});
