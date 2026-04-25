# DornikaImage Smoke Test (PowerShell)
# Run: .\smoke-test.ps1
param([string]$Base = "http://localhost:5000")

# PS5: load System.Net.Http explicitly so [System.Net.Http.HttpClient] resolves
Add-Type -AssemblyName System.Net.Http

$pass = 0; $fail = 0
function P($l) { Write-Host "  [PASS] $l" -ForegroundColor Green; $script:pass++ }
function F($l,$d) { Write-Host "  [FAIL] $l  $d" -ForegroundColor Red; $script:fail++ }

Write-Host "`nDornikaImage Smoke Test  [$Base]`n"

# ── 1. Homepage ──────────────────────────────────────────────────
try {
    $r = Invoke-WebRequest -Uri "$Base/" -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { P "Homepage -> 200" } else { F "Homepage" "status=$($r.StatusCode)" }
} catch { F "Homepage" $_.Exception.Message }

# ── 2. Upload: non-image -> 415 ──────────────────────────────────
try {
    $bnd  = "B$(([guid]::NewGuid().ToString() -replace '-',''))"
    $CRLF = "`r`n"
    $body = [System.Text.Encoding]::UTF8.GetBytes(
        "--$bnd$CRLF" +
        "Content-Disposition: form-data; name=`"files`"; filename=`"evil.txt`"$CRLF" +
        "Content-Type: text/plain$CRLF$CRLF" +
        "hello world$CRLF" +
        "--$bnd--$CRLF"
    )
    $r = Invoke-WebRequest -Uri "$Base/api/upload" -Method POST `
        -Headers @{ 'Content-Type' = "multipart/form-data; boundary=$bnd" } `
        -Body $body -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
    F "Upload non-image" "Expected 415 but got $($r.StatusCode)"
} catch {
    $code = [int]$_.Exception.Response.StatusCode
    if ($code -eq 415) { P "Upload non-image -> 415" } else { F "Upload non-image" "Got ${code}: $($_.Exception.Message)" }
}

# ── 3. Progress: bad UUID -> 400 ─────────────────────────────────
try {
    $r = Invoke-WebRequest -Uri "$Base/api/progress?sessionId=not-a-uuid" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    F "Progress bad UUID" "Expected 400, got $($r.StatusCode)"
} catch {
    $code = [int]$_.Exception.Response.StatusCode
    if ($code -eq 400) { P "Progress bad UUID -> 400" } else { F "Progress bad UUID" "Got $code" }
}

# ── 4. Download: bad UUID -> 400 ─────────────────────────────────
try {
    $r = Invoke-WebRequest -Uri "$Base/api/download?sessionId=xxx&jobId=yyy" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    F "Download bad UUID" "Expected 400, got $($r.StatusCode)"
} catch {
    $code = [int]$_.Exception.Response.StatusCode
    if ($code -eq 400) { P "Download bad UUID -> 400" } else { F "Download bad UUID" "Got $code" }
}

# ── 5. Real JPEG upload (via .NET HttpClient — guaranteed valid multipart) ────
# Valid 4x4 JPEG generated with Sharp, encoded as base64 to avoid PS5 hex conversion bugs
$jpegBytes = [Convert]::FromBase64String("/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAEAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAABv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJAB58//2Q==")

$sessionId = $null; $jobId = $null
$httpClient = $null
try {
    # Use .NET HttpClient + MultipartFormDataContent — avoids PS5 byte-array concat bugs
    $httpClient = [System.Net.Http.HttpClient]::new()
    $httpClient.Timeout = [System.TimeSpan]::FromSeconds(60)

    $mpContent = [System.Net.Http.MultipartFormDataContent]::new()
    $byteContent = [System.Net.Http.ByteArrayContent]::new($jpegBytes)
    $byteContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("image/jpeg")
    $mpContent.Add($byteContent, "files", "photo.jpg")

    $response = $httpClient.PostAsync("$Base/api/upload", $mpContent).GetAwaiter().GetResult()
    $respBody  = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $statusCode = [int]$response.StatusCode

    if ($statusCode -eq 202) {
        $j = $respBody | ConvertFrom-Json
        if ($j.sessionId -and $j.jobs -and $j.jobs.Count -gt 0) {
            $sessionId = $j.sessionId
            $jobId = $j.jobs[0].jobId
            P "JPEG upload -> 202  sid=$($sessionId.Substring(0,8))..."
        } else {
            F "JPEG upload" "no sessionId/jobs in response: $respBody"
        }
    } else {
        F "JPEG upload" "Got $statusCode : $respBody"
    }
} catch {
    F "JPEG upload" $_.Exception.Message
} finally {
    if ($httpClient) { $httpClient.Dispose() }
}

# ── 6. Download compressed + 7. Batch ZIP ────────────────────────
if ($sessionId -and $jobId) {
    Write-Host "  ... waiting 15s for compression worker ..."
    Start-Sleep -Seconds 15

    # Diagnostic: check progress endpoint to see actual job status
    try {
        $prog = Invoke-WebRequest -Uri "$Base/api/progress?sessionId=$sessionId" `
            -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        Write-Host "  [DEBUG] progress: $($prog.Content.Substring(0,[Math]::Min(300,$prog.Content.Length)))"
    } catch { Write-Host "  [DEBUG] progress error: $($_.Exception.Message)" }

    try {
        $r = Invoke-WebRequest -Uri "$Base/api/download?sessionId=$sessionId&jobId=$jobId" `
            -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { P "Download compressed -> 200  ($($r.RawContentLength) bytes)" }
        else { F "Download compressed" "status=$($r.StatusCode)" }
    } catch {
        $code = [int]$_.Exception.Response.StatusCode
        F "Download compressed" "Got $code"
    }

    try {
        $r = Invoke-WebRequest -Uri "$Base/api/download/batch?sessionId=$sessionId" `
            -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { P "Batch ZIP -> 200  ($($r.RawContentLength) bytes)" }
        else { F "Batch ZIP" "status=$($r.StatusCode)" }
    } catch {
        $code = [int]$_.Exception.Response.StatusCode
        F "Batch ZIP" "Got $code"
    }
}

Write-Host "`n$('─' * 52)"
Write-Host "  Results: $pass passed,  $fail failed"
Write-Host "$('─' * 52)`n"
exit $(if ($fail -gt 0) { 1 } else { 0 })
