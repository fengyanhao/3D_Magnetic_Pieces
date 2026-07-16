import { EditorProject } from '../../editor/types';

interface Props {
  project: EditorProject;
  currentStepId: number | null;
  onSelectStep: (id: number) => void;
  onAddStep: () => void;
  onDeleteStep: (id: number) => void;
  onMoveStep: (from: number, to: number) => void;
}

/** 底部:拼装步骤时间轴。 */
export function StepTimeline({
  project, currentStepId, onSelectStep, onAddStep, onDeleteStep, onMoveStep,
}: Props) {
  const steps = project.steps;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 border-b">
        <span className="text-xs font-semibold text-gray-700">拼装步骤时间轴</span>
        <button
          onClick={onAddStep}
          className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + 新增步骤
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
              return (
                <div
                  key={step.id}
                  className={`flex flex-col w-56 p-2 border rounded flex-shrink-0 cursor-pointer ${
                    active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectStep(step.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">#{step.id} · {step.title || '(未命名)'}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{step.description || '(无说明)'}</p>
                  <div className="text-[10px] text-gray-400 mt-1">
                    新增 {step.addedPieceIds.length} 片 · {step.addedConnections.length} 连接
                  </div>
                  <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onMoveStep(idx, idx - 1)}
                      disabled={idx === 0}
                      className="text-[10px] px-1 border rounded disabled:opacity-30"
                    >←</button>
                    <button
                      onClick={() => onMoveStep(idx, idx + 1)}
                      disabled={idx === steps.length - 1}
                      className="text-[10px] px-1 border rounded disabled:opacity-30"
                    >→</button>
                    <button
                      onClick={() => onDeleteStep(step.id)}
                      className="text-[10px] px-1 border rounded text-red-600 hover:bg-red-50"
                    >删除</button>
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
