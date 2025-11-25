'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Camera,
  ExternalLink,
  Lightbulb,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataStore, useUserStore } from '@/lib/store';
import type { Event, VisitNote, VisitNoteDraft } from '@/types';

interface Params {
  eventId: string;
}

interface DiscoveryFormState {
  company_name: string;
  product_name: string;
  booth_code: string;
  website_url: string;
  content: string;
  interest_level: 'high' | 'medium' | 'low';
  keywords: string;
  highlight: boolean;
  file?: File | null;
}

const defaultForm: DiscoveryFormState = {
  company_name: '',
  product_name: '',
  booth_code: '',
  website_url: '',
  content: '',
  interest_level: 'medium',
  keywords: '',
  highlight: false,
  file: null,
};

const INTEREST_OPTIONS = [
  { value: 'high', label: '高', color: 'bg-red-500' },
  { value: 'medium', label: '中', color: 'bg-amber-500' },
  { value: 'low', label: '低', color: 'bg-slate-400' },
] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DiscoveryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const events = useDataStore((state) => state.events);
  const updateEvent = useDataStore((state) => state.updateEvent);
  const visitNotes = useDataStore((state) => state.visitNotes);
  const setVisitNotes = useDataStore((state) => state.setVisitNotes);
  const setUploadedImage = useDataStore((state) => state.setUploadedImage);

  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<DiscoveryFormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
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

  const fetchEventContext = useCallback(
    async (id: string) => {
      try {
        const [eventRes, notesRes] = await Promise.all([
          fetch(`${apiUrl}/events/${id}`),
          fetch(`${apiUrl}/events/${id}/notes`),
        ]);

        if (!eventRes.ok) throw new Error('イベント情報の取得に失敗しました');
        if (!notesRes.ok) throw new Error('ノートの取得に失敗しました');

        const eventData: Event = await eventRes.json();
        updateEvent(id, eventData);
        setEvent(eventData);

        const notesData: VisitNote[] = await notesRes.json();
        setVisitNotes([
          ...useDataStore
            .getState()
            .visitNotes.filter((note) => note.event_id !== id),
          ...notesData,
        ]);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'コンテキスト情報の取得に失敗しました'
        );
      }
    },
    [apiUrl, setVisitNotes, updateEvent]
  );

  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);
    fetchEventContext(eventId).finally(() => setIsLoading(false));
  }, [eventId, fetchEventContext]);

  useEffect(() => {
    if (!eventId) return;
    const stored = events.find((item) => item.event_id === eventId);
    if (stored) {
      setEvent(stored);
    }
  }, [eventId, events]);

  // discovery タイプのノートのみをフィルタリング
  const discoveryNotes = visitNotes
    .filter((note) => note.event_id === eventId && note.note_type === 'other')
    .filter((note) => note.title?.startsWith('[発見]'))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const handleFormChange = (
    field: keyof DiscoveryFormState,
    value: string | boolean | File | null
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!eventId) return;
    if (!form.company_name.trim() && !form.product_name.trim()) {
      setErrorMessage('会社名またはプロダクト名を入力してください');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let imageIds: string[] = [];
      if (form.file) {
        const base64 = await fileToBase64(form.file);
        const uploadRes = await fetch(`${apiUrl}/upload/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: form.file.name,
            media_type: form.file.type,
            content_base64: base64,
            metadata: { source: 'discovery' },
          }),
        });
        if (!uploadRes.ok) {
          throw new Error('画像のアップロードに失敗しました');
        }
        const uploadData = await uploadRes.json();
        imageIds = [uploadData.image_id];
        setUploadedImage({
          image_id: uploadData.image_id,
          filename: form.file.name,
          media_type: form.file.type,
          content_base64: base64,
          metadata: { source: 'discovery' },
          created_at: new Date().toISOString(),
        });
      }

      // タイトルを構築
      const titleParts = ['[発見]'];
      if (form.company_name) titleParts.push(form.company_name);
      if (form.product_name) titleParts.push(`- ${form.product_name}`);
      const title = titleParts.join(' ');

      // 内容を構築（メタ情報を含む）
      const contentParts = [];
      if (form.booth_code) contentParts.push(`ブース: ${form.booth_code}`);
      if (form.website_url) contentParts.push(`URL: ${form.website_url}`);
      contentParts.push(`興味度: ${INTEREST_OPTIONS.find(o => o.value === form.interest_level)?.label}`);
      contentParts.push('');
      contentParts.push(form.content || '(メモなし)');

      const payload: VisitNoteDraft = {
        event_id: eventId,
        target_company_id: null,
        title,
        note_type: 'other',
        content: contentParts.join('\n'),
        image_ids: imageIds,
        keywords: form.keywords
          ? [...form.keywords.split(',').map((k) => k.trim()).filter(Boolean), '発見']
          : ['発見'],
        highlight: form.highlight,
        created_by: user?.email || null,
      };

      const response = await fetch(`${apiUrl}/events/${eventId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: '発見レポートの保存に失敗しました' }));
        throw new Error(message.detail || '発見レポートの保存に失敗しました');
      }

      const created: VisitNote = await response.json();
      const current = useDataStore.getState().visitNotes;
      setVisitNotes([
        created,
        ...current.filter((note) => note.visit_note_id !== created.visit_note_id),
      ]);
      setForm(defaultForm);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : '発見レポートの保存に失敗しました'
      );
    } finally {
      setIsSaving(false);
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
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              プロダクト発見レポート
            </h1>
            <p className="text-sm text-muted-foreground">
              {event?.name || 'イベント情報を読み込み中...'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => eventId && fetchEventContext(eventId)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 space-y-6 max-w-3xl">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}

        {/* 説明 */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <p className="text-sm text-amber-800">
              <strong>名刺交換なしでも</strong>、展示会で見つけた興味深い会社やプロダクトを記録できます。
              後で詳しく調べたい情報をすばやくメモしておきましょう。
            </p>
          </CardContent>
        </Card>

        {/* 入力フォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-5 h-5" />
              新しい発見を記録
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  会社名
                </label>
                <Input
                  value={form.company_name}
                  onChange={(e) => handleFormChange('company_name', e.target.value)}
                  placeholder="例: 株式会社サンプル"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  プロダクト名
                </label>
                <Input
                  value={form.product_name}
                  onChange={(e) => handleFormChange('product_name', e.target.value)}
                  placeholder="例: AI画像解析ツール"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">ブース番号</label>
                <Input
                  value={form.booth_code}
                  onChange={(e) => handleFormChange('booth_code', e.target.value)}
                  placeholder="例: A-123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  WebサイトURL
                </label>
                <Input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => handleFormChange('website_url', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">興味度</label>
              <div className="flex gap-2">
                {INTEREST_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleFormChange('interest_level', option.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      form.interest_level === option.value
                        ? `${option.color} text-white border-transparent`
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        form.interest_level === option.value ? 'fill-current' : ''
                      }`}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                メモ・気づき
              </label>
              <Textarea
                rows={4}
                value={form.content}
                onChange={(e) => handleFormChange('content', e.target.value)}
                placeholder="なぜ興味を持ったか、特徴、後で調べたいことなど..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                タグ (カンマ区切り)
              </label>
              <Input
                value={form.keywords}
                onChange={(e) => handleFormChange('keywords', e.target.value)}
                placeholder="例: AI, 画像解析, SaaS"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.highlight}
                  onChange={(e) => handleFormChange('highlight', e.target.checked)}
                  className="w-4 h-4"
                />
                <Sparkles className="w-4 h-4 text-amber-500" />
                ハイライトに追加
              </label>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">写真添付</label>
                <Input
                  type="file"
                  accept="image/*"
                  className="max-w-[200px]"
                  onChange={(e) =>
                    handleFormChange(
                      'file',
                      e.target.files && e.target.files[0] ? e.target.files[0] : null
                    )
                  }
                />
              </div>
              {form.file && (
                <span className="text-xs text-muted-foreground">
                  {form.file.name}
                </span>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    発見を記録
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 発見一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              記録済みの発見 ({discoveryNotes.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {discoveryNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>まだ発見が記録されていません</p>
                <p className="text-sm">展示会で見つけた興味深いプロダクトを記録しましょう</p>
              </div>
            ) : (
              <div className="space-y-3">
                {discoveryNotes.map((note) => (
                  <div
                    key={note.visit_note_id}
                    className="border rounded-lg p-4 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          {note.title?.replace('[発見] ', '')}
                          {note.highlight && (
                            <Badge variant="default" className="bg-amber-500">
                              ハイライト
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(note.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap text-muted-foreground">
                      {note.content}
                    </p>
                    {note.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
