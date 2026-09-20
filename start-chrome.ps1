$profile = Join-Path $PSScriptRoot 'chrome-profile'
if (-not (Test-Path $profile)) { New-Item -ItemType Directory -Path $profile | Out-Null }
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --user-data-dir="$profile" --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --no-first-run --disable-extensions
