from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
import base64

load_dotenv()

app = FastAPI(
    title="展示会用名刺管理API",
    description="名刺OCRとDeepリサーチ機能を提供するAPI",
    version="1.0.0"
)

# CORS設定
# 環境変数から許可するオリジンを取得（カンマ区切り）
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API設定（新しいSDK）
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
else:
    gemini_client = None


# リクエスト/レスポンスモデル
class CardScanRequest(BaseModel):
    image_base64: str


class CardScanResponse(BaseModel):
    company_name: Optional[str] = None
    departments: Optional[List[str]] = None
    titles: Optional[List[str]] = None
    full_name: Optional[str] = None
    name_reading: Optional[str] = None
    email: Optional[str] = None
    company_url: Optional[str] = None
    address: Optional[str] = None


class DeepResearchRequest(BaseModel):
    company_name: str
    company_url: Optional[str] = None
    address: Optional[str] = None
    departments: Optional[List[str]] = None
    demo_interests: Optional[List[str]] = None
    customer_needs: Optional[List[str]] = None
    heat_level: Optional[str] = None
    potential: Optional[str] = None


class SourceReference(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = None


class DeepResearchResponse(BaseModel):
    report: str
    status: str
    sources: List[SourceReference] = []
    search_queries: List[str] = []


@app.get("/")
async def root():
    return {
        "message": "展示会用名刺管理API",
        "version": "1.0.0",
        "endpoints": {
            "/scan": "名刺OCR",
            "/deep-research": "Deepリサーチレポート生成"
        }
    }


@app.post("/scan", response_model=CardScanResponse)
async def scan_card(request: CardScanRequest):
    """
    名刺画像をOCRでスキャンして情報を抽出
    """
    if not GEMINI_API_KEY or not gemini_client:
        # モックレスポンス（API キーがない場合）
        return CardScanResponse(
            company_name="株式会社サンプル",
            departments=["営業部", "第一営業課"],
            titles=["課長"],
            full_name="山田 太郎",
            name_reading="Yamada Taro",
            email="yamada@sample.co.jp",
            company_url="https://sample.co.jp",
            address="東京都千代田区丸の内1-1-1"
        )

    try:
        # Base64画像をデコード
        image_data = base64.b64decode(request.image_base64.split(',')[1])

        prompt = """これは名刺の画像です。以下の項目をJSON形式で抽出してください。

        抽出項目:
        - company_name: 会社名
        - departments: 部署名（部、課、グループなど。複数ある場合は配列で）
        - titles: 役職（複数ある場合は配列で）
        - full_name: 氏名
        - name_reading: 氏名のローマ字またはフリガナ（存在する場合のみ）
        - email: メールアドレス
        - company_url: 会社URL
        - address: 会社住所

        注意事項:
        - 画像に含まれない項目は null とする
        - 推測や補完はしない
        - JSON形式で返答する（マークダウンコードブロックは使用しない）
        """

        # 新しいSDKで画像を解析
        response = gemini_client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=image_data,
                    mime_type='image/jpeg'
                )
            ]
        )

        # JSONレスポンスをパース
        import json
        result = json.loads(response.text)

        return CardScanResponse(**result)

    except Exception as e:
        print(f"Error scanning card: {e}")
        raise HTTPException(status_code=500, detail=f"名刺のスキャンに失敗しました: {str(e)}")


@app.post("/deep-research", response_model=DeepResearchResponse)
async def deep_research(request: DeepResearchRequest):
    """
    企業情報に基づいてDeepリサーチレポートを生成
    Google SearchでGroundingされたGemini 2.0 Flashを使用
    """
    if not GEMINI_API_KEY:
        # モックレスポンス
        mock_sources = [
            SourceReference(
                title=f"{request.company_name} 公式サイト",
                url=request.company_url or "https://example.com",
                snippet="企業の基本情報"
            )
        ]
        mock_report = f"""# Deepリサーチレポート: {request.company_name}

## 1. 企業概要（サマリー）
**{request.company_name}** は、主要な事業展開を行っている企業です。

## 2. 会社基本情報
- **所在地**: {request.address or '情報なし'}
- **部署**: {', '.join(request.departments or ['情報なし'])}
- **ウェブサイト**: {request.company_url or '情報なし'}

## 3. 直近の動向・プレスリリース
最新の情報によると、デジタルトランスフォーメーションを推進中です。

## 4. 部署の役割と事業領域
{request.departments[0] if request.departments else '担当部署'}の役割について分析します。

## 5. 接触状況と推定ニーズ
顧客の課題: {', '.join(request.customer_needs or ['情報なし'])}

## 6. 推奨アプローチ
具体的なフォローアップ施策を検討してください。
"""
        return DeepResearchResponse(
            report=mock_report,
            status="completed",
            sources=mock_sources,
            search_queries=[f"{request.company_name} 企業情報"]
        )

    try:
        # 企業を正確に特定するための検索クエリを構築
        company_identifier = request.company_name
        if request.address:
            # 住所から都道府県・市区町村を抽出して特定精度を上げる
            company_identifier = f"{request.company_name} {request.address}"

        # プロンプト構築
        prompt = f"""あなたは企業分析の専門家です。以下の企業について、Web検索結果を活用して詳細な調査レポートを作成してください。

# 調査対象企業
- **企業名**: {request.company_name}
- **所在地**: {request.address or '不明'}
- **ウェブサイト**: {request.company_url or '不明'}
- **関連部署**: {', '.join(request.departments or ['不明'])}

# 重要な注意事項
1. 同名の企業が複数存在する可能性があるため、所在地({request.address})を基に正しい企業を特定してください
2. 必ずWeb検索結果から最新かつ正確な情報を取得してください
3. 情報源のURLを明記してください
4. 推測ではなく、検索結果に基づいた事実のみを記載してください

# レポート構成

## 1. 企業概要（サマリー）
- 正式な会社名
- 設立年、資本金、従業員数
- 事業内容とビジネスモデル
- 主要な製品・サービス
- 主要顧客層・ターゲット市場

## 2. 会社基本情報
- 本社所在地（郵便番号含む）
- 代表者名
- 資本金・売上高（直近の公表値）
- 従業員数
- 上場情報（上場している場合）
- グループ会社・関連会社

## 3. 直近の動向・プレスリリース（過去1年以内）
- 最新のプレスリリース（日付とタイトル、概要）
- 新製品・新サービスのリリース情報
- 業務提携・M&A情報
- 受賞歴・表彰
- 採用情報や組織変更
※各情報には必ず出典URLを記載

## 4. 担当部署の役割と事業領域
- {', '.join(request.departments or ['担当部署'])}の組織における位置づけ
- この部署が担当する主な業務内容
- この部署が関わる製品・サービス
- 業界内でのポジションや強み

## 5. 接触状況と推定ニーズ（該当する場合のみ）
{f"- 関心を示したデモ: {', '.join(request.demo_interests)}" if request.demo_interests else ""}
{f"- 顧客の課題: {', '.join(request.customer_needs)}" if request.customer_needs else ""}
{f"- 熱量レベル: {request.heat_level}" if request.heat_level else ""}
{f"- 案件化可能性: {request.potential}" if request.potential else ""}

上記の接触情報から推測される具体的なニーズや背景を分析

## 6. 推奨アプローチ
- 次回の接触で言及すべきポイント
- ヒアリングすべき具体的な質問項目
- 提案すべきソリューションの方向性
- アプローチのタイミングと優先度

# 出力形式
- マークダウン形式で出力
- 各セクションで引用した情報源は [タイトル](URL) の形式で明記
- 情報が見つからない項目は「情報なし」と明記し、推測しない
"""

        # Google Search Groundingを使用（最新のSDK）
        # モデル名を確認: gemini-2.0-flash-exp または gemini-1.5-pro など
        try:
            # まずは gemini-1.5-pro を試す（Google Search Groundingをサポート）
            response = gemini_client.models.generate_content(
                model='gemini-1.5-pro',
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.7
                )
            )
        except Exception as model_error:
            # モデルが利用できない場合は、gemini-2.0-flash-expを試す
            print(f"Warning: gemini-1.5-pro failed, trying gemini-2.0-flash-exp: {model_error}")
            try:
                response = gemini_client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                        temperature=0.7
                    )
                )
            except Exception as model_error2:
                # それでも失敗する場合は、Google Searchなしで通常のモデルを使用
                print(f"Warning: Google Search Grounding failed, using regular model: {model_error2}")
                response = gemini_client.models.generate_content(
                    model='gemini-1.5-pro',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.7
                    )
                )

        # レスポンスから情報を抽出
        if not response:
            raise HTTPException(status_code=500, detail="APIレスポンスが空です")
        
        # レスポンステキストを取得
        try:
            report_text = response.text
            if not report_text:
                raise HTTPException(status_code=500, detail="レスポンステキストが空です")
        except Exception as e:
            print(f"Error extracting response text: {e}")
            raise HTTPException(status_code=500, detail=f"レスポンステキストの取得に失敗しました: {str(e)}")

        # Grounding metadataから検索クエリとソースを抽出
        search_queries = []
        sources = []

        try:
            if hasattr(response, 'candidates') and response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                    grounding_metadata = candidate.grounding_metadata

                    # 検索クエリを取得
                    if hasattr(grounding_metadata, 'web_search_queries') and grounding_metadata.web_search_queries:
                        search_queries = list(grounding_metadata.web_search_queries)

                    # ソース情報を取得
                    if hasattr(grounding_metadata, 'grounding_chunks') and grounding_metadata.grounding_chunks:
                        for chunk in grounding_metadata.grounding_chunks:
                            if hasattr(chunk, 'web') and chunk.web:
                                sources.append(SourceReference(
                                    title=getattr(chunk.web, 'title', None) or "No title",
                                    url=getattr(chunk.web, 'uri', None) or "",
                                    snippet=getattr(chunk.web, 'snippet', None)
                                ))
        except Exception as e:
            print(f"Warning: Failed to extract grounding metadata: {e}")
            import traceback
            traceback.print_exc()

        # レスポンステキストからURLを抽出（フォールバック）
        if not sources:
            import re
            # マークダウンリンク形式のURLを抽出 [title](url)
            markdown_links = re.findall(r'\[([^\]]+)\]\((https?://[^\)]+)\)', report_text)
            for title, url in markdown_links:
                sources.append(SourceReference(
                    title=title,
                    url=url,
                    snippet=None
                ))

        # 検索クエリがない場合はデフォルト値を設定
        if not search_queries:
            search_queries = [f"{request.company_name} 企業情報", f"{request.company_name} プレスリリース"]

        return DeepResearchResponse(
            report=report_text,
            status="completed",
            sources=sources,
            search_queries=search_queries
        )

    except Exception as e:
        print(f"Error generating deep research: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"レポート生成に失敗しました: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    # Renderでは環境変数PORTが自動的に設定される
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
