import { Shield, AlertTriangle, Sparkles, Clock } from 'lucide-react';

export function SafetyPage() {
  const safetyTips = [
    {
      id: 'age',
      title: '适用年龄',
      description: '建议3岁以上儿童使用，3岁以下需成人全程陪同',
      icon: Shield,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'choking',
      title: '防止误吞',
      description: '小配件请勿放入口中，避免儿童误吞',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
    },
    {
      id: 'magnet',
      title: '磁力安全',
      description: '请勿将磁力片靠近电子设备、磁卡等',
      icon: Sparkles,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'maintenance',
      title: '日常维护',
      description: '定期清洁磁力片表面，保持磁性良好',
      icon: Clock,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className="container min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="safe-area-top" />
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-800">安全与维护</h1>
        <p className="text-gray-500 mt-1">正确使用和保养磁力片</p>
      </header>
      <main className="px-4 pb-8">
        <div className="grid grid-cols-1 gap-3">
          {safetyTips.map((tip) => (
            <div
              key={tip.id}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${tip.color} flex items-center justify-center shrink-0`}>
                  <tip.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">{tip.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">使用注意事项</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>使用时请在平坦的桌面上进行，避免磁力片掉落</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>不要用力摔打或弯折磁力片，以免损坏</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>收纳时请分类整理，方便下次使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>发现磁力片损坏或磁性减弱，请及时更换</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 bg-primary-50 rounded-2xl p-4">
          <h3 className="font-bold text-primary-700 mb-3">家长引导建议</h3>
          <ul className="space-y-2 text-sm text-primary-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>陪同孩子一起搭建，引导观察形状和结构</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>鼓励孩子发挥想象力，尝试不同的组合方式</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
              <span>及时表扬孩子的作品，增强自信心</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}