import { useNavigate } from 'react-router-dom';
import { Square, Triangle, ChevronDown, Circle, Hexagon, Pentagon, Diamond } from 'lucide-react';

export function ShapesPage() {
  const navigate = useNavigate();

  const shapes = [
    { id: 'square', name: '正方形', icon: Square, color: 'bg-red-100 text-red-600', sides: 4 },
    { id: 'rectangle', name: '长方形', icon: Square, color: 'bg-blue-100 text-blue-600', sides: 4 },
    { id: 'equilateral-triangle', name: '等边三角形', icon: Triangle, color: 'bg-green-100 text-green-600', sides: 3 },
    { id: 'isosceles-triangle', name: '等腰三角形', icon: Triangle, color: 'bg-yellow-100 text-yellow-600', sides: 3 },
    { id: 'right-triangle', name: '直角三角形', icon: Triangle, color: 'bg-purple-100 text-purple-600', sides: 3 },
    { id: 'long-right-triangle', name: '长直角三角形', icon: Triangle, color: 'bg-pink-100 text-pink-600', sides: 3 },
    { id: 'trapezoid', name: '梯形', icon: ChevronDown, color: 'bg-cyan-100 text-cyan-600', sides: 4 },
    { id: 'rhombus', name: '菱形', icon: Diamond, color: 'bg-orange-100 text-orange-600', sides: 4 },
    { id: 'pentagon', name: '五边形', icon: Pentagon, color: 'bg-indigo-100 text-indigo-600', sides: 5 },
    { id: 'hexagon', name: '六边形', icon: Hexagon, color: 'bg-teal-100 text-teal-600', sides: 6 },
    { id: 'semicircle', name: '半圆', icon: Circle, color: 'bg-gray-100 text-gray-600', sides: 1 },
    { id: 'sector', name: '扇形', icon: Circle, color: 'bg-amber-100 text-amber-600', sides: 1 },
  ];

  return (
    <div className="container min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="safe-area-top" />
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-800">基础形状</h1>
        <p className="text-gray-500 mt-1">认识不同形状的磁力片</p>
      </header>
      <main className="px-4 pb-8">
        <div className="grid grid-cols-3 gap-3">
          {shapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() => navigate(`/learn/shapes/${shape.id}`)}
              className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2"
            >
              <div className={`w-10 h-10 rounded-lg ${shape.color} flex items-center justify-center`}>
                <shape.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">{shape.name}</span>
              <span className="text-xs text-gray-400">{shape.sides}边</span>
            </button>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">形状小知识</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>正方形有4条边，每条边长度相等</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>三角形是最稳定的形状</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>六边形可以紧密排列，没有空隙</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}