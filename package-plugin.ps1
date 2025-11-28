# ConteFi Plugin Packager
# Creates a distributable ZIP file for testers

Write-Host "Building ConteFi Plugin Package..." -ForegroundColor Cyan

# Build the plugin
Write-Host "`n1. Building TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Create distribution folder
Write-Host "`n2. Creating distribution folder..." -ForegroundColor Yellow
$distFolder = "dist-package"
if (Test-Path $distFolder) {
    Remove-Item $distFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $distFolder | Out-Null

# Copy required files
Write-Host "`n3. Copying files..." -ForegroundColor Yellow
Copy-Item "manifest.json" -Destination $distFolder
Copy-Item "code.js" -Destination $distFolder
Copy-Item "ui.html" -Destination $distFolder
Copy-Item "DISTRIBUTION.md" -Destination "$distFolder\README.md"

# Copy icon files if they exist
if (Test-Path "icon-32.png") {
    Copy-Item "icon-32.png" -Destination $distFolder
}
if (Test-Path "icon-128.png") {
    Copy-Item "icon-128.png" -Destination $distFolder
}

# Get version from package.json
$package = Get-Content "package.json" | ConvertFrom-Json
$version = $package.version
$zipName = "ConteFi-v$version.zip"

# Create ZIP
Write-Host "`n4. Creating ZIP archive..." -ForegroundColor Yellow
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
}
Compress-Archive -Path "$distFolder\*" -DestinationPath $zipName

# Summary
Write-Host "`nPackage created successfully!" -ForegroundColor Green
Write-Host "`nPackage details:" -ForegroundColor Cyan
Write-Host "  Folder: $distFolder\" -ForegroundColor White
Write-Host "  ZIP: $zipName" -ForegroundColor White
Write-Host "  Version: v$version" -ForegroundColor White

Write-Host "`nShare this with testers:" -ForegroundColor Yellow
Write-Host "  1. Send them $zipName" -ForegroundColor White
Write-Host "  2. They extract it and follow README.md instructions" -ForegroundColor White
Write-Host "  3. Import manifest.json in Figma Desktop" -ForegroundColor White

Write-Host "`nDone!" -ForegroundColor Green

