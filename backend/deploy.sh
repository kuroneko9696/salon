#!/bin/bash

# Cloud Run デプロイスクリプト
# 使い方: ./deploy.sh [PROJECT_ID] [REGION]

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# デフォルト値
PROJECT_ID="${1:-}"
REGION="${2:-asia-northeast1}"
SERVICE_NAME="salon-backend"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Cloud Run デプロイスクリプト${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# プロジェクトIDチェック
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}現在のGCPプロジェクト一覧:${NC}"
    gcloud projects list
    echo ""
    echo -e "${RED}エラー: PROJECT_IDが指定されていません${NC}"
    echo ""
    echo -e "使い方: ${GREEN}./deploy.sh YOUR_PROJECT_ID [REGION]${NC}"
    echo -e "例: ${GREEN}./deploy.sh my-project-123 asia-northeast1${NC}"
    exit 1
fi

echo -e "${BLUE}📋 デプロイ設定:${NC}"
echo -e "  プロジェクトID: ${GREEN}${PROJECT_ID}${NC}"
echo -e "  リージョン: ${GREEN}${REGION}${NC}"
echo -e "  サービス名: ${GREEN}${SERVICE_NAME}${NC}"
echo ""

# 確認
read -p "この設定でデプロイを開始しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}デプロイをキャンセルしました${NC}"
    exit 1
fi

# プロジェクトを設定
echo -e "${BLUE}🔧 プロジェクトを設定中...${NC}"
gcloud config set project "$PROJECT_ID"

# Cloud Run APIの有効化
echo -e "${BLUE}🔧 Cloud Run APIを有効化中...${NC}"
gcloud services enable run.googleapis.com

# 環境変数の確認
echo ""
echo -e "${YELLOW}⚠️  環境変数の設定が必要です${NC}"
echo ""
read -p "GEMINI_API_KEY を入力してください: " GEMINI_API_KEY
echo ""
read -p "ALLOWED_ORIGINS を入力してください (カンマ区切り、例: https://your-app.vercel.app,http://localhost:3000): " ALLOWED_ORIGINS

if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}エラー: GEMINI_API_KEY が設定されていません${NC}"
    exit 1
fi

if [ -z "$ALLOWED_ORIGINS" ]; then
    echo -e "${YELLOW}警告: ALLOWED_ORIGINS が設定されていません。デフォルト値を使用します${NC}"
    ALLOWED_ORIGINS="http://localhost:3000"
fi

# デプロイ実行
echo ""
echo -e "${BLUE}🚀 Cloud Run にデプロイ中...${NC}"
echo ""

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --set-env-vars "ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --timeout 300 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0

# デプロイ成功
echo ""
echo -e "${GREEN}✅ デプロイが完了しました！${NC}"
echo ""

# サービスURLを取得
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")

echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}🎉 デプロイ完了情報${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "サービス名: ${GREEN}${SERVICE_NAME}${NC}"
echo -e "URL: ${GREEN}${SERVICE_URL}${NC}"
echo -e "リージョン: ${GREEN}${REGION}${NC}"
echo ""
echo -e "${YELLOW}📝 次のステップ:${NC}"
echo -e "1. ブラウザで ${GREEN}${SERVICE_URL}${NC} にアクセスして動作確認"
echo -e "2. フロントエンドの環境変数 ${GREEN}NEXT_PUBLIC_API_URL${NC} に以下を設定:"
echo -e "   ${GREEN}${SERVICE_URL}${NC}"
echo -e "3. CORSを更新する場合:"
echo -e "   ${GREEN}gcloud run services update ${SERVICE_NAME} --region ${REGION} --set-env-vars ALLOWED_ORIGINS=https://your-frontend.vercel.app${NC}"
echo ""
echo -e "${BLUE}============================================${NC}"







