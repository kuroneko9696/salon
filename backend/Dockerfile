FROM python:3.11-slim

WORKDIR /app

# 依存関係をコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# Cloud RunではPORT環境変数が自動設定される
ENV PORT=8000
EXPOSE $PORT

# PORT環境変数からポート番号を取得して起動
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
