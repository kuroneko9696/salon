'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataStore } from '@/lib/store';
import type { Event } from '@/types';

interface EventFormState {
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
  event_website_url: string;
  highlight_tags: string;
}

const defaultFormState: EventFormState = {
  name: '',
  start_date: '',
  end_date: '',
  location: '',
  description: '',
  event_website_url: '',
  highlight_tags: '',
};

export default function EventsPage() {
  const router = useRouter();
  const events = useDataStore((state) => state.events);
  const setEvents = useDataStore((state) => state.setEvents);
  const addEvent = useDataStore((state) => state.addEvent);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<EventFormState>(defaultFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', []);

  const fetchEvents = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${apiUrl}/events`);
      if (!response.ok) {
        throw new Error(`イベント一覧の取得に失敗しました (${response.status})`);
      }
      const data: Event[] = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'イベント情報の取得に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormChange = (field: keyof EventFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState(defaultFormState);
  };

  const handleSubmit = async () => {
    if (!formState.name.trim()) {
      setErrorMessage('イベント名を入力してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      name: formState.name.trim(),
      start_date: formState.start_date || null,
      end_date: formState.end_date || null,
      location: formState.location || null,
      description: formState.description || null,
      event_website_url: formState.event_website_url || null,
      scraped_data: null,
      highlight_tags: formState.highlight_tags
        ? formState.highlight_tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };

    try {
      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `イベントの作成に失敗しました (${response.status})`);
      }

      const created: Event = await response.json();
      addEvent(created);
      resetForm();
    } catch (error) {
      console.error('Failed to create event:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'イベントの作成に失敗しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">展示会管理</h1>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-base md:text-lg">展示会を登録</CardTitle>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="event-name">イベント名 *</Label>
              <Input
                id="event-name"
                value={formState.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="例: Japan IT Week 秋"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="event-start">開始日</Label>
                <Input
                  id="event-start"
                  type="date"
                  value={formState.start_date}
                  onChange={(e) => handleFormChange('start_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="event-end">終了日</Label>
                <Input
                  id="event-end"
                  type="date"
                  value={formState.end_date}
                  onChange={(e) => handleFormChange('end_date', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="event-location">会場</Label>
              <Input
                id="event-location"
                value={formState.location}
                onChange={(e) => handleFormChange('location', e.target.value)}
                placeholder="例: 東京ビッグサイト 東展示棟"
              />
            </div>

            <div>
              <Label htmlFor="event-url">公式サイトURL</Label>
              <Input
                id="event-url"
                type="url"
                value={formState.event_website_url}
                onChange={(e) => handleFormChange('event_website_url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="event-description">概要メモ</Label>
              <Textarea
                id="event-description"
                value={formState.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="展示会の目的、ターゲット、メモなど"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="event-tags">ハイライトタグ (カンマ区切り)</Label>
              <Input
                id="event-tags"
                value={formState.highlight_tags}
                onChange={(e) => handleFormChange('highlight_tags', e.target.value)}
                placeholder="例: 生成AI, 画像解析, 成果報酬"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                クリア
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 登録中...
                  </>
                ) : (
                  '登録'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">登録済みイベント</h2>
            <span className="text-sm text-muted-foreground">{events.length}件</span>
          </div>

          {events.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {isLoading ? '読み込み中...' : '登録された展示会はまだありません'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.event_id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center justify-between">
                      <span>{event.name}</span>
                    </CardTitle>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      {event.start_date && (
                        <span>開始: {new Date(event.start_date).toLocaleDateString('ja-JP')}</span>
                      )}
                      {event.end_date && (
                        <span>終了: {new Date(event.end_date).toLocaleDateString('ja-JP')}</span>
                      )}
                      {event.event_website_url && (
                        <a
                          href={event.event_website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          公式サイト
                        </a>
                      )}
                    </div>

                    {event.highlight_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.highlight_tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {event.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/events/${event.event_id}/preparation`)}
                      >
                        事前準備
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/events/${event.event_id}/active`)}
                      >
                        来場キャプチャ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/events/${event.event_id}/highlights`)}
                      >
                        ハイライト
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/events/${event.event_id}/summary`)}
                      >
                        サマリー
                      </Button>
                    </div>
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

