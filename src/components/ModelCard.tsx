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
    <div
      onClick={() => navigate(`/model/${model.id}`)}
      className="bg-white rounded-2xl card-shadow overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="relative aspect-square">
        <img
          src={model.coverImage}
          alt={model.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-3 py-1 rounded-full text-gray-700">
            {themeLabels[model.theme]}
          </span>
        </div>
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[model.difficulty]}`}>
          {difficultyLabels[model.difficulty]}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-lg mb-2">{model.name}</h3>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{model.ageRange}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{model.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{model.steps.length}步</span>
          </div>
        </div>
      </div>
    </div>
  );
}
