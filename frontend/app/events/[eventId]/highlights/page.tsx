'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  ClipboardList,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useDataStore,
  useUserStore,
} from '@/lib/store';
import type {
  Event,
  TargetCompany,
  VisitNote,
  Task,
  KeywordNote,
  MaterialImage,
  EventReport,
} from '@/types';

interface Params {
  eventId: string;
}

interface EventSummary {
  event: Event;
  metrics: Record<string, unknown>;
  highlights: {
    highlight_notes: VisitNote[];
    highlight_companies: TargetCompany[];
    pending_tasks: Task[];
  };
  recent_materials: MaterialImage[];
  keyword_notes: KeywordNote[];
  last_report?: EventReport | null;
}

export default function EventHighlightsPage({
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
        throw new Error('ハイライト情報の取得に失敗しました');
      }
      const data: EventSummary = await response.json();
      setSummary(data);
      updateEvent(id, data.event);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'ハイライト情報の取得に失敗しました'
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
            <h1 className="text-lg font-semibold">注目ハイライト</h1>
            <p className="text-sm text-muted-foreground">
              {event?.name || 'イベント情報を読み込み中...'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSummary(eventId)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                更新中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                再集計
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

        {/* ハイライト企業 */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold">
              ハイライト企業 ({summary?.highlights.highlight_companies.length || 0}社)
            </h2>
          </div>
          {summary?.highlights.highlight_companies?.length ? (
            <div className="divide-y">
              {summary.highlights.highlight_companies.map((company) => (
                <div key={company.target_company_id} className="px-5 py-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{company.name}</p>
                      {company.booth_code && (
                        <p className="text-xs text-muted-foreground">
                          ブース: {company.booth_code}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {company.priority && (
                        <Badge variant="secondary">優先度: {company.priority}</Badge>
                      )}
                      {company.highlight_tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {company.research_summary && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {company.research_summary}
                    </p>
                  )}
                  {company.ai_research && (
                    <details className="bg-slate-100 px-3 py-2 rounded text-sm">
                      <summary className="font-semibold cursor-pointer">
                        AI事前調査を表示
                      </summary>
                      <div className="mt-2 whitespace-pre-wrap">{company.ai_research}</div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-muted-foreground">
              ハイライトに設定された企業はまだありません。
            </div>
          )}
        </section>

        {/* ハイライトノート */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-base font-semibold">
              ハイライトノート ({summary?.highlights.highlight_notes.length || 0}件)
            </h2>
          </div>
          {summary?.highlights.highlight_notes?.length ? (
            <div className="divide-y">
              {summary.highlights.highlight_notes.map((note) => (
                <div key={note.visit_note_id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold">
                      {note.title || '（タイトル未設定）'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  {note.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {note.keywords.map((keyword) => (
                        <Badge key={keyword} variant="outline">
                          #{keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-muted-foreground">
              ハイライトとしてマークされたノートはまだありません。
            </div>
          )}
        </section>

        {/* 未完了タスク */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-sky-500" />
            <h2 className="text-base font-semibold">
              未完了タスク ({summary?.highlights.pending_tasks.length || 0}件)
            </h2>
          </div>
          {summary?.highlights.pending_tasks?.length ? (
            <div className="divide-y">
              {summary.highlights.pending_tasks.map((task) => (
                <div key={task.task_id} className="px-5 py-4 space-y-1">
                  <p className="text-sm font-semibold">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    期限: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '未設定'} / ステータス: {task.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-muted-foreground">
              未完了タスクはありません。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
