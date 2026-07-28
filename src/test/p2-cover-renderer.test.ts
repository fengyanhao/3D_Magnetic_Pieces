/**
 * P2: 封面渲染器测试
 *
 * 验证:
 * 1. setThumbnailDataUrlAction 正确写入 thumbnail.dataUrl
 * 2. projectToModel 透传 thumbnail.dataUrl 到 coverImage
 * 3. SchemeDef v3 往返保留 dataUrl
 * 4. renderProjectCover 在无零件时返回 null
 * 5. ModelCard 在无 coverImage 时显示占位图(由组件测试覆盖)
 */
import { describe, it, expect } from 'vitest';
import { createInitialHistory, setThumbnailDataUrlAction, replaceProject } from '../editor/state';
import { projectToModel } from '../editor/serialization';
import {
  projectToScheme,
  schemeToEditorProject,
  serializeProjectAsScheme,
  parseScheme,
} from '../engine/scheme';
import { renderProjectCover } from '../components/magnet3d/coverRenderer';
import { models } from '../data/models';
import { modelToProject } from '../editor/serialization';
import { resnapshotTransforms } from '../editor/serialization';

describe('P2: 封面生成 - 数据流', () => {
  it('setThumbnailDataUrlAction 设置 source=manual 和 dataUrl', () => {
    const h = createInitialHistory();
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const h2 = setThumbnailDataUrlAction(h, dataUrl, 'cam-1');
    expect(h2.current.thumbnail.source).toBe('manual');
    expect(h2.current.thumbnail.dataUrl).toBe(dataUrl);
    expect(h2.current.thumbnail.cameraPresetId).toBe('cam-1');
  });

  it('projectToModel 透传 thumbnail.dataUrl 到 coverImage', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const proj = modelToProject(house);
    const dataUrl = 'data:image/png;base64,FAKE_COVER_DATA';
    const h = setThumbnailDataUrlAction(replaceProject(createInitialHistory(), proj), dataUrl);
    const model = projectToModel(h.current);
    expect(model.coverImage).toBe(dataUrl);
  });

  it('projectToModel 在无 dataUrl 时 coverImage 为空字符串', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const proj = modelToProject(house);
    const model = projectToModel(proj);
    expect(model.coverImage).toBe('');
  });

  it('SchemeDef v3 往返保留 thumbnail.dataUrl', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const proj = modelToProject(house);
    proj.transforms = resnapshotTransforms(proj);
    const dataUrl = 'data:image/png;base64,ROUNDTRIP_COVER';
    const h = setThumbnailDataUrlAction(replaceProject(createInitialHistory(), proj), dataUrl, 'cam-cover');
    // project -> scheme
    const scheme = projectToScheme(h.current);
    expect(scheme.thumbnail.dataUrl).toBe(dataUrl);
    expect(scheme.thumbnail.source).toBe('manual');
    expect(scheme.thumbnail.cameraPresetId).toBe('cam-cover');
    // scheme -> JSON -> scheme -> project
    const json = serializeProjectAsScheme(h.current);
    const parsed = parseScheme(json);
    const proj2 = schemeToEditorProject(parsed);
    expect(proj2.thumbnail.dataUrl).toBe(dataUrl);
    expect(proj2.thumbnail.source).toBe('manual');
  });

  it('renderProjectCover 在无零件时返回 null', () => {
    const h = createInitialHistory();
    // createInitialHistory 创建空 project(无零件)
    const result = renderProjectCover(h.current, { width: 64, height: 64 });
    expect(result).toBeNull();
  });

  it('renderProjectCover 在 SSR(无 document)时返回 null', () => {
    // 测试环境是 jsdom,有 document。模拟无 document 的情况
    const origDocument = globalThis.document;
    try {
      // @ts-expect-error 故意删除 document 模拟 SSR
      delete globalThis.document;
      const house = models.find((m) => m.id === 'house-1')!;
      const proj = modelToProject(house);
      proj.transforms = resnapshotTransforms(proj);
      const result = renderProjectCover(proj, { width: 64, height: 64 });
      expect(result).toBeNull();
    } finally {
      globalThis.document = origDocument;
    }
  });
});
