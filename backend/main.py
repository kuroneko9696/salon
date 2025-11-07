from datetime import date, datetime
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
import base64
import binascii
from bs4 import BeautifulSoup
import json

load_dotenv()

app = FastAPI(
    title="展示会用名刺管理API",
    description="名刺OCRとDeepリサーチ機能を提供するAPI",
    version="1.0.0"
)

# CORS設定
# 環境変数から許可するオリジンを取得（カンマ区切り）
# 本番環境ではフロントエンドのURLを環境変数で指定してください
# 例: ALLOWED_ORIGINS=https://salon-tkru.vercel.app,http://localhost:3000
ALLOWED_ORIGINS_STR = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
)
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",") if origin.strip()]

# デバッグ用: 許可されているオリジンをログ出力
print(f"CORS設定: 許可されているオリジン: {ALLOWED_ORIGINS}")

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


class EventBase(BaseModel):
    name: str = Field(..., description="展示会名称")
    start_date: Optional[date] = Field(None, description="開始日")
    end_date: Optional[date] = Field(None, description="終了日")
    location: Optional[str] = Field(None, description="会場所在地")
    description: Optional[str] = Field(None, description="概要メモ")
    event_website_url: Optional[str] = Field(None, description="公式サイトURL")
    scraped_data: Optional[Dict[str, Any]] = Field(
        None, description="スクレイピングした補足データ（JSON形式）"
    )


class EventCreate(EventBase):
    highlight_tags: Optional[List[str]] = Field(
        default=None, description="注目タグ（カンマ区切り指定を想定）"
    )


class EventUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location: Optional[str] = None
    description: Optional[str] = None
    event_website_url: Optional[str] = None
    scraped_data: Optional[Dict[str, Any]] = None
    highlight_tags: Optional[List[str]] = None


class Event(EventBase):
    event_id: str = Field(..., description="イベントID")
    highlight_tags: List[str] = Field(default_factory=list, description="注目タグ")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class BoothBase(BaseModel):
    event_id: str = Field(..., description="紐づくイベントID")
    name: str = Field(..., description="ブース名")
    booth_code: Optional[str] = Field(None, description="ブース番号/コード")
    location: Optional[str] = Field(None, description="会場内の位置情報")
    contact_persons: List[str] = Field(default_factory=list, description="担当者一覧")
    focus_products: List[str] = Field(default_factory=list, description="注目製品・サービス")
    highlight_tags: List[str] = Field(default_factory=list, description="ハイライトタグ")
    pre_research_status: Optional[str] = Field(None, description="事前調査状況メモ")
    memo: Optional[str] = Field(None, description="備考")


class BoothCreate(BoothBase):
    pass


class BoothUpdate(BaseModel):
    event_id: Optional[str] = None
    name: Optional[str] = None
    booth_code: Optional[str] = None
    location: Optional[str] = None
    contact_persons: Optional[List[str]] = None
    focus_products: Optional[List[str]] = None
    highlight_tags: Optional[List[str]] = None
    pre_research_status: Optional[str] = None
    memo: Optional[str] = None


class Booth(BoothBase):
    booth_id: str = Field(..., description="ブースID")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class BusinessCardLinkage(BaseModel):
    event_id: Optional[str] = Field(None, description="紐づくイベントID")
    booth_id: Optional[str] = Field(None, description="紐づくブースID")
    visit_notes: Optional[str] = Field(None, description="訪問時メモ")
    highlight: bool = Field(False, description="ハイライトフラグ")


class MeetingVisitContext(BaseModel):
    event_id: Optional[str] = Field(None, description="紐づくイベントID")
    booth_id: Optional[str] = Field(None, description="紐づくブースID")
    booth_experience: Optional[str] = Field(None, description="ブース訪問時の感想・記録")
    followup_tasks: List[str] = Field(default_factory=list, description="フォローアップタスク候補")

NoteType = Literal["conversation", "demo", "material", "question", "followup", "other"]


class TargetCompanyBase(BaseModel):
    event_id: str = Field(..., description="紐づくイベントID")
    name: str = Field(..., description="ターゲット企業名またはブース名")
    website_url: Optional[str] = Field(None, description="公式サイトURL")
    description: Optional[str] = Field(None, description="企業概要メモ")
    booth_code: Optional[str] = Field(None, description="会場ブース番号")
    priority: Optional[str] = Field(None, description="優先度（high/medium/lowなど）")
    highlight_tags: List[str] = Field(default_factory=list, description="ハイライトタグ")
    pre_research_status: Optional[str] = Field(None, description="事前調査ステータス")
    research_summary: Optional[str] = Field(None, description="スクレイピング・調査のまとめ")
    notes: Optional[str] = Field(None, description="自由メモ")
    scraped_context: Optional[Dict[str, Any]] = Field(
        None, description="スクレイピングで取得した生データ"
    )
    ai_research: Optional[str] = Field(None, description="AIによる事前調査レポート")
    highlight: bool = Field(False, description="注目ターゲットとしてマーク済みか")


class TargetCompany(TargetCompanyBase):
    target_company_id: str = Field(..., description="ターゲット企業ID")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class TargetCompanyCreate(TargetCompanyBase):
    pass


class TargetCompanyUpdate(BaseModel):
    event_id: Optional[str] = None
    name: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None
    booth_code: Optional[str] = None
    priority: Optional[str] = None
    highlight_tags: Optional[List[str]] = None
    pre_research_status: Optional[str] = None
    research_summary: Optional[str] = None
    notes: Optional[str] = None
    scraped_context: Optional[Dict[str, Any]] = None
    ai_research: Optional[str] = None
    highlight: Optional[bool] = None


class PreResearchRequest(BaseModel):
    focus_points: Optional[List[str]] = Field(
        default=None, description="AIに強調してほしい観点（例: 協業テーマ、直近のプレスリリース）"
    )
    keywords: Optional[List[str]] = Field(
        default=None, description="追加で調査したいキーワード"
    )
    force_refresh: bool = Field(
        default=False, description="既存結果があっても再生成するか"
    )
    custom_prompt: Optional[str] = Field(
        default=None, description="AIに渡す追加プロンプト指示"
    )


class BatchPreResearchRequest(PreResearchRequest):
    target_company_ids: Optional[List[str]] = Field(
        default=None,
        description="事前調査を実行するターゲット企業ID。未指定の場合はイベント配下の全企業を対象",
    )


class UploadImageRequest(BaseModel):
    filename: str = Field(..., description="アップロード時のファイル名")
    content_base64: str = Field(..., description="Base64エンコードされた画像")
    media_type: Optional[str] = Field(
        default="image/jpeg", description="MIMEタイプ (例: image/jpeg)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="任意のメタデータ"
    )


class UploadImageResponse(BaseModel):
    image_id: str
    filename: str
    media_type: str


class UploadedImage(BaseModel):
    image_id: str
    filename: str
    media_type: str
    content_base64: str
    metadata: Dict[str, Any]
    created_at: datetime


class VisitNoteBase(BaseModel):
    event_id: str = Field(..., description="紐づくイベントID")
    target_company_id: Optional[str] = Field(
        default=None, description="紐づくターゲット企業ID"
    )
    title: Optional[str] = Field(
        default=None, description="ノートのタイトルまたはショートメモ"
    )
    note_type: NoteType = Field(default="conversation", description="ノート種別")
    content: str = Field(..., description="詳細メモ")
    image_ids: List[str] = Field(
        default_factory=list, description="添付画像ID（upload/imageで取得）"
    )
    keywords: List[str] = Field(default_factory=list, description="関連キーワード")
    highlight: bool = Field(False, description="ハイライトとして扱うか")
    created_by: Optional[str] = Field(
        default=None, description="ノート作成者（メールアドレスなど）"
    )


class VisitNote(VisitNoteBase):
    visit_note_id: str = Field(..., description="ノートID")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class VisitNoteUpdate(BaseModel):
    event_id: Optional[str] = None
    target_company_id: Optional[str] = None
    title: Optional[str] = None
    note_type: Optional[NoteType] = None
    content: Optional[str] = None
    image_ids: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    highlight: Optional[bool] = None
    created_by: Optional[str] = None


class KeywordNoteBase(BaseModel):
    event_id: str = Field(..., description="紐づくイベントID")
    target_company_id: Optional[str] = Field(
        default=None, description="紐づくターゲット企業ID"
    )
    keyword: str = Field(..., description="メモしたキーワード・疑問点")
    context: Optional[str] = Field(default=None, description="キーワードの補足情報")
    ai_suggestions: List[str] = Field(default_factory=list, description="AI提案")
    status: Literal["open", "resolved"] = Field(
        default="open", description="対応状況"
    )


class KeywordNote(KeywordNoteBase):
    keyword_note_id: str = Field(..., description="キーワードノートID")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class KeywordNoteUpdate(BaseModel):
    event_id: Optional[str] = None
    target_company_id: Optional[str] = None
    keyword: Optional[str] = None
    context: Optional[str] = None
    ai_suggestions: Optional[List[str]] = None
    status: Optional[Literal["open", "resolved"]] = None


class KeywordSuggestionRequest(BaseModel):
    additional_context: Optional[str] = Field(
        default=None, description="AIに渡す追加コンテキスト"
    )


class KeywordSuggestionResponse(BaseModel):
    suggestions: List[str]


class MaterialImageBase(BaseModel):
    event_id: str = Field(..., description="紐づくイベントID")
    target_company_id: Optional[str] = Field(
        default=None, description="紐づくターゲット企業ID"
    )
    visit_note_id: Optional[str] = Field(
        default=None, description="紐づく来場ノートID"
    )
    image_id: str = Field(..., description="アップロード済み画像ID")
    caption: Optional[str] = Field(default=None, description="キャプション")
    tags: List[str] = Field(default_factory=list, description="タグ")
    ocr_text: Optional[str] = Field(
        default=None, description="Vision OCRで抽出したテキスト"
    )
    ai_summary: Optional[str] = Field(
        default=None, description="AIによる要約・注目ポイント"
    )


class MaterialImage(MaterialImageBase):
    material_id: str = Field(..., description="資料画像ID")
    created_at: datetime = Field(..., description="登録日時")
    updated_at: datetime = Field(..., description="更新日時")


class MaterialImageUpdate(BaseModel):
    target_company_id: Optional[str] = None
    visit_note_id: Optional[str] = None
    caption: Optional[str] = None
    tags: Optional[List[str]] = None
    ocr_text: Optional[str] = None
    ai_summary: Optional[str] = None


class MaterialImageCreate(MaterialImageBase):
    auto_ocr: bool = Field(default=False, description="Gemini Vision OCRを実行するか")
    prompt_hint: Optional[str] = Field(
        default=None, description="OCR/要約時にAIへ渡したいヒント"
    )


class TaskBase(BaseModel):
    event_id: str = Field(..., description="紐づくイベントID")
    title: str = Field(..., description="タスク名")
    description: Optional[str] = Field(None, description="詳細メモ")
    status: Literal["open", "in_progress", "completed"] = Field(
        default="open", description="タスクの進捗ステータス"
    )
    due_date: Optional[date] = Field(None, description="期限日")
    target_company_id: Optional[str] = Field(
        default=None, description="紐づくターゲット企業"
    )
    visit_note_id: Optional[str] = Field(
        default=None, description="紐づく来場ノート"
    )
    source: Optional[str] = Field(
        default=None, description="タスクの生成元（アンケート/AIなど）"
    )
    priority: Optional[str] = Field(
        default=None, description="優先度（high/medium/lowなど）"
    )


class TaskCreate(TaskBase):
    pass


class Task(TaskBase):
    task_id: str = Field(..., description="タスクID")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["open", "in_progress", "completed"]] = None
    due_date: Optional[date] = None
    target_company_id: Optional[str] = None
    visit_note_id: Optional[str] = None
    source: Optional[str] = None
    priority: Optional[str] = None


class EventReport(BaseModel):
    report_id: str = Field(..., description="レポートID")
    event_id: str = Field(..., description="紐づくイベントID")
    status: Literal["pending", "processing", "completed", "failed"] = Field(
        ..., description="生成ステータス"
    )
    content: Optional[str] = Field(
        default=None, description="Markdown形式のレポート本文"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="生成時のメタデータ"
    )
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class EventSummaryHighlights(BaseModel):
    highlight_notes: List[VisitNote] = Field(
        default_factory=list, description="ハイライトとしてマークされたノート"
    )
    highlight_companies: List[TargetCompany] = Field(
        default_factory=list, description="ハイライト企業"
    )
    pending_tasks: List[Task] = Field(
        default_factory=list, description="未完了タスク"
    )


class EventSummaryResponse(BaseModel):
    event: Event
    metrics: Dict[str, Any]
    highlights: EventSummaryHighlights
    recent_materials: List[MaterialImage]
    keyword_notes: List[KeywordNote]
    last_report: Optional[EventReport] = None


class MaterialOcrRequest(BaseModel):
    prompt_hint: Optional[str] = Field(
        default=None, description="OCR/要約時にAIへ伝えたいヒント"
    )


class EventReportRequest(BaseModel):
    focus_points: Optional[List[str]] = Field(
        default=None, description="レポートに必ず含めたい観点"
    )
    include_sections: Optional[List[str]] = Field(
        default=None, description="出力したいセクション（例: summary, highlights, tasks）"
    )
    custom_prompt: Optional[str] = Field(
        default=None, description="Geminiへ渡すカスタム指示"
    )


class ScrapeRequest(BaseModel):
    source_url: Optional[str] = Field(
        default=None, description="スクレイピング対象URL（メモ用途）"
    )
    source_html: Optional[str] = Field(
        default=None, description="HTMLソース（オフライン解析用）"
    )
    selectors: Optional[List[str]] = Field(
        default=None, description="抽出に使用するCSSセレクタ"
    )
    limit: int = Field(default=50, description="抽出する最大件数")
    include_links: bool = Field(
        default=True, description="抽出結果にリンク情報を含めるか"
    )


class ScrapeResult(BaseModel):
    parsed_at: datetime
    selectors: List[str]
    items: List[Dict[str, Any]]
    source_url: Optional[str] = None
    notes: Optional[str] = None


# 簡易インメモリーストア
events_store: Dict[str, Event] = {}
booths_store: Dict[str, Booth] = {}
target_companies_store: Dict[str, TargetCompany] = {}
uploaded_images_store: Dict[str, UploadedImage] = {}
visit_notes_store: Dict[str, VisitNote] = {}
keyword_notes_store: Dict[str, KeywordNote] = {}
material_images_store: Dict[str, MaterialImage] = {}
tasks_store: Dict[str, Task] = {}
event_reports_store: Dict[str, EventReport] = {}


def _touch_event(event: Event) -> Event:
    return event.model_copy(update={"updated_at": datetime.utcnow()})


def _touch_booth(booth: Booth) -> Booth:
    return booth.model_copy(update={"updated_at": datetime.utcnow()})


def _touch_target_company(target: TargetCompany) -> TargetCompany:
    return target.model_copy(update={"updated_at": datetime.utcnow()})


def _touch_visit_note(note: VisitNote) -> VisitNote:
    return note.model_copy(update={"updated_at": datetime.utcnow()})


def _touch_material(material: MaterialImage) -> MaterialImage:
    return material.model_copy(update={"updated_at": datetime.utcnow()})


def _touch_task(task: Task) -> Task:
    return task.model_copy(update={"updated_at": datetime.utcnow()})


def _require_event(event_id: str) -> Event:
    event = events_store.get(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="イベントが見つかりません")
    return event


def _require_target_company(target_company_id: str) -> TargetCompany:
    target = target_companies_store.get(target_company_id)
    if not target:
        raise HTTPException(status_code=404, detail="ターゲット企業が見つかりません")
    return target


def _require_visit_note(visit_note_id: str) -> VisitNote:
    note = visit_notes_store.get(visit_note_id)
    if not note:
        raise HTTPException(status_code=404, detail="来場ノートが見つかりません")
    return note


def _require_material(material_id: str) -> MaterialImage:
    material = material_images_store.get(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="資料画像が見つかりません")
    return material


def _require_task(task_id: str) -> Task:
    task = tasks_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    return task


def _require_keyword(keyword_note_id: str) -> KeywordNote:
    keyword_note = keyword_notes_store.get(keyword_note_id)
    if not keyword_note:
        raise HTTPException(status_code=404, detail="キーワードメモが見つかりません")
    return keyword_note


async def _generate_pre_research_report(
    event: Event, target: TargetCompany, request: PreResearchRequest
) -> str:
    focus_section = ""
    if request.focus_points:
        focus_section = "\n".join(f"- {point}" for point in request.focus_points)
        focus_section = f"\n# 注目したい観点\n{focus_section}\n"

    keywords_section = ""
    if request.keywords:
        keywords_section = (
            "\n# 深掘りキーワード\n"
            + ", ".join(request.keywords)
            + "\n"
        )

    scraped_section = ""
    scraped_data = event.scraped_data or {}
    scraped_items = []
    if isinstance(scraped_data, dict):
        scraped_items = scraped_data.get("items") or scraped_data.get("results") or []
    if scraped_items:
        lines = []
        for item in scraped_items[:10]:
            if isinstance(item, dict):
                text = item.get("text") or item.get("title") or ""
                href = item.get("href") or item.get("url")
                if text:
                    if href:
                        lines.append(f"- {text} ({href})")
                    else:
                        lines.append(f"- {text}")
            elif isinstance(item, str):
                lines.append(f"- {item}")
        if lines:
            scraped_section = "\n# 展示会サイトからの候補情報\n" + "\n".join(lines) + "\n"

    base_summary = f"""# 展示会情報
- 名称: {event.name}
- 会期: {event.start_date or '不明'} 〜 {event.end_date or '不明'}
- 会場: {event.location or '未入力'}

# ターゲット企業
- 名称: {target.name}
- ブース番号: {target.booth_code or '未登録'}
- 公式サイト: {target.website_url or '未登録'}
- 優先度: {target.priority or '未設定'}
- ハイライトタグ: {', '.join(target.highlight_tags) if target.highlight_tags else 'なし'}
- 既存メモ: {target.description or target.notes or '未入力'}
{scraped_section}{focus_section}{keywords_section}"""

    if request.custom_prompt:
        base_summary += f"\n# カスタム指示\n{request.custom_prompt}\n"

    if not GEMINI_API_KEY or not gemini_client:
        fallback = [
            f"### 企業概要の仮メモ\n- 公式サイト: {target.website_url or '未登録'}",
            "- 展示会で注目したいポイント: 既存メモを確認し、現地で特徴を聞き出しましょう。",
            "- 会話で確認したい質問案:\n  1. 現在注力しているプロジェクト\n  2. 課題感や導入検討状況\n  3. 展示会来場の目的",
        ]
        if request.focus_points:
            fallback.append(
                "- 追加フォーカス: " + ", ".join(request.focus_points)
            )
        if request.keywords:
            fallback.append("- 深掘りキーワード: " + ", ".join(request.keywords))
        return base_summary + "\n\n" + "\n".join(fallback)

    def _invoke():
        return gemini_client.models.generate_content(
            model="gemini-1.5-pro",
            contents=base_summary,
            config=types.GenerateContentConfig(temperature=0.4),
        )

    response = await run_in_threadpool(_invoke)
    if not response or not getattr(response, "text", None):
        raise HTTPException(status_code=500, detail="AIリサーチの生成に失敗しました")

    return response.text


async def _generate_keyword_suggestions(
    keyword_note: KeywordNote, additional_context: Optional[str] = None
) -> List[str]:
    context_block = ""
    if keyword_note.context:
        context_block += f"\n# 既存メモ\n{keyword_note.context}\n"
    if additional_context:
        context_block += f"\n# 追加コンテキスト\n{additional_context}\n"

    base_prompt = f"""あなたは展示会対応を支援する営業アシスタントです。
キーワード: {keyword_note.keyword}
{context_block}
# 指示
1. ブース訪問時に確認すると良い質問や深掘りポイントを3件提案してください。
2. 箇条書き（- を使用）で日本語で回答してください。
3. 事実確認が必要な事項があれば簡潔に記載してください。
"""

    if not GEMINI_API_KEY or not gemini_client:
        fallback = [
            f"- 「{keyword_note.keyword}」に関する直近の導入事例を確認する",
            f"- 既存システムとの連携や技術スタックについて質問する",
            "- 展示会後のフォローアップ資料やデモの提供可否を確認する",
        ]
        return fallback

    def _invoke():
        return gemini_client.models.generate_content(
            model="gemini-1.5-pro",
            contents=base_prompt,
            config=types.GenerateContentConfig(temperature=0.5),
        )

    response = await run_in_threadpool(_invoke)
    if not response or not getattr(response, "text", None):
        raise HTTPException(status_code=500, detail="AI提案の生成に失敗しました")

    lines = [
        line.strip("-• \t")
        for line in response.text.splitlines()
        if line.strip()
    ]
    return [line for line in lines if line]


async def _run_material_analysis(
    image: UploadedImage, prompt_hint: Optional[str] = None
) -> Dict[str, Any]:
    if not GEMINI_API_KEY or not gemini_client:
        return {
            "ocr_text": None,
            "ai_summary": None,
            "tags": [],
        }

    prompt = """あなたは展示会で集めた資料を整理するアシスタントです。
以下の画像から読み取れる文字情報をOCRとして抽出し、要点を最大3行の箇条書きで要約し、関連しそうなタグを3件まで提案してください。
出力は以下のJSON形式で、必ず日本語で記載してください。マークダウンは使用せず、JSON文字列のみを返してください。
{
  "ocr_text": "資料から読み取れた文字列を可能な範囲で全文",
  "summary": [
    "要約ポイント1",
    "要約ポイント2"
  ],
  "tags": ["タグ1", "タグ2"]
}
"""
    if prompt_hint:
        prompt += f"\n参考ヒント: {prompt_hint}\n"

    try:
        base64_data = image.content_base64
        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]
        image_bytes = base64.b64decode(base64_data)
    except Exception as decode_error:
        raise HTTPException(
            status_code=400, detail=f"画像データのデコードに失敗しました: {decode_error}"
        )

    def _invoke():
        return gemini_client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=image_bytes, mime_type=image.media_type or "image/jpeg"
                ),
            ],
            config=types.GenerateContentConfig(temperature=0.2),
        )

    response = await run_in_threadpool(_invoke)
    if not response or not getattr(response, "text", None):
        raise HTTPException(status_code=500, detail="資料画像の解析に失敗しました")

    try:
        result = json.loads(response.text)
        summary = result.get("summary")
        if isinstance(summary, list):
            summary_text = "\n".join(str(item) for item in summary)
        elif isinstance(summary, str):
            summary_text = summary
        else:
            summary_text = None
        tags = result.get("tags")
        if isinstance(tags, list):
            tags_list = [str(tag) for tag in tags if tag]
        elif isinstance(tags, str) and tags:
            tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        else:
            tags_list = []
        return {
            "ocr_text": result.get("ocr_text"),
            "ai_summary": summary_text,
            "tags": tags_list,
        }
    except json.JSONDecodeError:
        # JSONパースに失敗した場合はそのままテキストを返却
        return {
            "ocr_text": response.text,
            "ai_summary": None,
            "tags": [],
        }


def _collect_event_data(event_id: str) -> Dict[str, Any]:
    targets = [
        target
        for target in target_companies_store.values()
        if target.event_id == event_id
    ]
    notes = [
        note for note in visit_notes_store.values() if note.event_id == event_id
    ]
    materials = [
        material
        for material in material_images_store.values()
        if material.event_id == event_id
    ]
    tasks = [task for task in tasks_store.values() if task.event_id == event_id]
    keywords = [
        keyword
        for keyword in keyword_notes_store.values()
        if keyword.event_id == event_id
    ]
    reports = [
        report for report in event_reports_store.values() if report.event_id == event_id
    ]

    metrics = {
        "target_company_count": len(targets),
        "highlight_target_count": len([t for t in targets if t.highlight]),
        "visit_note_count": len(notes),
        "highlight_note_count": len([n for n in notes if n.highlight]),
        "material_count": len(materials),
        "task_count": len(tasks),
        "open_task_count": len([t for t in tasks if t.status != "completed"]),
        "completed_task_count": len([t for t in tasks if t.status == "completed"]),
        "keyword_count": len(keywords),
    }

    return {
        "targets": targets,
        "notes": notes,
        "materials": materials,
        "tasks": tasks,
        "keywords": keywords,
        "reports": reports,
        "metrics": metrics,
    }


async def _generate_event_report_markdown(
    event: Event, data: Dict[str, Any], request: EventReportRequest
) -> str:
    metrics = data["metrics"]
    targets: List[TargetCompany] = data["targets"]
    notes: List[VisitNote] = data["notes"]
    materials: List[MaterialImage] = data["materials"]
    tasks: List[Task] = data["tasks"]
    keywords: List[KeywordNote] = data["keywords"]

    def _format_datetime(dt: Optional[datetime]) -> str:
        if not dt:
            return ""
        return dt.strftime("%Y-%m-%d %H:%M")

    target_section = "\n".join(
        [
            f"- {target.name} (優先度: {target.priority or '未設定'}, ハイライト: {'Yes' if target.highlight else 'No'})"
            + (
                f"\n  リサーチ: {target.research_summary}"
                if target.research_summary
                else ""
            )
            + (
                f"\n  AIレポート: {target.ai_research[:200]}..."
                if target.ai_research and len(target.ai_research) > 200
                else (
                    f"\n  AIレポート: {target.ai_research}"
                    if target.ai_research
                    else ""
                )
            )
        ]
    )

    highlighted_notes = sorted(
        [note for note in notes if note.highlight],
        key=lambda n: n.created_at,
        reverse=True,
    )
    note_section = "\n".join(
        [
            f"- [{note.note_type}] {note.title or note.content[:30]} "
            f"({ _format_datetime(note.created_at)} 作成)"
            + (
                f"\n  メモ: {note.content[:200]}"
                if note.content
                else ""
            )
            + (
                f"\n  キーワード: {', '.join(note.keywords)}"
                if note.keywords
                else ""
            )
        ]
    )

    material_section = "\n".join(
        [
            f"- {material.caption or '資料'} (OCRあり: {'Yes' if material.ocr_text else 'No'})"
            + (
                f"\n  要約: {material.ai_summary}"
                if material.ai_summary
                else ""
            )
            + (
                f"\n  タグ: {', '.join(material.tags)}"
                if material.tags
                else ""
            )
        ]
    )

    open_tasks = [task for task in tasks if task.status != "completed"]
    task_section = "\n".join(
        [
            f"- {task.title} (ステータス: {task.status}, 期限: {task.due_date or '未設定'})"
            + (f"\n  詳細: {task.description}" if task.description else "")
        ]
    )

    keyword_section = "\n".join(
        [
            f"- {keyword.keyword} (ステータス: {keyword.status})"
            + (
                f"\n  提案: {', '.join(keyword.ai_suggestions)}"
                if keyword.ai_suggestions
                else ""
            )
        ]
    )

    include_sections_text = ""
    if request.include_sections:
        include_sections_text = (
            "出力には以下のセクションを含めてください: "
            + ", ".join(request.include_sections)
            + "\n"
        )

    custom_prompt_text = request.custom_prompt or ""

    context = f"""# イベント概要
- 名称: {event.name}
- 会期: {event.start_date or '未設定'} 〜 {event.end_date or '未設定'}
- 会場: {event.location or '未入力'}
- 公式サイト: {event.event_website_url or 'なし'}
- 概要メモ: {event.description or '未入力'}

# KPIサマリー
- ターゲット企業数: {metrics['target_company_count']} (ハイライト: {metrics['highlight_target_count']})
- 来場ノート数: {metrics['visit_note_count']} (ハイライト: {metrics['highlight_note_count']})
- 資料枚数: {metrics['material_count']}
- タスク: {metrics['open_task_count']}件が未完了 / {metrics['task_count']}件中
- キーワードメモ: {metrics['keyword_count']} 件

# ターゲット企業
{target_section or '- まだ登録されていません'}

# ハイライトノート
{note_section or '- ハイライトされたノートはまだありません'}

# 資料まとめ
{material_section or '- 資料はまだ登録されていません'}

# タスク
{task_section or '- タスクはまだ登録されていません'}

# キーワードメモ
{keyword_section or '- キーワードメモはまだ登録されていません'}

{include_sections_text}
{custom_prompt_text}
"""

    if not GEMINI_API_KEY or not gemini_client:
        fallback = f"""# {event.name} 展示会レポート（ドラフト）

## 概要
- 会期: {event.start_date or '未設定'} 〜 {event.end_date or '未設定'}
- 会場: {event.location or '未入力'}

## ハイライト
- ターゲット企業数: {metrics['target_company_count']}
- 来場ノート: {metrics['visit_note_count']} 件
- 未完了タスク: {metrics['open_task_count']} 件

## 次のアクション
- ターゲット企業の事前調査を確認し、優先度順にアプローチ
- ハイライトノートのフォローアップ
- 未完了タスクの担当割り振りと期限調整
"""
        if request.focus_points:
            fallback += "\n### 注目する観点\n" + "\n".join(
                f"- {point}" for point in request.focus_points
            )
        return fallback

    def _invoke():
        return gemini_client.models.generate_content(
            model="gemini-1.5-pro",
            contents=context,
            config=types.GenerateContentConfig(
                temperature=0.3,
                top_p=0.8,
            ),
        )

    response = await run_in_threadpool(_invoke)
    if not response or not getattr(response, "text", None):
        raise HTTPException(status_code=500, detail="レポート生成に失敗しました")

    return response.text


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


@app.post("/events", response_model=Event, status_code=201)
async def create_event(payload: EventCreate):
    now = datetime.utcnow()
    event_data = payload.model_dump()
    highlight_tags = event_data.pop("highlight_tags", None) or []
    event = Event(
        event_id=str(uuid4()),
        created_at=now,
        updated_at=now,
        highlight_tags=highlight_tags,
        **event_data
    )
    events_store[event.event_id] = event
    return event


@app.get("/events", response_model=List[Event])
async def list_events():
    return list(events_store.values())


@app.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = events_store.get(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="イベントが見つかりません")
    return event


@app.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, payload: EventUpdate):
    current = events_store.get(event_id)
    if not current:
        raise HTTPException(status_code=404, detail="イベントが見つかりません")

    update_data = payload.model_dump(exclude_unset=True)
    if "highlight_tags" in update_data and update_data["highlight_tags"] is None:
        update_data["highlight_tags"] = []
    updated = current.model_copy(update=update_data)
    updated = updated.model_copy(update={"updated_at": datetime.utcnow()})
    events_store[event_id] = updated
    return updated


@app.post("/events/{event_id}/scrape", response_model=Event)
async def scrape_event(event_id: str, payload: ScrapeRequest):
    event = _require_event(event_id)

    selectors = payload.selectors or ["a.exhibitor", "li", "a"]
    items: List[Dict[str, Any]] = []
    notes: Optional[str] = None

    if payload.source_html:
        soup = BeautifulSoup(payload.source_html, "html.parser")
        seen_texts = set()
        for selector in selectors:
            for element in soup.select(selector):
                text = element.get_text(strip=True)
                if not text:
                    continue
                key = (selector, text)
                if key in seen_texts:
                    continue
                seen_texts.add(key)
                entry: Dict[str, Any] = {
                    "text": text,
                    "selector": selector,
                }
                if payload.include_links:
                    href = element.get("href")
                    if href:
                        entry["href"] = href
                items.append(entry)
                if len(items) >= payload.limit:
                    break
            if len(items) >= payload.limit:
                break
        if not items:
            notes = "指定されたセレクタでは情報を抽出できませんでした。セレクタを調整してください。"
    else:
        notes = "source_htmlが提供されなかったため、サーバー側での取得はスキップされました。HTMLを渡すか、外部ジョブでスクレイピングした結果を登録してください。"

    scrape_result = ScrapeResult(
        parsed_at=datetime.utcnow(),
        selectors=selectors,
        items=items,
        source_url=payload.source_url or event.event_website_url,
        notes=notes,
    )

    updated_event = event.model_copy(
        update={
            "event_website_url": payload.source_url or event.event_website_url,
            "scraped_data": scrape_result.model_dump(mode="json"),
            "updated_at": datetime.utcnow(),
        }
    )
    events_store[event_id] = updated_event
    return updated_event


@app.post("/booths", response_model=Booth, status_code=201)
async def create_booth(payload: BoothCreate):
    event = events_store.get(payload.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="紐づくイベントが見つかりません")

    now = datetime.utcnow()
    booth = Booth(
        booth_id=str(uuid4()),
        created_at=now,
        updated_at=now,
        **payload.model_dump()
    )
    booths_store[booth.booth_id] = booth
    return booth


@app.get("/booths", response_model=List[Booth])
async def list_booths(event_id: Optional[str] = None):
    if event_id:
        if event_id not in events_store:
            raise HTTPException(status_code=404, detail="イベントが見つかりません")
        return [booth for booth in booths_store.values() if booth.event_id == event_id]
    return list(booths_store.values())


@app.get("/booths/{booth_id}", response_model=Booth)
async def get_booth(booth_id: str):
    booth = booths_store.get(booth_id)
    if not booth:
        raise HTTPException(status_code=404, detail="ブースが見つかりません")
    return booth


@app.put("/booths/{booth_id}", response_model=Booth)
async def update_booth(booth_id: str, payload: BoothUpdate):
    current = booths_store.get(booth_id)
    if not current:
        raise HTTPException(status_code=404, detail="ブースが見つかりません")

    update_data = payload.model_dump(exclude_unset=True)

    # event_idが更新される場合は存在確認
    if "event_id" in update_data:
        new_event_id = update_data["event_id"]
        if new_event_id and new_event_id not in events_store:
            raise HTTPException(status_code=404, detail="紐づくイベントが見つかりません")

    updated = current.model_copy(update=update_data)
    updated = updated.model_copy(update={"updated_at": datetime.utcnow()})
    booths_store[booth_id] = updated
    return updated


@app.get("/events/{event_id}/booths", response_model=List[Booth])
async def list_booths_for_event(event_id: str):
    if event_id not in events_store:
        raise HTTPException(status_code=404, detail="イベントが見つかりません")
    return [booth for booth in booths_store.values() if booth.event_id == event_id]


@app.post("/upload/image", response_model=UploadImageResponse, status_code=201)
async def upload_image(payload: UploadImageRequest):
    image_id = str(uuid4())
    media_type = payload.media_type or "image/jpeg"
    uploaded = UploadedImage(
        image_id=image_id,
        filename=payload.filename,
        media_type=media_type,
        content_base64=payload.content_base64,
        metadata=payload.metadata or {},
        created_at=datetime.utcnow(),
    )
    uploaded_images_store[image_id] = uploaded
    return UploadImageResponse(image_id=image_id, filename=payload.filename, media_type=media_type)


@app.get("/upload/image/{image_id}", response_model=UploadedImage)
async def get_uploaded_image(image_id: str):
    image = uploaded_images_store.get(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="画像が見つかりません")
    return image


@app.post("/events/{event_id}/notes", response_model=VisitNote, status_code=201)
async def create_visit_note(event_id: str, payload: VisitNoteBase):
    _require_event(event_id)
    if payload.target_company_id:
        _require_target_company(payload.target_company_id)

    # 添付画像の存在確認
    for image_id in payload.image_ids:
        if image_id not in uploaded_images_store:
            raise HTTPException(
                status_code=404, detail=f"添付画像が見つかりません: {image_id}"
            )

    now = datetime.utcnow()
    data = payload.model_dump()
    data["event_id"] = event_id
    note = VisitNote(
        visit_note_id=str(uuid4()),
        created_at=now,
        updated_at=now,
        **data,
    )
    visit_notes_store[note.visit_note_id] = note
    return note


@app.get("/events/{event_id}/notes", response_model=List[VisitNote])
async def list_visit_notes(
    event_id: str,
    note_type: Optional[NoteType] = None,
    highlight_only: bool = False,
    target_company_id: Optional[str] = None,
):
    _require_event(event_id)
    notes = [
        note for note in visit_notes_store.values() if note.event_id == event_id
    ]
    if note_type:
        notes = [note for note in notes if note.note_type == note_type]
    if highlight_only:
        notes = [note for note in notes if note.highlight]
    if target_company_id:
        notes = [note for note in notes if note.target_company_id == target_company_id]
    notes.sort(key=lambda note: note.created_at, reverse=True)
    return notes


@app.get("/visit-notes/{visit_note_id}", response_model=VisitNote)
async def get_visit_note(visit_note_id: str):
    return _require_visit_note(visit_note_id)


@app.put("/visit-notes/{visit_note_id}", response_model=VisitNote)
async def update_visit_note(visit_note_id: str, payload: VisitNoteUpdate):
    note = _require_visit_note(visit_note_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "event_id" in update_data and update_data["event_id"]:
        _require_event(update_data["event_id"])
    if "target_company_id" in update_data and update_data["target_company_id"]:
        _require_target_company(update_data["target_company_id"])
    if "image_ids" in update_data and update_data["image_ids"]:
        for image_id in update_data["image_ids"]:
            if image_id not in uploaded_images_store:
                raise HTTPException(
                    status_code=404, detail=f"添付画像が見つかりません: {image_id}"
                )

    updated = note.model_copy(update=update_data)
    updated = _touch_visit_note(updated)
    visit_notes_store[visit_note_id] = updated
    return updated


@app.delete("/visit-notes/{visit_note_id}", status_code=204)
async def delete_visit_note(visit_note_id: str):
    if visit_note_id not in visit_notes_store:
        raise HTTPException(status_code=404, detail="来場ノートが見つかりません")
    del visit_notes_store[visit_note_id]
    return None


@app.post("/events/{event_id}/keywords", response_model=KeywordNote, status_code=201)
async def create_keyword_note(event_id: str, payload: KeywordNoteBase):
    _require_event(event_id)
    if payload.target_company_id:
        _require_target_company(payload.target_company_id)

    now = datetime.utcnow()
    data = payload.model_dump()
    data["event_id"] = event_id
    keyword_note = KeywordNote(
        keyword_note_id=str(uuid4()),
        created_at=now,
        updated_at=now,
        **data,
    )
    keyword_notes_store[keyword_note.keyword_note_id] = keyword_note
    return keyword_note


@app.get("/events/{event_id}/keywords", response_model=List[KeywordNote])
async def list_keyword_notes(
    event_id: str, status: Optional[Literal["open", "resolved"]] = None
):
    _require_event(event_id)
    notes = [
        note for note in keyword_notes_store.values() if note.event_id == event_id
    ]
    if status:
        notes = [note for note in notes if note.status == status]
    notes.sort(key=lambda note: note.created_at, reverse=True)
    return notes


@app.get("/keywords/{keyword_note_id}", response_model=KeywordNote)
async def get_keyword_note(keyword_note_id: str):
    return _require_keyword(keyword_note_id)


@app.put("/keywords/{keyword_note_id}", response_model=KeywordNote)
async def update_keyword_note(keyword_note_id: str, payload: KeywordNoteUpdate):
    keyword_note = _require_keyword(keyword_note_id)
    update_data = payload.model_dump(exclude_unset=True)
    if "event_id" in update_data and update_data["event_id"]:
        _require_event(update_data["event_id"])
    if "target_company_id" in update_data and update_data["target_company_id"]:
        _require_target_company(update_data["target_company_id"])

    updated = keyword_note.model_copy(update=update_data)
    updated = updated.model_copy(update={"updated_at": datetime.utcnow()})
    keyword_notes_store[keyword_note_id] = updated
    return updated


@app.delete("/keywords/{keyword_note_id}", status_code=204)
async def delete_keyword_note(keyword_note_id: str):
    if keyword_note_id not in keyword_notes_store:
        raise HTTPException(status_code=404, detail="キーワードメモが見つかりません")
    del keyword_notes_store[keyword_note_id]
    return None


@app.post(
    "/keywords/{keyword_note_id}/suggest",
    response_model=KeywordSuggestionResponse,
)
async def suggest_for_keyword(
    keyword_note_id: str, payload: KeywordSuggestionRequest = KeywordSuggestionRequest()
):
    keyword_note = _require_keyword(keyword_note_id)
    suggestions = await _generate_keyword_suggestions(
        keyword_note, payload.additional_context
    )
    updated = keyword_note.model_copy(
        update={
            "ai_suggestions": suggestions,
            "updated_at": datetime.utcnow(),
        }
    )
    keyword_notes_store[keyword_note_id] = updated
    return KeywordSuggestionResponse(suggestions=suggestions)


@app.post(
    "/events/{event_id}/materials",
    response_model=MaterialImage,
    status_code=201,
)
async def create_material_image(event_id: str, payload: MaterialImageCreate):
    _require_event(event_id)
    if payload.target_company_id:
        _require_target_company(payload.target_company_id)
    if payload.visit_note_id:
        _require_visit_note(payload.visit_note_id)

    uploaded_image = uploaded_images_store.get(payload.image_id)
    if not uploaded_image:
        raise HTTPException(status_code=404, detail="紐づく画像が見つかりません")

    data = payload.model_dump()
    auto_ocr = data.pop("auto_ocr", False)
    prompt_hint = data.pop("prompt_hint", None)
    data["event_id"] = event_id

    if auto_ocr:
        analysis = await _run_material_analysis(uploaded_image, prompt_hint)
        if analysis.get("ocr_text") and not data.get("ocr_text"):
            data["ocr_text"] = analysis.get("ocr_text")
        if analysis.get("ai_summary") and not data.get("ai_summary"):
            data["ai_summary"] = analysis.get("ai_summary")
        if analysis.get("tags") and not data.get("tags"):
            data["tags"] = analysis.get("tags")

    now = datetime.utcnow()
    material = MaterialImage(
        material_id=str(uuid4()),
        created_at=now,
        updated_at=now,
        **data,
    )
    material_images_store[material.material_id] = material
    return material


@app.get("/events/{event_id}/materials", response_model=List[MaterialImage])
async def list_material_images(event_id: str, target_company_id: Optional[str] = None):
    _require_event(event_id)
    materials = [
        material
        for material in material_images_store.values()
        if material.event_id == event_id
    ]
    if target_company_id:
        materials = [
            material
            for material in materials
            if material.target_company_id == target_company_id
        ]
    materials.sort(key=lambda material: material.created_at, reverse=True)
    return materials


@app.get("/materials/{material_id}", response_model=MaterialImage)
async def get_material_image(material_id: str):
    return _require_material(material_id)


@app.put("/materials/{material_id}", response_model=MaterialImage)
async def update_material_image(
    material_id: str, payload: MaterialImageUpdate
):
    material = _require_material(material_id)
    update_data = payload.model_dump(exclude_unset=True)
    if "target_company_id" in update_data and update_data["target_company_id"]:
        _require_target_company(update_data["target_company_id"])
    if "visit_note_id" in update_data and update_data["visit_note_id"]:
        _require_visit_note(update_data["visit_note_id"])

    updated = material.model_copy(update=update_data)
    updated = _touch_material(updated)
    material_images_store[material_id] = updated
    return updated


@app.delete("/materials/{material_id}", status_code=204)
async def delete_material_image(material_id: str):
    if material_id not in material_images_store:
        raise HTTPException(status_code=404, detail="資料画像が見つかりません")
    del material_images_store[material_id]
    return None


@app.post("/events/{event_id}/tasks", response_model=Task, status_code=201)
async def create_task(event_id: str, payload: TaskCreate):
    _require_event(event_id)
    if payload.target_company_id:
        _require_target_company(payload.target_company_id)
    if payload.visit_note_id:
        _require_visit_note(payload.visit_note_id)

    now = datetime.utcnow()
    data = payload.model_dump()
    data["event_id"] = event_id
    task = Task(
        task_id=str(uuid4()),
        created_at=now,
        updated_at=now,
        **data,
    )
    tasks_store[task.task_id] = task
    return task


@app.get("/events/{event_id}/tasks", response_model=List[Task])
async def list_tasks(
    event_id: str,
    status: Optional[Literal["open", "in_progress", "completed"]] = None,
    target_company_id: Optional[str] = None,
):
    _require_event(event_id)
    tasks = [task for task in tasks_store.values() if task.event_id == event_id]
    if status:
        tasks = [task for task in tasks if task.status == status]
    if target_company_id:
        tasks = [
            task for task in tasks if task.target_company_id == target_company_id
        ]
    tasks.sort(key=lambda task: task.created_at, reverse=True)
    return tasks


@app.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    return _require_task(task_id)


@app.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate):
    task = _require_task(task_id)
    update_data = payload.model_dump(exclude_unset=True)
    if "target_company_id" in update_data and update_data["target_company_id"]:
        _require_target_company(update_data["target_company_id"])
    if "visit_note_id" in update_data and update_data["visit_note_id"]:
        _require_visit_note(update_data["visit_note_id"])

    updated = task.model_copy(update=update_data)
    updated = _touch_task(updated)
    tasks_store[task_id] = updated
    return updated


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str):
    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    del tasks_store[task_id]
    return None


@app.get("/events/{event_id}/summary", response_model=EventSummaryResponse)
async def get_event_summary(event_id: str):
    event = _require_event(event_id)
    data = _collect_event_data(event_id)

    highlights = EventSummaryHighlights(
        highlight_notes=sorted(
            [note for note in data["notes"] if note.highlight],
            key=lambda note: note.created_at,
            reverse=True,
        )[:10],
        highlight_companies=[
            target for target in data["targets"] if target.highlight
        ],
        pending_tasks=[
            task for task in data["tasks"] if task.status != "completed"
        ],
    )

    recent_materials = sorted(
        data["materials"], key=lambda material: material.created_at, reverse=True
    )[:8]
    keyword_notes = sorted(
        data["keywords"], key=lambda keyword: keyword.created_at, reverse=True
    )[:20]

    last_report = None
    if data["reports"]:
        last_report = max(
            data["reports"],
            key=lambda report: report.updated_at,
        )

    return EventSummaryResponse(
        event=event,
        metrics=data["metrics"],
        highlights=highlights,
        recent_materials=recent_materials,
        keyword_notes=keyword_notes,
        last_report=last_report,
    )


@app.get("/events/{event_id}/reports", response_model=List[EventReport])
async def list_event_reports(event_id: str):
    _require_event(event_id)
    reports = [
        report for report in event_reports_store.values() if report.event_id == event_id
    ]
    reports.sort(key=lambda report: report.created_at, reverse=True)
    return reports


@app.get("/event-reports/{report_id}", response_model=EventReport)
async def get_event_report(report_id: str):
    report = event_reports_store.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="イベントレポートが見つかりません")
    return report


@app.post(
    "/events/{event_id}/generate-report",
    response_model=EventReport,
    status_code=201,
)
async def generate_event_report(event_id: str, request: EventReportRequest):
    event = _require_event(event_id)
    data = _collect_event_data(event_id)

    report_id = str(uuid4())
    now = datetime.utcnow()
    report = EventReport(
        report_id=report_id,
        event_id=event_id,
        status="processing",
        content=None,
        metadata={"focus_points": request.focus_points, "include_sections": request.include_sections},
        created_at=now,
        updated_at=now,
    )
    event_reports_store[report_id] = report

    try:
        content = await _generate_event_report_markdown(event, data, request)
        updated = report.model_copy(
            update={
                "status": "completed",
                "content": content,
                "updated_at": datetime.utcnow(),
            }
        )
    except Exception as exc:
        print(f"Event report generation failed: {exc}")
        updated = report.model_copy(
            update={
                "status": "failed",
                "content": f"レポート生成に失敗しました: {exc}",
                "updated_at": datetime.utcnow(),
            }
        )

    event_reports_store[report_id] = updated
    return updated
@app.post("/target-companies", response_model=TargetCompany, status_code=201)
async def create_target_company(payload: TargetCompanyCreate):
    _require_event(payload.event_id)
    now = datetime.utcnow()
    data = payload.model_dump()
    highlight_tags = data.pop("highlight_tags", None) or []
    target = TargetCompany(
        target_company_id=str(uuid4()),
        created_at=now,
        updated_at=now,
        highlight_tags=highlight_tags,
        **data,
    )
    target_companies_store[target.target_company_id] = target
    return target


@app.get("/target-companies", response_model=List[TargetCompany])
async def list_target_companies(event_id: Optional[str] = None):
    if event_id:
        _require_event(event_id)
        return [
            target
            for target in target_companies_store.values()
            if target.event_id == event_id
        ]
    return list(target_companies_store.values())


@app.get("/target-companies/{target_company_id}", response_model=TargetCompany)
async def get_target_company(target_company_id: str):
    return _require_target_company(target_company_id)


@app.put("/target-companies/{target_company_id}", response_model=TargetCompany)
async def update_target_company(target_company_id: str, payload: TargetCompanyUpdate):
    target = _require_target_company(target_company_id)
    update_data = payload.model_dump(exclude_unset=True)
    if "event_id" in update_data and update_data["event_id"]:
        _require_event(update_data["event_id"])
    if "highlight_tags" in update_data and update_data["highlight_tags"] is None:
        update_data["highlight_tags"] = []
    updated = target.model_copy(update=update_data)
    updated = _touch_target_company(updated)
    target_companies_store[target_company_id] = updated
    return updated


@app.delete("/target-companies/{target_company_id}", status_code=204)
async def delete_target_company(target_company_id: str):
    if target_company_id not in target_companies_store:
        raise HTTPException(status_code=404, detail="ターゲット企業が見つかりません")
    # 関連するノートやタスクの参照をクリーンアップ
    for note in list(visit_notes_store.values()):
        if note.target_company_id == target_company_id:
            updated_note = note.model_copy(update={"target_company_id": None})
            visit_notes_store[note.visit_note_id] = updated_note
    for keyword_note in list(keyword_notes_store.values()):
        if keyword_note.target_company_id == target_company_id:
            updated_keyword = keyword_note.model_copy(update={"target_company_id": None})
            keyword_notes_store[keyword_note.keyword_note_id] = updated_keyword
    for material in list(material_images_store.values()):
        if material.target_company_id == target_company_id:
            updated_material = material.model_copy(update={"target_company_id": None})
            material_images_store[material.material_id] = updated_material
    for task in list(tasks_store.values()):
        if task.target_company_id == target_company_id:
            updated_task = task.model_copy(update={"target_company_id": None})
            tasks_store[task.task_id] = updated_task
    del target_companies_store[target_company_id]
    return None


@app.post(
    "/target-companies/{target_company_id}/pre-research",
    response_model=TargetCompany,
)
async def run_pre_research(target_company_id: str, request: PreResearchRequest):
    target = _require_target_company(target_company_id)
    event = _require_event(target.event_id)

    if target.ai_research and not request.force_refresh:
        return target

    processing = target.model_copy(
        update={"pre_research_status": "processing", "updated_at": datetime.utcnow()}
    )
    target_companies_store[target_company_id] = processing

    try:
        report = await _generate_pre_research_report(event, target, request)
        summary_line = next(
            (line for line in report.splitlines() if line.strip()), ""
        )
        updated = processing.model_copy(
            update={
                "ai_research": report,
                "research_summary": summary_line[:200],
                "pre_research_status": "completed",
                "updated_at": datetime.utcnow(),
            }
        )
    except Exception as exc:
        print(f"Pre-research failed for {target_company_id}: {exc}")
        updated = processing.model_copy(
            update={
                "pre_research_status": f"failed: {exc}",
                "updated_at": datetime.utcnow(),
            }
        )

    target_companies_store[target_company_id] = updated
    return updated


@app.post(
    "/events/{event_id}/target-companies/pre-research",
    response_model=List[TargetCompany],
)
async def batch_pre_research(event_id: str, request: BatchPreResearchRequest):
    _require_event(event_id)
    targets = [
        target
        for target in target_companies_store.values()
        if target.event_id == event_id
    ]

    if request.target_company_ids:
        requested_ids = set(request.target_company_ids)
        targets = [target for target in targets if target.target_company_id in requested_ids]
        missing = requested_ids - {t.target_company_id for t in targets}
        if missing:
            raise HTTPException(
                status_code=404,
                detail=f"指定したターゲット企業が見つかりません: {', '.join(missing)}",
            )

    updated_targets: List[TargetCompany] = []
    for target in targets:
        updated = await run_pre_research(target.target_company_id, request)
        updated_targets.append(updated)

    return updated_targets


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
        raw_image_base64 = (request.image_base64 or "").strip()
        if not raw_image_base64:
            raise HTTPException(status_code=400, detail="画像データが空です。")

        if ',' in raw_image_base64:
            _, image_base64 = raw_image_base64.split(',', 1)
        else:
            image_base64 = raw_image_base64

        try:
            image_data = base64.b64decode(image_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail="画像データのBase64デコードに失敗しました。形式を確認してください。",
            ) from exc

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
