# serve_preview.ps1
# Pure .NET Sockets HTTP Server (Zero ACL restrictions, Zero administrative requirements)
$port = 8085
$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path

$ip = [System.Net.IPAddress]::Loopback
$server = New-Object System.Net.Sockets.TcpListener($ip, $port)

try {
    $server.Start()
    Write-Host "=========================================================="
    Write-Host "  G-MAPS Local Web Server running on http://127.0.0.1:$port/"
    Write-Host "  Serving from: $workspace"
    Write-Host "=========================================================="

    while ($true) {
        $client = $server.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $writer = New-Object System.IO.StreamWriter($stream)

        $line = $reader.ReadLine()
        if ($line) {
            $parts = $line.Split(' ')
            $path = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
            $cleanPath = $path.Split('?')[0].TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($cleanPath) -or $cleanPath -eq '/') {
                $cleanPath = 'preview.html'
            }

            $filePath = Join-Path $workspace $cleanPath
            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = switch ($ext) {
                    '.html' { 'text/html; charset=utf-8' }
                    '.css'  { 'text/css; charset=utf-8' }
                    '.js'   { 'application/javascript; charset=utf-8' }
                    '.json' { 'application/json; charset=utf-8' }
                    '.png'  { 'image/png' }
                    '.jpg'  { 'image/jpeg' }
                    '.svg'  { 'image/svg+xml' }
                    default { 'application/octet-stream' }
                }

                $writer.WriteLine("HTTP/1.1 200 OK")
                $writer.WriteLine("Content-Type: $mime")
                $writer.WriteLine("Content-Length: $($bytes.Length)")
                $writer.WriteLine("Access-Control-Allow-Origin: *")
                $writer.WriteLine("Connection: close")
                $writer.WriteLine()
                $writer.Flush()
                $stream.Write($bytes, 0, $bytes.Length)
            } else {
                $err = "File Not Found: $cleanPath"
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($err)
                $writer.WriteLine("HTTP/1.1 404 Not Found")
                $writer.WriteLine("Content-Type: text/plain; charset=utf-8")
                $writer.WriteLine("Content-Length: $($errBytes.Length)")
                $writer.WriteLine("Connection: close")
                $writer.WriteLine()
                $writer.Flush()
                $stream.Write($errBytes, 0, $errBytes.Length)
            }
        }

        $writer.Close()
        $reader.Close()
        $client.Close()
    }
} catch {
    Write-Host "Server error: $($_.Exception.Message)"
} finally {
    $server.Stop()
}
