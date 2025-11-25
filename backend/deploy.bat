@echo off
REM Cloud Run デプロイスクリプト (Windows用)
REM 使い方: deploy.bat [PROJECT_ID] [REGION]

setlocal enabledelayedexpansion

set "PROJECT_ID=%~1"
set "REGION=%~2"
if "%REGION%"=="" set "REGION=asia-northeast1"
set "SERVICE_NAME=salon-backend"

echo ============================================
echo   Cloud Run デプロイスクリプト (Windows)
echo ============================================
echo.

REM プロジェクトIDチェック
if "%PROJECT_ID%"=="" (
    echo 現在のGCPプロジェクト一覧:
    gcloud projects list
    echo.
    echo エラー: PROJECT_IDが指定されていません
    echo.
    echo 使い方: deploy.bat YOUR_PROJECT_ID [REGION]
    echo 例: deploy.bat my-project-123 asia-northeast1
    exit /b 1
)

echo デプロイ設定:
echo   プロジェクトID: %PROJECT_ID%
echo   リージョン: %REGION%
echo   サービス名: %SERVICE_NAME%
echo.

REM 確認
set /p CONFIRM="この設定でデプロイを開始しますか？ (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo デプロイをキャンセルしました
    exit /b 1
)

REM プロジェクトを設定
echo プロジェクトを設定中...
gcloud config set project "%PROJECT_ID%"

REM Cloud Run APIの有効化
echo Cloud Run APIを有効化中...
gcloud services enable run.googleapis.com

REM 環境変数の確認
echo.
echo 環境変数の設定が必要です
echo.
set /p GEMINI_API_KEY="GEMINI_API_KEY を入力してください: "
echo.
set /p ALLOWED_ORIGINS="ALLOWED_ORIGINS を入力してください (カンマ区切り、例: https://your-app.vercel.app,http://localhost:3000): "

if "%GEMINI_API_KEY%"=="" (
    echo エラー: GEMINI_API_KEY が設定されていません
    exit /b 1
)

if "%ALLOWED_ORIGINS%"=="" (
    echo 警告: ALLOWED_ORIGINS が設定されていません。デフォルト値を使用します
    set "ALLOWED_ORIGINS=http://localhost:3000"
)

REM デプロイ実行
echo.
echo Cloud Run にデプロイ中...
echo.

gcloud run deploy "%SERVICE_NAME%" ^
  --source . ^
  --platform managed ^
  --region "%REGION%" ^
  --allow-unauthenticated ^
  --set-env-vars "GEMINI_API_KEY=%GEMINI_API_KEY%" ^
  --set-env-vars "ALLOWED_ORIGINS=%ALLOWED_ORIGINS%" ^
  --timeout 300 ^
  --memory 512Mi ^
  --cpu 1 ^
  --max-instances 10 ^
  --min-instances 0

if errorlevel 1 (
    echo.
    echo デプロイに失敗しました
    exit /b 1
)

REM デプロイ成功
echo.
echo デプロイが完了しました！
echo.

REM サービスURLを取得
for /f "delims=" %%i in ('gcloud run services describe "%SERVICE_NAME%" --region "%REGION%" --format="value(status.url)"') do set SERVICE_URL=%%i

echo ============================================
echo デプロイ完了情報
echo ============================================
echo サービス名: %SERVICE_NAME%
echo URL: %SERVICE_URL%
echo リージョン: %REGION%
echo.
echo 次のステップ:
echo 1. ブラウザで %SERVICE_URL% にアクセスして動作確認
echo 2. フロントエンドの環境変数 NEXT_PUBLIC_API_URL に以下を設定:
echo    %SERVICE_URL%
echo 3. CORSを更新する場合:
echo    gcloud run services update %SERVICE_NAME% --region %REGION% --set-env-vars ALLOWED_ORIGINS=https://your-frontend.vercel.app
echo.
echo ============================================

endlocal







