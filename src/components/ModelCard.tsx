import { useNavigate } from 'react-router-dom';
import { Star, Clock, Users } from 'lucide-react';
import { Model } from '../data/types';
import { themeLabels, difficultyLabels, difficultyColors } from '../data/models';

interface ModelCardProps {
  model: Model;
}

export function ModelCard({ model }: ModelCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/model/${model.id}`)}
      data-testid="model-card"
      className="bg-white rounded-2xl card-shadow overflow-hidden transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left w-full"
    >
      <div className="relative aspect-square">
        {model.coverImage ? (
          <img
            src={model.coverImage}
            alt={model.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // P2: 无封面时的占位图(纯 CSS,不依赖外部资源)
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">{model.name.charAt(0)}</span>
              </div>
              <p className="text-xs text-gray-400">未生成封面</p>
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full text-gray-700">
            {themeLabels[model.theme]}
          </span>
        </div>
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[model.difficulty]}`}>
          {difficultyLabels[model.difficulty]}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-gray-800 text-base mb-1.5 leading-tight">{model.name}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {model.ageRange}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {model.estimatedTime}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            {model.steps.length}步
          </span>
        </div>
      </div>
    </button>
  );
}
