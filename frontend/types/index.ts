// データベーススキーマに基づいた型定義

export type ISODateString = string;

export interface ScrapeResultItem {
  text: string;
  selector?: string;
  href?: string;
  url?: string;
}

export interface ScrapeResult {
  parsed_at: ISODateString;
  selectors: string[];
  items: ScrapeResultItem[];
  source_url?: string | null;
  notes?: string | null;
}

// 展示会
export interface Event {
  event_id: string;
  name: string;
  start_date?: ISODateString | null;
  end_date?: ISODateString | null;
  location?: string | null;
  description?: string | null;
  event_website_url?: string | null;
  scraped_data?: ScrapeResult | null;
  highlight_tags: string[];
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface EventDraft
  extends Omit<
    Event,
    'event_id' | 'highlight_tags' | 'created_at' | 'updated_at'
  > {
  highlight_tags?: string[];
}

// ブース
export interface Booth {
  booth_id: string;
  event_id: string;
  name: string;
  booth_code?: string | null;
  location?: string | null;
  contact_persons: string[];
  focus_products: string[];
  highlight_tags: string[];
  pre_research_status?: string | null;
  memo?: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface BoothDraft
  extends Omit<Booth, 'booth_id' | 'created_at' | 'updated_at'> {}

export type TargetPriority = 'high' | 'medium' | 'low';

export interface TargetCompany {
  target_company_id: string;
  event_id: string;
  name: string;
  website_url?: string | null;
  description?: string | null;
  booth_code?: string | null;
  priority?: TargetPriority | string | null;
  highlight_tags: string[];
  pre_research_status?: string | null;
  research_summary?: string | null;
  notes?: string | null;
  scraped_context?: Record<string, unknown> | null;
  ai_research?: string | null;
  highlight: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface TargetCompanyDraft
  extends Omit<TargetCompany, 'target_company_id' | 'created_at' | 'updated_at' | 'highlight' | 'highlight_tags'> {
  highlight?: boolean;
  highlight_tags?: string[];
}

export type NoteType =
  | 'conversation'
  | 'demo'
  | 'material'
  | 'question'
  | 'followup'
  | 'other';

export interface VisitNote {
  visit_note_id: string;
  event_id: string;
  target_company_id?: string | null;
  title?: string | null;
  note_type: NoteType;
  content: string;
  image_ids: string[];
  keywords: string[];
  highlight: boolean;
  created_by?: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface VisitNoteDraft
  extends Omit<
    VisitNote,
    'visit_note_id' | 'created_at' | 'updated_at' | 'highlight'
  > {
  highlight?: boolean;
}

export type KeywordStatus = 'open' | 'resolved';

export interface KeywordNote {
  keyword_note_id: string;
  event_id: string;
  target_company_id?: string | null;
  keyword: string;
  context?: string | null;
  ai_suggestions: string[];
  status: KeywordStatus;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface KeywordNoteDraft
  extends Omit<KeywordNote, 'keyword_note_id' | 'created_at' | 'updated_at'> {}

export interface MaterialImage {
  material_id: string;
  event_id: string;
  target_company_id?: string | null;
  visit_note_id?: string | null;
  image_id: string;
  caption?: string | null;
  tags: string[];
  ocr_text?: string | null;
  ai_summary?: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface MaterialImageDraft
  extends Omit<MaterialImage, 'material_id' | 'created_at' | 'updated_at'> {}

export type TaskStatus = 'open' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  task_id: string;
  event_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  due_date?: ISODateString | null;
  target_company_id?: string | null;
  visit_note_id?: string | null;
  source?: string | null;
  priority?: TaskPriority | string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface TaskDraft
  extends Omit<
    Task,
    'task_id' | 'created_at' | 'updated_at' | 'status' | 'priority'
  > {
  status?: TaskStatus;
  priority?: TaskPriority | string | null;
}

export interface EventReport {
  report_id: string;
  event_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface UploadedImage {
  image_id: string;
  filename: string;
  media_type: string;
  content_base64: string;
  metadata: Record<string, unknown>;
  created_at: ISODateString;
}

export interface BusinessCardLinkage {
  event_id?: string | null;
  booth_id?: string | null;
  visit_notes?: string | null;
  highlight?: boolean;
}

export interface MeetingVisitContext {
  event_id?: string | null;
  booth_id?: string | null;
  booth_visit_memo?: string | null;
  followup_tasks?: string[];
}

// ユーザー
export interface User {
  user_id: string;
  name: string;
  email: string;
  created_at: Date;
}

// 名刺情報
export interface BusinessCard {
  card_id: string;
  user_id: string;
  image_url: string;
  company_name: string;
  departments: string[] | null;
  titles: string[] | null;
  full_name: string;
  name_reading?: string;
  email?: string;
  company_url?: string;
  address?: string;
  event_id?: string | null;
  booth_id?: string | null;
  highlight?: boolean;
  visit_notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

// 名刺OCRスキャン結果
export interface CardScanResult {
  company_name: string | null;
  departments: string[] | null;
  titles: string[] | null;
  full_name: string | null;
  name_reading: string | null;
  email: string | null;
  company_url: string | null;
  address: string | null;
}

// 商談メモ（アンケート）
export interface Meeting {
  meeting_id: string;
  card_id: string;
  event_id?: string | null;
  booth_id?: string | null;
  q1_demo: string[] | null; // 複数選択
  q2_needs: string[] | null; // 複数選択
  q3_background: string; // 単一選択 A/B/C/D
  q3_background_memo?: string; // Aを選択時の自由記述
  q4_heat_level: 'A' | 'B' | 'C' | 'D'; // 単一選択
  q5_potential: '高' | '中' | '低' | '不明'; // 単一選択
  q6_timeframe?: 'すぐにでも' | '半年以内' | '1年以内' | '未定'; // Q5が「高」の場合のみ
  q7_next_action: string; // 単一選択
  q7_action_date?: ISODateString | null; // 「アポ設定済み」の場合の日付
  memo?: string; // 特記事項・会話メモ
  booth_visit_memo?: string | null;
  followup_tasks?: string[];
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Deepリサーチレポート
export interface Report {
  report_id: string;
  card_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: string; // Markdown形式
  created_at: Date;
  updated_at: Date;
}

// アンケート選択肢
export const DEMO_OPTIONS = [
  'デモA: AI画像認識ソリューション',
  'デモB: 高速データ処理基盤',
  'デモC: AR/MRシミュレーション',
  'デモD: その他',
] as const;

export const NEEDS_OPTIONS = [
  '既存業務の自動化・効率化',
  '新規事業・サービスのアイディア実現',
  'データ活用・分析基盤の構築',
  '技術的なR&Dパートナー探索',
  'DX推進のコンサルティング',
] as const;

export const BACKGROUND_OPTIONS = [
  { value: 'A', label: '自社の用途に活用できそう' },
  { value: 'B', label: '既存ベンダーからのリプレイス検討' },
  { value: 'C', label: 'R&Dテーマとして情報収集中' },
  { value: 'D', label: '具体的な相談はまだない (情報収集)' },
] as const;

export const HEAT_LEVEL_OPTIONS = [
  { value: 'A', label: '非常に高い (ぜひ提案・見積もりが欲しい)' },
  { value: 'B', label: '高い (一度、技術詳細や活用事例の紹介に来てほしい)' },
  { value: 'C', label: '普通 (関連資料が欲しい)' },
  { value: 'D', label: '低い (挨拶・名刺交換のみ)' },
] as const;

export const POTENTIAL_OPTIONS = [
  { value: '高', label: '高: 具体的な予算・時期の相談あり' },
  { value: '中', label: '中: 課題は明確だが、時期・予算は未定' },
  { value: '低', label: '低: 情報交換レベル' },
  { value: '不明', label: '不明' },
] as const;

export const TIMEFRAME_OPTIONS = [
  { value: 'すぐにでも', label: 'すぐにでも (3ヶ月以内)' },
  { value: '半年以内', label: '半年以内' },
  { value: '1年以内', label: '1年以内' },
  { value: '未定', label: '未定' },
] as const;

export const NEXT_ACTION_OPTIONS = [
  { value: 'アポ設定済み', label: 'アポ設定済み' },
  { value: '後日アポ調整', label: '後日アポ調整 (こちらから連絡)' },
  { value: '資料送付', label: '技術詳細資料・事例集の送付' },
  { value: 'PoC提案', label: 'PoC (概念実証) の提案' },
  { value: '御礼メールのみ', label: '御礼メールのみ' },
] as const;

export const NOTE_TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'conversation', label: '会話メモ' },
  { value: 'demo', label: 'デモ体験' },
  { value: 'material', label: '資料メモ' },
  { value: 'question', label: '疑問点' },
  { value: 'followup', label: 'フォローアップ' },
  { value: 'other', label: 'その他' },
];

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'open', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
];

export const TASK_PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
}[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];
