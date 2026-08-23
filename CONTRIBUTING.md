# Contributing to 3D Magnetic Pieces

Thank you for helping improve 3D Magnetic Pieces. Contributions are welcome when they solve a real problem, improve the learning experience, add a well-defined model, or strengthen the editor and geometry engine.

## Before You Start

- Search the existing issues before opening a new one.
- Use a bug report for reproducible defects and a feature request for a concrete user need.
- For larger changes, open or discuss an issue before investing substantial implementation time.
- Keep each issue and pull request focused on one problem.

## Development Setup

Requirements: Node.js 20 or later and npm 10 or later.

```bash
npm install
npm run dev
```

The development server runs at <http://localhost:5174/>.

## Tests and Build

Run the checks that match your change before opening a pull request:

```bash
# Unit and integration tests
npm run test:run

# Browser end-to-end tests
npm run test:e2e

# Type-check and production build
npm run build
```

Add or update tests when changing model data, geometry, connections, validation, routes, editor behavior, or user-visible workflows. If an E2E change intentionally updates a visual snapshot, explain why in the pull request.

## Issue Workflow

When reporting a bug, include reproducible steps, expected and actual behavior, browser/device details, and screenshots or logs when useful. Feature requests should describe the user problem and intended outcome before proposing an implementation.

Roadmap items in the README are candidates for real issues, but an issue should be opened only when someone intends to investigate or implement it.

## Pull Request Workflow

1. Fork the repository and create a focused branch such as `feature/voice-guidance` or `fix/editor-connection-preview`.
2. Make the smallest coherent change and include relevant tests.
3. Run the unit tests, relevant E2E tests, and production build.
4. Open a pull request against `main` and link the related issue with `Closes #123` when applicable.
5. Describe the behavior change, test evidence, and any UI screenshots or compatibility considerations.
6. Address review feedback with additional commits. Maintainers will merge after the change is understood and verified.

Please do not create placeholder issues or pull requests solely to increase repository activity. A small number of genuine, well-scoped contributions is more valuable.

## 中文简要说明

欢迎通过真实 Issue 和 PR 参与项目：先搜索已有 Issue，再描述可复现的问题或明确的用户需求；从独立分支开发，补充相关测试，运行 `npm run test:run`、必要的 `npm run test:e2e` 与 `npm run build`，最后向 `main` 提交 PR 并关联对应 Issue。请勿为了制造活跃度创建占位 Issue 或 PR。
