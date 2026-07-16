import { ArrowRight, GitBranch, Square, Triangle, Layers, Circle } from 'lucide-react';

export function ConnectionsPage() {
  const connections = [
    {
      id: 'edge-to-edge',
      title: '边对边连接',
      description: '最基础的连接方式，两片磁力片的边对齐吸合',
      icon: ArrowRight,
      color: 'bg-blue-100 text-blue-600',
      difficulty: '简单',
    },
    {
      id: 'straight-extend',
      title: '直线延伸',
      description: '多片磁力片连成一条直线，搭建更长的结构',
      icon: GitBranch,
      color: 'bg-green-100 text-green-600',
      difficulty: '简单',
    },
    {
      id: 'square-tile',
      title: '2×2正方形平铺',
      description: '四片正方形拼成一个大正方形',
      icon: Square,
      color: 'bg-red-100 text-red-600',
      difficulty: '简单',
    },
    {
      id: 'triangle-combine',
      title: '三角形组合',
      description: '两个三角形组合成正方形或菱形',
      icon: Triangle,
      color: 'bg-yellow-100 text-yellow-600',
      difficulty: '中等',
    },
    {
      id: 'right-angle',
      title: '90度墙角',
      description: '两片磁力片形成90度角，搭建立体结构',
      icon: Layers,
      color: 'bg-purple-100 text-purple-600',
      difficulty: '中等',
    },
    {
      id: 'roof',
      title: '斜面与屋顶',
      description: '用三角形搭建屋顶结构',
      icon: Triangle,
      color: 'bg-orange-100 text-orange-600',
      difficulty: '中等',
    },
    {
      id: 'closed-loop',
      title: '闭环与加固',
      description: '连接成封闭图形，增加结构稳定性',
      icon: Circle,
      color: 'bg-cyan-100 text-cyan-600',
      difficulty: '困难',
    },
  ];

  return (
    <div className="container min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="safe-area-top" />
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-800">基础连接</h1>
        <p className="text-gray-500 mt-1">学习不同的连接方式</p>
      </header>
      <main className="px-4 pb-8">
        <div className="grid grid-cols-1 gap-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${conn.color} flex items-center justify-center shrink-0`}>
                  <conn.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-gray-800">{conn.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{conn.description}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    conn.difficulty === '简单' ? 'bg-green-100 text-green-600' :
                    conn.difficulty === '中等' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {conn.difficulty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">连接小贴士</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>连接时要对齐边，确保磁力片吸牢</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>立体连接时要注意角度，保持结构稳定</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>先搭建平面结构，再尝试立体结构</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}