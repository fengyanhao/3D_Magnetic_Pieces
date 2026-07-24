import { useNavigate } from 'react-router-dom';
import { Shapes } from 'lucide-react';
import { shapeDetails } from '../data/shapes';
import { shapeLabels } from '../data/models';

export function ShapesPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
      <div className="text-center mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">基础形状</h1>
        <p className="text-gray-500">认识磁力片的各种基本形状</p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {shapeDetails.map((shape) => {
          const ShapeIcon = shape.icon || Shapes;
          return (
            <button
              key={shape.id}
              onClick={() => navigate(`/learn/shapes/${shape.id}`)}
              className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] flex flex-col items-center text-center gap-2"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
                <ShapeIcon className="w-7 h-7 md:w-8 md:h-8 text-primary-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm md:text-base">{shape.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{shapeLabels[shape.id]}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
