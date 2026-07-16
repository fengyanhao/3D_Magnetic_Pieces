import { shapeCatalog, colorLabels, shapeThumbnailDataUrl } from '../../editor/shapeInfo';
import { buildMaterialInventory } from '../../editor/serialization';
import { EditorProject } from '../../editor/types';
import { MagnetShape, MagnetColor } from '../../data/types';

interface Props {
  onAddPiece: (shape: MagnetShape, color: MagnetColor) => void;
  project: EditorProject;
}

/** 左侧:磁力片零件库。 */
export function PartLibrary({ onAddPiece, project }: Props) {
  const inventory = buildMaterialInventory(project);
  const invMap = new Map(inventory.map((i) => [`${i.shape}:${i.color}`, i]));

  return (
    <div className="p-3">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">零件库</h2>
      <p className="text-xs text-gray-400 mb-3">点击添加到方案</p>
      <div className="grid grid-cols-2 gap-2">
        {shapeCatalog.map((entry) => {
          const color = entry.defaultColors[0];
          const used = invMap.get(`${entry.shape}:${color}`)?.count ?? 0;
          return (
            <button
              key={entry.shape}
              onClick={() => onAddPiece(entry.shape, color)}
              className="flex flex-col items-center p-2 border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors group"
              title={`${entry.label} (${entry.dimensions})`}
            >
              <img
                src={shapeThumbnailDataUrl(entry.shape, 40)}
                alt={entry.label}
                className="w-10 h-10"
                style={{ imageRendering: 'auto' }}
              />
              <span className="text-xs mt-1 text-gray-700">{entry.label}</span>
              <span className="text-[10px] text-gray-400">{entry.dimensions}</span>
              {used > 0 && (
                <span className="text-[10px] text-blue-500 mt-0.5">已用 {used}</span>
              )}
            </button>
          );
        })}
      </div>

      <details className="mt-4">
        <summary className="text-xs text-gray-500 cursor-pointer">颜色说明</summary>
        <ul className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
          {Object.entries(colorLabels).map(([c, label]) => (
            <li key={c} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded-sm border`} style={{ background: colorSwatch(c as MagnetColor) }} />
              {label}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function colorSwatch(c: MagnetColor): string {
  const map: Record<MagnetColor, string> = {
    red: '#ff6b6b', orange: '#ff9f43', yellow: '#ffe66d', green: '#4ecd96',
    cyan: '#4ecd98', blue: '#3498db', purple: '#9b59b6', pink: '#f5b7b1',
    white: '#ffffff', black: '#2c3e50', clear: '#e0f7fa',
  };
  return map[c];
}
