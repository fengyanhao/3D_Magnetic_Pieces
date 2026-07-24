import { useNavigate } from 'react-router-dom';
import { Shapes, Link2, Blocks, Shield, ArrowRight } from 'lucide-react';

const sections = [
  {
    id: 'shapes',
    title: '基础形状',
    description: '认识磁力片的各种基本形状，了解每种形状的特性和用途',
    icon: Shapes,
    color: 'from-blue-500 to-blue-600',
    route: '/learn/shapes',
  },
  {
    id: 'connections',
    title: '基础连接',
    description: '学习磁力片之间的连接方式，掌握平面和立体搭建的基本技巧',
    icon: Link2,
    color: 'from-green-500 to-green-600',
    route: '/learn/connections',
  },
  {
    id: 'structures',
    title: '基础结构',
    description: '探索不同的结构类型，从简单的几何图形到复杂的立体模型',
    icon: Blocks,
    color: 'from-purple-500 to-purple-600',
    route: '/learn/structures',
  },
  {
    id: 'safety',
    title: '安全与维护',
    description: '了解磁力片的使用安全注意事项和日常维护方法',
    icon: Shield,
    color: 'from-orange-500 to-orange-600',
    route: '/learn/safety',
  },
];

export function LearnPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">磁力片学堂</h1>
        <p className="text-gray-500 max-w-lg mx-auto">从入门到进阶，轻松掌握磁力片搭建技巧</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => navigate(section.route)}
            className="group text-left bg-white rounded-2xl p-5 md:p-6 border border-gray-100 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                <section.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-800 text-lg">{section.title}</h3>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{section.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
