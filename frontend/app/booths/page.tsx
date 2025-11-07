'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataStore } from '@/lib/store';
import type { Booth, Event } from '@/types';

interface BoothFormState {
  event_id: string;
  name: string;
  booth_code: string;
  location: string;
  contact_persons: string;
  focus_products: string;
  highlight_tags: string;
  pre_research_status: string;
  memo: string;
}

const defaultBoothFormState: BoothFormState = {
  event_id: '',
  name: '',
  booth_code: '',
  location: '',
  contact_persons: '',
  focus_products: '',
  highlight_tags: '',
  pre_research_status: '',
  memo: '',
};

export default function BoothsPage() {
  const router = useRouter();
  const events = useDataStore((state) => state.events);
  const setEvents = useDataStore((state) => state.setEvents);
  const booths = useDataStore((state) => state.booths);
  const setBooths = useDataStore((state) => state.setBooths);
  const addBooth = useDataStore((state) => state.addBooth);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterEventId, setFilterEventId] = useState<string>('');
  const [formState, setFormState] = useState<BoothFormState>(defaultBoothFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${apiUrl}/events`);
      if (!response.ok) {
        throw new Error(`イベント一覧の取得に失敗しました (${response.status})`);
      }
      const data: Event[] = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchBooths = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${apiUrl}/booths`);
      if (!response.ok) {
        throw new Error(`ブース一覧の取得に失敗しました (${response.status})`);
      }
      const data: Booth[] = await response.json();
      setBooths(data);
    } catch (error) {
      console.error('Failed to fetch booths:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'ブース情報の取得に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents();
    }
    fetchBooths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormChange = (field: keyof BoothFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState(defaultBoothFormState);
  };

  const handleSubmit = async () => {
    if (!formState.event_id) {
      setErrorMessage('紐づくイベントを選択してください');
      return;
    }
    if (!formState.name.trim()) {
      setErrorMessage('ブース名を入力してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      event_id: formState.event_id,
      name: formState.name.trim(),
      booth_code: formState.booth_code || null,
      location: formState.location || null,
      contact_persons: formState.contact_persons
        ? formState.contact_persons
            .split('\n')
            .map((person) => person.trim())
            .filter(Boolean)
        : [],
      focus_products: formState.focus_products
        ? formState.focus_products
            .split('\n')
            .map((product) => product.trim())
            .filter(Boolean)
        : [],
      highlight_tags: formState.highlight_tags
        ? formState.highlight_tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      pre_research_status: formState.pre_research_status || null,
      memo: formState.memo || null,
    };

    try {
      const response = await fetch(`${apiUrl}/booths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `ブースの作成に失敗しました (${response.status})`);
      }

      const created: Booth = await response.json();
      addBooth(created);
      resetForm();
    } catch (error) {
      console.error('Failed to create booth:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'ブースの作成に失敗しました'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBooths = booths.filter((booth) =>
    filterEventId ? booth.event_id === filterEventId : true
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">ブース管理</h1>
          <Button variant="ghost" size="icon" onClick={fetchBooths} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-base md:text-lg">ブースを登録</CardTitle>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="booth-event">イベント *</Label>
              <select
                id="booth-event"
                value={formState.event_id}
                onChange={(e) => handleFormChange('event_id', e.target.value)}
                className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">イベントを選択</option>
                {events.map((event) => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="booth-name">ブース名 *</Label>
              <Input
                id="booth-name"
                value={formState.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="例: 株式会社サロン AIソリューション"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="booth-code">ブース番号</Label>
                <Input
                  id="booth-code"
                  value={formState.booth_code}
                  onChange={(e) => handleFormChange('booth_code', e.target.value)}
                  placeholder="例: 14-23"
                />
              </div>
              <div>
                <Label htmlFor="booth-location">会場内の位置</Label>
                <Input
                  id="booth-location"
                  value={formState.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  placeholder="例: 東6ホール 出入口C付近"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="booth-contacts">担当者 (1行1名)</Label>
              <Textarea
                id="booth-contacts"
                rows={3}
                value={formState.contact_persons}
                onChange={(e) => handleFormChange('contact_persons', e.target.value)}
                placeholder={`例:\n田中 太郎 (営業責任者)\n佐藤 花子 (技術リード)`}
              />
            </div>

            <div>
              <Label htmlFor="booth-products">注目製品・サービス (1行1件)</Label>
              <Textarea
                id="booth-products"
                rows={3}
                value={formState.focus_products}
                onChange={(e) => handleFormChange('focus_products', e.target.value)}
                placeholder={`例:\nAI画像検査システム\n高速エッジ端末`}
              />
            </div>

            <div>
              <Label htmlFor="booth-tags">ハイライトタグ (カンマ区切り)</Label>
              <Input
                id="booth-tags"
                value={formState.highlight_tags}
                onChange={(e) => handleFormChange('highlight_tags', e.target.value)}
                placeholder="例: 生成AI, 画像解析"
              />
            </div>

            <div>
              <Label htmlFor="booth-status">事前調査メモ</Label>
              <Textarea
                id="booth-status"
                rows={3}
                value={formState.pre_research_status}
                onChange={(e) => handleFormChange('pre_research_status', e.target.value)}
                placeholder="調査状況、確認事項など"
              />
            </div>

            <div>
              <Label htmlFor="booth-memo">ブースメモ</Label>
              <Textarea
                id="booth-memo"
                rows={3}
                value={formState.memo}
                onChange={(e) => handleFormChange('memo', e.target.value)}
                placeholder="追加メモを記入"
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
            <h2 className="text-base font-semibold">登録済みブース</h2>
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">すべてのイベント</option>
              {events.map((event) => (
                <option key={event.event_id} value={event.event_id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          {filteredBooths.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {isLoading ? '読み込み中...' : '登録されたブースはまだありません'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBooths.map((booth) => {
                const event = events.find((ev) => ev.event_id === booth.event_id);
                return (
                  <Card key={booth.booth_id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base md:text-lg flex items-center justify-between">
                        <span>{booth.name}</span>
                        {event && (
                          <span className="text-xs text-muted-foreground">{event.name}</span>
                        )}
                      </CardTitle>
                      {booth.booth_code && (
                        <p className="text-sm text-muted-foreground">ブース番号: {booth.booth_code}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {booth.location && <p>位置: {booth.location}</p>}

                      {booth.contact_persons.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-1">担当者</p>
                          <ul className="list-disc list-inside space-y-1">
                            {booth.contact_persons.map((person) => (
                              <li key={person}>{person}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {booth.focus_products.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-1">注目製品</p>
                          <ul className="list-disc list-inside space-y-1">
                            {booth.focus_products.map((product) => (
                              <li key={product}>{product}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {booth.highlight_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {booth.highlight_tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {booth.pre_research_status && (
                        <div>
                          <p className="text-muted-foreground mb-1">事前調査</p>
                          <p className="whitespace-pre-wrap">{booth.pre_research_status}</p>
                        </div>
                      )}

                      {booth.memo && (
                        <div>
                          <p className="text-muted-foreground mb-1">メモ</p>
                          <p className="whitespace-pre-wrap">{booth.memo}</p>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground flex gap-4">
                        <span>
                          登録: {new Date(booth.created_at).toLocaleString('ja-JP')}
                        </span>
                        <span>
                          更新: {new Date(booth.updated_at).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}










