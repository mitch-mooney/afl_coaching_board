Set-Location "C:\Users\mitch\PycharmProjects\afl_coaching_board"

$tscOutput = & npx tsc --noEmit 2>&1 | Out-String
$buildOutput = & npm run build 2>&1 | Out-String

$combined = "=== TSC CHECK ===`n$tscOutput`n=== BUILD ===`n$buildOutput"
$combined | Out-File -FilePath "C:\Users\mitch\PycharmProjects\afl_coaching_board\check_output.txt" -Encoding utf8
Write-Host "Done"
