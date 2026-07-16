import { useNavigate } from 'react-router-dom';
import { BookOpen, Hexagon, Link2, Building2, Shield } from 'lucide-react';

export function LearnPage() {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'intro',
      title: '认识磁力片',
      description: '了解磁力片的基本原理和材质特点',
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
      route: '/learn',
    },
    {
      id: 'shapes',
      title: '基础形状',
      description: '认识正方形、三角形、梯形等各种形状',
      icon: Hexagon,
      color: 'bg-green-100 text-green-600',
      route: '/learn/shapes',
    },
    {
      id: 'connections',
      title: '基础连接',
      description: '学习边对边、角度连接等基本技巧',
      icon: Link2,
      color: 'bg-orange-100 text-orange-600',
      route: '/learn/connections',
    },
    {
      id: 'structures',
      title: '基础结构',
      description: '练习立方体、三棱柱等基础结构',
      icon: Building2,
      color: 'bg-purple-100 text-purple-600',
      route: '/learn/structures',
    },
    {
      id: 'safety',
      title: '安全与维护',
      description: '使用注意事项和磁力片保养方法',
      icon: Shield,
      color: 'bg-red-100 text-red-600',
      route: '/learn/safety',
    },
  ];

  return (
    <div className="container min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="safe-area-top" />
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-800">磁力片学堂</h1>
        <p className="text-gray-500 mt-1">从入门到进阶，轻松掌握磁力片搭建技巧</p>
      </header>
      <main className="px-4 pb-8">
        <div className="grid grid-cols-1 gap-4">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => navigate(section.route)}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${section.color} flex items-center justify-center shrink-0`}>
                  <section.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 group-hover:text-primary-500 transition-colors">
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {section.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">学习小贴士</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>从简单形状开始，逐步学习复杂结构</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>多观察实物，培养空间想象力</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>家长可以和孩子一起完成，增进亲子互动</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}