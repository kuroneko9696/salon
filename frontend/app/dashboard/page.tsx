'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarRange,
  ClipboardList,
  LogOut,
  MapPin,
  Plus,
  Scan,
  Search,
  Sparkles,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserStore, useDataStore } from '@/lib/store';
import type { BusinessCard } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);

  const businessCards = useDataStore((state) => state.businessCards);
  const events = useDataStore((state) => state.events);
  const setEvents = useDataStore((state) => state.setEvents);
  const booths = useDataStore((state) => state.booths);
  const setBooths = useDataStore((state) => state.setBooths);
  const targetCompanies = useDataStore((state) => state.targetCompanies);
  const visitNotes = useDataStore((state) => state.visitNotes);
  const tasks = useDataStore((state) => state.tasks);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [filteredCards, setFilteredCards] = useState<BusinessCard[]>([]);

  const apiUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    []
  );

  useEffect(() => {
    const fetchContext = async () => {
      try {
        if (events.length === 0) {
          const response = await fetch(`${apiUrl}/events`);
          if (response.ok) {
            const data = await response.json();
            setEvents(data);
          }
        }
        if (booths.length === 0) {
          const response = await fetch(`${apiUrl}/booths`);
          if (response.ok) {
            const data = await response.json();
            setBooths(data);
          }
        }
      } catch (error) {
        console.error('コンテキストデータの取得に失敗しました:', error);
      }
    };

    fetchContext();
  }, [apiUrl, events.length, booths.length, setEvents, setBooths]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    let filtered = businessCards;

    if (selectedEventId) {
      filtered = filtered.filter((card) => card.event_id === selectedEventId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.full_name.toLowerCase().includes(query) ||
          card.company_name.toLowerCase().includes(query) ||
          card.departments?.some((dept) => dept.toLowerCase().includes(query))
      );
    }

    setFilteredCards(filtered);
  }, [searchQuery, selectedEventId, businessCards]);

  const handleLogout = () => {
    clearUser();
    router.push('/login');
  };

  const handleAddCard = () => {
    router.push('/camera');
  };

  const handleCardClick = (cardId: string) => {
    router.push(`/card/${cardId}`);
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
      return aDate - bDate;
    });
  }, [events]);

  const currentEvent = sortedEvents[0] ?? null;

  const highlightTargets = useMemo(
    () => targetCompanies.filter((target) => target.highlight),
    [targetCompanies]
  );

  const highlightNotes = useMemo(
    () => visitNotes.filter((note) => note.highlight),
    [visitNotes]
  );

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'completed'),
    [tasks]
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">展示会ワークスペース</h1>
            <p className="text-sm text-muted-foreground">
              前・中・後のタスクをここからスタートできます
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{user.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="w-4 h-4" />
                  今日やること
                </div>
                <CardTitle className="text-xl">
                  進行中の展示会ワークフローに飛び込みましょう
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  事前準備の見直しから会場でのキャプチャ、A I レポート生成までワンクリックで遷移できます。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => router.push('/events')}>
                  展示会を管理
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button onClick={handleAddCard}>
                  名刺をスキャン
                  <Scan className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            {currentEvent && (
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <CalendarRange className="w-4 h-4" />
                    次の展示会
                  </div>
                  <p className="mt-2 text-sm font-semibold">{currentEvent.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentEvent.start_date
                      ? new Date(currentEvent.start_date).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '日程未設定'}{' '}
                    〜{' '}
                    {currentEvent.end_date
                      ? new Date(currentEvent.end_date).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '未設定'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/events/${currentEvent.event_id}/preparation`)}
                    >
                      事前準備へ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/events/${currentEvent.event_id}/active`)}
                    >
                      来場中メモ
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <ClipboardList className="w-4 h-4" />
                    未完了タスク
                  </div>
                  <p className="mt-2 text-2xl font-bold">{openTasks.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    タスク画面から担当者と期限を更新しましょう。
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/events/${currentEvent.event_id}/summary`)}
                  >
                    サマリーを見る
                  </Button>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    ハイライト
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {highlightTargets.length} 件の重要ターゲット
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ノートのハイライト {highlightNotes.length} 件を振り返って次のアクションを整理します。
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => currentEvent && router.push(`/events/${currentEvent.event_id}/highlights`)}
                  >
                    ハイライト一覧
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarRange className="w-5 h-5 text-primary" />
                ステータス概要
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                登録済みデータのサマリー。詳細は各画面で編集できます。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  展示会
                </p>
                <p className="text-2xl font-semibold">{events.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  ターゲット企業
                </p>
                <p className="text-2xl font-semibold">{targetCompanies.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  名刺
                </p>
                <p className="text-2xl font-semibold">{businessCards.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  ハイライトノート
                </p>
                <p className="text-2xl font-semibold">{highlightNotes.length}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  展示会タイムライン
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  イベントごとの進捗とクイックアクション。
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">
                  展示会がまだ登録されていません。まずはイベントを作成しましょう。
                </div>
              ) : (
                sortedEvents.map((event) => (
                  <div
                    key={event.event_id}
                    className="border rounded-lg bg-white px-4 py-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{event.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.start_date
                            ? new Date(event.start_date).toLocaleDateString('ja-JP', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '日程未設定'}{' '}
                          〜{' '}
                          {event.end_date
                            ? new Date(event.end_date).toLocaleDateString('ja-JP', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '未設定'}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            会場: {event.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/events/${event.event_id}/preparation`)}
                        >
                          事前準備
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/events/${event.event_id}/active`)}
                        >
                          来場中
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/events/${event.event_id}/summary`)}
                        >
                          事後整理
                        </Button>
                      </div>
                    </div>
                    {event.highlight_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.highlight_tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                ハイライトノート
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {highlightNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  来場中に「ハイライト」をオンにするとここに集約されます。
                </p>
              ) : (
                highlightNotes.slice(0, 4).map((note) => (
                  <div key={note.visit_note_id} className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-semibold">{note.title || 'ハイライトメモ'}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                      {note.content}
                    </p>
                    {note.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="secondary">
                            #{keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">最近追加した名刺</h2>
              <p className="text-sm text-muted-foreground">
                直近に保存した名刺カードを確認し、アンケートを追記できます。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="氏名・会社名・部署で検索"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full md:w-56 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">すべてのイベント</option>
                {events.map((event) => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredCards.length === 0 ? (
            <div className="text-center border border-dashed rounded-lg py-12">
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? '該当する名刺が見つかりませんでした。' : 'まだ名刺が登録されていません。'}
              </p>
              {!searchQuery && (
                <Button onClick={handleAddCard}>
                  <Plus className="w-4 h-4 mr-2" />
                  名刺を追加
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCards.slice(0, 6).map((card) => (
                <Card
                  key={card.card_id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleCardClick(card.card_id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{card.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {card.company_name}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {card.departments && card.departments.length > 0 && (
                      <p>{card.departments.join(' / ')}</p>
                    )}
                    {card.titles && card.titles.length > 0 && (
                      <p>{card.titles.join(' / ')}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
