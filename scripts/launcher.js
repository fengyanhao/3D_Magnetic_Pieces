const http = require('http');
const path = require('path');
const { exec, spawn } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const PORT = 5175;
const DEV_PORT = 5174;

let devServer = null;

const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>启动亲子磁力片网站</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px;
      max-width: 520px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(249, 115, 22, 0.15);
      text-align: center;
    }
    .logo {
      width: 72px;
      height: 72px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(234, 88, 12, 0.25);
    }
    .logo svg { width: 40px; height: 40px; color: white; }
    h1 { margin: 0 0 12px; font-size: 24px; color: #1f2937; }
    p { margin: 0 0 32px; color: #6b7280; line-height: 1.6; font-size: 14px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 16px 24px;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: white;
      box-shadow: 0 8px 24px rgba(249, 115, 22, 0.3);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(249, 115, 22, 0.35); }
    .btn-primary:active { transform: translateY(0); }
    .btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }
    .status {
      margin-top: 24px;
      padding: 16px;
      border-radius: 12px;
      font-size: 13px;
      text-align: left;
    }
    .status.info { background: #eff6ff; color: #1d4ed8; border-left: 4px solid #3b82f6; }
    .status.success { background: #f0fdf4; color: #15803d; border-left: 4px solid #22c55e; }
    .status.warning { background: #fffbeb; color: #92400e; border-left: 4px solid #f59e0b; }
    .spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M9 5H5"/><path d="M19 18v4"/><path d="M17 22h4"/>
      </svg>
    </div>
    <h1>亲子磁力片</h1>
    <p>点击下方按钮启动本地网站服务，并自动在浏览器中打开最新版本。</p>

    <button id="startBtn" class="btn btn-primary" onclick="startSite()">
      <span id="btnText">启动并打开网站</span>
    </button>

    <div id="status" class="status"></div>
  </div>

  <script>
    const DEV_URL = 'http://localhost:${DEV_PORT}';
    const API_BASE = 'http://localhost:${PORT}';

    function setStatus(msg, type) {
      const el = document.getElementById('status');
      el.innerHTML = msg;
      el.className = 'status ' + type;
    }

    function setLoading(loading) {
      const btn = document.getElementById('startBtn');
      const txt = document.getElementById('btnText');
      btn.disabled = loading;
      txt.innerHTML = loading ? '<span class="spinner"></span> 正在启动服务...' : '启动并打开网站';
    }

    async function checkServer() {
      try {
        const res = await fetch(DEV_URL, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
        return true;
      } catch { return false; }
    }

    async function startSite() {
      setLoading(true);
      setStatus('正在检查本地服务是否运行...', 'info');

      const isRunning = await checkServer();
      if (isRunning) {
        setStatus('服务已在运行，正在打开网站...', 'success');
        window.location.href = DEV_URL;
        return;
      }

      setStatus('服务未运行，正在启动...', 'info');

      try {
        const res = await fetch(API_BASE + '/start', { method: 'POST' });
        const data = await res.json();

        if (data.success) {
          setStatus(data.message + '，正在等待服务就绪...', 'success');
          let attempts = 0;
          const maxAttempts = 30;
          const interval = setInterval(async () => {
            attempts++;
            const ready = await checkServer();
            if (ready) {
              clearInterval(interval);
              setStatus('服务启动成功！正在打开网站...', 'success');
              window.location.href = DEV_URL;
            } else if (attempts >= maxAttempts) {
              clearInterval(interval);
              setStatus('启动超时，请手动访问 ' + DEV_URL, 'warning');
              setLoading(false);
            }
          }, 1000);
        } else {
          setStatus('启动失败：' + data.message, 'warning');
          setLoading(false);
        }
      } catch (e) {
        setStatus('启动请求失败：' + e.message, 'warning');
        setLoading(false);
      }
    }

    window.onload = checkServer;
  </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(HTML_PAGE);
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/status') {
    res.end(JSON.stringify({ running: devServer !== null, port: DEV_PORT }));
    return;
  }

  if (req.url === '/start') {
    if (devServer) {
      res.end(JSON.stringify({ success: true, message: '服务已在运行', port: DEV_PORT }));
      return;
    }

    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    devServer = spawn(cmd, ['run', 'start-site'], {
      cwd: PROJECT_DIR,
      stdio: 'inherit',
      shell: true
    });

    devServer.on('error', (err) => {
      console.error('启动失败:', err);
      devServer = null;
      res.end(JSON.stringify({ success: false, message: '启动失败: ' + err.message }));
    });

    devServer.on('exit', () => {
      devServer = null;
    });

    setTimeout(() => {
      res.end(JSON.stringify({ success: true, message: '服务正在启动', port: DEV_PORT }));
    }, 500);

    return;
  }

  if (req.url === '/stop') {
    if (devServer) {
      devServer.kill();
      devServer = null;
      res.end(JSON.stringify({ success: true, message: '服务已停止' }));
    } else {
      res.end(JSON.stringify({ success: false, message: '服务未运行' }));
    }
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`启动器服务运行在 http://localhost:${PORT}`);
  console.log('打开浏览器访问启动页面，点击按钮启动开发服务器');

  const startCmd = process.platform === 'win32' ? 'start' : 'open';
  exec(`${startCmd} http://localhost:${PORT}`, (err) => {
    if (err) {
      console.log('请手动打开浏览器访问 http://localhost:' + PORT);
    }
  });
});
