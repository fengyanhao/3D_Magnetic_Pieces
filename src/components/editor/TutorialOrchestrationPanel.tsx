/**
 * P1: 教学编排面板
 *
 * 在编辑器的"教学编排"模式下,作为右侧属性面板的替代/扩展。
 * 允许作者配置当前步骤的:
 * - 镜头预设(设为本步镜头 / 清除镜头 / 镜头过渡时长)
 * - 入场动画(逐片配置 type/delay/duration/easing,或批量设置类型)
 * - 高亮时间 / 吸附反馈
 * - 提示文字 / 观察重点
 * - 零件标注
 *
 * 数据通过 EditorWorkspace 的 callbacks 写入 history(支持撤销/重做)。
 * 面板本身是无状态受控组件,所有真值来自 EditorProject。
 */
import { useMemo, useState } from 'react';
import {
  Camera, Video, Trash2, Plus, X, Sparkles,
  Package, Zap, Eye, MessageSquare, Settings2,
} from 'lucide-react';
import type { EditorProject } from '../../editor/types';
import type {
  BuildStepV2, StepCamera, PieceEntranceConfig,
  EntranceType, EasingName,
} from '../../engine/types';
import { magnetColorMap } from '../../data/models';

/* ----------------- 选项常量 ----------------- */

const ENTRANCE_OPTIONS: { value: EntranceType; label: string; desc: string }[] = [
  { value: 'drop', label: '上方飞入', desc: '从上方下落到目标位置' },
  { value: 'side', label: '侧面飞入', desc: '从右侧滑入到目标位置' },
  { value: 'fold', label: '折叠展开', desc: '原地展开,配合旋转' },
  { value: 'fade', label: '原位淡入', desc: '原地透明度渐变显现' },
  { value: 'none', label: '无动画', desc: '直接显示在目标位置' },
];

const EASING_OPTIONS: { value: EasingName; label: string }[] = [
  { value: 'linear', label: '线性' },
  { value: 'easeOutCubic', label: '先快后慢(Cubic)' },
  { value: 'easeInOutCubic', label: '两端缓(Cubic)' },
  { value: 'easeOutBack', label: '回弹(Back)' },
  { value: 'easeOutBounce', label: '弹跳(Bounce)' },
  { value: 'easeOutElastic', label: '弹性(Elastic)' },
];

const SNAP_FEEDBACK_OPTIONS: { value: 'none' | 'pulse' | 'glow'; label: string }[] = [
  { value: 'none', label: '无反馈' },
  { value: 'pulse', label: '轻微缩放' },
  { value: 'glow', label: '发光' },
];

/* ----------------- 工具函数 ----------------- */

function formatVec(v: [number, number, number] | undefined): string {
  if (!v) return '—';
  return `(${v[0].toFixed(1)}, ${v[1].toFixed(1)}, ${v[2].toFixed(1)})`;
}

/* ----------------- 面板 Props ----------------- */

export interface TutorialOrchestrationPanelProps {
  project: EditorProject;
  /** 当前选中的步骤 id */
  currentStepId: number | null;
  /** 当前编辑器视图(由 EditorCanvas 透传,用于"设为本步镜头") */
  currentView?: { position: [number, number, number]; target: [number, number, number]; zoom: number };
  /* ----------------- 回调 ----------------- */
  onSetStepCamera: (stepId: number, camera: StepCamera | null) => void;
  onCaptureCurrentViewAsStepCamera: (stepId: number, transitionMs: number) => void;
  onPatchPieceEntrance: (stepId: number, pieceId: string, patch: Partial<PieceEntranceConfig>) => void;
  onBatchSetEntranceType: (stepId: number, pieceIds: string[], type: EntranceType) => void;
  onClearPieceEntrance: (stepId: number, pieceId: string) => void;
  onSetStepHint: (stepId: number, hint: string) => void;
  onSetStepFocusPoints: (stepId: number, points: string[]) => void;
  onSetStepHighlightMs: (stepId: number, ms: number) => void;
  onSetStepSnapFeedback: (stepId: number, feedback: 'none' | 'pulse' | 'glow') => void;
  onSetPieceAnnotation: (stepId: number, pieceId: string, text: string) => void;
  onRemovePieceFromStep: (stepId: number, pieceId: string) => void;
  onAddPieceToStep: (stepId: number, pieceId: string) => void;
  onSelectPiece?: (pieceId: string) => void;
}

/* ----------------- 主组件 ----------------- */

export function TutorialOrchestrationPanel({
  project,
  currentStepId,
  currentView,
  onSetStepCamera,
  onCaptureCurrentViewAsStepCamera,
  onPatchPieceEntrance,
  onBatchSetEntranceType,
  onClearPieceEntrance,
  onSetStepHint,
  onSetStepFocusPoints,
  onSetStepHighlightMs,
  onSetStepSnapFeedback,
  onSetPieceAnnotation,
  onRemovePieceFromStep,
  onAddPieceToStep,
  onSelectPiece,
}: TutorialOrchestrationPanelProps) {
  const step = useMemo(
    () => project.steps.find((s) => s.id === currentStepId) ?? null,
    [project.steps, currentStepId],
  );

  const partMap = useMemo(() => {
    const m: Record<string, EditorProject['parts'][number]> = {};
    project.parts.forEach((p) => (m[p.id] = p));
    return m;
  }, [project.parts]);

  const pieceMap = useMemo(() => {
    const m: Record<string, EditorProject['pieces'][number]> = {};
    project.pieces.forEach((p) => (m[p.id] = p));
    return m;
  }, [project.pieces]);

  if (!step) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6" data-testid="orchestration-panel-empty">
        <Video className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm text-center">
          请先在下方时间轴选择一个步骤,
          <br />
          才能编辑其教学编排。
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" data-testid="orchestration-panel">
      {/* 步骤标题 */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-blue-50 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <h2 className="font-bold text-gray-800 text-sm truncate">{step.title}</h2>
          <span className="ml-auto text-xs text-gray-500">#{step.id}</span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* ============ 1. 镜头预设 ============ */}
        <Section icon={<Camera className="w-4 h-4" />} title="本步镜头">
          {step.camera ? (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">位置</span>
                  <span className="font-mono text-gray-800">{formatVec(step.camera.position)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">目标</span>
                  <span className="font-mono text-gray-800">{formatVec(step.camera.target)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">缩放</span>
                  <span className="font-mono text-gray-800">{step.camera.zoom.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">过渡</span>
                  <span className="font-mono text-gray-800">{step.camera.transitionMs}ms</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onCaptureCurrentViewAsStepCamera(step.id, step.camera?.transitionMs ?? 800)}
                  disabled={!currentView}
                  className="flex-1 px-2 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  更新为当前视角
                </button>
                <button
                  onClick={() => onSetStepCamera(step.id, null)}
                  className="px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                  title="清除本步镜头"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                未设置本步镜头。播放器将保持上一镜头或使用默认镜头。
              </p>
              <button
                onClick={() => onCaptureCurrentViewAsStepCamera(step.id, 800)}
                disabled={!currentView}
                className="w-full px-2 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <Camera className="w-3 h-3" />
                设为本步镜头
              </button>
            </div>
          )}
          {currentView && (
            <p className="text-[10px] text-gray-400 mt-1">
              当前视角: {formatVec(currentView.position)} / zoom {currentView.zoom.toFixed(1)}
            </p>
          )}
        </Section>

        {/* ============ 2. 入场动画 ============ */}
        <Section
          icon={<Sparkles className="w-4 h-4" />}
          title="入场动画"
          subtitle={`${step.addedPieceIds.length} 片新零件`}
        >
          {step.addedPieceIds.length === 0 ? (
            <p className="text-xs text-gray-400">本步暂无新增零件,请先在结构模式下添加零件到本步。</p>
          ) : (
            <>
              {/* 批量设置入场类型 */}
              <div className="mb-3 p-2 bg-purple-50 rounded-lg">
                <div className="text-[10px] text-purple-700 mb-1 font-semibold">批量设置入场类型</div>
                <div className="flex flex-wrap gap-1">
                  {ENTRANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onBatchSetEntranceType(step.id, step.addedPieceIds, opt.value)}
                      className="px-2 py-1 text-[10px] bg-white border border-purple-200 rounded hover:bg-purple-100 text-purple-700"
                      title={opt.desc}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 逐片零件配置 */}
              <div className="space-y-2">
                {step.addedPieceIds.map((pid, idx) => {
                  const piece = pieceMap[pid];
                  if (!piece) return null;
                  const part = partMap[piece.partId];
                  if (!part) return null;
                  const cfg = step.entrance?.[pid];
                  return (
                    <PieceEntranceCard
                      key={pid}
                      pieceId={pid}
                      index={idx}
                      partName={part.name}
                      color={part.color}
                      config={cfg}
                      onPatch={(patch) => onPatchPieceEntrance(step.id, pid, patch)}
                      onClear={() => onClearPieceEntrance(step.id, pid)}
                      onRemove={() => onRemovePieceFromStep(step.id, pid)}
                      onSelect={() => onSelectPiece?.(pid)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </Section>

        {/* ============ 3. 反馈效果 ============ */}
        <Section icon={<Zap className="w-4 h-4" />} title="反馈效果">
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">新零件高亮时间(ms)</label>
              <input
                type="number"
                min={0}
                max={3000}
                step={100}
                value={step.highlightMs ?? 600}
                onChange={(e) => onSetStepHighlightMs(step.id, Number(e.target.value))}
                className="w-full px-2 py-1 text-xs border rounded"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">设为 0 表示不高亮</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">吸附完成反馈</label>
              <div className="flex gap-1">
                {SNAP_FEEDBACK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onSetStepSnapFeedback(step.id, opt.value)}
                    className={`flex-1 px-2 py-1 text-[10px] rounded border ${
                      (step.snapFeedback ?? 'none') === opt.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ============ 4. 提示与观察重点 ============ */}
        <Section icon={<MessageSquare className="w-4 h-4" />} title="提示与观察重点">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">本步提示文字</label>
              <textarea
                value={step.hint ?? ''}
                onChange={(e) => onSetStepHint(step.id, e.target.value)}
                placeholder="例如:注意屋顶的倾斜方向,让两片磁力片对齐..."
                rows={2}
                className="w-full px-2 py-1 text-xs border rounded resize-y"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">观察重点</label>
              <FocusPointsEditor
                points={step.focusPoints ?? []}
                onChange={(points) => onSetStepFocusPoints(step.id, points)}
              />
            </div>
          </div>
        </Section>

        {/* ============ 5. 零件标注 ============ */}
        <Section icon={<Eye className="w-4 h-4" />} title="零件标注">
          {step.addedPieceIds.length === 0 ? (
            <p className="text-xs text-gray-400">本步无新增零件。</p>
          ) : (
            <div className="space-y-1.5">
              {step.addedPieceIds.map((pid) => {
                const piece = pieceMap[pid];
                if (!piece) return null;
                const part = partMap[piece.partId];
                if (!part) return null;
                const text = step.annotations?.[pid] ?? '';
                return (
                  <div key={pid} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: magnetColorMap[part.color] }}
                    />
                    <span className="text-[10px] text-gray-500 flex-shrink-0 w-16 truncate">{part.name}</span>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => onSetPieceAnnotation(step.id, pid, e.target.value)}
                      placeholder="(可选标注)"
                      className="flex-1 px-1.5 py-0.5 text-[10px] border rounded"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ============ 6. 添加已有零件到本步 ============ */}
        <AddPiecesToStepSection
          project={project}
          step={step}
          onAddPieceToStep={onAddPieceToStep}
        />
      </div>
    </div>
  );
}

/* ----------------- 子组件 ----------------- */

function Section({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-gray-500">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-800">{title}</h3>
        {subtitle && <span className="ml-auto text-[10px] text-gray-400">{subtitle}</span>}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function PieceEntranceCard({
  pieceId, index, partName, color, config,
  onPatch, onClear, onRemove, onSelect,
}: {
  pieceId: string;
  index: number;
  partName: string;
  color: string;
  config: PieceEntranceConfig | undefined;
  onPatch: (patch: Partial<PieceEntranceConfig>) => void;
  onClear: () => void;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg: PieceEntranceConfig = config ?? {
    type: 'drop',
    delayMs: index * 150,
    durationMs: 800,
    easing: 'easeOutCubic',
  };
  const isCustom = !!config;

  return (
    <div className={`border rounded-lg p-2 ${isCustom ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={onSelect}
          className="w-3 h-3 rounded-sm flex-shrink-0"
          style={{ backgroundColor: magnetColorMap[color as keyof typeof magnetColorMap] ?? '#ccc' }}
          title="在画布中选中此零件"
        />
        <span className="text-[10px] text-gray-600 flex-shrink-0">#{index + 1}</span>
        <span className="text-xs font-medium text-gray-800 flex-shrink-0 truncate flex-1">{partName}</span>
        <span className="text-[9px] font-mono text-gray-400 flex-shrink-0">{pieceId.slice(0, 6)}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] px-1.5 py-0.5 rounded hover:bg-gray-100 text-gray-500"
          title={expanded ? '收起' : '展开详细参数'}
        >
          <Settings2 className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[9px] text-gray-500 block">入场类型</label>
          <select
            value={cfg.type}
            onChange={(e) => onPatch({ type: e.target.value as EntranceType })}
            className="w-full px-1 py-0.5 text-[10px] border rounded bg-white"
          >
            {ENTRANCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-gray-500 block">缓动</label>
          <select
            value={cfg.easing}
            onChange={(e) => onPatch({ easing: e.target.value as EasingName })}
            className="w-full px-1 py-0.5 text-[10px] border rounded bg-white"
          >
            {EASING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100">
          <div>
            <label className="text-[9px] text-gray-500 block">延迟(ms)</label>
            <input
              type="number"
              min={0}
              max={5000}
              step={50}
              value={cfg.delayMs}
              onChange={(e) => onPatch({ delayMs: Number(e.target.value) })}
              className="w-full px-1 py-0.5 text-[10px] border rounded"
            />
          </div>
          <div>
            <label className="text-[9px] text-gray-500 block">时长(ms)</label>
            <input
              type="number"
              min={200}
              max={3000}
              step={50}
              value={cfg.durationMs}
              onChange={(e) => onPatch({ durationMs: Number(e.target.value) })}
              className="w-full px-1 py-0.5 text-[10px] border rounded"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[9px] text-gray-500 block">起始位移偏移(x,y,z)</label>
            <div className="grid grid-cols-3 gap-1">
              {([0, 1, 2] as const).map((i) => (
                <input
                  key={i}
                  type="number"
                  step={0.5}
                  value={cfg.startOffset?.[i] ?? 0}
                  onChange={(e) => {
                    const cur = cfg.startOffset ?? [0, 0, 0];
                    const next = [...cur] as [number, number, number];
                    next[i] = Number(e.target.value);
                    onPatch({ startOffset: next });
                  }}
                  className="px-1 py-0.5 text-[10px] border rounded"
                />
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[9px] text-gray-500 block">起始旋转偏移(弧度)</label>
            <div className="grid grid-cols-3 gap-1">
              {([0, 1, 2] as const).map((i) => (
                <input
                  key={i}
                  type="number"
                  step={0.1}
                  value={cfg.startRotation?.[i] ?? 0}
                  onChange={(e) => {
                    const cur = cfg.startRotation ?? [0, 0, 0];
                    const next = [...cur] as [number, number, number];
                    next[i] = Number(e.target.value);
                    onPatch({ startRotation: next });
                  }}
                  className="px-1 py-0.5 text-[10px] border rounded"
                />
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-1 mt-1">
            {isCustom && (
              <button
                onClick={onClear}
                className="flex-1 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                重置为默认
              </button>
            )}
            <button
              onClick={onRemove}
              className="flex-1 px-2 py-0.5 text-[10px] bg-red-50 text-red-600 rounded hover:bg-red-100"
            >
              移出本步
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FocusPointsEditor({
  points,
  onChange,
}: {
  points: string[];
  onChange: (points: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const addPoint = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...points, t]);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      {points.length > 0 && (
        <ul className="space-y-1">
          {points.map((p, idx) => (
            <li key={idx} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">{idx + 1}.</span>
              <span className="flex-1 text-gray-700">{p}</span>
              <button
                onClick={() => onChange(points.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600"
                title="删除"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPoint();
            }
          }}
          placeholder="新增观察重点..."
          className="flex-1 px-2 py-1 text-xs border rounded"
        />
        <button
          onClick={addPoint}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          title="添加"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AddPiecesToStepSection({
  project,
  step,
  onAddPieceToStep,
}: {
  project: EditorProject;
  step: BuildStepV2;
  onAddPieceToStep: (stepId: number, pieceId: string) => void;
}) {
  const [showList, setShowList] = useState(false);

  // 列出还未加入本步的零件
  const availablePieces = useMemo(() => {
    const inStep = new Set(step.addedPieceIds);
    return project.pieces.filter((p) => !inStep.has(p.id));
  }, [project.pieces, step.addedPieceIds]);

  const partMap = useMemo(() => {
    const m: Record<string, EditorProject['parts'][number]> = {};
    project.parts.forEach((p) => (m[p.id] = p));
    return m;
  }, [project.parts]);

  return (
    <Section icon={<Package className="w-4 h-4" />} title="添加已有零件到本步">
      {availablePieces.length === 0 ? (
        <p className="text-xs text-gray-400">
          {project.pieces.length === 0
            ? '方案中暂无零件。请先在结构模式下添加零件。'
            : '所有零件已加入本步。'}
        </p>
      ) : (
        <>
          <button
            onClick={() => setShowList(!showList)}
            className="w-full px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            {showList ? '收起列表' : `展开可添加零件 (${availablePieces.length})`}
          </button>
          {showList && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {availablePieces.map((piece) => {
                const part = partMap[piece.partId];
                if (!part) return null;
                return (
                  <div key={piece.id} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: magnetColorMap[part.color] }}
                    />
                    <span className="flex-1 truncate text-gray-700">{part.name}</span>
                    <span className="text-[9px] font-mono text-gray-400">{piece.id.slice(0, 6)}</span>
                    <button
                      onClick={() => onAddPieceToStep(step.id, piece.id)}
                      className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      加入
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
