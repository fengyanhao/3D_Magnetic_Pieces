import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Blocks, CheckCircle } from 'lucide-react';

const structures = [
  {
    id: '2d',
    title: '平面结构',
    description: '在二维平面上搭建各种几何图形和图案',
    examples: ['正方形', '三角形', '六边形', '星形', '菱形'],
    tips: ['从中心开始向外扩展', '注意对称性', '可以使用多种形状组合'],
    difficulty: '简单',
  },
  {
    id: 'prism',
    title: '棱柱结构',
    description: '搭建具有两个平行多边形底面的立体结构',
    examples: ['三棱柱', '四棱柱', '六棱柱', '八棱柱'],
    tips: ['先搭建底面', '确保侧面垂直', '顶部与底面平行'],
    difficulty: '中等',
  },
  {
    id: 'pyramid',
    title: '锥体结构',
    description: '搭建具有一个多边形底面和尖顶的立体结构',
    examples: ['三棱锥', '四棱锥', '五棱锥'],
    tips: ['底面要稳固', '侧面逐渐向中心收缩', '顶部尖点要居中'],
    difficulty: '中等',
  },
  {
    id: 'dome',
    title: '穹顶结构',
    description: '搭建半球形或拱形的弯曲结构',
    examples: ['半球穹顶', '拱形门', '隧道'],
    tips: ['从底部环开始', '逐层向内收缩', '注意弧度均匀'],
    difficulty: '困难',
  },
  {
    id: 'tower',
    title: '塔楼结构',
    description: '搭建高耸的垂直结构',
    examples: ['信号塔', '灯塔', '摩天大楼'],
    tips: ['底部要宽大', '逐层检查垂直度', '可以添加支撑'],
    difficulty: '中等',
  },
  {
    id: 'bridge',
    title: '桥梁结构',
    description: '搭建跨越空间的连接结构',
    examples: ['拱桥', '悬索桥', '梁桥'],
    tips: ['桥墩要稳固', '桥面要平直', '注意承重分布'],
    difficulty: '困难',
  },
];

export function StructuresPage() {
  const navigate = useNavigate();
  const { structureId } = useParams();
  const [selectedStructure, setSelectedStructure] = useState(structureId || null);

  const structure = selectedStructure ? structures.find((s) => s.id === selectedStructure) : null;

  if (structure) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
        <button
          onClick={() => setSelectedStructure(null)}
          className="flex items-center gap-1 text-gray-500 text-sm mb-6 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          返回结构列表
        </button>

        <div className="bg-white rounded-2xl p-5 md:p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
              <Blocks className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{structure.title}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                structure.difficulty === '简单' ? 'bg-green-100 text-green-600' :
                structure.difficulty === '中等' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {structure.difficulty}
              </span>
            </div>
          </div>

          <p className="text-gray-600 mb-6">{structure.description}</p>

          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">示例</h3>
            <div className="flex flex-wrap gap-2">
              {structure.examples.map((ex, i) => (
                <span key={i} className="bg-primary-50 text-primary-600 text-sm px-4 py-2 rounded-xl font-medium">
                  {ex}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-3">搭建技巧</h3>
            <ul className="space-y-2">
              {structure.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <CheckCircle className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">基础结构</h1>
        <p className="text-gray-500">探索不同的结构类型，从简单到复杂</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {structures.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStructure(s.id)}
            className="group text-left bg-white rounded-2xl p-5 md:p-6 border border-gray-100 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <Blocks className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-800 text-lg">{s.title}</h3>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>
                <p className="text-sm text-gray-500 mb-2">{s.description}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  s.difficulty === '简单' ? 'bg-green-100 text-green-600' :
                  s.difficulty === '中等' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {s.difficulty}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button onClick={() => navigate('/learn')} className="flex items-center gap-2 text-primary-500 font-medium">
          <ArrowRight className="w-4 h-4 rotate-180" />
          返回学堂首页
        </button>
      </div>
    </div>
  );
}
