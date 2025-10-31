# CORS設定ガイド

## 問題: "Failed to fetch" または CORSエラー

フロントエンドからバックエンドAPIへのリクエストが失敗する場合、CORS（Cross-Origin Resource Sharing）設定の問題である可能性が高いです。

## 解決方法

### 1. Renderダッシュボードで環境変数を設定

1. **Renderダッシュボードにアクセス**
   - https://dashboard.render.com にログイン
   - `salon-backend` サービスを選択

2. **環境変数を編集**
   - 左側のメニューから "Environment" を選択
   - `ALLOWED_ORIGINS` 環境変数を探す（存在しない場合は追加）

3. **フロントエンドのURLを追加**
   - 現在の値: `http://localhost:3000,http://localhost:3001`（デフォルト）
   - 新しい値: `https://salon-tkru.vercel.app,http://localhost:3000`
   
   **注意**: カンマ区切りで複数のURLを指定できます。スペースは不要です。

4. **変更を保存**
   - "Save Changes" をクリック
   - Renderが自動的に再デプロイを開始します

### 2. 再デプロイの確認

1. Renderダッシュボードの "Events" タブで再デプロイの完了を確認
2. "Logs" タブで以下のログが表示されることを確認：
   ```
   CORS設定: 許可されているオリジン: ['https://salon-tkru.vercel.app', 'http://localhost:3000']
   ```

### 3. 動作確認

1. フロントエンド（https://salon-tkru.vercel.app）にアクセス
2. Deepリサーチ機能を試す
3. ブラウザのコンソールでエラーが解消されているか確認

## トラブルシューティング

### まだエラーが発生する場合

1. **ブラウザのキャッシュをクリア**
   - ブラウザの開発者ツールを開く
   - ネットワークタブで "Disable cache" にチェック
   - ページをリロード

2. **環境変数の形式を確認**
   - URLの末尾に `/` がついていないか確認
   - カンマの後にスペースが入っていないか確認
   - 例: `https://salon-tkru.vercel.app,http://localhost:3000` ✅
   - 例: `https://salon-tkru.vercel.app/, http://localhost:3000` ❌

3. **Renderのログを確認**
   - Renderダッシュボード → salon-backend → Logs
   - CORS関連のエラーログがないか確認

4. **バックエンドの起動確認**
   - https://salon-backend-fk8y.onrender.com/ にアクセス
   - JSONレスポンスが返ってくることを確認

## 現在の設定確認

バックエンドのコードでは、環境変数 `ALLOWED_ORIGINS` から許可するオリジンを読み込んでいます。

設定されていない場合のデフォルト値:
- `http://localhost:3000`
- `http://localhost:3001`

本番環境では、必ずフロントエンドのURLを環境変数で指定してください。

