import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link2 } from 'lucide-react';

const connectionTypes = [
  {
    id: 'flat',
    title: '平面连接',
    description: '将磁力片在同一平面上连接，形成各种几何图形',
    examples: ['正方形拼图', '三角形组合', '多边形拼接'],
    tips: ['确保边缘对齐', '轻轻按压使其紧密连接'],
  },
  {
    id: 'edge',
    title: '边对边连接',
    description: '通过磁力片的边缘相互吸引来搭建立体结构',
    examples: ['立方体搭建', '三角锥结构', '多面体组合'],
    tips: ['注意磁极方向', '从底部开始搭建更稳固'],
  },
  {
    id: 'corner',
    title: '角对角连接',
    description: '利用磁力片的角部磁力进行连接，创造独特角度',
    examples: ['菱形结构', '星形图案', '放射状设计'],
    tips: ['小心控制力度', '可以先在平面上预排'],
  },
  {
    id: 'stack',
    title: '堆叠连接',
    description: '将磁力片垂直堆叠，创建高度和层次感',
    examples: ['高塔搭建', '阶梯结构', '层叠建筑'],
    tips: ['底部要宽大稳固', '逐层检查平衡'],
  },
];

export function ConnectionsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">基础连接</h1>
        <p className="text-gray-500">学习磁力片之间的连接方式，掌握搭建技巧</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {connectionTypes.map((type) => (
          <div key={type.id} className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">{type.title}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">{type.description}</p>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">示例</h4>
              <div className="flex flex-wrap gap-2">
                {type.examples.map((ex, i) => (
                  <span key={i} className="bg-primary-50 text-primary-600 text-xs px-3 py-1.5 rounded-full">
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">技巧提示</h4>
              <ul className="space-y-1">
                {type.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
