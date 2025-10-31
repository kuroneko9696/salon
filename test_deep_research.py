import requests
import json

# テスト用のリクエストデータ
test_data = {
    "company_name": "株式会社サンプル",
    "company_url": "https://sample.co.jp",
    "address": "東京都千代田区丸の内1-1-1",
    "departments": ["営業部", "第一営業課"],
    "demo_interests": ["デモA", "デモB"],
    "customer_needs": ["既存業務の自動化"],
    "heat_level": "A",
    "potential": "高"
}

# APIエンドポイント
# Renderの本番環境URLでテスト
api_url = "https://salon-backend-fk8y.onrender.com/deep-research"

# 開発環境を使用する場合は以下をコメントアウトして有効化
# api_url = "http://localhost:8000/deep-research"

print("=" * 60)
print("Deep Research API テスト")
print("=" * 60)
print(f"\nAPI URL: {api_url}")
print(f"\nリクエストデータ:")
print(json.dumps(test_data, indent=2, ensure_ascii=False))

try:
    print("\n" + "=" * 60)
    print("APIリクエストを送信しています...")
    print("=" * 60)
    
    response = requests.post(
        api_url,
        json=test_data,
        headers={"Content-Type": "application/json"},
        timeout=180  # Renderの無料プランではスリープ後に初回リクエストが遅くなる可能性があるため180秒に設定
    )
    
    print(f"\nステータスコード: {response.status_code}")
    print(f"レスポンスヘッダー: {dict(response.headers)}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n" + "=" * 60)
        print("[SUCCESS] APIリクエスト成功")
        print("=" * 60)
        print(f"\nレスポンス:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("\n" + "=" * 60)
        print("[ERROR] APIリクエスト失敗")
        print("=" * 60)
        print(f"\nエラーレスポンス:")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2, ensure_ascii=False))
        except:
            print(response.text)
            
except requests.exceptions.ConnectionError as e:
    print("\n" + "=" * 60)
    print("[ERROR] 接続エラー: バックエンドサーバーに接続できません")
    print("=" * 60)
    print(f"エラー詳細: {str(e)}")
    print("\nバックエンドサーバーが起動しているか確認してください。")
    print("起動方法: cd backend && python main.py")
    
except requests.exceptions.Timeout as e:
    print("\n" + "=" * 60)
    print("[ERROR] タイムアウトエラー: APIリクエストがタイムアウトしました")
    print("=" * 60)
    print(f"エラー詳細: {str(e)}")
    
except requests.exceptions.RequestException as e:
    print("\n" + "=" * 60)
    print("[ERROR] リクエストエラー")
    print("=" * 60)
    print(f"エラー詳細: {str(e)}")
    
except Exception as e:
    print("\n" + "=" * 60)
    print("[ERROR] 予期しないエラー")
    print("=" * 60)
    print(f"エラー詳細: {str(e)}")
    import traceback
    traceback.print_exc()

