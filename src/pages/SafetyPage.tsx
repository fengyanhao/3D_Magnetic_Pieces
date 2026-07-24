import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ArrowRight, Heart, Ban, Droplets, Sun } from 'lucide-react';

const safetyTopics = [
  {
    icon: AlertTriangle,
    title: '年龄建议',
    content: '建议3岁以上儿童使用，需在成人陪同下玩耍。小零件可能存在吞咽风险。',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
  },
  {
    icon: Heart,
    title: '安全玩耍',
    content: '确保玩耍区域宽敞明亮，地面平整。避免在楼梯口、窗户边等危险区域玩耍。',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    icon: Ban,
    title: '禁止事项',
    content: '不要将磁力片放入口中、鼻子或耳朵。不要用力摔打或踩踏磁力片。',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    icon: Droplets,
    title: '清洁保养',
    content: '使用湿布轻轻擦拭，避免浸泡或高温消毒。存放时保持干燥，避免阳光直射。',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Sun,
    title: '存储建议',
    content: '存放在干燥通风处，远离热源和强磁场。建议使用专用收纳盒分类存放。',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  {
    icon: CheckCircle,
    title: '定期检查',
    content: '定期检查磁力片是否有破损、裂缝或磁力减弱。发现问题及时更换。',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
];

export function SafetyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">安全与维护</h1>
        <p className="text-gray-500">了解磁力片的使用安全注意事项和日常维护方法</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {safetyTopics.map((topic, index) => (
          <div key={index} className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100">
            <div className={`w-12 h-12 rounded-xl ${topic.bgColor} flex items-center justify-center mb-4`}>
              <topic.icon className={`w-6 h-6 ${topic.color}`} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">{topic.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{topic.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 md:mt-10 bg-red-50 rounded-2xl p-5 md:p-6 border border-red-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 mb-1">紧急提醒</h3>
            <p className="text-sm text-red-700 leading-relaxed">
              如果孩子吞食了磁力片，请立即就医。多个磁力片在肠道内相互吸引可能造成严重伤害。
            </p>
          </div>
        </div>
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
