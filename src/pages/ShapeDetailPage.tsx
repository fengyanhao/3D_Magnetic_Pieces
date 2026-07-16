import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ruler, CornerDownLeft, Link2, Grid3x3, Play } from 'lucide-react';

const shapeData: Record<string, {
  name: string;
  englishName: string;
  description: string;
  dimensions: string;
  angles: string;
  ports: number;
  compatible: string[];
  uses: string[];
  mistakes: string[];
  source: string;
  lastReviewed: string;
}> = {
  square: {
    name: '正方形',
    englishName: 'Square',
    description: '四边相等、四角均为90度的四边形，是最基础的磁力片形状',
    dimensions: '边长5cm×5cm',
    angles: '4个直角(90°)',
    ports: 4,
    compatible: ['正方形', '长方形', '三角形', '梯形'],
    uses: ['搭建底座', '制作墙壁', '构建立方体'],
    mistakes: ['不要只在一个方向延伸', '注意边对齐'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  rectangle: {
    name: '长方形',
    englishName: 'Rectangle',
    description: '对边相等、四角均为90度的四边形，常用于搭建长条结构',
    dimensions: '长10cm×宽5cm',
    angles: '4个直角(90°)',
    ports: 4,
    compatible: ['正方形', '长方形', '三角形'],
    uses: ['搭建桥梁', '制作车身', '构建长方体'],
    mistakes: ['注意长边和短边的区分'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  'equilateral-triangle': {
    name: '等边三角形',
    englishName: 'Equilateral Triangle',
    description: '三边相等、三角均为60度的三角形，是最稳定的形状',
    dimensions: '边长5cm',
    angles: '3个60°角',
    ports: 3,
    compatible: ['正方形', '长方形', '其他三角形', '梯形'],
    uses: ['搭建屋顶', '制作三角结构', '构建四面体'],
    mistakes: ['注意三个角的方向'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  'isosceles-triangle': {
    name: '等腰三角形',
    englishName: 'Isosceles Triangle',
    description: '两边相等、两底角相等的三角形',
    dimensions: '底边5cm，两腰5cm',
    angles: '两个60°角，一个60°角',
    ports: 3,
    compatible: ['正方形', '长方形', '其他三角形'],
    uses: ['搭建斜屋顶', '制作对称结构'],
    mistakes: ['注意底边和腰的区分'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  'right-triangle': {
    name: '直角三角形',
    englishName: 'Right Triangle',
    description: '一个角为90度的三角形，两直角边相等',
    dimensions: '直角边5cm',
    angles: '1个90°角，2个45°角',
    ports: 3,
    compatible: ['正方形', '长方形', '半圆'],
    uses: ['搭建墙角', '制作斜坡', '构建直角结构'],
    mistakes: ['注意直角的位置'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  'long-right-triangle': {
    name: '长直角三角形',
    englishName: 'Long Right Triangle',
    description: '一个角为90度，两直角边不等的三角形',
    dimensions: '短边5cm，长边10cm',
    angles: '1个90°角，两个锐角',
    ports: 3,
    compatible: ['正方形', '长方形', '半圆'],
    uses: ['搭建长斜坡', '制作斜边结构'],
    mistakes: ['注意长边和短边的位置'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  trapezoid: {
    name: '梯形',
    englishName: 'Trapezoid',
    description: '只有一组对边平行的四边形',
    dimensions: '上底5cm，下底10cm，高5cm',
    angles: '两个钝角，两个锐角',
    ports: 4,
    compatible: ['三角形', '正方形', '长方形'],
    uses: ['搭建梯形屋顶', '制作桥梁结构'],
    mistakes: ['注意上下底的区分'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  rhombus: {
    name: '菱形',
    englishName: 'Rhombus',
    description: '四边相等的平行四边形',
    dimensions: '边长5cm',
    angles: '两个钝角，两个锐角',
    ports: 4,
    compatible: ['正方形', '三角形', '梯形'],
    uses: ['搭建菱形图案', '制作装饰结构'],
    mistakes: ['注意对角线的方向'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  pentagon: {
    name: '五边形',
    englishName: 'Pentagon',
    description: '有五条边的多边形',
    dimensions: '边长5cm',
    angles: '5个108°角',
    ports: 5,
    compatible: ['三角形', '六边形'],
    uses: ['搭建五边形底座', '制作装饰图案'],
    mistakes: ['注意每个角的方向'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  hexagon: {
    name: '六边形',
    englishName: 'Hexagon',
    description: '有六条边的多边形，可以紧密排列',
    dimensions: '边长5cm',
    angles: '6个120°角',
    ports: 6,
    compatible: ['三角形', '正方形'],
    uses: ['搭建蜂窝结构', '制作六边形底座'],
    mistakes: ['注意排列方式'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  semicircle: {
    name: '半圆',
    englishName: 'Semicircle',
    description: '圆形的一半，有一条直边和一条曲边',
    dimensions: '直径10cm，半径5cm',
    angles: '直边两端各有一个连接点',
    ports: 2,
    compatible: ['长方形', '直角三角形'],
    uses: ['搭建拱门', '制作圆形结构的一部分'],
    mistakes: ['曲边没有磁铁，不能连接'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
  sector: {
    name: '扇形',
    englishName: 'Sector',
    description: '圆形的一部分，由两条半径和一段弧组成',
    dimensions: '半径5cm，圆心角90°',
    angles: '圆心角90°',
    ports: 2,
    compatible: ['正方形', '直角三角形'],
    uses: ['搭建圆形结构', '制作装饰图案'],
    mistakes: ['曲边没有磁铁，不能连接'],
    source: '磁力片通用标准',
    lastReviewed: '2024-01-15',
  },
};

export function ShapeDetailPage() {
  const { shapeId } = useParams<{ shapeId: string }>();
  const navigate = useNavigate();
  
  const shape = shapeData[shapeId || ''];
  
  if (!shape) {
    return (
      <div className="container min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 px-4 py-4">
        <button
          onClick={() => navigate('/learn/shapes')}
          className="flex items-center gap-2 text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回形状列表</span>
        </button>
        <div className="mt-4 text-center">
          <p className="text-gray-500">未找到该形状</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="safe-area-top" />
      <header className="px-4 py-4">
        <button
          onClick={() => navigate('/learn/shapes')}
          className="flex items-center gap-2 text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回形状列表</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 mt-4">{shape.name}</h1>
        <p className="text-gray-500 mt-1">{shape.englishName}</p>
      </header>
      <main className="px-4 pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-6xl">
              {shapeId === 'square' && '□'}
              {shapeId === 'rectangle' && '▭'}
              {shapeId === 'equilateral-triangle' && '△'}
              {shapeId === 'isosceles-triangle' && '▲'}
              {shapeId === 'right-triangle' && '◢'}
              {shapeId === 'long-right-triangle' && '◣'}
              {shapeId === 'trapezoid' && '⏢'}
              {shapeId === 'rhombus' && '◇'}
              {shapeId === 'pentagon' && '⬡'}
              {shapeId === 'hexagon' && '⬢'}
              {shapeId === 'semicircle' && '◡'}
              {shapeId === 'sector' && '◠'}
            </div>
          </div>
          <button className="mt-4 w-full bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <Play className="w-5 h-5" />
            马上练习
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-gray-800 mb-3">基本信息</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-gray-500">尺寸</p>
                <p className="font-medium text-gray-800">{shape.dimensions}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <CornerDownLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-gray-500">角度</p>
                <p className="font-medium text-gray-800">{shape.angles}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-gray-500">连接端口</p>
                <p className="font-medium text-gray-800">{shape.ports}个</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-gray-800 mb-3">描述</h3>
          <p className="text-gray-600">{shape.description}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-gray-800 mb-3">常见组合</h3>
          <div className="flex flex-wrap gap-2">
            {shape.compatible.map((c, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-gray-800 mb-3">常见用途</h3>
          <ul className="space-y-2">
            {shape.uses.map((use, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-600">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
                <span>{use}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-yellow-50 rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-yellow-700 mb-3">常见错误</h3>
          <ul className="space-y-2">
            {shape.mistakes.map((mistake, idx) => (
              <li key={idx} className="flex items-start gap-2 text-yellow-600">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <h3 className="font-bold text-gray-700 mb-2">资料来源</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Grid3x3 className="w-4 h-4" />
            <span>{shape.source}</span>
            <span className="mx-2">|</span>
            <span>最后审核: {shape.lastReviewed}</span>
          </div>
        </div>
      </main>
    </div>
  );
}