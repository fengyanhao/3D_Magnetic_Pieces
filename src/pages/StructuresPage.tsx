import { useNavigate } from 'react-router-dom';
import { Box, Triangle, Hexagon, Layers, Home } from 'lucide-react';

export function StructuresPage() {
  const navigate = useNavigate();

  const structures = [
    {
      id: 'cube',
      title: '立方体',
      description: '6片正方形搭建的立方体',
      icon: Box,
      color: 'bg-blue-100 text-blue-600',
      parts: ['正方形×6'],
      steps: 3,
    },
    {
      id: 'triangular-prism',
      title: '三棱柱',
      description: '2片三角形+3片方形搭建',
      icon: Triangle,
      color: 'bg-green-100 text-green-600',
      parts: ['等边三角形×2', '正方形×3'],
      steps: 4,
    },
    {
      id: 'tetrahedron',
      title: '四面体',
      description: '4片等边三角形搭建',
      icon: Triangle,
      color: 'bg-purple-100 text-purple-600',
      parts: ['等边三角形×4'],
      steps: 4,
    },
    {
      id: 'pyramid',
      title: '方锥',
      description: '1片正方形+4片三角形搭建',
      icon: Hexagon,
      color: 'bg-yellow-100 text-yellow-600',
      parts: ['正方形×1', '等边三角形×4'],
      steps: 4,
    },
    {
      id: 'corner',
      title: '墙角模块',
      description: '搭建立体墙角的基础结构',
      icon: Layers,
      color: 'bg-orange-100 text-orange-600',
      parts: ['正方形×3'],
      steps: 2,
    },
    {
      id: 'roof',
      title: '双坡屋顶',
      description: '搭建房子的屋顶结构',
      icon: Home,
      color: 'bg-red-100 text-red-600',
      parts: ['等边三角形×2', '正方形×2'],
      steps: 3,
    },
  ];

  return (
    <div className="container min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="safe-area-top" />
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-800">基础结构练习</h1>
        <p className="text-gray-500 mt-1">练习搭建各种立体结构</p>
      </header>
      <main className="px-4 pb-8">
        <div className="grid grid-cols-1 gap-3">
          {structures.map((struct) => (
            <button
              key={struct.id}
              onClick={() => navigate(`/learn/structures/${struct.id}`)}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${struct.color} flex items-center justify-center shrink-0`}>
                  <struct.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-gray-800">{struct.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{struct.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {struct.parts.map((part, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {part}
                      </span>
                    ))}
                    <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-600 rounded">
                      {struct.steps}步
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">结构练习小贴士</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>先搭建平面底座，再向上扩展</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>注意对称，保持结构平衡</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>三角形结构最稳定，多用三角形加固</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}