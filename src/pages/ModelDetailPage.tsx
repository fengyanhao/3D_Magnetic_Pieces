import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, Star, Target, Lightbulb, ChevronRight, Package } from 'lucide-react';
import { Header } from '../components/Header';
import { MagnetScene } from '../components/MagnetScene';
import { models, themeLabels, difficultyLabels, difficultyColors, shapeLabels, magnetColorMap } from '../data/models';

export function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const model = models.find((m) => m.id === id);

  if (!model) {
    return (
      <div className="container">
        <Header title="模型详情" />
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500">未找到该模型</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-primary-500 font-medium"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="模型详情" />

      <main className="pb-8 safe-area-bottom">
        <div className="relative h-64">
          <MagnetScene
            model={model}
            stepIndex={-1}
            interactive={true}
          />
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full text-gray-700">
                {themeLabels[model.theme]}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[model.difficulty]}`}>
                {difficultyLabels[model.difficulty]}
              </span>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-gray-800 drop-shadow-sm">{model.name}</h1>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-5 h-5" />
              <span className="text-sm">{model.ageRange}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-5 h-5" />
              <span className="text-sm">{model.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm">{model.steps.length}步</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-2">{model.name}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{model.description}</p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-gray-800">所需零件</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {model.parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center gap-2 bg-white rounded-xl p-2"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border-2"
                    style={{ backgroundColor: magnetColorMap[part.color], borderColor: 'rgba(255,255,255,0.6)' }}
                  >
                    <span className="text-xs font-bold text-gray-700">
                      {part.count}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{part.name}</p>
                    <p className="text-xs text-gray-500">{shapeLabels[part.shape]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-green-500" />
              <h3 className="font-bold text-gray-800">能力目标</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {model.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-white text-green-600 text-sm px-3 py-1.5 rounded-full font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-gray-800">家长陪玩提示</h3>
            </div>
            <ul className="space-y-2">
              {model.parentTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-5 h-5 bg-yellow-200 text-yellow-700 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">搭建步骤预览</h4>
            <div className="flex gap-2">
              {model.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center"
                >
                  <span className="text-primary-600 font-bold">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(`/tutorial/${model.id}`)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            开始搭建
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
