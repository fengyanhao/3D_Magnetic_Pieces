import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Star, Sparkles, Package } from 'lucide-react';
import { MagnetScene } from '../components/MagnetScene';
import { models, magnetColorMap } from '../data/models';

export function TutorialPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const model = models.find((m) => m.id === id);
  const [currentStep, setCurrentStep] = useState(0);

  if (!model) {
    return (
      <div className="container">
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

  const steps = model.steps;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // 计算本步骤新增加的零件种类
  const currentParts = steps[currentStep]?.addedPieces || [];
  const newPartIds = useMemo(() => {
    const prevIds = currentStep > 0
      ? new Set(steps[currentStep - 1].addedPieces.map((p) => p.partId))
      : new Set<string>();
    const ids = new Set<string>();
    currentParts.forEach((p) => {
      if (!prevIds.has(p.partId)) ids.add(p.partId);
    });
    return Array.from(ids);
  }, [currentStep, currentParts, steps]);

  const partDetails = newPartIds
    .map((partId) => model.parts.find((p) => p.id === partId))
    .filter(Boolean);

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(steps.length);
    }
  };

  const handleBack = () => {
    navigate(`/model/${model.id}`);
  };

  const handleRestart = () => {
    setCurrentStep(0);
  };

  const handleHome = () => {
    navigate('/');
  };

  if (currentStep >= steps.length) {
    return (
      <div className="container">
        <div className="safe-area-top" />
        <main className="px-4 py-8 safe-area-bottom flex flex-col items-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h1>
          <p className="text-gray-600 text-center mb-6">
            你和宝贝一起完成了{model.name}的搭建！
          </p>

          <div className="bg-white rounded-2xl card-shadow p-6 mb-6 w-full">
            <div className="aspect-square rounded-xl overflow-hidden mb-4">
              <MagnetScene model={model} stepIndex={-1} interactive={true} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg text-center">{model.name}</h3>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </div>

          <p className="text-sm text-gray-500 text-center mb-8">
            小朋友真厉害！一起拍张照片记录这个作品吧！
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleRestart}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              再玩一次
            </button>
            <button
              onClick={handleBack}
              className="btn-secondary w-full"
            >
              返回模型详情
            </button>
            <button
              onClick={handleHome}
              className="w-full py-3 text-gray-500 font-medium"
            >
              返回首页
            </button>
          </div>
        </main>
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="container">
      <header className="safe-area-top bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-gray-800">
              第 {currentStep + 1} / {steps.length} 步
            </h1>
          </div>
          <div className="w-10" />
        </div>
        <div className="h-2 bg-gray-100">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="pb-8 safe-area-bottom">
        <div className="relative h-72">
          <MagnetScene
            model={model}
            stepIndex={currentStep}
            highlightNew={true}
            interactive={true}
          />
          <div className="absolute top-4 left-4">
            <span className="bg-primary-500 text-white text-sm font-medium px-3 py-1.5 rounded-full shadow-lg">
              {step.title}
            </span>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {partDetails.length > 0 && (
            <div className="bg-primary-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-gray-800">本步新增零件</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {partDetails.map((part) => (
                  <div
                    key={part?.id}
                    className="flex items-center gap-2 bg-white rounded-xl px-3 py-2"
                  >
                    <div
                      className="w-6 h-6 rounded-lg border border-white/60"
                      style={{ backgroundColor: part ? magnetColorMap[part.color] : '#ccc' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{part?.name}</p>
                      <p className="text-xs text-gray-500">x{part?.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-2xl p-4">
            <h3 className="font-bold text-gray-800 mb-2">操作说明</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
          </div>

          <div className="bg-yellow-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-gray-800">家长引导话术</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed italic">
              {step.parentGuide}
            </p>
          </div>

          <div className="flex gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`flex-1 h-2 rounded-full transition-all duration-200 ${
                  index === currentStep
                    ? 'bg-primary-500'
                    : index < currentStep
                    ? 'bg-primary-200'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`flex-1 btn-secondary flex items-center justify-center gap-2 ${
                isFirstStep ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              上一步
            </button>
            <button
              onClick={handleNext}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {isLastStep ? '完成' : '下一步'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
