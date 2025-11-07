'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  FileText,
  Loader2,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useDataStore,
  useUserStore,
} from '@/lib/store';
import type {
  Event,
  EventReport,
  KeywordNote,
  MaterialImage,
  TargetCompany,
  Task,
  VisitNote,
} from '@/types';

interface Params {
  eventId: string;
}

interface EventSummary {
  event: Event;
  metrics: Record<string, number>;
  highlights: {
    highlight_notes: VisitNote[];
    highlight_companies: TargetCompany[];
    pending_tasks: Task[];
  };
  recent_materials: MaterialImage[];
  keyword_notes: KeywordNote[];
  last_report?: EventReport | null;
}

export default function EventSummaryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const events = useDataStore((state) => state.events);
  const updateEvent = useDataStore((state) => state.updateEvent);

  const [eventId, setEventId] = useState<string | null>(null);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const fetchSummary = async (id: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${apiUrl}/events/${id}/summary`);
      if (!response.ok) {
        throw new Error('サマリー情報の取得に失敗しました');
      }
      const data: EventSummary = await response.json();
      setSummary(data);
      updateEvent(id, data.event);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'サマリー情報の取得に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    fetchSummary(eventId);
  }, [eventId]);

  const event = summary?.event || events.find((item) => item.event_id === eventId) || null;

  const handleGenerateReport = async () => {
    if (!eventId) return;
    setIsGeneratingReport(true);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `${apiUrl}/events/${eventId}/generate-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ include_sections: ['summary', 'highlights', 'tasks'] }),
        }
      );
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: 'レポート生成に失敗しました' }));
        throw new Error(message.detail || 'レポート生成に失敗しました');
      }
      const report: EventReport = await response.json();
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              last_report: report,
            }
          : prev
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'レポート生成に失敗しました'
      );
    } finally {
      setIsGeneratingReport(false);
      if (eventId) {
        fetchSummary(eventId);
      }
    }
  };

  if (!user || !eventId) {
    return null;
  }

  const metrics = summary?.metrics || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">展示会サマリー</h1>
            <p className="text-sm text-muted-foreground">
              {event?.name || 'イベント情報を読み込み中...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSummary(eventId)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 更新中...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2" /> 再集計
                </>
              )}
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> レポート生成
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 space-y-6 max-w-5xl">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}

        {/* KPI */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">KPIサマリー</h2>
          </div>
          <div className="px-5 py-4">
            {Object.keys(metrics).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                指標を読み込み中です...
              </p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(metrics).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-lg border p-4 bg-slate-50 flex flex-col gap-1"
                  >
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-2xl font-semibold">{value as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 資料ハイライト */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">
              資料ハイライト ({summary?.recent_materials.length || 0}件)
            </h2>
          </div>
          {summary?.recent_materials.length ? (
            <div className="divide-y">
              {summary.recent_materials.map((material) => (
                <div key={material.material_id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {material.caption || '資料'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(material.created_at).toLocaleString()}
                    </span>
                  </div>
                  {material.ai_summary && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {material.ai_summary}
                    </p>
                  )}
                  {material.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {material.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-muted-foreground">
              資料はまだ登録されていません。
            </div>
          )}
        </section>

        {/* キーワード */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-semibold">
              登録済みキーワード ({summary?.keyword_notes.length || 0}件)
            </h2>
          </div>
          {summary?.keyword_notes.length ? (
            <div className="divide-y">
              {summary.keyword_notes.map((note) => (
                <div key={note.keyword_note_id} className="px-5 py-4 space-y-1">
                  <p className="text-sm font-semibold">{note.keyword}</p>
                  {note.context && (
                    <p className="text-sm text-muted-foreground">{note.context}</p>
                  )}
                  {note.ai_suggestions.length > 0 && (
                    <div className="bg-slate-100 px-3 py-2 rounded text-sm space-y-1">
                      {note.ai_suggestions.map((suggestion, index) => (
                        <p key={index}>• {suggestion}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-muted-foreground">
              キーワードメモはまだ登録されていません。
            </div>
          )}
        </section>

        {/* 最新レポート */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold">最新レポート</h2>
          </div>
          {summary?.last_report ? (
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold">
                  ステータス: {summary.last_report.status}
                </p>
                <span className="text-xs text-muted-foreground">
                  更新日時: {new Date(summary.last_report.updated_at).toLocaleString()}
                </span>
              </div>
              {summary.last_report.content ? (
                <div className="bg-slate-100 rounded px-4 py-3 text-sm whitespace-pre-wrap overflow-x-auto">
                  {summary.last_report.content}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  レポート本文はまだ生成されていません。
                </p>
              )}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-muted-foreground">
              レポートはまだ生成されていません。ハイライトとタスクを整理した上でレポート生成を実行してください。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
