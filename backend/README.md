# バックエンドAPI

FastAPIベースの名刺管理APIです。

## 機能

- **名刺OCR**: Gemini APIを使用した画像からの情報抽出
- **Deepリサーチ**: Google Search Groundingを使用した企業分析レポート生成

## ローカル開発

### 環境構築

```bash
# 依存関係のインストール
pip install -r requirements.txt

# 環境変数の設定
cp .env.example .env
# .envファイルにGEMINI_API_KEYを設定

# サーバー起動
python main.py
# または
uvicorn main:app --reload
```

サーバーは http://localhost:8000 で起動します。

### API ドキュメント

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Dockerでの実行

```bash
# イメージのビルド
docker build -t salon-backend .

# コンテナの起動
docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your_api_key \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  salon-backend
```

## Cloud Runへのデプロイ

### クイックデプロイ

**Windows:**
```cmd
deploy.bat YOUR_PROJECT_ID asia-northeast1
```

**Mac/Linux:**
```bash
chmod +x deploy.sh
./deploy.sh YOUR_PROJECT_ID asia-northeast1
```

### 手動デプロイ

```bash
gcloud run deploy salon-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_api_key \
  --set-env-vars ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

詳細は [CLOUD_RUN_SETUP.md](../CLOUD_RUN_SETUP.md) を参照してください。

## 環境変数

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `GEMINI_API_KEY` | Gemini APIキー | はい | - |
| `ALLOWED_ORIGINS` | CORSで許可するオリジン（カンマ区切り） | いいえ | `http://localhost:3000,http://localhost:3001` |
| `PORT` | サーバーのポート番号 | いいえ | `8080` |

## API エンドポイント

### `GET /`
ヘルスチェック・API情報

**レスポンス:**
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

### `POST /scan`
名刺画像をOCRでスキャン

**リクエスト:**
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**レスポンス:**
```json
{
  "company_name": "株式会社サンプル",
  "departments": ["営業部", "第一営業課"],
  "titles": ["課長"],
  "full_name": "山田 太郎",
  "name_reading": "Yamada Taro",
  "email": "yamada@sample.co.jp",
  "company_url": "https://sample.co.jp",
  "address": "東京都千代田区..."
}
```

### `POST /deep-research`
企業のDeepリサーチレポート生成

**リクエスト:**
```json
{
  "company_name": "株式会社サンプル",
  "company_url": "https://sample.co.jp",
  "address": "東京都千代田区...",
  "departments": ["営業部"],
  "demo_interests": ["デモA"],
  "customer_needs": ["業務効率化"],
  "heat_level": "A",
  "potential": "高"
}
```

**レスポンス:**
```json
{
  "report": "# Deepリサーチレポート\n\n## 1. 企業概要...",
  "status": "completed",
  "sources": [
    {
      "title": "企業サイト",
      "url": "https://...",
      "snippet": "..."
    }
  ],
  "search_queries": ["株式会社サンプル 企業情報"]
}
```

## 技術スタック

- **FastAPI**: 高速なPython Webフレームワーク
- **Uvicorn**: ASGIサーバー
- **Google Generative AI (Gemini)**: AI/ML API
- **Pydantic**: データバリデーション

## トラブルシューティング

### CORSエラーが発生する

`ALLOWED_ORIGINS` 環境変数にフロントエンドのURLを追加してください：

```bash
export ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
```

### Deep ResearchがタイムアウトするÁ

Cloud Runのタイムアウト設定を延長してください：

```bash
gcloud run services update salon-backend \
  --region asia-northeast1 \
  --timeout 300
```

### モックレスポンスが返される

`GEMINI_API_KEY` が正しく設定されているか確認してください：

```bash
echo $GEMINI_API_KEY
```

## ライセンス

社内利用を想定したプライベートプロジェクトです。







