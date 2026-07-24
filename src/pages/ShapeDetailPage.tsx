import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shapes, CheckCircle } from 'lucide-react';
import { shapeDetails } from '../data/shapes';
import { shapeLabels } from '../data/models';

export function ShapeDetailPage() {
  const navigate = useNavigate();
  const { shapeId } = useParams();
  const shape = shapeDetails.find((s) => s.id === shapeId);

  if (!shape) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-gray-500">未找到该形状</p>
          <button onClick={() => navigate('/learn/shapes')} className="mt-4 text-primary-500 font-medium">
            返回形状列表
          </button>
        </div>
      </div>
    );
  }

  const ShapeIcon = shape.icon || Shapes;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
      <button
        onClick={() => navigate('/learn/shapes')}
        className="md:hidden flex items-center gap-1 text-gray-500 text-sm mb-4 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        返回形状列表
      </button>

      <div className="bg-white rounded-2xl p-5 md:p-8 border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
            <ShapeIcon className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">{shape.name}</h1>
            <p className="text-gray-500 text-sm">{shapeLabels[shape.id]}</p>
          </div>
        </div>

        <p className="text-gray-600 mb-6 leading-relaxed">{shape.description}</p>

        {shape.characteristics && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">形状特征</h3>
            <ul className="space-y-2">
              {shape.characteristics.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {shape.usageTips && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">使用技巧</h3>
            <ul className="space-y-2">
              {shape.usageTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {shape.examples && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3">常见应用</h3>
            <div className="flex flex-wrap gap-2">
              {shape.examples.map((ex, i) => (
                <span key={i} className="bg-primary-50 text-primary-600 text-sm px-3 py-1.5 rounded-full font-medium">
                  {ex}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
