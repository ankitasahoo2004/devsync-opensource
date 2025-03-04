# Create deployment package
$deploymentPath = ".\deployment"
$zipPath = ".\deployment.zip"

# Create deployment directory if it doesn't exist
if (Test-Path $deploymentPath) {
    Remove-Item $deploymentPath -Recurse -Force
}
New-Item -ItemType Directory -Path $deploymentPath

# Copy required files
Copy-Item ".\index.js" $deploymentPath
Copy-Item ".\package.json" $deploymentPath
Copy-Item ".\package-lock.json" $deploymentPath
Copy-Item ".\web.config" $deploymentPath
Copy-Item ".\iisnode.yml" $deploymentPath
Copy-Item ".\config.js" $deploymentPath
Copy-Item ".\.env" $deploymentPath
Copy-Item ".\models" -Destination "$deploymentPath\models" -Recurse

# Create zip archive
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path "$deploymentPath\*" -DestinationPath $zipPath

# Cleanup
Remove-Item $deploymentPath -Recurse -Force

Write-Host "Deployment package created at $zipPath"
