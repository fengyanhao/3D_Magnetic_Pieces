import { EditorWorkspace } from '../components/editor/EditorWorkspace';

/**
 * 编辑器入口页。懒加载路由 /editor。
 * 首页不加载此页及其依赖。
 */
export function EditorPage() {
  return <EditorWorkspace />;
}

export default EditorPage;
