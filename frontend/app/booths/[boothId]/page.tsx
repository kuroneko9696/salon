'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataStore } from '@/lib/store';
import type { Booth, Event } from '@/types';

interface BoothDetailParams {
  boothId: string;
}

export default function BoothDetailPage({
  params,
}: {
  params: Promise<BoothDetailParams>;
}) {
  const router = useRouter();
  const booths = useDataStore((state) => state.booths);
  const setBooths = useDataStore((state) => state.setBooths);
  const updateBooth = useDataStore((state) => state.updateBooth);
  const events = useDataStore((state) => state.events);
  const setEvents = useDataStore((state) => state.setEvents);
  const [boothId, setBoothId] = useState<string>('');
  const [booth, setBooth] = useState<Booth | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    contact_persons: '',
    focus_products: '',
    highlight_tags: '',
    pre_research_status: '',
    memo: '',
  });
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', []);

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setBoothId(resolved.boothId);
    };
    resolveParams();
  }, [params]);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${apiUrl}/events`);
      if (!response.ok) return;
      const data: Event[] = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchBooth = async (targetBoothId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${apiUrl}/booths/${targetBoothId}`);
      if (!response.ok) {
        throw new Error(`ブース情報の取得に失敗しました (${response.status})`);
      }
      const data: Booth = await response.json();
      setBooth(data);
      updateBooth(targetBoothId, data);
    } catch (error) {
      console.error('Failed to fetch booth:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'ブース情報の取得に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!boothId) return;

    let currentBooth = booths.find((item) => item.booth_id === boothId);
    if (currentBooth) {
      setBooth(currentBooth);
    } else {
      fetchBooth(boothId);
    }

    if (events.length === 0) {
      fetchEvents();
    }
  }, [boothId, booths, events.length]);

  useEffect(() => {
    if (!booth) return;

    const relatedEvent = events.find((item) => item.event_id === booth.event_id) || null;
    setEvent(relatedEvent);

    setFormState({
      contact_persons: booth.contact_persons.join('\n'),
      focus_products: booth.focus_products.join('\n'),
      highlight_tags: booth.highlight_tags.join(', '),
      pre_research_status: booth.pre_research_status ?? '',
      memo: booth.memo ?? '',
    });
  }, [booth, events]);

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!booth) return;

    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
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
      const response = await fetch(`${apiUrl}/booths/${booth.booth_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `ブース情報の更新に失敗しました (${response.status})`);
      }

      const updated: Booth = await response.json();
      setBooth(updated);
      updateBooth(updated.booth_id, updated);
    } catch (error) {
      console.error('Failed to update booth:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'ブース情報の更新に失敗しました'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!boothId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!booth) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-semibold">ブース詳細</h1>
            <div className="w-10" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 pb-24 max-w-3xl">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {errorMessage || 'ブース情報が見つかりません'}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">ブース詳細</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 max-w-3xl space-y-6">
        {errorMessage && (
          <Card>
            <CardContent className="py-4 text-sm text-red-500">{errorMessage}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{booth.name}</CardTitle>
            {event && (
              <p className="text-sm text-muted-foreground">{event.name}</p>
            )}
            {booth.booth_code && (
              <p className="text-sm text-muted-foreground">ブース番号: {booth.booth_code}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booth.location && <p>位置: {booth.location}</p>}

            {booth.highlight_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {booth.highlight_tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground flex gap-4">
              <span>登録: {new Date(booth.created_at).toLocaleString('ja-JP')}</span>
              <span>更新: {new Date(booth.updated_at).toLocaleString('ja-JP')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">情報を更新</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="detail-contacts">担当者 (1行1名)</Label>
              <Textarea
                id="detail-contacts"
                rows={3}
                value={formState.contact_persons}
                onChange={(e) => handleChange('contact_persons', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="detail-products">注目製品・サービス (1行1件)</Label>
              <Textarea
                id="detail-products"
                rows={3}
                value={formState.focus_products}
                onChange={(e) => handleChange('focus_products', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="detail-tags">ハイライトタグ (カンマ区切り)</Label>
              <Input
                id="detail-tags"
                value={formState.highlight_tags}
                onChange={(e) => handleChange('highlight_tags', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="detail-status">事前調査メモ</Label>
              <Textarea
                id="detail-status"
                rows={3}
                value={formState.pre_research_status}
                onChange={(e) => handleChange('pre_research_status', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="detail-memo">ブースメモ</Label>
              <Textarea
                id="detail-memo"
                rows={3}
                value={formState.memo}
                onChange={(e) => handleChange('memo', e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 更新中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> 更新する
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}










