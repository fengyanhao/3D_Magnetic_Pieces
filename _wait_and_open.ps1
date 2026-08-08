$port = 5174
$maxAttempts = 45
$url = "http://localhost:$port"

Write-Host "Waiting for service to start..."
for ($i = 0; $i -lt $maxAttempts; $i++) {
    Start-Sleep -Seconds 2
    # 用 TcpClient 测试端口连通性,绕过系统代理设置
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect("localhost", $port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(2000)
        if ($success -and $client.Connected) {
            $client.Close()
            Write-Host "Service ready! Opening browser..."
            Start-Process $url
            exit 0
        }
        $client.Close()
    } catch {}
    Write-Host "  Attempt $($i + 1)/$maxAttempts..."
}

Write-Host "Timeout - opening browser anyway..."
Start-Sleep -Seconds 2
Start-Process $url
