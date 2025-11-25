# デプロイガイド

このプロジェクトをVercel（フロントエンド）とGoogle Cloud Run（バックエンド）にデプロイする手順です。

## 🚀 クイックスタート

### 1️⃣ バックエンドをCloud Runにデプロイ

```bash
# Google Cloudにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# バックエンドをデプロイ
cd backend
gcloud run deploy salon-backend \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY \
  --set-env-vars ALLOWED_ORIGINS=http://localhost:3000

# 📝 デプロイ完了後に表示されるURLをメモする
# 例: https://salon-backend-xxxxxxxxx-an.a.run.app
```

### 2️⃣ フロントエンドをVercelにデプロイ

1. **Vercelにログイン**
   - https://vercel.com にアクセス

2. **新規プロジェクトを作成**
   - "Add New" → "Project"
   - GitHubリポジトリを選択

3. **プロジェクト設定**
   ```
   Framework Preset: Next.js
   Root Directory: frontend    ← 重要！
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **環境変数を設定**
   
   Vercel の Environment Variables セクションで以下を追加：
   
   | Variable Name | Value |
   |--------------|-------|
   | `GEMINI_API_KEY` | YOUR_GEMINI_API_KEY |
   | `NEXT_PUBLIC_API_URL` | https://salon-backend-xxx.a.run.app |
   
   ※ `NEXT_PUBLIC_API_URL` はステップ1で取得したCloud RunのURL

5. **Deploy をクリック**

### 3️⃣ CORSを更新

フロントエンドのデプロイ完了後、VercelのURLをCloud RunのCORS設定に追加：

```bash
# VercelのURLを確認（例: https://salon-xxx.vercel.app）
# Cloud RunのALLOWED_ORIGINSに追加
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --set-env-vars ALLOWED_ORIGINS=https://salon-xxx.vercel.app,http://localhost:3000
```

### 4️⃣ 動作確認

1. VercelのURLにアクセス
2. ログイン画面が表示されることを確認
3. カメラ撮影 → OCRスキャンをテスト
4. Deep Researchの生成をテスト

---

## 📋 チェックリスト

### デプロイ前
- [ ] Google Cloud アカウント作成済み
- [ ] gcloud CLI インストール済み
- [ ] Gemini API キー取得済み
- [ ] GitHubにコードをプッシュ済み

### バックエンド（Cloud Run）
- [ ] デプロイ完了
- [ ] URLを取得済み
- [ ] GEMINI_API_KEY 設定済み
- [ ] ALLOWED_ORIGINS 設定済み
- [ ] ヘルスチェック: `curl https://your-backend-url.run.app/`

### フロントエンド（Vercel）
- [ ] デプロイ完了
- [ ] Root Directory を `frontend` に設定
- [ ] GEMINI_API_KEY 設定済み
- [ ] NEXT_PUBLIC_API_URL 設定済み
- [ ] ブラウザでアクセス可能

### 最終確認
- [ ] CORS設定を更新済み
- [ ] OCRスキャンが動作
- [ ] Deep Researchが動作

---

## 🔧 トラブルシューティング

### 404エラー（Vercel）
**原因**: Root Directoryが正しく設定されていない

**解決策**:
1. Vercel ダッシュボード → Settings → General
2. "Root Directory" を `frontend` に変更
3. 再デプロイ

### CORSエラー
**症状**: `Access to fetch at '...' has been blocked by CORS policy`

**解決策**:
```bash
# フロントエンドのURLをバックエンドに追加
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --update-env-vars ALLOWED_ORIGINS=https://your-vercel-url.vercel.app,http://localhost:3000
```

### APIリクエストが失敗
**確認事項**:
1. Vercelの環境変数が正しいか確認
2. Cloud Runが起動しているか確認: `gcloud run services list`
3. バックエンドURLの末尾に `/` がないか確認

### Deep Researchがタイムアウト
**解決策**: タイムアウトを延長
```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --timeout 300
```

---

## 🔄 更新デプロイ

### バックエンドの更新
```bash
cd backend
gcloud run deploy salon-backend \
  --source . \
  --region asia-northeast1
```

### フロントエンドの更新
GitHubにプッシュすると自動デプロイされます。
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

---

## 💰 コスト見積もり

### Google Cloud Run（バックエンド）
- **無料枠**: 月200万リクエスト、36万vCPU秒、180,000 GiB秒
- **予想コスト**: 小規模利用なら**ほぼ無料**

### Vercel（フロントエンド）
- **Hobby（無料）**: 個人プロジェクト、商用利用可
- **予想コスト**: **無料**

---

## 📞 サポート

問題が発生した場合：
1. Cloud Runのログを確認: `gcloud run services logs read salon-backend`
2. Vercelのログを確認: Vercelダッシュボード → Deployments → ログ
3. README.mdの詳細手順を参照













