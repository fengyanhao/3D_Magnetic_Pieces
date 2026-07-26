import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, Star, Sparkles, Package,
  Home, Camera, Trash2, Check
} from 'lucide-react';
import { MagnetScene } from '../components/MagnetScene';
import { models, magnetColorMap } from '../data/models';
import { safeStorage, isFileProtocol } from '../utils/standalone';

function TutorialError() {
  const navigate = useNavigate();
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-12">
      <div className="flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl font-bold text-red-400">!</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">未找到该模型</h2>
        <p className="text-gray-500 text-center mb-8">
          可能是模型已被移除，或者链接有误。
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-xl font-medium transition-colors hover:bg-primary-600"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
          <button
            onClick={() => navigate('/list')}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium transition-colors hover:bg-gray-200"
          >
            浏览模型列表
          </button>
        </div>
      </div>
    </div>
  );
}

function TutorialContent({ modelId }: { modelId: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const model = models.find((m) => m.id === modelId)!;

  const savedStep = safeStorage.getItem(`tutorial_progress_${modelId}`);
  const initialStep = searchParams.get('step')
    ? parseInt(searchParams.get('step')!, 10)
    : savedStep
      ? JSON.parse(savedStep).currentStep
      : 0;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  useEffect(() => {
    if (currentStep < model.steps.length) {
      safeStorage.setItem(`tutorial_progress_${modelId}`, JSON.stringify({
        modelId,
        currentStep,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [currentStep, modelId, model.steps.length]);

  const steps = model.steps;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const currentStepData = steps[currentStep];
  const currentParts = useMemo(() => {
    // P0-1: 移除 v1 addedPieces 分支,统一使用 addedPieceIds
    if (currentStepData?.addedPieceIds) {
      return currentStepData.addedPieceIds
        .map((pid) => {
          const piece = model.pieces?.find((p) => p.id === pid);
          return piece ? { id: piece.id, partId: piece.partId, position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] } : null;
        })
        .filter(Boolean) as { id: string; partId: string; position: [number, number, number]; rotation: [number, number, number] }[];
    }
    return [];
  }, [currentStepData, model.pieces]);

  const stepPartCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentParts.forEach((p) => {
      counts[p.partId] = (counts[p.partId] || 0) + 1;
    });
    return counts;
  }, [currentParts]);

  const partDetails = useMemo(() => {
    return Object.entries(stepPartCounts).map(([partId, count]) => {
      const part = model.parts.find((p) => p.id === partId);
      return part ? { ...part, stepCount: count } : null;
    }).filter(Boolean);
  }, [stepPartCounts, model.parts]);

  const handlePrev = () => {
    if (!isFirstStep) setCurrentStep(currentStep - 1);
  };

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    } else {
      safeStorage.setItem(`tutorial_progress_${modelId}`, JSON.stringify({
        modelId,
        currentStep: model.steps.length,
        completedAt: new Date().toISOString(),
      }));
      setCurrentStep(steps.length);
    }
  };

  const handleBack = () => {
    navigate(`/model/${model.id}`);
  };

  const handleRestart = () => setCurrentStep(0);
  const handleHome = () => navigate('/');

  const handlePhotoCapture = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    if (!isFileProtocol()) {
      fileInput.accept = 'image/*';
      fileInput.capture = 'environment';
    } else {
      fileInput.accept = 'image/*';
    }

    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setCapturedPhoto(result);
          setShowPhotoPreview(true);
          const savedPhotos = safeStorage.getItem('model_photos');
          const photos = savedPhotos ? JSON.parse(savedPhotos) : [];
          photos.push({ modelId, modelName: model.name, photo: result, timestamp: new Date().toISOString() });
          safeStorage.setItem('model_photos', JSON.stringify(photos));
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }, [modelId, model.name]);

  const handleDeletePhoto = useCallback(() => {
    if (capturedPhoto) {
      const savedPhotos = safeStorage.getItem('model_photos');
      if (savedPhotos) {
        const photos = JSON.parse(savedPhotos);
        const filteredPhotos = photos.filter((p: { photo: string }) => p.photo !== capturedPhoto);
        safeStorage.setItem('model_photos', JSON.stringify(filteredPhotos));
      }
      setCapturedPhoto(null);
      setShowPhotoPreview(false);
    }
  }, [capturedPhoto]);

  if (currentStep >= steps.length) {
    const savedPhotos = safeStorage.getItem('model_photos');
    const photos = savedPhotos ? JSON.parse(savedPhotos) : [];
    const modelPhotos = photos.filter((p: { modelId: string }) => p.modelId === modelId);

    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-8">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 motion-safe:animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h1>
          <p className="text-gray-600 text-center mb-6">
            你和宝贝一起完成了{model.name}的搭建！
          </p>

          <div className="bg-white rounded-2xl card-shadow p-6 mb-6 w-full max-w-md">
            <div className="aspect-square rounded-xl overflow-hidden mb-4">
              <MagnetScene model={model} stepIndex={-1} interactive={true} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg text-center">{model.name}</h3>
          </div>

          <div className="flex items-center gap-3 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            ))}
          </div>

          <button
            onClick={handlePhotoCapture}
            className="w-full max-w-xs bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 mb-6"
          >
            <Camera className="w-5 h-5" />
            拍照记录
          </button>

          {modelPhotos.length > 0 && (
            <div className="w-full max-w-md mb-6">
              <h3 className="font-bold text-gray-800 mb-3">作品记录</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {modelPhotos.map((photo: { photo: string }, idx: number) => (
                  <div key={idx} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden">
                    <img src={photo.photo} alt={`作品照片${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={handleRestart} className="btn-primary w-full flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              再玩一次
            </button>
            <button onClick={handleBack} className="btn-secondary w-full">返回模型详情</button>
            <button onClick={handleHome} className="w-full py-3 text-gray-500 font-medium">返回首页</button>
          </div>
        </div>

        {showPhotoPreview && capturedPhoto && (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl overflow-hidden max-w-full max-h-full">
              <img src={capturedPhoto} alt="照片预览" className="max-w-[80vw] max-h-[60vh] object-contain" />
              <div className="p-4 flex justify-between items-center">
                <button onClick={handleDeletePhoto} className="flex items-center gap-2 text-red-500 px-4 py-2">
                  <Trash2 className="w-5 h-5" />
                  删除
                </button>
                <button onClick={() => setShowPhotoPreview(false)} className="bg-primary-500 text-white px-6 py-2 rounded-xl font-medium">
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const step = currentStepData;

  return (
    <div>
      {/* 移动端顶部栏 */}
      <div className="md:hidden bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="返回模型详情">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-gray-800" data-testid="step-indicator">
              第 {currentStep + 1} / {steps.length} 步
            </h1>
          </div>
          <div className="w-10" />
        </div>
        <div className="h-1.5 bg-gray-100">
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 桌面端：左右分栏 */}
      <div className="md:flex md:h-[calc(100vh-64px)]">
        {/* 左侧：大画布 */}
        <div className="md:flex-1 relative bg-gray-900">
          <div className="w-full h-72 md:h-full" data-testid="magnet-scene">
            <MagnetScene model={model} stepIndex={currentStep} highlightNew={true} interactive={true} />
          </div>
          {/* 步骤标签 */}
          <div className="absolute top-4 left-4">
            <span className="bg-primary-500 text-white text-sm font-medium px-3 py-1.5 rounded-full shadow-lg">
              {step.title}
            </span>
          </div>
          {/* 桌面端步骤进度（画布右上角） */}
          <div className="hidden md:flex absolute top-4 right-4 items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm">
            <span className="font-medium">{currentStep + 1} / {steps.length}</span>
          </div>
        </div>

        {/* 右侧：步骤信息面板 */}
        <div className="md:w-[400px] lg:w-[440px] bg-white md:border-l border-gray-200 flex flex-col">
          {/* 桌面端步骤时间轴 */}
          <div className="hidden md:block px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">{step.title}</h2>
              <span className="text-sm text-gray-500">第 {currentStep + 1} / {steps.length} 步</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg transition-all flex items-center justify-center text-xs font-medium ${
                    index === currentStep
                      ? 'bg-primary-500 text-white'
                      : index < currentStep
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* 移动端步骤选择器 */}
          <div className="md:hidden px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl transition-all flex items-center justify-center font-medium ${
                    index === currentStep
                      ? 'bg-primary-500 text-white ring-2 ring-primary-300 ring-offset-2'
                      : index < currentStep
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {index < currentStep ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm">{index + 1}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 滚动内容区 */}
          <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-4">
            {partDetails.length > 0 && (
              <div className="bg-primary-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-primary-500" />
                  <h3 className="font-bold text-gray-800">本步新增零件</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {partDetails.map((part) => (
                    <div key={part?.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                      <div
                        className="w-6 h-6 rounded-lg border border-white/60"
                        style={{ backgroundColor: part ? magnetColorMap[part.color] : '#ccc' }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{part?.name}</p>
                        <p className="text-xs text-gray-500">x{part?.stepCount}</p>
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
              <p className="text-gray-600 text-sm leading-relaxed italic">{step.parentGuide}</p>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="px-4 md:px-5 py-4 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                disabled={isFirstStep}
                data-testid="prev-step"
                className={`flex-1 btn-secondary flex items-center justify-center gap-2 ${isFirstStep ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ArrowLeft className="w-5 h-5" />
                上一步
              </button>
              <button
                onClick={handleNext}
                data-testid="next-step"
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {isLastStep ? '完成' : '下一步'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TutorialPage() {
  const { id } = useParams<{ id: string }>();
  const model = models.find((m) => m.id === id);

  if (!model) {
    return <TutorialError />;
  }

  return <TutorialContent modelId={id || ''} />;
}
