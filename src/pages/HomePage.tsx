import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Home, Car, Rocket, Cat, Castle, Grid3X3, BookOpen, Pencil } from 'lucide-react';
import { models, difficultyLabels, difficultyColors } from '../data/models';
import { ModelCover } from '../components/ModelCover';

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
  const featuredModel = models.find(m => m.id === 'house-1') || models[0];

  const handleThemeClick = (theme: string) => {
    navigate(`/list?theme=${theme}`);
  };

  const handleDifficultyClick = (difficulty: string) => {
    navigate(`/list?difficulty=${difficulty}`);
  };

  return (
    <div>
      {/* 移动端标题区 */}
      <header className="md:hidden safe-area-top gradient-bg">
        <div className="px-4 pt-6 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-gray-800">亲子磁力片</h1>
          </div>
          <p className="text-gray-600 text-sm">和宝贝一起动手，创造无限可能！</p>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-8">
        {/* 桌面端：精选推荐左右布局 */}
        <section className="mb-8 md:mb-10">
          <div className="md:flex md:gap-8 md:items-start">
            <div className="md:w-2/3 bg-white rounded-2xl card-shadow overflow-hidden">
              <div className="relative">
                {/* P0-6: 使用真实3D渲染封面 */}
                <ModelCover model={featuredModel} className="w-full h-48 md:h-80 object-cover" />
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
                  <h2 className="text-xl md:text-2xl font-bold">{featuredModel.name}</h2>
                  <p className="text-sm opacity-90">{featuredModel.description}</p>
                </div>
              </div>
              <div className="p-4">
                <button
                  onClick={() => navigate(`/model/${featuredModel.id}`)}
                  className="btn-primary w-full md:w-auto md:px-8"
                >
                  开始搭建
                </button>
              </div>
            </div>

            {/* 桌面端右侧：编辑器入口 + 学堂 */}
            <div className="hidden md:flex md:w-1/3 flex-col gap-4">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">磁力片方案编辑器</h4>
                    <p className="text-xs opacity-80">电脑端创作 3D 拼搭方案</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/editor')}
                  className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  进入编辑器
                </button>
              </div>

              <div className="bg-gradient-to-r from-primary-500 to-orange-400 rounded-2xl p-5 text-white flex-1">
                <h4 className="font-bold text-lg mb-1">磁力片学堂</h4>
                <p className="text-sm opacity-90 mb-4">从入门到进阶，轻松掌握搭建技巧</p>
                <button
                  onClick={() => navigate('/learn')}
                  className="w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                >
                  <BookOpen className="w-4 h-4" />
                  开始学习
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 按主题浏览 */}
        <section className="mb-8 md:mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-lg">按主题浏览</h3>
            <button
              onClick={() => navigate('/list')}
              className="text-sm text-primary-500 font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-4">
            {themes.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => handleThemeClick(id)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 hover:bg-gray-50 active:scale-95"
              >
                <div className={`p-2 rounded-full ${color}`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="text-xs text-gray-600">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 按难度选择 */}
        <section className="mb-8 md:mb-10">
          <h3 className="font-bold text-gray-800 text-lg mb-3">按难度选择</h3>
          <div className="flex gap-2 md:gap-3">
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

        {/* 热门模型：桌面端网格，移动端横向滚动 */}
        <section className="mb-8 md:mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-lg">热门模型</h3>
            <button
              onClick={() => navigate('/list')}
              className="flex items-center gap-1 text-sm text-primary-500 font-medium"
            >
              更多
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          {/* 移动端横向滚动 */}
          <div className="flex md:hidden gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {models.slice(0, 4).map((model) => (
              <Link
                key={model.id}
                to={`/model/${model.id}`}
                className="flex-shrink-0 w-32 bg-white rounded-xl card-shadow overflow-hidden transform transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="aspect-square">
                  {/* P0-6: 使用真实3D渲染封面 */}
                  <ModelCover model={model} className="w-full h-full object-cover" />
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
          {/* 桌面端网格 */}
          <div className="hidden md:grid md:grid-cols-4 gap-4">
            {models.slice(0, 4).map((model) => (
              <Link
                key={model.id}
                to={`/model/${model.id}`}
                className="bg-white rounded-xl card-shadow overflow-hidden transform transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="aspect-[4/3]">
                  {/* P0-6: 使用真实3D渲染封面 */}
                  <ModelCover model={model} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-gray-800 truncate">{model.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[model.difficulty]}`}>
                    {difficultyLabels[model.difficulty]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 移动端：学堂 + 编辑器 */}
        <section className="md:hidden mb-6">
          <div className="bg-gradient-to-r from-primary-500 to-orange-400 rounded-2xl p-4 text-white mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-lg">磁力片学堂</h4>
                <p className="text-sm opacity-90 mt-1">从入门到进阶，轻松掌握搭建技巧</p>
              </div>
              <button
                onClick={() => navigate('/learn')}
                className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 hover:bg-white/30 transition-colors min-h-[44px]"
              >
                <BookOpen className="w-4 h-4" />
                开始学习
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate('/editor')}
            className="w-full bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-4 text-white flex items-center justify-between hover:from-gray-900 hover:to-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Pencil className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-base">磁力片方案编辑器</h4>
                <p className="text-xs opacity-80 mt-0.5">电脑端创作你自己的 3D 拼搭方案</p>
              </div>
            </div>
          </button>
        </section>

        <section className="bg-primary-50 rounded-2xl p-4 md:p-6 mb-8">
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
      </div>
    </div>
  );
}
