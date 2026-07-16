import { castleV2 } from '../src/data/v2/castle';

const portUsage: Record<string, number[]> = {};
castleV2.connections.forEach((conn, idx) => {
  const keyA = `${conn.pieceA}:${conn.portA}`;
  const keyB = `${conn.pieceB}:${conn.portB}`;
  if (!portUsage[keyA]) portUsage[keyA] = [];
  if (!portUsage[keyB]) portUsage[keyB] = [];
  portUsage[keyA].push(idx);
  portUsage[keyB].push(idx);
});

console.log('=== castle-1 端口使用情况 ===');
for (const key of Object.keys(portUsage)) {
  const count = portUsage[key].length;
  console.log(`${key}: ${count} 次 (连接: ${portUsage[key].join(', ')})`);
}