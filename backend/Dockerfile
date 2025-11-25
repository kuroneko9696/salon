FROM python:3.11-slim

WORKDIR /app

# セキュリティアップデートと必要なパッケージをインストール
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 依存関係をコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# 非rootユーザーで実行（セキュリティベストプラクティス）
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Cloud RunではPORT環境変数が自動設定される（デフォルト8080）
ENV PORT=8080
EXPOSE $PORT

# ヘルスチェック（オプション）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/')" || exit 1

# PORT環境変数からポート番号を取得して起動
CMD uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
