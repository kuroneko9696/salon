# 展示会ワークフロー強化プラン

## 目的
展示会に参加する担当者が「行く前 → 来場中 → 事後」の一連の業務を1つのアプリで完結できるようにする。展示会サイトからの自動情報収集、会場での写真付きメモ、疑問点へのAIアシスト、事後レポート/タスク自動化までをカバーし、紙のパンフレットに頼らない効率的な運用を実現する。

## 全体アーキテクチャ
- **データレイヤー**: Event、TargetCompany、VisitNote、KeywordNote、MaterialImage、Task、EventReport等で前中後の情報を構造化
- **バックエンドAPI**: FastAPIで一貫提供。スクレイピング/LLM呼び出しはバックエンドで統合
- **フロントエンド**: Next.js (App Router) + Zustand。モバイル利用を想定し、カメラ・ギャラリーアクセス・オフライン対応を重視
- **AI活用**: Google Gemini（Vision + Web検索）でOCR、事前調査、疑問への提案、事後レポートを自動化

## フェーズ構成

### Phase 1: 事前準備の自動化
1. **データモデル拡張**（types/store）
   - Eventへ`event_website_url`・`scraped_data`追加
   - TargetCompanyへ`pre_research_status`・`highlight_tags`
   - VisitNote/KeywordNote/MaterialImage定義
2. **スクレイピングAPI**（backend/main.py）
   - `POST /events/{id}/scrape`で展示会サイトから出展企業リスト抽出（htmlパース or サードパーティAPI）
3. **事前調査API**
   - 企業サイトURL/キーワードをもとにLLM＋簡易スクレイピングで概要・注目ポイント生成
   - 個別＋一括実行対応
4. **展示会事前準備UI**（`/events/[id]/preparation`）
   - 公式サイトURL入力→スクレイピング実行→結果をターゲット候補として表示
   - ドラッグ＆ドロップで優先度設定、事前調査の実行/結果表示

### Phase 2: 来場中のキャプチャとAIアシスト
5. **画像アップロード基盤**
   - `POST /upload/image`（名刺・写真共通）。ローカル保存 or クラウドアップロードを抽象化
6. **来場ノートAPI/モデル**
   - ノート種別（会話/デモ/資料/疑問など）、複数写真、ハイライトフラグ、キーワード
   - `POST /events/{id}/notes`等
7. **疑問・キーワードAPI**
   - `POST /events/{id}/keywords`でメモ→`/suggest`で「●●のことでは？」とAI提案
8. **資料画像管理**
   - `POST /events/{id}/materials`でパンフ・展示デモ写真登録、Vision OCRでテキスト抽出
9. **フロントUI拡張**
   - `/events/[id]/active`: 写真付きクイックノート、ギャラリー選択、疑問メモとAIコメント即時表示、ターゲット訪問チェック
   - `/survey/[cardId]`: 会話記録に写真添付、疑問メモ欄、ハイライトタグ付け、次アクション→タスク化トグル
   - `/card/[cardId]`: 紐づくノート・資料・疑問をタブ表示
10. **注目内容ダッシュボード**
    - `/events/[id]/highlights`でハイライトだけをタグ/種別で集約

### Phase 3: 事後整理と自動化
11. **タスク管理**
    - Taskモデル/Store/API（作成・更新・完了）。商談アンケートから自動生成
12. **展示会サマリー/統計**
    - `GET /events/{id}/summary`で名刺数、面談数、ハイライトなど集計
13. **レポート自動生成**
    - `POST /events/{id}/generate-report`でLLMが注目コンテンツ・タスク・資料要点を織り込んだMarkdownレポート生成
14. **レポートUI**
    - `/events/[id]/summary`: サマリー指標、ハイライトカード、資料ギャラリー、タスクリスト、生成レポート表示

## 技術的留意事項
- **スクレイピング**: サイト構造の変化に備え、XPath/正規表現設定をイベントごとに調整できるようにするか、外部API利用を検討
- **写真保存**: 一時保存はIndexedDB/Service Worker、同期時にAPIアップロード
- **AI費用最適化**: 事前調査はバッチで夜間実行できる仕組みを検討。Vision/OCRは必要画像のみ
- **オフライン対応**: メモ・写真はローカルキューに溜め、オンライン時に同期
- **セキュリティ**: アップロード画像のアクセス制御、スクレイピング対象サイトの利用規約遵守

## 成果物の整理
- バックエンド: `backend/main.py`（API拡張、スクレイピング/LLM連携ロジック）、必要に応じて補助モジュール
- フロントエンド: `frontend/types/index.ts`, `frontend/lib/store.ts`, 各ページ（events/*, tasks, quick-research, card, survey, dashboard 等）
- ドキュメント: `plan/plan.md`更新、スクレイピング設定例、AI利用時のプロンプトテンプレート

## 次のステップ
1. データモデルとAPI仕様を詳細設計（OpenAPI更新）
2. Phase 1実装→PoCで展示会サイトからターゲット抽出
3. Phase 2で写真付きノートとAIアシストを実機テスト
4. Phase 3でレポート自動化とタスク統合を完成させ、全体E2Eテスト





