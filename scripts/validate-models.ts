import { validatePhysicalModel } from '../src/engine/validator';
import { models } from '../src/data/models';
import { getShapeDef } from '../src/engine/shapes';
import { ShapeDef } from '../src/engine/types';

function createGetShapeForPiece(model: typeof models[0]): (pieceId: string) => ShapeDef | undefined {
  const pieceMap: Record<string, typeof model.pieces[number]> = {};
  model.pieces?.forEach(p => pieceMap[p.id] = p);
  const partMap: Record<string, typeof model.parts[number]> = {};
  model.parts.forEach(p => partMap[p.id] = p);
  
  return (pieceId: string) => {
    const piece = pieceMap[pieceId];
    if (!piece) return undefined;
    const part = partMap[piece.partId];
    if (!part) return undefined;
    return getShapeDef(part.shape);
  };
}

console.log('=== 六模型验证结果 ===');
console.log('');

for (const m of models) {
  const getShapeForPiece = createGetShapeForPiece(m);
  const r = validatePhysicalModel(m, getShapeForPiece);
  const errors = r.issues.filter(i => i.severity === 'error');
  const warnings = r.issues.filter(i => i.severity === 'warning');
  
  console.log(`${m.id} | ${m.name}`);
  console.log(`  valid: ${r.valid}`);
  console.log(`  errors: ${errors.length}`);
  console.log(`  warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('  --- Error Details ---');
    errors.forEach((e, idx) => {
      console.log(`    ${idx + 1}. ${e.message}`);
      if (e.pieceId) console.log(`       pieceId: ${e.pieceId}`);
      if (e.portId) console.log(`       portId: ${e.portId}`);
      if (e.connectionIndex) console.log(`       connectionIndex: ${e.connectionIndex}`);
    });
  }
  
  console.log('');
}
