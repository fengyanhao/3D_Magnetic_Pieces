import { getShapeDef } from '../engine/shapes';
import { validatePhysicalModel } from '../engine/validator';
import { PhysicalModel, ValidationResult, ValidationIssue } from '../engine/types';
import { EditorProject } from './types';
import { projectToPhysicalModel } from './serialization';

/**
 * 校验入口:复用现有 validatePhysicalModel。
 * 将校验问题映射为编辑器可定位的错误(含零件/连接/步骤 ID),
 * 供右侧校验面板点击后在 3D 画布中聚焦相关对象。
 */

export interface EditorValidationIssue {
  /** 原始 issue */
  raw: ValidationIssue;
  severity: 'error' | 'warning';
  message: string;
  /** 可定位对象 */
  pieceId?: string;
  connectionIndex?: number;
  portId?: string;
  edgeId?: string;
  stepId?: number;
  /** 简短类别,用于分组展示 */
  category: ValidationCategory;
}

export type ValidationCategory =
  | 'unconnected' // 未连接零件
  | 'port-reuse' // 端口重复占用
  | 'port-overlap' // 端口区间重叠
  | 'port-length' // 端口长度不兼容
  | 'port-missing' // 引用不存在端口
  | 'intersection' // 零件相交
  | 'loop-residual' // 闭环误差
  | 'ground' // 地面穿透
  | 'stability' // 重心不稳定
  | 'planarity' // flat 模型不共面
  | 'step' // 步骤增量错误
  | 'dihedral' // 二面角非法
  | 'semantic-piece' // P0-4: 零件步骤覆盖缺失
  | 'semantic-final' // P0-4: 最终步骤不完整
  | 'semantic-parts-count' // P0-4: 零件清单数量不一致
  | 'semantic-structure' // P0-4: 结构宣称与几何不符
  | 'other';

function categorize(raw: ValidationIssue): ValidationCategory {
  // P1-13: 优先用机器可读的 code 字段,避免依赖中文文案匹配
  switch (raw.code) {
    case 'unconnected': return 'unconnected';
    case 'port-reuse': return 'port-reuse';
    case 'port-overlap': return 'port-overlap';
    case 'port-length': return 'port-length';
    case 'port-missing': return 'port-missing';
    case 'intersection': return 'intersection';
    case 'loop-residual':
    case 'loop-position-error':
    case 'loop-direction-error':
    case 'loop-dihedral-error':
      return 'loop-residual';
    case 'ground': return 'ground';
    case 'stability': return 'stability';
    case 'planarity': return 'planarity';
    case 'step': return 'step';
    case 'dihedral-invalid': return 'dihedral';
    // P0-4: 语义校验
    case 'semantic-piece-not-covered': return 'semantic-piece';
    case 'semantic-final-step-incomplete': return 'semantic-final';
    case 'semantic-parts-count-mismatch': return 'semantic-parts-count';
    case 'semantic-structure-claim': return 'semantic-structure';
    default:
      break;
  }
  // 兜底:旧路径未填 code 时,用文案匹配(避免遗漏已发布 issue)
  const msg = raw.message;
  if (msg.includes('不连通') || msg.includes('未连通')) return 'unconnected';
  if (msg.includes('多次使用') || (msg.includes('端口') && msg.includes('占用'))) return 'port-reuse';
  if (msg.includes('端口') && msg.includes('重叠')) return 'port-overlap';
  if (msg.includes('长度不兼容')) return 'port-length';
  if (msg.includes('不存在的端口')) return 'port-missing';
  if (msg.includes('穿透') || msg.includes('相交')) return 'intersection';
  if (msg.includes('闭环') || msg.includes('位置误差') || msg.includes('方向对齐') || msg.includes('二面角误差')) return 'loop-residual';
  if (msg.includes('地面') || msg.includes('低于地面')) return 'ground';
  if (msg.includes('稳定') || msg.includes('支撑') || msg.includes('重心') || msg.includes('倾倒')) return 'stability';
  if (msg.includes('公共平面') || msg.includes('偏离')) return 'planarity';
  if (msg.includes('步骤')) return 'step';
  if (msg.includes('dihedralDeg')) return 'dihedral';
  return 'other';
}

export const categoryLabels: Record<ValidationCategory, string> = {
  unconnected: '未连接零件',
  'port-reuse': '端口重复占用',
  'port-overlap': '端口区间重叠',
  'port-length': '端口长度不兼容',
  'port-missing': '非法端口连接',
  intersection: '零件相交',
  'loop-residual': '闭环误差',
  ground: '地面穿透',
  stability: '重心不稳定',
  planarity: 'flat 模型不共面',
  step: '步骤增量错误',
  dihedral: '二面角非法',
  'semantic-piece': '零件未被步骤覆盖',
  'semantic-final': '最终步骤不完整',
  'semantic-parts-count': '零件清单数量不一致',
  'semantic-structure': '结构宣称与几何不符',
  other: '其他',
};

export interface EditorValidationResult {
  valid: boolean;
  issues: EditorValidationIssue[];
  errorCount: number;
  warningCount: number;
  solverError?: string;
}

/** 运行完整物理校验。 */
export function runValidation(project: EditorProject): EditorValidationResult {
  const physical: PhysicalModel = projectToPhysicalModel(project);
  const partMap = new Map(project.parts.map((p) => [p.id, p]));
  const pieceMap = new Map(project.pieces.map((p) => [p.id, p]));
  const getShapeForPiece = (pid: string) => {
    const piece = pieceMap.get(pid);
    if (!piece) return undefined;
    const part = partMap.get(piece.partId);
    return part ? getShapeDef(part.shape) : undefined;
  };

  let result: ValidationResult;
  try {
    result = validatePhysicalModel(physical, getShapeForPiece);
  } catch (e) {
    return {
      valid: false,
      issues: [],
      errorCount: 1,
      warningCount: 0,
      solverError: '校验器异常: ' + (e as Error).message,
    };
  }

  const issues: EditorValidationIssue[] = result.issues.map((raw: ValidationIssue) => ({
    raw,
    severity: raw.severity,
    message: raw.message,
    pieceId: raw.pieceId,
    connectionIndex: raw.connectionIndex,
    portId: raw.portId,
    edgeId: raw.edgeId,
    stepId: raw.stepId,
    category: categorize(raw),
  }));

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}

/** 简要修复建议。 */
export function suggestFix(issue: EditorValidationIssue): string {
  switch (issue.category) {
    case 'unconnected':
      return '为该零件创建连接,或将其设为根零件,或删除它。';
    case 'port-reuse':
      return '先断开该端口已有的连接,再建立新连接。';
    case 'port-overlap':
      return '调整形状端口划分,或改用同边上未占用的端口。';
    case 'port-length':
      return '选择长度兼容的端口对(边长相等)。';
    case 'port-missing':
      return '检查连接引用的 portId 是否存在于该形状的端口列表中。';
    case 'intersection':
      return '调整二面角或断开冲突连接,避免零件穿插。';
    case 'loop-residual':
      return '闭环连接误差过大,检查二面角/flip 是否正确。';
    case 'ground':
      return '零件穿透地面,检查根零件位置或连接方向。';
    case 'stability':
      return '重心偏离支撑面,增加底部支撑或调整布局。';
    case 'planarity':
      return 'flat 模式要求所有零件共面,检查是否有非 0 二面角连接。';
    case 'step':
      return '检查步骤引用的零件/连接是否在本步骤新增且可达。';
    case 'dihedral':
      return '二面角应在 [-180, 180] 范围内且为有限数。';
    case 'semantic-piece':
      return '把该零件加入某个步骤的 addedPieceIds，或删除该零件。';
    case 'semantic-final':
      return '检查步骤累积新增是否覆盖 model.pieces 和 model.connections，不要少也不要多。';
    case 'semantic-parts-count':
      return '调整 parts[*].count 与实际 pieces 数量一致，或在编辑器中通过零件操作触发自动同步。';
    case 'semantic-structure':
      return '修改文案描述与实际几何结构一致：要么补齐缺失的结构零件，要么删除文案中的虚假宣称。';
    default:
      return '检查相关连接参数。';
  }
}
