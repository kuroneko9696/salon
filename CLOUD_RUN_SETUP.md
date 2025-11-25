# Cloud Run セットアップガイド

このガイドでは、バックエンドAPIをGoogle Cloud Runにデプロイする手順を説明します。

## 📋 前提条件

以下を事前に準備してください：

- ✅ Googleアカウント
- ✅ [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install) のインストール
- ✅ Gemini API キー（[Google AI Studio](https://aistudio.google.com/app/apikey)で取得）
- ✅ Google Cloudプロジェクトの作成（[コンソール](https://console.cloud.google.com/)で作成）

---

## 🚀 クイックデプロイ（推奨）

### Windows

```cmd
cd backend
deploy.bat YOUR_PROJECT_ID asia-northeast1
```

### Mac / Linux

```bash
cd backend
chmod +x deploy.sh
./deploy.sh YOUR_PROJECT_ID asia-northeast1
```

スクリプトが以下を自動実行します：
1. プロジェクトの設定
2. Cloud Run APIの有効化
3. 環境変数の入力プロンプト
4. デプロイ実行
5. サービスURLの表示

---

## 📝 手動デプロイ手順

スクリプトを使わずに手動でデプロイする場合：

### 1. Google Cloudにログイン

```bash
gcloud auth login
```

### 2. プロジェクトを設定

```bash
# プロジェクト一覧を確認
gcloud projects list

# プロジェクトを選択
gcloud config set project YOUR_PROJECT_ID
```

### 3. Cloud Run APIを有効化

```bash
gcloud services enable run.googleapis.com
```

### 4. バックエンドをデプロイ

```bash
cd backend

gcloud run deploy salon-backend \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY \
  --set-env-vars ALLOWED_ORIGINS=http://localhost:3000 \
  --timeout 300 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0
```

**パラメータ説明：**
- `--source .`: 現在のディレクトリのコードをデプロイ
- `--allow-unauthenticated`: 認証なしでアクセス可能にする
- `--timeout 300`: タイムアウト5分（Deep Research用）
- `--memory 512Mi`: メモリ512MB
- `--cpu 1`: CPU 1コア
- `--max-instances 10`: 最大インスタンス数
- `--min-instances 0`: アイドル時は0インスタンス（コスト削減）

### 5. デプロイ完了の確認

デプロイが完了すると、サービスURLが表示されます：

```
Service URL: https://salon-backend-xxxxxxxxx-an.a.run.app
```

このURLをブラウザで開き、以下のようなレスポンスが返ることを確認：

```json
{
  "message": "展示会用名刺管理API",
  "version": "1.0.0",
  "endpoints": {
    "/scan": "名刺OCR",
    "/deep-research": "Deepリサーチレポート生成"
  }
}
```

---

## 🔧 環境変数の管理

### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `GEMINI_API_KEY` | Gemini APIキー | `AIzaSy...` |
| `ALLOWED_ORIGINS` | CORSで許可するオリジン（カンマ区切り） | `https://your-app.vercel.app,http://localhost:3000` |

### 環境変数の更新

デプロイ後に環境変数を更新する場合：

```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --set-env-vars ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

### 環境変数の確認

```bash
gcloud run services describe salon-backend \
  --region asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

---

## 🔍 デプロイ後の確認

### 1. ヘルスチェック

```bash
curl https://salon-backend-xxxxxxxxx-an.a.run.app/
```

### 2. OCR機能のテスト

```bash
curl -X POST https://salon-backend-xxxxxxxxx-an.a.run.app/scan \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "data:image/jpeg;base64,/9j/4AAQ..."}'
```

### 3. ログの確認

```bash
# リアルタイムログ
gcloud run services logs tail salon-backend --region asia-northeast1

# 過去のログ
gcloud run services logs read salon-backend --region asia-northeast1 --limit 50
```

---

## 🔄 更新デプロイ

コードを更新した後、再度デプロイする場合：

### スクリプトを使う場合

```bash
cd backend
./deploy.sh YOUR_PROJECT_ID
```

### 手動の場合

```bash
cd backend
gcloud run deploy salon-backend \
  --source . \
  --region asia-northeast1
```

※ 環境変数は前回の設定が維持されます。

---

## 💰 コストの最適化

### 無料枠

Cloud Runには無料枠があります：
- **月間無料枠**:
  - 200万リクエスト
  - 36万 vCPU秒
  - 18万 GiB秒のメモリ

### コスト削減のヒント

1. **アイドル時は0インスタンス**: `--min-instances 0`（デフォルト設定済み）
2. **適切なメモリサイズ**: 必要最小限のメモリを指定（現在512MB）
3. **タイムアウト設定**: 必要以上に長くしない（現在300秒）

### コストの確認

```bash
# サービスの詳細情報を確認
gcloud run services describe salon-backend --region asia-northeast1
```

Google Cloud Consoleの[請求ページ](https://console.cloud.google.com/billing)で実際のコストを確認できます。

---

## 🔐 セキュリティ設定

### 認証の追加（オプション）

本番環境で認証を追加する場合：

```bash
# 認証を必須にする
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --no-allow-unauthenticated

# サービスアカウントにアクセス権を付与
gcloud run services add-iam-policy-binding salon-backend \
  --region asia-northeast1 \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### カスタムドメインの設定

独自ドメインを使用する場合：

1. Cloud Consoleで[Domain Mappings](https://console.cloud.google.com/run/domains)を開く
2. 「Add Mapping」をクリック
3. ドメインとサービスを選択
4. DNSレコードを設定

---

## ❗ トラブルシューティング

### デプロイが失敗する

**エラー**: `Permission denied`

**解決策**:
```bash
# 必要なAPIを有効化
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

---

### CORS エラーが発生する

**症状**: フロントエンドからAPIを呼び出すと `CORS policy` エラー

**解決策**:
```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --set-env-vars ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
```

---

### タイムアウトエラー

**症状**: Deep Researchで `504 Gateway Timeout`

**解決策**: タイムアウトを延長
```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --timeout 600
```

---

### メモリ不足エラー

**症状**: `Memory limit exceeded`

**解決策**: メモリを増やす
```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --memory 1Gi
```

---

### コールドスタートが遅い

**症状**: 最初のリクエストが遅い（アイドル後）

**解決策**: 最小インスタンスを設定（コストが増える点に注意）
```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --min-instances 1
```

---

## 🌐 フロントエンドとの連携

### Vercelでの環境変数設定

フロントエンドをVercelにデプロイする場合、以下の環境変数を設定：

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | `https://salon-backend-xxx.a.run.app` |
| `GEMINI_API_KEY` | あなたのGemini APIキー |

### Cloud RunのCORS設定を更新

フロントエンドのURLをALLOWED_ORIGINSに追加：

```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --set-env-vars ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

---

## 📊 モニタリング

### メトリクスの確認

```bash
# サービスの状態を確認
gcloud run services describe salon-backend --region asia-northeast1

# リクエスト数やレイテンシを確認
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'
```

### Cloud Consoleでの確認

[Cloud Run Console](https://console.cloud.google.com/run)でグラフィカルにメトリクスを確認できます：
- リクエスト数
- レイテンシ
- エラー率
- コンテナインスタンス数

---

## 🔗 リンク集

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud Run 料金](https://cloud.google.com/run/pricing)
- [Gemini API ドキュメント](https://ai.google.dev/docs)
- [gcloud CLI リファレンス](https://cloud.google.com/sdk/gcloud/reference/run)

---

## 📞 サポート

問題が発生した場合：

1. ログを確認: `gcloud run services logs read salon-backend --region asia-northeast1 --limit 100`
2. サービスの状態を確認: `gcloud run services describe salon-backend --region asia-northeast1`
3. 本リポジトリのIssueを作成

---

以上でCloud Runのセットアップは完了です！🎉







