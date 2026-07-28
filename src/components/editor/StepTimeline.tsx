/**
 * P1: 拼装步骤时间轴
 *
 * 显示每个步骤的卡片,包含:
 * - 步骤编号和标题
 * - 零件数 / 连接数
 * - 镜头是否设置(图标徽章)
 * - 动画是否设置(图标徽章)
 * - 校验状态(✓/⚠/✗)
 * - 排序 / 删除按钮
 *
 * 卡片支持点击选中、拖拽排序(通过 ←/→ 按钮实现,保持简单)。
 */
import {
  Camera, Sparkles, AlertCircle, CheckCircle, AlertTriangle,
  Plus, ChevronLeft, ChevronRight, Trash2, Eye,
} from 'lucide-react';
import type { EditorProject } from '../../editor/types';
import type { BuildStepV2 } from '../../engine/types';
import type { EditorValidationResult } from '../../editor/validate';

interface Props {
  project: EditorProject;
  currentStepId: number | null;
  onSelectStep: (id: number) => void;
  onAddStep: () => void;
  onDeleteStep: (id: number) => void;
  onMoveStep: (from: number, to: number) => void;
  /** 校验结果(用于显示每步校验状态),可选 */
  validation?: EditorValidationResult | null;
  /** 录制模式下的当前步骤(显示录制中标记) */
  recordingStepId?: number | null;
}

export function StepTimeline({
  project, currentStepId, onSelectStep, onAddStep, onDeleteStep, onMoveStep,
  validation, recordingStepId,
}: Props) {
  const steps = project.steps;

  /** 获取某步骤相关的校验问题数 */
  const getStepIssues = (step: BuildStepV2) => {
    if (!validation) return null;
    const issues = validation.issues.filter((i) => i.stepId === step.id);
    return {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
    };
  };

  return (
    <div className="flex flex-col h-full" data-testid="step-timeline">
      <div className="flex items-center justify-between px-3 py-1 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">拼装步骤时间轴</span>
          <span className="text-[10px] text-gray-400">{steps.length} 步</span>
        </div>
        <button
          onClick={onAddStep}
          className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          新增步骤
        </button>
      </div>
      {steps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
          暂无步骤,点击"新增步骤"开始
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-2 p-3 h-full items-stretch">
            {steps.map((step, idx) => {
              const active = step.id === currentStepId;
              const recording = step.id === recordingStepId;
              const issues = getStepIssues(step);
              const hasCamera = !!step.camera;
              const hasAnimation = !!step.entrance && Object.keys(step.entrance).length > 0;
              const hasHint = !!(step.hint || (step.focusPoints && step.focusPoints.length > 0));

              return (
                <div
                  key={step.id}
                  className={`flex flex-col w-60 p-2 border rounded flex-shrink-0 cursor-pointer transition-all ${
                    active
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : recording
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectStep(step.id)}
                  data-testid={`step-card-${step.id}`}
                >
                  {/* 标题行 */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {recording && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" title="录制中" />
                      )}
                      <span className="text-xs font-semibold truncate">
                        #{idx + 1} · {step.title || '(未命名)'}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 flex-shrink-0">id:{step.id}</span>
                  </div>

                  {/* 说明 */}
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 flex-1">
                    {step.description || '(无说明)'}
                  </p>

                  {/* 统计行 */}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                    <span className="flex items-center gap-0.5" title="新增零件数">
                      <span className="font-mono">{step.addedPieceIds.length}</span> 片
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-0.5" title="新增连接数">
                      <span className="font-mono">{step.addedConnections.length}</span> 连接
                    </span>
                  </div>

                  {/* 徽章行:镜头 / 动画 / 提示 / 校验 */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {hasCamera ? (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-green-100 text-green-700 rounded text-[9px]" title="已设置镜头">
                        <Camera className="w-2.5 h-2.5" />
                        镜头
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px]" title="未设置镜头">
                        <Camera className="w-2.5 h-2.5" />
                        无镜头
                      </span>
                    )}
                    {hasAnimation ? (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px]" title="已设置入场动画">
                        <Sparkles className="w-2.5 h-2.5" />
                        动画
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px]" title="未设置动画(将使用默认)">
                        <Sparkles className="w-2.5 h-2.5" />
                        默认
                      </span>
                    )}
                    {hasHint && (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px]" title="已设置提示或观察重点">
                        <Eye className="w-2.5 h-2.5" />
                        提示
                      </span>
                    )}
                    {issues && issues.errors > 0 && (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px]" title={`${issues.errors} 个错误`}>
                        <AlertCircle className="w-2.5 h-2.5" />
                        {issues.errors}
                      </span>
                    )}
                    {issues && issues.warnings > 0 && issues.errors === 0 && (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px]" title={`${issues.warnings} 个警告`}>
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {issues.warnings}
                      </span>
                    )}
                    {issues && issues.errors === 0 && issues.warnings === 0 && (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-green-100 text-green-700 rounded text-[9px]" title="校验通过">
                        <CheckCircle className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onMoveStep(idx, idx - 1)}
                      disabled={idx === 0}
                      className="text-[10px] px-1 border rounded disabled:opacity-30 hover:bg-gray-50"
                      title="前移"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onMoveStep(idx, idx + 1)}
                      disabled={idx === steps.length - 1}
                      className="text-[10px] px-1 border rounded disabled:opacity-30 hover:bg-gray-50"
                      title="后移"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteStep(step.id)}
                      className="text-[10px] px-1 border rounded text-red-600 hover:bg-red-50 ml-auto"
                      title="删除步骤"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
