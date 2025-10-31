import subprocess
import time
import requests
import json
import sys

def start_server():
    """バックエンドサーバーをバックグラウンドで起動"""
    print("バックエンドサーバーを起動しています...")
    process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    return process

def wait_for_server(max_wait=30):
    """サーバーが起動するまで待機"""
    for i in range(max_wait):
        try:
            response = requests.get("http://localhost:8000/", timeout=2)
            if response.status_code == 200:
                print(f"サーバーが起動しました（{i+1}秒後）")
                return True
        except:
            pass
        time.sleep(1)
    return False

def test_deep_research():
    """Deep Research APIをテスト"""
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
    
    api_url = "http://localhost:8000/deep-research"
    
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
            timeout=120  # Deep Researchは時間がかかる可能性があるため120秒に設定
        )
        
        print(f"\nステータスコード: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n" + "=" * 60)
            print("[SUCCESS] APIリクエスト成功")
            print("=" * 60)
            print(f"\nレポートステータス: {result.get('status', 'N/A')}")
            print(f"検索クエリ数: {len(result.get('search_queries', []))}")
            print(f"ソース数: {len(result.get('sources', []))}")
            
            if result.get('report'):
                report_preview = result['report'][:500]  # 最初の500文字を表示
                print(f"\nレポートプレビュー（最初の500文字）:")
                print("-" * 60)
                print(report_preview)
                if len(result['report']) > 500:
                    print("...")
                    print(f"（合計 {len(result['report'])} 文字）")
            
            if result.get('search_queries'):
                print(f"\n使用された検索クエリ:")
                for i, query in enumerate(result['search_queries'][:5], 1):
                    print(f"  {i}. {query}")
            
            if result.get('sources'):
                print(f"\n情報源（最初の3つ）:")
                for i, source in enumerate(result['sources'][:3], 1):
                    print(f"  {i}. {source.get('title', 'No title')}")
                    print(f"     URL: {source.get('url', 'N/A')}")
            
            return True
        else:
            print("\n" + "=" * 60)
            print("[ERROR] APIリクエスト失敗")
            print("=" * 60)
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except:
                print(response.text[:500])
            return False
            
    except requests.exceptions.Timeout as e:
        print("\n" + "=" * 60)
        print("[ERROR] タイムアウトエラー: APIリクエストがタイムアウトしました")
        print("=" * 60)
        print(f"エラー詳細: {str(e)}")
        return False
        
    except Exception as e:
        print("\n" + "=" * 60)
        print("[ERROR] エラーが発生しました")
        print("=" * 60)
        print(f"エラー詳細: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # サーバーが既に起動しているか確認
    try:
        response = requests.get("http://localhost:8000/", timeout=2)
        print("サーバーは既に起動しています")
    except:
        # サーバーを起動
        process = start_server()
        if not wait_for_server():
            print("サーバーの起動に失敗しました")
            process.terminate()
            sys.exit(1)
    
    # APIテストを実行
    success = test_deep_research()
    
    sys.exit(0 if success else 1)

