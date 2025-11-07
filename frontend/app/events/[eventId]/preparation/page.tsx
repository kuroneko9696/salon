'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  RefreshCcw,
  Globe2,
  Sparkles,
  Plus,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  useDataStore,
  useUserStore,
} from '@/lib/store';
import type {
  Event,
  TargetCompany,
  TargetCompanyDraft,
  ScrapeResultItem,
} from '@/types';

interface Params {
  eventId: string;
}

interface TargetFormState {
  name: string;
  website_url: string;
  description: string;
  booth_code: string;
  priority: string;
  highlight: boolean;
  highlight_tags: string;
}

const defaultTargetForm: TargetFormState = {
  name: '',
  website_url: '',
  description: '',
  booth_code: '',
  priority: '',
  highlight: false,
  highlight_tags: '',
};

const PRIORITY_OPTIONS = [
  { value: '', label: '未設定' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export default function EventPreparationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const addEvent = useDataStore((state) => state.addEvent);
  const updateEvent = useDataStore((state) => state.updateEvent);
  const events = useDataStore((state) => state.events);
  const targetCompanies = useDataStore((state) => state.targetCompanies);
  const setTargetCompanies = useDataStore((state) => state.setTargetCompanies);

  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeHtml, setScrapeHtml] = useState('');
  const [scrapeNotes, setScrapeNotes] = useState<string | null>(null);
  const [scrapedItems, setScrapedItems] = useState<ScrapeResultItem[]>([]);
  const [targetForm, setTargetForm] = useState<TargetFormState>(defaultTargetForm);
  const [isSubmittingTarget, setIsSubmittingTarget] = useState(false);
  const [preResearchLoadingId, setPreResearchLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    []
  );

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setEventId(resolved.eventId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const pullEvent = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/events/${id}`);
      if (!response.ok) {
        throw new Error('イベント情報の取得に失敗しました');
      }
      const data: Event = await response.json();

      const existing = events.find((item) => item.event_id === id);
      if (existing) {
        updateEvent(id, data);
      } else {
        addEvent(data);
      }
      setEvent(data);

      if (data.scraped_data) {
        setScrapedItems(data.scraped_data.items || []);
        setScrapeNotes(data.scraped_data.notes || null);
      } else {
        setScrapedItems([]);
        setScrapeNotes(null);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'イベント情報の取得に失敗しました'
      );
    }
  }, [addEvent, apiUrl, events, updateEvent]);

  const pullTargets = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/target-companies?event_id=${encodeURIComponent(id)}`
      );
      if (!response.ok) {
        throw new Error('ターゲット企業の取得に失敗しました');
      }
      const data: TargetCompany[] = await response.json();
      const current = useDataStore.getState().targetCompanies;
      const merged = [
        ...current.filter((target) => target.event_id !== id),
        ...data,
      ];
      setTargetCompanies(merged);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'ターゲット企業の取得に失敗しました'
      );
    }
  }, [apiUrl, setTargetCompanies]);

  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);
    Promise.all([pullEvent(eventId), pullTargets(eventId)]).finally(() =>
      setIsLoading(false)
    );
  }, [eventId, pullEvent, pullTargets]);

  useEffect(() => {
    if (!eventId) return;
    const stored = events.find((item) => item.event_id === eventId);
    if (stored) {
      setEvent(stored);
      if (stored.scraped_data) {
        setScrapedItems(stored.scraped_data.items || []);
        setScrapeNotes(stored.scraped_data.notes || null);
      }
    }
  }, [eventId, events]);

  const linkedTargets = targetCompanies.filter(
    (target) => target.event_id === eventId
  );

  const handleEventFieldUpdate = async (
    field: keyof Event,
    value: string | string[] | null
  ) => {
    if (!eventId || !event) return;
    try {
      const response = await fetch(`${apiUrl}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) {
        throw new Error('イベント情報の更新に失敗しました');
      }
      const updated: Event = await response.json();
      updateEvent(eventId, updated);
      setEvent(updated);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'イベント情報の更新に失敗しました'
      );
    }
  };

  const handleScrape = async () => {
    if (!eventId) return;
    setIsScraping(true);
    setScrapeMessage(null);
    try {
      const payload = {
        source_url: event?.event_website_url || null,
        source_html: scrapeHtml || null,
        selectors: undefined,
        limit: 80,
        include_links: true,
      };
      const response = await fetch(`${apiUrl}/events/${eventId}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: 'スクレイピングに失敗しました' }));
        throw new Error(message.detail || 'スクレイピングに失敗しました');
      }
      const updated: Event = await response.json();
      updateEvent(eventId, updated);
      setEvent(updated);
      setScrapedItems(updated.scraped_data?.items || []);
      setScrapeNotes(updated.scraped_data?.notes || null);
      setScrapeMessage('スクレイピング結果を更新しました');
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'スクレイピングに失敗しました'
      );
    } finally {
      setIsScraping(false);
    }
  };

  const handleTargetFormChange = (
    field: keyof TargetFormState,
    value: string | boolean
  ) => {
    setTargetForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateTarget = async () => {
    if (!eventId || !targetForm.name.trim()) {
      setErrorMessage('ターゲット名称を入力してください');
      return;
    }
    setIsSubmittingTarget(true);
    setErrorMessage(null);
    try {
      const payload: TargetCompanyDraft = {
        event_id: eventId,
        name: targetForm.name.trim(),
        website_url: targetForm.website_url.trim() || null,
        description: targetForm.description.trim() || null,
        booth_code: targetForm.booth_code.trim() || null,
        priority: targetForm.priority || null,
        highlight: targetForm.highlight,
        highlight_tags: targetForm.highlight_tags
          ? targetForm.highlight_tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        pre_research_status: null,
        research_summary: null,
        notes: null,
        scraped_context: null,
        ai_research: null,
      };

      const response = await fetch(`${apiUrl}/target-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: 'ターゲット企業の作成に失敗しました' }));
        throw new Error(message.detail || 'ターゲット企業の作成に失敗しました');
      }
      const created: TargetCompany = await response.json();
      const current = useDataStore.getState().targetCompanies;
      setTargetCompanies([...current, created]);
      setTargetForm(defaultTargetForm);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'ターゲット企業の作成に失敗しました'
      );
    } finally {
      setIsSubmittingTarget(false);
    }
  };

  const runPreResearch = async (target: TargetCompany) => {
    setPreResearchLoadingId(target.target_company_id);
    try {
      const response = await fetch(
        `${apiUrl}/target-companies/${target.target_company_id}/pre-research`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force_refresh: true }),
        }
      );
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: '事前調査の実行に失敗しました' }));
        throw new Error(message.detail || '事前調査の実行に失敗しました');
      }
      const updated: TargetCompany = await response.json();
      const current = useDataStore.getState().targetCompanies;
      const merged = current.map((item) =>
        item.target_company_id === updated.target_company_id ? updated : item
      );
      setTargetCompanies(merged);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '事前調査の実行に失敗しました'
      );
    } finally {
      setPreResearchLoadingId(null);
    }
  };

  if (!user || !eventId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              展示会事前準備
            </h1>
            <p className="text-sm text-muted-foreground">
              {event?.name || '読み込み中...'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (eventId) {
                setIsLoading(true);
                Promise.all([pullEvent(eventId), pullTargets(eventId)]).finally(
                  () => setIsLoading(false)
                );
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                再読込
              </>
            ) : (
              <>
                <RefreshCcw className="w-4 h-4 mr-2" />
                再読込
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 space-y-6 max-w-5xl">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}

        {/* イベント基本情報 */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">イベント基本情報</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  公式サイトURL
                </label>
                <Input
                  value={event?.event_website_url ?? ''}
                  placeholder="https://example.com"
                  onChange={(e) =>
                    handleEventFieldUpdate('event_website_url', e.target.value)
                  }
                  onBlur={(e) =>
                    handleEventFieldUpdate('event_website_url', e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  ハイライトタグ (カンマ区切り)
                </label>
                <Input
                  value={(event?.highlight_tags || []).join(', ')}
                  onBlur={(e) =>
                    handleEventFieldUpdate(
                      'highlight_tags' as keyof Event,
                      e.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                    )
                  }
                  onChange={(e) =>
                    setEvent((prev) =>
                      prev
                        ? {
                            ...prev,
                            highlight_tags: e.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          }
                        : prev
                    )
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                展示会メモ
              </label>
              <Textarea
                rows={3}
                value={event?.description ?? ''}
                onChange={(e) =>
                  setEvent((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev
                  )
                }
                onBlur={(e) =>
                  handleEventFieldUpdate('description', e.target.value)
                }
                placeholder="展示会の目的や注目ポイントをメモ..."
              />
            </div>
          </div>
        </section>

        {/* スクレイピング支援 */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">展示会サイトからの情報抽出</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              公式サイトのHTMLを貼り付けて抽出を実行します。セレクタ調整はバックエンド側で行えます。
            </p>
            <Textarea
              rows={6}
              placeholder="展示会サイトのHTMLを貼り付け..."
              value={scrapeHtml}
              onChange={(e) => setScrapeHtml(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {scrapeNotes
                  ? scrapeNotes
                  : '最大80件まで抽出します。スクレイピング対象のセクションがある場合はHTMLを貼り付けてください。'}
              </div>
              <Button onClick={handleScrape} disabled={isScraping}>
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 抽出中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> 情報抽出
                  </>
                )}
              </Button>
            </div>

            {scrapeMessage && (
              <div className="text-sm text-emerald-600">{scrapeMessage}</div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 text-sm font-medium">
                抽出結果 ({scrapedItems.length}件)
              </div>
              {scrapedItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  まだ抽出結果がありません。
                </div>
              ) : (
                <ul className="divide-y">
                  {scrapedItems.map((item, index) => (
                    <li key={`${item.text}-${index}`} className="px-4 py-3">
                      <p className="text-sm font-medium">{item.text}</p>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                        {item.selector && (
                          <Badge variant="outline">selector: {item.selector}</Badge>
                        )}
                        {(item.href || item.url) && (
                          <a
                            className="text-blue-600 hover:underline"
                            href={item.href || item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            リンクを開く
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setTargetForm((prev) => ({
                              ...prev,
                              name: item.text,
                              website_url: item.href || item.url || '',
                            }));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> ターゲットに追加
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ターゲット登録フォーム */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">ターゲット企業を追加</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">名称 *</label>
              <Input
                value={targetForm.name}
                onChange={(e) => handleTargetFormChange('name', e.target.value)}
                placeholder="例: 株式会社サンプル"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  公式サイトURL
                </label>
                <Input
                  value={targetForm.website_url}
                  onChange={(e) =>
                    handleTargetFormChange('website_url', e.target.value)
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  ブース番号
                </label>
                <Input
                  value={targetForm.booth_code}
                  onChange={(e) =>
                    handleTargetFormChange('booth_code', e.target.value)
                  }
                  placeholder="例: 西2-25"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  優先度
                </label>
                <select
                  value={targetForm.priority}
                  onChange={(e) =>
                    handleTargetFormChange('priority', e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="target-highlight"
                  type="checkbox"
                  checked={targetForm.highlight}
                  onChange={(e) =>
                    handleTargetFormChange('highlight', e.target.checked)
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="target-highlight" className="text-sm">
                  ハイライト対象としてマーク
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                ハイライトタグ (カンマ区切り)
              </label>
              <Input
                value={targetForm.highlight_tags}
                onChange={(e) =>
                  handleTargetFormChange('highlight_tags', e.target.value)
                }
                placeholder="例: 画像解析, クラウドAI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                メモ
              </label>
              <Textarea
                rows={3}
                value={targetForm.description}
                onChange={(e) =>
                  handleTargetFormChange('description', e.target.value)
                }
                placeholder="展示会前に把握しておきたい情報や仮説をメモ..."
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateTarget} disabled={isSubmittingTarget}>
                {isSubmittingTarget ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 登録中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> ターゲットを追加
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* ターゲットリスト */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">
              ターゲット企業一覧 ({linkedTargets.length}件)
            </h2>
          </div>
          {linkedTargets.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground">
              まだターゲットが登録されていません。抽出結果から追加するか、手動で登録してください。
            </div>
          ) : (
            <div className="divide-y">
              {linkedTargets.map((target) => (
                <div key={target.target_company_id} className="px-5 py-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        {target.name}
                        {target.highlight && (
                          <Badge variant="default" className="bg-amber-500">
                            ハイライト
                          </Badge>
                        )}
                      </h3>
                      {target.booth_code && (
                        <p className="text-xs text-muted-foreground">
                          ブース: {target.booth_code}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {target.website_url && (
                        <a
                          href={target.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          公式サイト
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runPreResearch(target)}
                        disabled={preResearchLoadingId === target.target_company_id}
                      >
                        {preResearchLoadingId === target.target_company_id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            分析中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            事前調査
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {target.priority && (
                      <Badge variant="secondary">優先度: {target.priority}</Badge>
                    )}
                    {target.highlight_tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  {target.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {target.description}
                    </p>
                  )}
                  {target.research_summary && (
                    <div className="bg-slate-100 px-3 py-2 rounded text-sm">
                      <p className="font-medium text-slate-700 mb-1">ハイライト</p>
                      <p className="text-slate-600 whitespace-pre-wrap">
                        {target.research_summary}
                      </p>
                    </div>
                  )}
                  {target.ai_research && (
                    <details className="bg-slate-100 px-3 py-2 rounded">
                      <summary className="text-sm font-semibold cursor-pointer">
                        AI事前調査レポートを表示
                      </summary>
                      <div className="mt-2 text-sm whitespace-pre-wrap">
                        {target.ai_research}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
