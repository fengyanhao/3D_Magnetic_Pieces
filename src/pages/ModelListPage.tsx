import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Home, Car, Rocket, Cat, Castle, MoreHorizontal, Search, Layers } from 'lucide-react';
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

const validThemes: string[] = Object.keys(themeLabels);
const validDifficulties: string[] = Object.keys(difficultyLabels);

const structureTypes = [
  { id: '2d', label: '平面', description: '平面搭建' },
  { id: 'beginner-3d', label: '入门立体', description: '简单立体结构' },
  { id: 'advanced-3d', label: '进阶立体', description: '复杂立体结构' },
];

function parseAgeRange(ageStr: string): { min: number; max: number } | null {
  const match = ageStr.match(/^(\d+)-(\d+)岁$/);
  if (!match) return null;
  return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
}

function getModelStructure(model: typeof models[0]): string {
  const partsCount = model.parts.reduce((sum, part) => sum + part.count, 0);
  if (model.buildMode === 'solid' || model.buildMode === 'standing') {
    return partsCount <= 20 ? 'beginner-3d' : 'advanced-3d';
  }
  return '2d';
}

export function ModelListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const rawTheme = searchParams.get('theme');
  const rawDifficulty = searchParams.get('difficulty');
  const rawAge = searchParams.get('age');
  const rawStructure = searchParams.get('structure');
  const rawSearch = searchParams.get('q');

  useEffect(() => {
    setSearchQuery(rawSearch || '');
  }, [rawSearch]);

  const ageOptions = useMemo(() => {
    const ages = new Set<number>();
    models.forEach(m => {
      ages.add(m.minAge);
      ages.add(m.maxAge);
    });
    const sortedAges = Array.from(ages).sort((a, b) => a - b);
    const options: string[] = [];
    for (let i = 0; i < sortedAges.length - 1; i++) {
      options.push(`${sortedAges[i]}-${sortedAges[i + 1]}岁`);
    }
    if (!options.includes('6-12岁')) {
      options.push('6-12岁');
    }
    return options;
  }, []);

  const themeFilter = validThemes.includes(rawTheme || '') ? (rawTheme as Theme) : '';
  const difficultyFilter = validDifficulties.includes(rawDifficulty || '') ? (rawDifficulty as Difficulty) : '';
  const ageFilter = ageOptions.includes(rawAge || '') ? rawAge : '';
  const structureFilter = structureTypes.some(s => s.id === rawStructure) ? rawStructure : '';

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const newParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      newParams.set('q', query.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const filteredModels = models.filter((model) => {
    if (themeFilter && model.theme !== themeFilter) return false;
    if (difficultyFilter && model.difficulty !== difficultyFilter) return false;
    if (ageFilter) {
      const ageRange = parseAgeRange(ageFilter);
      if (ageRange) {
        if (model.maxAge < ageRange.min || model.minAge > ageRange.max) return false;
      }
    }
    if (structureFilter) {
      if (getModelStructure(model) !== structureFilter) return false;
    }
    if (rawSearch) {
      const query = rawSearch.toLowerCase();
      if (!model.name.toLowerCase().includes(query) && 
          !model.description.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = themeFilter || difficultyFilter || ageFilter || structureFilter || rawSearch;

  return (
    <div className="container">
      <Header title="模型列表" />
      
      <div className="sticky top-[60px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索模型名称或描述..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            aria-label="搜索模型"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full"
          aria-expanded={showFilters}
          aria-controls="filter-panel"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 font-medium">筛选</span>
            {hasActiveFilters && (
              <span className="bg-primary-100 text-primary-600 text-xs px-2 py-0.5 rounded-full">
                已筛选
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
          <div id="filter-panel" className="mt-4 space-y-4 pb-2">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">主题</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(themeLabels).map(([key, label]) => {
                  const Icon = themeIcons[key];
                  const isActive = themeFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => updateFilter('theme', isActive ? '' : key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      aria-pressed={isActive}
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
                      onClick={() => updateFilter('difficulty', isActive ? '' : key)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      aria-pressed={isActive}
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
                    onClick={() => updateFilter('age', ageFilter === age ? '' : age)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      ageFilter === age
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-pressed={ageFilter === age}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">结构类型</h4>
              <div className="flex flex-wrap gap-2">
                {structureTypes.map((struct) => (
                  <button
                    key={struct.id}
                    onClick={() => updateFilter('structure', structureFilter === struct.id ? '' : struct.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      structureFilter === struct.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-pressed={structureFilter === struct.id}
                    title={struct.description}
                  >
                    <Layers className="w-4 h-4" />
                    {struct.label}
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
