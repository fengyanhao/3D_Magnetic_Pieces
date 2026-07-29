import { useState, useMemo } from 'react';
import * as THREE from 'three';
import { EditorProject } from '../../editor/types';
import { EditorValidationResult, categoryLabels, suggestFix, EditorValidationIssue } from '../../editor/validate';
import { buildMaterialInventory } from '../../editor/serialization';
import { ALL_COLORS, colorLabels } from '../../editor/shapeInfo';
import { MagnetColor, Theme, Difficulty } from '../../data/types';
import type { Selection } from './EditorWorkspace';

let fieldIdCounter = 0;
const nextFieldId = () => `pf-${++fieldIdCounter}`;

interface Props {
  project: EditorProject;
  selection: Selection;
  validation: EditorValidationResult | null;
  currentStepId: number | null;
  onSetPieceColor: (pieceId: string, color: MagnetColor) => void;
  onDuplicatePiece: () => void;
  onDeleteSelected: () => void;
  onUpdateConnection: (index: number, patch: { dihedralDeg?: number; flip?: boolean }) => void;
  onRemoveConnection: (index: number) => void;
  onUpdateMetadata: (patch: Partial<EditorProject['metadata']>) => void;
  onFocusError: (target: { pieceId?: string; connectionIndex?: number }) => void;
  onSaveCameraPreset: (preset: { label: string; position: [number, number, number]; target: [number, number, number]; zoom: number; stepId?: number }) => void;
  onAddPieceToStep: (stepId: number, pieceId: string) => void;
  onUpdateStep: (stepId: number, patch: any) => void;
  onSetPieceTransform: (pieceId: string, tf: { position: [number, number, number]; quaternion: [number, number, number, number] }) => void;
  // P1-10: 大纲列表选择回调(键盘可达)
  onSelectPiece?: (id: string) => void;
  onSelectConnection?: (index: number) => void;
}

export function PropertyPanel(props: Props) {
  const { project, validation } = props;
  const [tab, setTab] = useState<'props' | 'validation' | 'info'>('props');

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b">
        <TabBtn active={tab === 'props'} onClick={() => setTab('props')}>属性</TabBtn>
        <TabBtn active={tab === 'validation'} onClick={() => setTab('validation')}>
          校验{validation && validation.errorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px]">{validation.errorCount}</span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>方案信息</TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'props' && <PropsTab {...props} />}
        {tab === 'validation' && <ValidationTab {...props} />}
        {tab === 'info' && <InfoTab project={project} onUpdateMetadata={props.onUpdateMetadata} />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
        active ? 'border-blue-500 text-blue-600 bg-blue-50'
        : 'border-transparent text-gray-500 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

/* ----------------- 属性 Tab ----------------- */
function PropsTab(props: Props) {
  const { project, selection } = props;

  return (
    <div className="flex flex-col h-full">
      {/* P1-10: 键盘可达的零件/连接大纲列表 */}
      <OutlineList {...props} />
      <div className="flex-1 overflow-y-auto">
        {selection.kind === 'none' && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">未选中对象。点击上方列表或 3D 画布中的零件/连接来编辑。</p>
            <MaterialList project={project} />
          </div>
        )}
        {selection.kind === 'piece' && <PieceProps {...props} />}
        {selection.kind === 'connection' && <ConnectionProps {...props} />}
        {selection.kind === 'step' && <StepProps {...props} />}
      </div>
    </div>
  );
}

/** P1-10: 键盘可达的零件/连接大纲列表。 */
function OutlineList({ project, selection, onSelectPiece, onSelectConnection }: Props) {
  const [expanded, setExpanded] = useState(true);
  if (project.pieces.length === 0 && project.connections.length === 0) return null;

  const pieceLabel = (p: EditorProject['pieces'][number]) => {
    const part = project.parts.find((pp) => pp.id === p.partId);
    return `${part?.shape ?? '?'} · ${part?.color ?? ''}`;
  };

  return (
    <div className="border-b">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100"
        aria-expanded={expanded}
      >
        <span>大纲({project.pieces.length} 零件 / {project.connections.length} 连接)</span>
        <span className="text-gray-400">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <ul role="tree" aria-label="零件与连接大纲" className="max-h-32 overflow-y-auto text-xs">
          {project.pieces.map((p, i) => {
            const isSelected = selection.kind === 'piece' && selection.id === p.id;
            return (
              <li key={p.id} role="treeitem" aria-selected={isSelected}>
                <button
                  onClick={() => onSelectPiece?.(p.id)}
                  className={`w-full text-left px-3 py-1 flex items-center gap-2 ${
                    isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  title={p.id}
                >
                  <span className="inline-block w-4 text-gray-400">{i + 1}.</span>
                  <span className="truncate">{pieceLabel(p)}</span>
                </button>
              </li>
            );
          })}
          {project.connections.map((c, i) => {
            const isSelected = selection.kind === 'connection' && selection.index === i;
            return (
              <li key={`c-${i}`} role="treeitem" aria-selected={isSelected}>
                <button
                  onClick={() => onSelectConnection?.(i)}
                  className={`w-full text-left px-3 py-1 flex items-center gap-2 ${
                    isSelected ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  title={`连接 ${c.pieceA}:${c.portA} → ${c.pieceB}:${c.portB}`}
                >
                  <span className="inline-block w-4 text-gray-400">↯</span>
                  <span className="truncate">连接 #{i} ({c.dihedralDeg}°)</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MaterialList({ project }: { project: EditorProject }) {
  const inv = buildMaterialInventory(project);
  if (inv.length === 0) return <p className="text-xs text-gray-400">暂无零件</p>;
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-700 mb-1">材料清单(自动生成)</h3>
      <ul className="text-xs space-y-0.5">
        {inv.map((i) => (
          <li key={`${i.shape}:${i.color}`} className="flex justify-between">
            <span>{i.name} · {colorLabels[i.color as MagnetColor] ?? i.color}</span>
            <span className="text-gray-500">×{i.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PieceProps(props: Props) {
  const { project, selection, onSetPieceColor, onDuplicatePiece, onDeleteSelected, onAddPieceToStep, currentStepId, onSetPieceTransform } = props;
  const piece = project.pieces.find((p) => p.id === (selection as any).id);
  const [posDraft, setPosDraft] = useState<{ x: string; y: string; z: string } | null>(null);
  const [rotDraft, setRotDraft] = useState<{ x: string; y: string; z: string } | null>(null);

  if (!piece) return <p className="text-xs text-gray-400 p-4">零件不存在</p>;
  const part = project.parts.find((p) => p.id === piece.partId);
  if (!part) return <p className="text-xs text-red-500 p-4">partId 悬空: {piece.partId}</p>;
  const shape = part.shape;
  const tf = project.transforms[piece.id];

  // 当前位置和旋转(显示用)
  const curPos = tf?.position ?? [0, 0, 0];
  const curQuat = new THREE.Quaternion(
    tf?.quaternion[0] ?? 0,
    tf?.quaternion[1] ?? 0,
    tf?.quaternion[2] ?? 0,
    tf?.quaternion[3] ?? 1
  );
  const curEuler = new THREE.Euler().setFromQuaternion(curQuat, 'XYZ');
  const curRotDeg = [
    THREE.MathUtils.radToDeg(curEuler.x),
    THREE.MathUtils.radToDeg(curEuler.y),
    THREE.MathUtils.radToDeg(curEuler.z),
  ];

  // 编辑中的草稿值优先显示
  const posDisplay = posDraft ?? { x: curPos[0].toFixed(2), y: curPos[1].toFixed(2), z: curPos[2].toFixed(2) };
  const rotDisplay = rotDraft ?? { x: curRotDeg[0].toFixed(0), y: curRotDeg[1].toFixed(0), z: curRotDeg[2].toFixed(0) };

  // 提交位置(回车或失焦时)
  const commitPosition = () => {
    if (!posDraft) return;
    const x = parseFloat(posDraft.x);
    const y = parseFloat(posDraft.y);
    const z = parseFloat(posDraft.z);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      onSetPieceTransform(piece.id, {
        position: [x, y, z],
        quaternion: [curQuat.x, curQuat.y, curQuat.z, curQuat.w],
      });
    }
    setPosDraft(null);
  };

  // 提交旋转(回车或失焦时)
  const commitRotation = () => {
    if (!rotDraft) return;
    const x = parseFloat(rotDraft.x);
    const y = parseFloat(rotDraft.y);
    const z = parseFloat(rotDraft.z);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(x),
          THREE.MathUtils.degToRad(y),
          THREE.MathUtils.degToRad(z),
          'XYZ'
        )
      );
      onSetPieceTransform(piece.id, {
        position: [curPos[0], curPos[1], curPos[2]],
        quaternion: [q.x, q.y, q.z, q.w],
      });
    }
    setRotDraft(null);
  };

  // 旋转快捷:绕指定轴旋转指定角度
  const rotateBy = (axis: 'x' | 'y' | 'z', deg: number) => {
    const axisVec = axis === 'x' ? new THREE.Vector3(1, 0, 0)
      : axis === 'y' ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
    const q = curQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axisVec, THREE.MathUtils.degToRad(deg)));
    onSetPieceTransform(piece.id, {
      position: [curPos[0], curPos[1], curPos[2]],
      quaternion: [q.x, q.y, q.z, q.w],
    });
  };

  // 重置旋转
  const resetRotation = () => {
    onSetPieceTransform(piece.id, {
      position: [curPos[0], curPos[1], curPos[2]],
      quaternion: [0, 0, 0, 1],
    });
  };

  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-xs text-gray-500">ID</div>
        <div className="text-xs font-mono text-gray-700 break-all">{piece.id}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">形状</div>
        <div className="text-xs text-gray-700">{shape}</div>
      </div>
      <div>
        <span id="piece-color-label" className="text-xs text-gray-500">颜色</span>
        <div className="grid grid-cols-6 gap-1 mt-1" role="group" aria-labelledby="piece-color-label">
          {ALL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onSetPieceColor(piece.id, c)}
              aria-pressed={part.color === c}
              aria-label={colorLabels[c]}
              className={`w-7 h-7 rounded border-2 ${part.color === c ? 'border-blue-500' : 'border-gray-200'}`}
              style={{ background: colorSwatch(c) }}
              title={colorLabels[c]}
            />
          ))}
        </div>
      </div>
      {/* 位置 */}
      <fieldset>
        <legend className="text-xs text-gray-500 mb-1">位置 (X / Y / Z)</legend>
        <div className="grid grid-cols-3 gap-1">
          {(['x', 'y', 'z'] as const).map((axis) => {
            const fid = `pos-${piece.id}-${axis}`;
            return (
              <div key={axis} className="block">
                <label htmlFor={fid} className="text-[10px] text-gray-400">{axis.toUpperCase()}</label>
                <input
                  id={fid}
                  type="number"
                  step={0.1}
                  value={posDisplay[axis]}
                  onChange={(e) => setPosDraft({ ...posDisplay, [axis]: e.target.value })}
                  onBlur={commitPosition}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitPosition(); }}
                  className="w-full px-1 py-0.5 text-xs border rounded font-mono"
                />
              </div>
            );
          })}
        </div>
      </fieldset>
      {/* 旋转(欧拉角 XYZ 度数) */}
      <fieldset>
        <div className="flex items-center justify-between mb-1">
          <legend className="text-xs text-gray-500">旋转 (度, XYZ)</legend>
          <button onClick={resetRotation} className="text-[10px] text-blue-500 hover:underline">重置</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(['x', 'y', 'z'] as const).map((axis) => {
            const fid = `rot-${piece.id}-${axis}`;
            return (
              <div key={axis} className="block">
                <label htmlFor={fid} className="text-[10px] text-gray-400">{axis.toUpperCase()}</label>
                <input
                  id={fid}
                  type="number"
                  step={15}
                  value={rotDisplay[axis]}
                  onChange={(e) => setRotDraft({ ...rotDisplay, [axis]: e.target.value })}
                  onBlur={commitRotation}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRotation(); }}
                  className="w-full px-1 py-0.5 text-xs border rounded font-mono"
                />
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1 mt-1" role="group" aria-label="旋转快捷按钮">
          <button onClick={() => rotateBy('y', 15)} className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-gray-50" title="R">Y +15°</button>
          <button onClick={() => rotateBy('y', -15)} className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-gray-50" title="T">Y -15°</button>
          <button onClick={() => rotateBy('x', 15)} className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-gray-50" title="F">X +15°</button>
          <button onClick={() => rotateBy('x', -15)} className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-gray-50" title="G">X -15°</button>
          <button onClick={() => rotateBy('z', 15)} className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-gray-50" title="V">Z +15°</button>
          <button onClick={() => rotateBy('z', -15)} className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-gray-50" title="B">Z -15°</button>
        </div>
      </fieldset>
      <div className="text-xs">
        <span className="text-gray-500">根零件:</span>
        <span className="ml-1">{piece.isRoot ? '是' : '否'}</span>
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <button onClick={onDuplicatePiece} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">复制</button>
        <button onClick={onDeleteSelected} className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50">删除</button>
      </div>

      {currentStepId !== null && (
        <div className="pt-2 border-t">
          <button
            onClick={() => onAddPieceToStep(currentStepId, piece.id)}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            加入当前步骤 #{currentStepId}
          </button>
        </div>
      )}
    </div>
  );
}

function ConnectionProps(props: Props) {
  const { project, selection, onUpdateConnection, onRemoveConnection } = props;
  const idx = (selection as any).index as number;
  const conn = project.connections[idx];
  const dihedralId = useMemo(() => nextFieldId(), []);
  const flipId = useMemo(() => nextFieldId(), []);
  if (!conn) return <p className="text-xs text-gray-400 p-4">连接不存在</p>;

  return (
    <div className="p-3 space-y-3">
      <div className="text-xs text-gray-500">连接 #{idx}</div>
      <div className="text-[10px] font-mono text-gray-600 break-all">
        {conn.pieceA}:{conn.portA} → {conn.pieceB}:{conn.portB}
      </div>
      <div>
        <label htmlFor={dihedralId} className="text-xs text-gray-500">二面角(deg): {conn.dihedralDeg}</label>
        <input
          id={dihedralId}
          type="range"
          min={-180}
          max={180}
          step={5}
          value={conn.dihedralDeg}
          onChange={(e) => onUpdateConnection(idx, { dihedralDeg: Number(e.target.value) })}
          className="w-full"
          aria-valuetext={`${conn.dihedralDeg} 度`}
        />
        <div className="flex gap-1 mt-1" role="group" aria-label="二面角预设">
          {[0, 45, 90, -90, 135, 180].map((d) => (
            <button
              key={d}
              onClick={() => onUpdateConnection(idx, { dihedralDeg: d })}
              aria-pressed={conn.dihedralDeg === d}
              className="text-[10px] px-1 border rounded hover:bg-gray-50"
            >{d}°</button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={flipId} className="text-xs text-gray-500">flip(翻转方向)</label>
        <button
          id={flipId}
          onClick={() => onUpdateConnection(idx, { flip: !conn.flip })}
          aria-pressed={conn.flip}
          className={`ml-2 text-xs px-2 py-0.5 rounded ${conn.flip ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          {conn.flip ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="pt-2 border-t">
        <button
          onClick={() => onRemoveConnection(idx)}
          className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
        >
          断开连接
        </button>
      </div>
    </div>
  );
}

function StepProps(props: Props) {
  const { project, selection, onUpdateStep } = props;
  const stepId = (selection as any).id as number;
  const step = project.steps.find((s) => s.id === stepId);
  const titleId = useMemo(() => nextFieldId(), []);
  const descId = useMemo(() => nextFieldId(), []);
  const guideId = useMemo(() => nextFieldId(), []);
  if (!step) return <p className="text-xs text-gray-400 p-4">步骤不存在</p>;

  return (
    <div className="p-3 space-y-3">
      <div>
        <label htmlFor={titleId} className="text-xs text-gray-500">标题</label>
        <input
          id={titleId}
          type="text"
          value={step.title}
          onChange={(e) => onUpdateStep(stepId, { title: e.target.value })}
          className="w-full mt-0.5 px-2 py-1 text-sm border rounded"
          placeholder="必须填写标题"
        />
      </div>
      <div>
        <label htmlFor={descId} className="text-xs text-gray-500">教学说明</label>
        <textarea
          id={descId}
          value={step.description}
          onChange={(e) => onUpdateStep(stepId, { description: e.target.value })}
          className="w-full mt-0.5 px-2 py-1 text-sm border rounded"
          rows={3}
          placeholder="描述本步骤的操作要点"
        />
      </div>
      <div>
        <label htmlFor={guideId} className="text-xs text-gray-500">家长引导</label>
        <input
          id={guideId}
          type="text"
          value={step.parentGuide}
          onChange={(e) => onUpdateStep(stepId, { parentGuide: e.target.value })}
          className="w-full mt-0.5 px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <div className="text-xs text-gray-500">本步骤新增零件 ({step.addedPieceIds.length})</div>
        <ul className="text-[10px] mt-1 space-y-0.5">
          {step.addedPieceIds.length === 0 ? (
            <li className="text-gray-400">无。选中零件后点"加入当前步骤"。</li>
          ) : step.addedPieceIds.map((pid) => (
            <li key={pid} className="font-mono text-gray-700">{pid}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs text-gray-500">本步骤新增连接 ({step.addedConnections.length})</div>
        <ul className="text-[10px] mt-1 space-y-0.5">
          {step.addedConnections.map((c, i) => (
            <li key={i} className="font-mono text-gray-700">{c.pieceA}:{c.portA}→{c.pieceB}:{c.portB}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ----------------- 校验 Tab ----------------- */
function ValidationTab(props: Props) {
  const { validation, onFocusError } = props;
  // P0-5: 初始状态为「尚未校验」，不显示「校验中…」误导用户
  if (!validation) {
    return (
      <div className="p-4 text-center" data-testid="validation-idle">
        <div className="text-gray-400 text-3xl mb-2" aria-hidden="true">○</div>
        <p className="text-xs text-gray-600 mb-1">尚未校验</p>
        <p className="text-[11px] text-gray-400">点击工具栏「校验」按钮开始检查</p>
      </div>
    );
  }
  if (validation.solverError) {
    return <p className="text-xs text-red-600 p-4">{validation.solverError}</p>;
  }
  if (validation.issues.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-green-500 text-3xl mb-2">✓</div>
        <p className="text-xs text-gray-700">校验通过</p>
      </div>
    );
  }

  // 按类别分组
  const grouped = new Map<string, EditorValidationIssue[]>();
  for (const i of validation.issues) {
    const list = grouped.get(i.category) || [];
    list.push(i);
    grouped.set(i.category, list);
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex gap-2 text-xs">
        <span className="text-red-600">错误 {validation.errorCount}</span>
        <span className="text-yellow-600">警告 {validation.warningCount}</span>
      </div>
      {Array.from(grouped.entries()).map(([cat, issues]) => (
        <div key={cat} className="border rounded">
          <div className="px-2 py-1 bg-gray-50 text-xs font-semibold text-gray-700">
            {categoryLabels[cat as keyof typeof categoryLabels] ?? cat} ({issues.length})
          </div>
          <ul className="divide-y">
            {issues.map((issue, idx) => (
              <li
                key={idx}
                onClick={() => onFocusError({ pieceId: issue.pieceId, connectionIndex: issue.connectionIndex })}
                className={`p-2 text-xs cursor-pointer hover:bg-blue-50 ${issue.severity === 'error' ? 'text-red-700' : 'text-yellow-700'}`}
              >
                <div>{issue.message}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {issue.pieceId && <span>零件: {issue.pieceId} </span>}
                  {issue.connectionIndex !== undefined && <span>连接 #{issue.connectionIndex} </span>}
                  {issue.portId && <span>端口: {issue.portId} </span>}
                  {issue.stepId !== undefined && <span>步骤: {issue.stepId} </span>}
                </div>
                <div className="text-[10px] text-blue-500 mt-0.5">→ {suggestFix(issue)}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ----------------- 方案信息 Tab ----------------- */
function InfoTab({ project, onUpdateMetadata }: {
  project: EditorProject;
  onUpdateMetadata: (patch: Partial<EditorProject['metadata']>) => void;
}) {
  const m = project.metadata;
  // P1-10: 为每个字段生成稳定 id 供 label 关联
  const ids = useMemo(() => ({
    name: nextFieldId(), desc: nextFieldId(), diff: nextFieldId(), theme: nextFieldId(),
    minAge: nextFieldId(), maxAge: nextFieldId(), time: nextFieldId(), mode: nextFieldId(),
    tags: nextFieldId(), tips: nextFieldId(), safety: nextFieldId(), author: nextFieldId(), ver: nextFieldId(),
  }), []);
  return (
    <div className="p-3 space-y-3">
      <Field label="方案名称" htmlFor={ids.name}>
        <input
          id={ids.name}
          type="text"
          value={m.name}
          onChange={(e) => onUpdateMetadata({ name: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </Field>
      <Field label="简介" htmlFor={ids.desc}>
        <textarea
          id={ids.desc}
          value={m.description}
          onChange={(e) => onUpdateMetadata({ description: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
          rows={2}
        />
      </Field>
      <Field label="难度" htmlFor={ids.diff}>
        <select
          id={ids.diff}
          value={m.difficulty}
          onChange={(e) => onUpdateMetadata({ difficulty: e.target.value as Difficulty })}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
      </Field>
      <Field label="主题" htmlFor={ids.theme}>
        <select
          id={ids.theme}
          value={m.theme}
          onChange={(e) => onUpdateMetadata({ theme: e.target.value as Theme })}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="house">房子</option>
          <option value="car">汽车</option>
          <option value="rocket">火箭</option>
          <option value="animal">动物</option>
          <option value="castle">城堡</option>
          <option value="other">其他</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="最小年龄" htmlFor={ids.minAge}>
          <input
            id={ids.minAge}
            type="number"
            value={m.minAge}
            onChange={(e) => onUpdateMetadata({ minAge: Number(e.target.value) })}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </Field>
        <Field label="最大年龄" htmlFor={ids.maxAge}>
          <input
            id={ids.maxAge}
            type="number"
            value={m.maxAge}
            onChange={(e) => onUpdateMetadata({ maxAge: Number(e.target.value) })}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </Field>
      </div>
      <Field label="预计搭建时间" htmlFor={ids.time}>
        <input
          id={ids.time}
          type="text"
          value={m.estimatedTime}
          onChange={(e) => onUpdateMetadata({ estimatedTime: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </Field>
      <Field label="构建模式" htmlFor={ids.mode}>
        <select
          id={ids.mode}
          value={m.buildMode}
          onChange={(e) => onUpdateMetadata({ buildMode: e.target.value as any })}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="solid">solid(立体)</option>
          <option value="flat">flat(平面)</option>
          <option value="standing">standing(站立)</option>
        </select>
      </Field>
      <Field label="标签(逗号分隔)" htmlFor={ids.tags}>
        <input
          id={ids.tags}
          type="text"
          value={m.tags.join(', ')}
          onChange={(e) => onUpdateMetadata({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </Field>
      <Field label="教学提示(逗号分隔)" htmlFor={ids.tips}>
        <input
          id={ids.tips}
          type="text"
          value={m.teachingTips.join(', ')}
          onChange={(e) => onUpdateMetadata({ teachingTips: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </Field>
      <Field label="安全提示(逗号分隔)" htmlFor={ids.safety}>
        <input
          id={ids.safety}
          type="text"
          value={m.safetyTips.join(', ')}
          onChange={(e) => onUpdateMetadata({ safetyTips: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </Field>
      <Field label="作者" htmlFor={ids.author}>
        <input
          id={ids.author}
          type="text"
          value={m.author}
          onChange={(e) => onUpdateMetadata({ author: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </Field>
      <Field label="数据版本" htmlFor={ids.ver}>
        <input
          id={ids.ver}
          type="text"
          value={m.dataVersion}
          onChange={(e) => onUpdateMetadata({ dataVersion: e.target.value })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </Field>
      <div className="text-[10px] text-gray-400 pt-2 border-t">
        <div>schemaVersion: {project.schemaVersion}</div>
        <div>ID: {project.id}</div>
        <div>创建: {new Date(project.createdAt).toLocaleString()}</div>
        <div>更新: {new Date(project.updatedAt).toLocaleString()}</div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs text-gray-500">{label}</label>
      {children}
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
