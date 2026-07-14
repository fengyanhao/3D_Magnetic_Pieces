import { useMemo, useRef, useState, useEffect } from 'react';
import { Model, MagnetPiece } from '../data/types';
import { magnetColorMap, magnetEdgeColorMap } from '../data/models';

interface MagnetSceneProps {
  model: Model;
  stepIndex: number;
  highlightNew?: boolean;
  interactive?: boolean;
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

function getPieceTransform(piece: MagnetPiece) {
  const [x, y, z] = piece.position;
  const [rx, ry, rz] = piece.rotation;
  const tx = x * UNIT;
  const ty = -y * UNIT;
  const tz = z * UNIT;
  return `translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
}

function calculateZIndex(piece: MagnetPiece, rotation: { x: number; y: number }) {
  const [x, y, z] = piece.position;
  const radX = (rotation.x * Math.PI) / 180;
  const radY = (rotation.y * Math.PI) / 180;

  const translatedZ = z * Math.cos(radX) * Math.cos(radY) + x * Math.sin(radY) + y * Math.sin(radX);

  return Math.round(translatedZ * 100) + 1000;
}

export function MagnetScene({ model, stepIndex, highlightNew = false, interactive = true }: MagnetSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: -25, y: 35 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, rx: 0, ry: 0 });

  const targetStepIndex = stepIndex === -1 ? model.steps.length - 1 : stepIndex;

  const { visiblePieces, newPieceSet } = useMemo(() => {
    const visiblePieces: { piece: MagnetPiece; index: number }[] = [];
    const newPieceSet = new Set<string>();

    for (let i = 0; i <= targetStepIndex; i++) {
      const s = model.steps[i];
      s.addedPieces.forEach((piece) => {
        visiblePieces.push({ piece, index: visiblePieces.length });
        if (i === targetStepIndex) {
          newPieceSet.add(piece.id);
        }
      });
    }
    return { visiblePieces, newPieceSet };
  }, [model, targetStepIndex]);

  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, rx: rotation.x, ry: rotation.y };
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setRotation({
        x: Math.max(-90, Math.min(90, dragStart.current.rx - dy * 0.5)),
        y: dragStart.current.ry + dx * 0.5,
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      setIsDragging(false);
      el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
    };
  }, [interactive, isDragging, rotation]);

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

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-pink-50 select-none ${
        interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '900px' }}>
        <div
          className="relative"
          style={{
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isDragging ? 'none' : 'transform 0.4s ease-out',
          }}
        >
          {sortedPieces.map(({ piece }) => {
            const part = partMap[piece.partId];
            if (!part) return null;
            const isNew = newPieceSet.has(piece.id);
            const fill = magnetColorMap[part.color];
            const stroke = magnetEdgeColorMap[part.color];
            const zIndex = calculateZIndex(piece, rotation);

            return (
              <div
                key={piece.id}
                className="absolute left-0 top-0 will-change-transform"
                style={{
                  width: 0,
                  height: 0,
                  transformStyle: 'preserve-3d',
                  transform: getPieceTransform(piece),
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
        <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs text-gray-400 pointer-events-none">
          <span>拖拽可旋转视角</span>
          <span>
            X:{Math.round(rotation.x)}° Y:{Math.round(rotation.y)}°
          </span>
        </div>
      )}
    </div>
  );
}
