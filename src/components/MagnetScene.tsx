import { RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState, useEffect, Suspense, lazy } from 'react';
import { Model, MagnetPiece } from '../data/types';
import { magnetColorMap, magnetEdgeColorMap } from '../data/models';
import { MagnetScene3D as MagnetScene3DSync } from './MagnetScene3D';
import { RUNTIME_FLAGS } from '../utils/standalone';

// standalone 模式下使用同步 import，把 Three.js 一起内嵌进 HTML
// 开发/生产模式继续走 lazy 拆分
const MagnetScene3DLazy = lazy(() => import('./MagnetScene3D').then(m => ({ default: m.MagnetScene3D })));
const MagnetScene3D = RUNTIME_FLAGS.isStandalone ? MagnetScene3DSync : MagnetScene3DLazy;

interface MagnetSceneProps {
  model: Model;
  stepIndex: number;
  highlightNew?: boolean;
  interactive?: boolean;
}

function isV2Model(model: Model): boolean {
  return !!(model.pieces && model.connections && model.buildMode);
}

const UNIT = 56;
const THICKNESS = 6;

const shapePath: Record<string, string> = {
  square: 'M-50,-50 L50,-50 L50,50 L-50,50 Z',
  rectangle: 'M-100,-50 L100,-50 L100,50 L-100,50 Z',
  'equilateral-triangle': 'M0,-58 L50,29 L-50,29 Z',
  'isosceles-triangle': 'M0,-75 L40,45 L-40,45 Z',
  trapezoid: 'M-30,-50 L30,-50 L60,50 L-60,50 Z',
  hexagon: 'M-50,-29 L0,-58 L50,-29 L50,29 L0,58 L-50,29 Z',
  pentagon: 'M0,-58 L55,-18 L34,52 L-34,52 L-55,-18 Z',
  sector: 'M0,0 L0,-58 A58,58 0 0,1 50,-29 Z',
  rhombus: 'M0,-58 L50,0 L0,58 L-50,0 Z',
};

const shapeViewBox: Record<string, string> = {
  square: '-60 -60 120 120',
  rectangle: '-110 -60 220 120',
  'equilateral-triangle': '-60 -70 120 110',
  'isosceles-triangle': '-55 -85 110 140',
  trapezoid: '-70 -60 140 120',
  hexagon: '-60 -68 120 136',
  pentagon: '-60 -68 120 130',
  sector: '-60 -68 120 120',
  rhombus: '-60 -68 120 136',
};

/** 每种形状的半包围盒（position 单位），用于自动取景 */
function getShapeExtent(shape: string): { hx: number; hy: number; hz: number } {
  switch (shape) {
    case 'square':
      return { hx: 0.55, hy: 0.08, hz: 0.55 };
    case 'rectangle':
      return { hx: 1.05, hy: 0.08, hz: 0.55 };
    case 'equilateral-triangle':
      return { hx: 0.55, hy: 0.08, hz: 0.55 };
    case 'isosceles-triangle':
      return { hx: 0.45, hy: 0.08, hz: 0.65 };
    case 'trapezoid':
      return { hx: 0.65, hy: 0.08, hz: 0.55 };
    case 'hexagon':
      return { hx: 0.55, hy: 0.08, hz: 0.6 };
    case 'pentagon':
      return { hx: 0.6, hy: 0.08, hz: 0.55 };
    case 'sector':
      return { hx: 0.55, hy: 0.08, hz: 0.55 };
    case 'rhombus':
      return { hx: 0.5, hy: 0.08, hz: 0.6 };
    default:
      return { hx: 0.55, hy: 0.08, hz: 0.55 };
  }
}

/** 计算当前可见零件的包围盒（保守估计，考虑旋转） */
function computeSceneBounds(
  visiblePieces: { piece: MagnetPiece }[],
  partMap: Record<string, Model['parts'][number]>
): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const { piece } of visiblePieces) {
    const part = partMap[piece.partId];
    if (!part) continue;

    const [px, py, pz] = piece.position;
    const { hx, hy, hz } = getShapeExtent(part.shape);

    // 考虑旋转的保守估计：用包围球半径
    const radius = Math.sqrt(hx * hx + hy * hy + hz * hz);

    minX = Math.min(minX, px - radius);
    maxX = Math.max(maxX, px + radius);
    minY = Math.min(minY, py - radius);
    maxY = Math.max(maxY, py + radius);
    minZ = Math.min(minZ, pz - radius);
    maxZ = Math.max(maxZ, pz + radius);
  }

  // 防止空场景或单点
  if (minX === Infinity) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };
  }

  // 保证最小尺寸，避免过度缩放
  const minSize = 1.5;
  if (maxX - minX < minSize) {
    const cx = (minX + maxX) / 2;
    minX = cx - minSize / 2;
    maxX = cx + minSize / 2;
  }
  if (maxY - minY < minSize) {
    const cy = (minY + maxY) / 2;
    minY = cy - minSize / 2;
    maxY = cy + minSize / 2;
  }
  if (maxZ - maxZ < minSize) {
    const cz = (minZ + maxZ) / 2;
    minZ = cz - minSize / 2;
    maxZ = cz + minSize / 2;
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/** 计算自动取景参数 */
function computeCamera(
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
  containerWidth: number,
  containerHeight: number
): { centerX: number; centerY: number; centerZ: number; scale: number } {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  const sizeX = (bounds.maxX - bounds.minX) * UNIT;
  const sizeY = (bounds.maxY - bounds.minY) * UNIT;
  const sizeZ = (bounds.maxZ - bounds.minZ) * UNIT;

  // 在透视投影下，最大维度决定所需视野
  const maxDim = Math.max(sizeX, sizeY, sizeZ, UNIT * 2);

  // 容器可用空间（留 10% padding）
  const availW = containerWidth * 0.85;
  const availH = containerHeight * 0.85;
  const avail = Math.min(availW, availH);

  const scale = avail > 0 && maxDim > 0 ? Math.min(avail / maxDim, 2.0) : 1;

  return { centerX, centerY, centerZ, scale };
}

function calculateZIndex(piece: MagnetPiece, rotation: { x: number; y: number }) {
  const [x, y, z] = piece.position;
  const radX = (rotation.x * Math.PI) / 180;
  const radY = (rotation.y * Math.PI) / 180;

  const translatedZ = z * Math.cos(radX) * Math.cos(radY) + x * Math.sin(radY) + y * Math.sin(radX);

  return Math.round(translatedZ * 100) + 1000;
}

export function MagnetScene({ model, stepIndex, highlightNew = false, interactive = true }: MagnetSceneProps) {
  if (isV2Model(model)) {
    return (
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50 rounded-2xl">
          <div className="text-gray-400 text-sm">加载中...</div>
        </div>
      }>
        <MagnetScene3D
          model={model}
          stepIndex={stepIndex}
          highlightNew={highlightNew}
          interactive={interactive}
        />
      </Suspense>
    );
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: -25, y: 35 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, rx: 0, ry: 0 });
  const [containerSize, setContainerSize] = useState({ width: 320, height: 240 });

  const targetStepIndex = stepIndex === -1 ? model.steps.length - 1 : stepIndex;

  const { visiblePieces, newPieceSet } = useMemo(() => {
    const visiblePiecesList: { piece: MagnetPiece }[] = [];
    const newPieceSetLocal = new Set<string>();

    for (let i = 0; i <= targetStepIndex; i++) {
      const s = model.steps[i];
      s.addedPieces?.forEach((piece) => {
        visiblePiecesList.push({ piece });
        if (i === targetStepIndex) {
          newPieceSetLocal.add(piece.id);
        }
      });
    }
    return { visiblePieces: visiblePiecesList, newPieceSet: newPieceSetLocal };
  }, [model, targetStepIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    let obs: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      obs = new ResizeObserver(updateSize);
      obs.observe(el);
    }
    window.addEventListener('resize', updateSize);

    return () => {
      obs?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY, rx: rotation.x, ry: rotation.y };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setRotation({
        x: Math.max(-90, Math.min(90, dragStartRef.current.rx - dy * 0.5)),
        y: dragStartRef.current.ry + dx * 0.5,
      });
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const onPointerCancel = () => {
      isDraggingRef.current = false;
    };

    const onLostPointerCapture = () => {
      isDraggingRef.current = false;
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('lostpointercapture', onLostPointerCapture);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('lostpointercapture', onLostPointerCapture);
    };
  }, [interactive]);

  const partMap = useMemo(() => {
    const map: Record<string, Model['parts'][number]> = {};
    model.parts.forEach((p) => (map[p.id] = p));
    return map;
  }, [model]);

  const sortedPieces = useMemo(() => {
    return [...visiblePieces].sort((a, b) => {
      const zA = calculateZIndex(a.piece, rotation);
      const zB = calculateZIndex(b.piece, rotation);
      return zA - zB;
    });
  }, [visiblePieces, rotation]);

  const sceneCamera = useMemo(() => {
    const bounds = computeSceneBounds(visiblePieces, partMap);
    return computeCamera(bounds, containerSize.width, containerSize.height);
  }, [visiblePieces, partMap, containerSize]);

  const { centerX, centerY, centerZ, scale } = sceneCamera;

  // 当步骤切换时重置旋转（可选：保留用户旋转）
  // 这里保留用户旋转，只重新计算取景

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-pink-50 select-none ${
        interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      style={{ touchAction: isDraggingRef.current ? 'none' : 'pan-y' }}
    >
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '900px' }}>
        <div
          className="relative"
          style={{
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `
              scale(${scale})
              rotateX(${rotation.x}deg)
              rotateY(${rotation.y}deg)
              translate3d(${-centerX * UNIT}px, ${centerY * UNIT}px, ${-centerZ * UNIT}px)
            `,
            transition: isDraggingRef.current ? 'none' : 'transform 0.5s ease-out',
          }}
        >
          {sortedPieces.map(({ piece }) => {
            const part = partMap[piece.partId];
            if (!part) return null;
            const isNew = newPieceSet.has(piece.id);
            const fill = magnetColorMap[part.color];
            const stroke = magnetEdgeColorMap[part.color];
            const zIndex = calculateZIndex(piece, rotation);
            const [px, py, pz] = piece.position;
            const [rx, ry, rz] = piece.rotation;

            return (
              <div
                key={piece.id}
                className="absolute left-0 top-0 will-change-transform"
                style={{
                  width: 0,
                  height: 0,
                  transformStyle: 'preserve-3d',
                  transform: `translate3d(${px * UNIT}px, ${-py * UNIT}px, ${pz * UNIT}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
                  zIndex,
                  opacity: highlightNew && isNew ? 0 : 1,
                  animation: highlightNew && isNew ? 'pop-in 0.6s ease-out forwards' : 'none',
                }}
              >
                <div
                  className="absolute"
                  style={{
                    width: part.shape === 'rectangle' ? UNIT * 2 : UNIT,
                    height: UNIT,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <svg
                    viewBox={shapeViewBox[part.shape]}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      transform: `translateZ(${THICKNESS / 2}px)`,
                      fill,
                      stroke,
                      strokeWidth: 3,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <path d={shapePath[part.shape]} />
                  </svg>

                  <svg
                    viewBox={shapeViewBox[part.shape]}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      transform: `rotateY(180deg) translateZ(${THICKNESS / 2}px)`,
                      fill,
                      stroke,
                      strokeWidth: 3,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <path d={shapePath[part.shape]} />
                  </svg>

                  <div
                    className="absolute"
                    style={{
                      width: part.shape === 'rectangle' ? UNIT * 2 : UNIT,
                      height: THICKNESS,
                      left: '50%',
                      top: '50%',
                      backgroundColor: fill,
                      transform: 'translate(-50%, -50%) rotateX(90deg)',
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {interactive && (
        <>
          <button
            onClick={() => setRotation({ x: -25, y: 35 })}
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="重置视角"
            data-testid="reset-view"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs text-gray-400 pointer-events-none">
            <span>拖拽可旋转视角</span>
            <span>
              X:{Math.round(rotation.x)}° Y:{Math.round(rotation.y)}°
            </span>
          </div>
        </>
      )}
    </div>
  );
}
