import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Home, Car, Rocket, Cat, Castle, Grid3X3, BookOpen, LayoutGrid } from 'lucide-react';
import { models, difficultyLabels, difficultyColors } from '../data/models';

const themes = [
  { id: 'house', label: '房子', icon: Home, color: 'bg-red-100 text-red-600' },
  { id: 'car', label: '汽车', icon: Car, color: 'bg-blue-100 text-blue-600' },
  { id: 'rocket', label: '火箭', icon: Rocket, color: 'bg-purple-100 text-purple-600' },
  { id: 'animal', label: '动物', icon: Cat, color: 'bg-pink-100 text-pink-600' },
  { id: 'castle', label: '城堡', icon: Castle, color: 'bg-yellow-100 text-yellow-600' },
];

const difficulties = [
  { id: 'easy', label: '简单', color: 'bg-green-100 text-green-600' },
  { id: 'medium', label: '中等', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'hard', label: '困难', color: 'bg-red-100 text-red-600' },
];

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const featuredModel = models.find(m => m.id === 'house-1') || models[0];

  const handleThemeClick = (theme: string) => {
    navigate(`/list?theme=${theme}`);
  };

  const handleDifficultyClick = (difficulty: string) => {
    navigate(`/list?difficulty=${difficulty}`);
  };

  const handleSeeAll = () => {
    navigate('/list');
  };

  return (
    <div className="container h-screen flex flex-col">
      <header className="safe-area-top gradient-bg flex-shrink-0">
        <div className="px-4 pt-6 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-gray-800">亲子磁力片</h1>
          </div>
          <p className="text-gray-600 text-sm">和宝贝一起动手，创造无限可能！</p>
        </div>
      </header>

      <main className="px-4 -mt-6 pb-24 overflow-y-auto flex-1">
        <section className="bg-white rounded-2xl card-shadow overflow-hidden mb-6">
          <div className="relative">
            <img
              src={featuredModel.coverImage}
              alt={featuredModel.name}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/90 text-xs font-medium px-2 py-0.5 rounded-full text-gray-700">
                  精选推荐
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[featuredModel.difficulty]}`}>
                  {difficultyLabels[featuredModel.difficulty]}
                </span>
              </div>
              <h2 className="text-xl font-bold">{featuredModel.name}</h2>
              <p className="text-sm opacity-90">{featuredModel.description}</p>
            </div>
          </div>
          <div className="p-4">
            <button
              onClick={() => navigate(`/model/${featuredModel.id}`)}
              className="btn-primary w-full"
            >
              开始搭建
            </button>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">按主题浏览</h3>
            <button
              onClick={handleSeeAll}
              className="text-sm text-primary-500 font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {themes.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => handleThemeClick(id)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 hover:bg-gray-50 active:scale-95"
              >
                <div className={`p-2 rounded-full ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-gray-600">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">按难度选择</h3>
          <div className="flex gap-2">
            {difficulties.map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => handleDifficultyClick(id)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${color} hover:opacity-80 active:scale-95`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">热门模型</h3>
            <button
              onClick={handleSeeAll}
              className="flex items-center gap-1 text-sm text-primary-500 font-medium"
            >
              更多
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {models.slice(0, 4).map((model) => (
              <Link
                key={model.id}
                to={`/model/${model.id}`}
                className="flex-shrink-0 w-32 bg-white rounded-xl card-shadow overflow-hidden transform transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <div className="aspect-square">
                  <img
                    src={model.coverImage}
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <h4 className="font-medium text-gray-800 text-sm truncate">{model.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[model.difficulty]}`}>
                    {difficultyLabels[model.difficulty]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="bg-gradient-to-r from-primary-500 to-orange-400 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-lg">磁力片学堂</h4>
                <p className="text-sm opacity-90 mt-1">从入门到进阶，轻松掌握搭建技巧</p>
              </div>
              <button
                onClick={() => navigate('/learn')}
                className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 hover:bg-white/30 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                开始学习
              </button>
            </div>
          </div>
        </section>

        <section className="bg-primary-50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 rounded-full">
              <Sparkles className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">陪玩小贴士</h4>
              <p className="text-sm text-gray-600 mt-1">
                搭建过程中多鼓励孩子尝试不同的组合方式，让孩子自己发现解决问题的方法，这比完成作品更重要！
              </p>
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom z-50">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          <button
            onClick={() => navigate('/')}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
              location.pathname === '/' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-current={location.pathname === '/' ? 'page' : undefined}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button
            onClick={() => navigate('/learn')}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
              location.pathname.startsWith('/learn') ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-current={location.pathname.startsWith('/learn') ? 'page' : undefined}
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-xs font-medium">学堂</span>
          </button>
          <button
            onClick={() => navigate('/list')}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
              location.pathname === '/list' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-current={location.pathname === '/list' ? 'page' : undefined}
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="text-xs font-medium">作品</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
