# 展示会用名刺管理Webアプリ

展示会での名刺交換と商談情報を効率的に管理・共有するための社内向けWebアプリケーションです。

## 特徴

- **📸 スマホカメラで名刺撮影**: 高解像度での名刺撮影をサポート
- **🤖 AI OCR**: Gemini APIを使用した自動名刺情報抽出
- **📝 詳細な商談記録**: アンケート形式で統一された商談情報の記録
- **🔍 Deepリサーチ**: AIによる企業分析とアプローチ提案の自動生成
- **💾 オフライン対応**: Service Workerによるオフライン機能（PWA）
- **📱 モバイルファースト**: Android スマートフォンでの利用を想定

## 技術スタック

### フロントエンド
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (UIコンポーネント)
- **Zustand** (状態管理)
- **PWA** (Progressive Web App)

### バックエンド
- **FastAPI** (Python)
- **Google Generative AI (Gemini)**
- **Pydantic** (データバリデーション)

### インフラ
- **Docker & Docker Compose**
- **Vercel** (フロントエンドデプロイ先)
- **Render** (バックエンドデプロイ先)

## セットアップ

### 前提条件

- Node.js 20以上
- Python 3.11以上
- Docker & Docker Compose (オプション)
- Google Gemini API Key

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd salon
```

### 2. 環境変数の設定

```bash
# ルートディレクトリ
cp .env.example .env
# .envファイルを編集してGEMINI_API_KEYを設定

# バックエンド
cp backend/.env.example backend/.env
```

### 3. フロントエンドのセットアップ

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは http://localhost:3000 で起動します。

### 4. バックエンドのセットアップ

```bash
cd backend
pip install -r requirements.txt
python main.py
```

バックエンドは http://localhost:8000 で起動します。

### Docker Composeを使用する場合

```bash
# ルートディレクトリで実行
docker-compose up --build
```

## 画面構成

### 1. ログイン画面 (`/login`)
- 社内向けのシンプルな認証

### 2. 名刺一覧 (`/dashboard`)
- 登録された名刺の一覧表示
- インクリメンタル検索機能
- FAB（フローティングアクションボタン）から名刺追加

### 3. カメラ撮影 (`/camera`)
- スマートフォンカメラでの名刺撮影
- ガイド枠表示
- カメラ切り替え機能

### 4. プレビュー確認 (`/preview`)
- 撮影画像の確認
- AIスキャン処理のトリガー

### 5. スキャン結果修正 (`/edit`)
- AI OCR結果の確認・修正
- 名刺情報の手動入力

### 6. 商談管理アンケート (`/survey/[cardId]`)
- Q1: 関心を示した技術デモ
- Q2: 顧客の課題・ニーズ
- Q3: 関心の背景
- Q4: 顧客の熱量・反応
- Q5: 協業・案件化の可能性
- Q6: 時期感（Q5が「高」の場合）
- Q7: 次のアクション
- 自由記述欄

### 7. 名刺・商談情報詳細 (`/card/[cardId]`)
- タブ1: 名刺情報
- タブ2: 商談メモ
- タブ3: Deepリサーチ（AIレポート）

## API エンドポイント

### Backend API (FastAPI)

#### `POST /scan`
名刺画像をOCRでスキャンして情報を抽出

**Request:**
```json
{
  "image_base64": "data:image/jpeg;base64,..."
}
```

**Response:**
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

#### `POST /deep-research`
企業情報とアンケート結果に基づいてDeepリサーチレポートを生成

**Request:**
```json
{
  "company_name": "株式会社サンプル",
  "company_url": "https://sample.co.jp",
  "demo_interests": ["デモA"],
  "customer_needs": ["既存業務の自動化"],
  "heat_level": "A",
  "potential": "高"
}
```

**Response:**
```json
{
  "report": "# Deepリサーチレポート\n\n## 1. 企業概要...",
  "status": "completed"
}
```

## データモデル

### BusinessCard (名刺)
- `card_id`: 名刺ID
- `user_id`: 登録者ID
- `image_url`: スキャン画像URL
- `company_name`: 会社名
- `full_name`: 氏名
- その他の名刺情報

### Meeting (商談メモ)
- `meeting_id`: 商談ID
- `card_id`: 紐づく名刺ID
- `q1_demo`: 関心を示したデモ
- `q2_needs`: 顧客の課題
- `q4_heat_level`: 熱量レベル（A/B/C/D）
- `q5_potential`: 案件化可能性（高/中/低/不明）
- その他のアンケート情報

## 開発

### フロントエンド開発

```bash
cd frontend
npm run dev    # 開発サーバー起動
npm run build  # 本番ビルド
npm run lint   # Lint実行
```

### バックエンド開発

```bash
cd backend
uvicorn main:app --reload  # 開発サーバー起動（ホットリロード有効）
```

## デプロイ

### 構成

- **フロントエンド**: Vercel
- **バックエンド**: Render

### 1. バックエンドのデプロイ (Render)

#### 前提条件
- Render アカウント (https://render.com)
- GitHub リポジトリにコードがプッシュ済み

#### デプロイ手順

1. **Renderダッシュボードにアクセス**
   - https://dashboard.render.com にログイン
   - GitHubアカウントを連携（初回のみ）

2. **新しいWebサービスを作成**
   - "New +" → "Web Service" を選択
   - GitHubリポジトリを選択
   - 以下の設定を入力：

   ```
   Name: salon-backend
   Region: Singapore (または最寄りのリージョン)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. **環境変数の設定**

   Renderの環境変数設定で以下を追加：

   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | あなたのGemini APIキー |
   | `ALLOWED_ORIGINS` | フロントエンドのURL（カンマ区切り）<br>例: `https://your-frontend.vercel.app,http://localhost:3000` |

4. **デプロイ**
   - "Create Web Service" をクリック
   - デプロイが完了すると、バックエンドURLが表示されます
   - 例: `https://salon-backend.onrender.com`

### 2. フロントエンドのデプロイ (Vercel)

#### デプロイ手順

1. **Vercelプロジェクトを作成**
   - https://vercel.com にアクセス
   - GitHubリポジトリを接続

2. **ビルド設定**
   - Framework Preset: `Next.js`
   - Root Directory: `frontend`
   - Build Command: `npm run build`（デフォルト）
   - Output Directory: `.next`（デフォルト）

3. **環境変数を設定**
   
   Vercelの環境変数設定で以下を追加：
   
   | Name | Value |
   |------|-------|
   | `GEMINI_API_KEY` | あなたのGemini APIキー |
   | `NEXT_PUBLIC_API_URL` | RenderのバックエンドURL<br>例: `https://salon-backend.onrender.com` |

4. **デプロイ**
   - "Deploy" ボタンをクリック

5. **バックエンドのCORS設定を更新**
   
   フロントエンドのデプロイが完了したら、Renderの環境変数 `ALLOWED_ORIGINS` にVercelのURLを追加：
   
   - Renderダッシュボード → salon-backend → Environment
   - `ALLOWED_ORIGINS` を編集して、VercelのURLを追加
   - 例: `https://your-frontend.vercel.app,http://localhost:3000`
   - 変更を保存すると自動的に再デプロイされます

### デプロイ後の確認

1. フロントエンドURL（Vercel）にアクセス
2. ログイン → カメラ撮影 → OCRスキャンが動作するか確認
3. Deep Researchが生成されるか確認

### トラブルシューティング

#### CORS エラーが発生する場合
- Renderの `ALLOWED_ORIGINS` 環境変数にフロントエンドのURLが含まれているか確認
- URLの末尾に `/` がついていないか確認
- Renderダッシュボードで環境変数が正しく設定されているか確認

#### APIリクエストが失敗する場合
- Vercelの `NEXT_PUBLIC_API_URL` が正しく設定されているか確認
- Renderサービスが起動しているか確認: Renderダッシュボード → salon-backend → Logs
- Renderの無料プランでは、スリープ後に初回リクエストが遅くなる可能性があります

#### Deep Researchがタイムアウトする場合
- Renderの無料プランでは、リクエストタイムアウトが制限されています
- 有料プランにアップグレードするか、リクエスト処理時間を最適化してください
- Renderダッシュボードでログを確認してエラーの詳細を確認してください

## ライセンス

社内利用を想定したプライベートプロジェクトです。

## 今後の拡張予定

- [ ] Firebase連携（本番データベース）
- [ ] Google Workspace認証
- [ ] リアルタイム同期機能
- [ ] エクスポート機能（CSV/Excel）
- [ ] 統計ダッシュボード
- [ ] プッシュ通知
- [ ] マルチテナント対応
#   s a l o n 
 
 