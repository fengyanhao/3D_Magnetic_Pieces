import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(projectRoot, 'server', 'index.js');
const targetDir = path.join(projectRoot, 'dist', 'server');

await mkdir(targetDir, { recursive: true });
await copyFile(source, path.join(targetDir, 'index.js'));
