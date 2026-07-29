import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Clock, Star, Target, Lightbulb, ChevronRight, Package, Heart, ArrowLeft } from 'lucide-react';
import { MagnetScene } from '../components/MagnetScene';
import { safeStorage } from '../utils/standalone';
import { models, themeLabels, difficultyLabels, difficultyColors, shapeLabels, magnetColorMap } from '../data/models';

interface TutorialProgress {
  modelId: string;
  currentStep: number;
  completedAt?: string;
}

export function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const model = models.find((m) => m.id === id);
  const [isFavorite, setIsFavorite] = useState(false);
  const [progress, setProgress] = useState<TutorialProgress | null>(null);

  useEffect(() => {
    const favs = safeStorage.getItem('favorites');
    const favorites = favs ? JSON.parse(favs) : [];
    setIsFavorite(favorites.includes(id));

    const savedProgress = safeStorage.getItem(`tutorial_progress_${id}`);
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  }, [id]);

  const toggleFavorite = () => {
    const favs = safeStorage.getItem('favorites');
    const favorites = favs ? JSON.parse(favs) : [];

    if (isFavorite) {
      const newFavs = favorites.filter((f: string) => f !== id);
      safeStorage.setItem('favorites', JSON.stringify(newFavs));
      setIsFavorite(false);
    } else {
      favorites.push(id);
      safeStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

  if (!model) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-gray-500">未找到该模型</p>
          <Link to="/list" className="mt-4 text-primary-500 font-medium">
            返回方案库
          </Link>
        </div>
      </div>
    );
  }

  // P0-2: 三态进度判定
  // - 无进度：progress 为空 → 显示「开始搭建」
  // - 进行中：progress 存在且未完成(currentStep < steps.length) → 显示「继续第N步」+「重新开始」
  // - 已完成：progress 存在且 currentStep >= steps.length → 显示「查看成品」+「再次搭建」
  const isCompleted = !!(progress && progress.currentStep >= model.steps.length);
  const isInProgress = !!(progress && progress.currentStep > 0 && progress.currentStep < model.steps.length);
  const hasProgress = isInProgress;

  return (
    <div>
      {/* 移动端返回栏 */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-600 text-sm">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <span className="font-medium text-gray-800 text-sm">方案详情</span>
        <div className="w-12" />
      </div>

      {/* 桌面端左右布局 / 移动端上下布局 */}
      <div className="md:flex">
        {/* 左侧/上方：3D画布 */}
        <div className="md:w-3/5 lg:w-2/3 relative">
          <div className="relative h-64 md:h-[calc(100vh-64px)] md:sticky md:top-16">
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
              <button
                onClick={toggleFavorite}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500'
                }`}
                aria-label={isFavorite ? '取消收藏' : '收藏'}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
            <div className="absolute bottom-12 left-4 right-4 md:hidden">
              <h1 className="text-2xl font-bold text-gray-800 drop-shadow-sm">{model.name}</h1>
            </div>
          </div>
        </div>

        {/* 右侧/下方：信息栏 */}
        <div className="md:w-2/5 lg:w-1/3 bg-white md:border-l border-gray-100">
          <div className="px-4 py-4 md:px-6 md:py-6 space-y-4 md:space-y-6 md:max-h-[calc(100vh-64px)] md:overflow-y-auto">
            {/* 桌面端标题 */}
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-gray-800">{model.name}</h1>
              <p className="text-gray-600 text-sm mt-2 leading-relaxed">{model.description}</p>
            </div>

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

            <div className="md:hidden">
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
              <div className="flex gap-2 flex-wrap">
                {model.steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => navigate(`/tutorial/${model.id}?step=${index}`)}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      index <= (progress?.currentStep ?? -1)
                        ? 'bg-green-100 text-green-600'
                        : 'bg-primary-100 text-primary-600'
                    }`}
                    aria-label={`跳转到第${index + 1}步`}
                  >
                    <span className="font-bold">{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 pb-4 md:pb-0">
              {isCompleted ? (
                <>
                  <button
                    onClick={() => navigate(`/tutorial/${model.id}?step=${model.steps.length}`)}
                    className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
                  >
                    查看成品
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate(`/tutorial/${model.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    再次搭建
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : hasProgress ? (
                <>
                  <button
                    onClick={() => navigate(`/tutorial/${model.id}?step=${progress?.currentStep ?? 0}`)}
                    className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
                  >
                    {/* P0-2: 修复「继续第0步」— currentStep=0 时不显示继续，currentStep>=1 时显示实际步号 */}
                    继续第{progress?.currentStep ?? 1}步
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate(`/tutorial/${model.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    重新开始
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate(`/tutorial/${model.id}`)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  开始搭建
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
