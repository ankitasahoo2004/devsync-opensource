@echo off

:: Setup
IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%DEPLOYMENT_SOURCE%
)

:: Install npm packages
call npm install --production

:: Copy web.config
IF EXIST "%DEPLOYMENT_SOURCE%\web.config" (
  copy /y "%DEPLOYMENT_SOURCE%\web.config" "%DEPLOYMENT_TARGET%\web.config"
)

:: Copy iisnode.yml
IF EXIST "%DEPLOYMENT_SOURCE%\iisnode.yml" (
  copy /y "%DEPLOYMENT_SOURCE%\iisnode.yml" "%DEPLOYMENT_TARGET%\iisnode.yml"
)

:: Create log directory
IF NOT EXIST "%DEPLOYMENT_TARGET%\logs" (
  mkdir "%DEPLOYMENT_TARGET%\logs"
)

echo Deployment Complete
