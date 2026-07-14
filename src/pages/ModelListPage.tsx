import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Home, Car, Rocket, Cat, Castle, MoreHorizontal } from 'lucide-react';
import { Header } from '../components/Header';
import { ModelCard } from '../components/ModelCard';
import { models, themeLabels, difficultyLabels } from '../data/models';
import { Theme, Difficulty } from '../data/types';

const themeIcons: Record<string, typeof Home> = {
  house: Home,
  car: Car,
  rocket: Rocket,
  animal: Cat,
  castle: Castle,
  other: MoreHorizontal,
};

const ageOptions = ['3-4岁', '3-5岁', '4-6岁', '5-6岁'];

export function ModelListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [themeFilter, setThemeFilter] = useState<Theme | ''>((searchParams.get('theme') as Theme) || '');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>((searchParams.get('difficulty') as Difficulty) || '');
  const [ageFilter, setAgeFilter] = useState<string>('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (themeFilter) params.theme = themeFilter;
    if (difficultyFilter) params.difficulty = difficultyFilter;
    if (ageFilter) params.age = ageFilter;
    setSearchParams(params);
  }, [themeFilter, difficultyFilter, ageFilter, setSearchParams]);

  const filteredModels = models.filter((model) => {
    if (themeFilter && model.theme !== themeFilter) return false;
    if (difficultyFilter && model.difficulty !== difficultyFilter) return false;
    if (ageFilter && model.ageRange !== ageFilter) return false;
    return true;
  });

  const clearFilters = () => {
    setThemeFilter('');
    setDifficultyFilter('');
    setAgeFilter('');
  };

  const hasActiveFilters = themeFilter || difficultyFilter || ageFilter;

  return (
    <div className="container">
      <Header title="模型列表" />
      
      <div className="sticky top-[60px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 font-medium">筛选</span>
            {hasActiveFilters && (
              <span className="bg-primary-100 text-primary-600 text-xs px-2 py-0.5 rounded-full">
                {themeFilter ? themeLabels[themeFilter] : ''}
                {difficultyFilter ? (themeFilter ? ' ' : '') + difficultyLabels[difficultyFilter] : ''}
                {ageFilter ? (themeFilter || difficultyFilter ? ' ' : '') + ageFilter : ''}
              </span>
            )}
          </div>
          {showFilters ? (
            <X className="w-5 h-5 text-gray-500" />
          ) : (
            <span className="text-gray-400 text-sm">点击展开</span>
          )}
        </button>

        {showFilters && (
          <div className="mt-4 space-y-4 pb-2">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">主题</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(themeLabels).map(([key, label]) => {
                  const Icon = themeIcons[key];
                  const isActive = themeFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setThemeFilter(isActive ? '' : key as Theme)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">难度</h4>
              <div className="flex gap-2">
                {Object.entries(difficultyLabels).map(([key, label]) => {
                  const isActive = difficultyFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setDifficultyFilter(isActive ? '' : key as Difficulty)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">适合年龄</h4>
              <div className="flex flex-wrap gap-2">
                {ageOptions.map((age) => (
                  <button
                    key={age}
                    onClick={() => setAgeFilter(ageFilter === age ? '' : age)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      ageFilter === age
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                清除所有筛选
              </button>
            )}
          </div>
        )}
      </div>

      <main className="px-4 py-4 pb-8 safe-area-bottom">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">共 {filteredModels.length} 个模型</p>
        </div>

        {filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500">没有找到符合条件的模型</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-primary-500 font-medium"
            >
              清除筛选条件
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
