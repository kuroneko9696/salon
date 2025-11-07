'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Loader2,
  MessageSquare,
  Lightbulb,
  Sparkles,
  Plus,
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
  VisitNote,
  VisitNoteDraft,
  KeywordNote,
  KeywordNoteDraft,
  TargetCompany,
} from '@/types';
import { NOTE_TYPE_OPTIONS } from '@/types';

interface Params {
  eventId: string;
}

interface NoteFormState {
  note_type: VisitNoteDraft['note_type'];
  target_company_id: string;
  content: string;
  title: string;
  keywords: string;
  highlight: boolean;
  created_by: string;
  file?: File | null;
}

const defaultNoteForm: NoteFormState = {
  note_type: 'conversation',
  target_company_id: '',
  content: '',
  title: '',
  keywords: '',
  highlight: false,
  created_by: '',
  file: null,
};

const defaultKeywordForm: { keyword: string; context: string } = {
  keyword: '',
  context: '',
};

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

export default function EventActivePage({
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
  const keywordNotes = useDataStore((state) => state.keywordNotes);
  const setKeywordNotes = useDataStore((state) => state.setKeywordNotes);
  const targetCompanies = useDataStore((state) => state.targetCompanies);
  const setTargetCompanies = useDataStore((state) => state.setTargetCompanies);
  const setUploadedImage = useDataStore((state) => state.setUploadedImage);

  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [noteForm, setNoteForm] = useState<NoteFormState>(defaultNoteForm);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [keywordForm, setKeywordForm] = useState(defaultKeywordForm);
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [suggestLoadingId, setSuggestLoadingId] = useState<string | null>(null);
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
        const [eventRes, notesRes, keywordsRes, targetsRes] = await Promise.all([
          fetch(`${apiUrl}/events/${id}`),
          fetch(`${apiUrl}/events/${id}/notes`),
          fetch(`${apiUrl}/events/${id}/keywords`),
          fetch(`${apiUrl}/target-companies?event_id=${encodeURIComponent(id)}`),
        ]);

        if (!eventRes.ok) throw new Error('イベント情報の取得に失敗しました');
        if (!notesRes.ok) throw new Error('来場ノートの取得に失敗しました');
        if (!keywordsRes.ok) throw new Error('キーワードの取得に失敗しました');
        if (!targetsRes.ok) throw new Error('ターゲット企業の取得に失敗しました');

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

        const keywordData: KeywordNote[] = await keywordsRes.json();
        setKeywordNotes([
          ...useDataStore
            .getState()
            .keywordNotes.filter((note) => note.event_id !== id),
          ...keywordData,
        ]);

        const targetsData: TargetCompany[] = await targetsRes.json();
        setTargetCompanies([
          ...useDataStore
            .getState()
            .targetCompanies.filter((target) => target.event_id !== id),
          ...targetsData,
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
    [apiUrl, setKeywordNotes, setTargetCompanies, setVisitNotes, updateEvent]
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

  const linkedTargets = targetCompanies.filter(
    (target) => target.event_id === eventId
  );
  const linkedNotes = visitNotes
    .filter((note) => note.event_id === eventId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  const linkedKeywords = keywordNotes
    .filter((note) => note.event_id === eventId)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  const handleNoteFormChange = (
    field: keyof NoteFormState,
    value: string | boolean | File | null
  ) => {
    setNoteForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateNote = async () => {
    if (!eventId || !noteForm.content.trim()) {
      setErrorMessage('メモの内容を入力してください');
      return;
    }
    setIsSavingNote(true);
    setErrorMessage(null);
    try {
      let imageIds: string[] = [];
      if (noteForm.file) {
        const base64 = await fileToBase64(noteForm.file);
        const uploadRes = await fetch(`${apiUrl}/upload/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: noteForm.file.name,
            media_type: noteForm.file.type,
            content_base64: base64,
            metadata: { source: 'active-note' },
          }),
        });
        if (!uploadRes.ok) {
          throw new Error('画像のアップロードに失敗しました');
        }
        const uploadData = await uploadRes.json();
        imageIds = [uploadData.image_id];
        setUploadedImage({
          image_id: uploadData.image_id,
          filename: noteForm.file.name,
          media_type: noteForm.file.type,
          content_base64: base64,
          metadata: { source: 'active-note' },
          created_at: new Date().toISOString(),
        });
      }

      const payload: VisitNoteDraft = {
        event_id: eventId,
        target_company_id: noteForm.target_company_id || null,
        title: noteForm.title || null,
        note_type: noteForm.note_type,
        content: noteForm.content.trim(),
        image_ids: imageIds,
        keywords: noteForm.keywords
          ? noteForm.keywords.split(',').map((k) => k.trim()).filter(Boolean)
          : [],
        highlight: noteForm.highlight,
        created_by: noteForm.created_by || user?.email || null,
      };

      const response = await fetch(`${apiUrl}/events/${eventId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: 'ノートの作成に失敗しました' }));
        throw new Error(message.detail || 'ノートの作成に失敗しました');
      }
      const created: VisitNote = await response.json();
      const current = useDataStore.getState().visitNotes;
      setVisitNotes([
        created,
        ...current.filter(
          (note) => note.visit_note_id !== created.visit_note_id
        ),
      ]);
      setNoteForm(defaultNoteForm);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'ノートの作成に失敗しました'
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCreateKeyword = async () => {
    if (!eventId || !keywordForm.keyword.trim()) {
      setErrorMessage('キーワードを入力してください');
      return;
    }
    setIsSavingKeyword(true);
    setErrorMessage(null);
    try {
      const payload: KeywordNoteDraft = {
        event_id: eventId,
        target_company_id: noteForm.target_company_id || null,
        keyword: keywordForm.keyword.trim(),
        context: keywordForm.context.trim() || null,
        ai_suggestions: [],
        status: 'open',
      };
      const response = await fetch(`${apiUrl}/events/${eventId}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: 'キーワードの登録に失敗しました' }));
        throw new Error(message.detail || 'キーワードの登録に失敗しました');
      }
      const created: KeywordNote = await response.json();
      const current = useDataStore.getState().keywordNotes;
      setKeywordNotes([
        created,
        ...current.filter(
          (note) => note.keyword_note_id !== created.keyword_note_id
        ),
      ]);
      setKeywordForm(defaultKeywordForm);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'キーワードの登録に失敗しました'
      );
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const requestSuggestions = async (keyword: KeywordNote) => {
    setSuggestLoadingId(keyword.keyword_note_id);
    try {
      const response = await fetch(
        `${apiUrl}/keywords/${keyword.keyword_note_id}/suggest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ additional_context: '' }),
        }
      );
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ detail: 'AI提案の取得に失敗しました' }));
        throw new Error(message.detail || 'AI提案の取得に失敗しました');
      }
      const data = await response.json();
      const updated: KeywordNote = {
        ...keyword,
        ai_suggestions: data.suggestions,
        updated_at: new Date().toISOString(),
      };
      const current = useDataStore.getState().keywordNotes;
      setKeywordNotes(
        current.map((item) =>
          item.keyword_note_id === keyword.keyword_note_id ? updated : item
        )
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'AI提案の取得に失敗しました'
      );
    } finally {
      setSuggestLoadingId(null);
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
            <h1 className="text-lg font-semibold">来場中キャプチャ</h1>
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
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 更新中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> 最新状態を取得
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

        {/* クイックノート */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">クイックノート作成</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  メモ種別
                </label>
                <select
                  value={noteForm.note_type}
                  onChange={(e) =>
                    handleNoteFormChange('note_type', e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {NOTE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  対象ターゲット
                </label>
                <select
                  value={noteForm.target_company_id}
                  onChange={(e) =>
                    handleNoteFormChange('target_company_id', e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">未選択</option>
                  {linkedTargets.map((target) => (
                    <option
                      key={target.target_company_id}
                      value={target.target_company_id}
                    >
                      {target.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                メモタイトル (任意)
              </label>
              <Input
                value={noteForm.title}
                onChange={(e) => handleNoteFormChange('title', e.target.value)}
                placeholder="例: 製品デモの反応"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">内容 *</label>
              <Textarea
                rows={4}
                value={noteForm.content}
                onChange={(e) =>
                  handleNoteFormChange('content', e.target.value)
                }
                placeholder="現場での会話内容や印象を記録..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  キーワード (カンマ区切り)
                </label>
                <Input
                  value={noteForm.keywords}
                  onChange={(e) =>
                    handleNoteFormChange('keywords', e.target.value)
                  }
                  placeholder="例: PoC, 画像解析"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  担当者 (任意)
                </label>
                <Input
                  value={noteForm.created_by}
                  onChange={(e) =>
                    handleNoteFormChange('created_by', e.target.value)
                  }
                  placeholder="自分の名前やメールアドレス"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={noteForm.highlight}
                  onChange={(e) =>
                    handleNoteFormChange('highlight', e.target.checked)
                  }
                />
                ハイライトに追加
              </label>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">写真添付 (任意)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleNoteFormChange(
                      'file',
                      e.target.files && e.target.files[0] ? e.target.files[0] : null
                    )
                  }
                />
              </div>
              {noteForm.file && (
                <span className="text-xs text-muted-foreground">
                  {noteForm.file.name}
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCreateNote} disabled={isSavingNote}>
                {isSavingNote ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 保存中...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" /> ノートを保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* キーワード */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">疑問・キーワードメモ</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  キーワード *
                </label>
                <Input
                  value={keywordForm.keyword}
                  onChange={(e) =>
                    setKeywordForm((prev) => ({ ...prev, keyword: e.target.value }))
                  }
                  placeholder="例: PoCの期間、料金体系"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  文脈・補足
                </label>
                <Input
                  value={keywordForm.context}
                  onChange={(e) =>
                    setKeywordForm((prev) => ({ ...prev, context: e.target.value }))
                  }
                  placeholder="状況や背景をメモ..."
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateKeyword} disabled={isSavingKeyword}>
                {isSavingKeyword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 登録中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> キーワードを追加
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 text-sm font-medium">
                登録済みキーワード
              </div>
              {linkedKeywords.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  まだキーワードが登録されていません。
                </div>
              ) : (
                <ul className="divide-y">
                  {linkedKeywords.map((keyword) => (
                    <li key={keyword.keyword_note_id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <strong>{keyword.keyword}</strong>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => requestSuggestions(keyword)}
                          disabled={suggestLoadingId === keyword.keyword_note_id}
                        >
                          {suggestLoadingId === keyword.keyword_note_id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              分析中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              AI提案
                            </>
                          )}
                        </Button>
                      </div>
                      {keyword.context && (
                        <p className="text-xs text-muted-foreground">
                          {keyword.context}
                        </p>
                      )}
                      {keyword.ai_suggestions && keyword.ai_suggestions.length > 0 && (
                        <div className="bg-slate-100 rounded px-3 py-2 text-sm space-y-1">
                          {keyword.ai_suggestions.map((suggestion, index) => (
                            <p key={index}>• {suggestion}</p>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ノート一覧 */}
        <section className="bg-white border rounded-lg shadow-sm">
          <div className="border-b px-5 py-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold">登録済みノート ({linkedNotes.length}件)</h2>
          </div>
          {linkedNotes.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground">
              まだノートが登録されていません。現場での気づきを素早く記録して共有しましょう。
            </div>
          ) : (
            <div className="divide-y">
              {linkedNotes.map((note) => (
                <div key={note.visit_note_id} className="px-5 py-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        [{NOTE_TYPE_OPTIONS.find((opt) => opt.value === note.note_type)?.label ||
                          note.note_type}]
                        {note.title || '（タイトル未設定）'}
                        {note.highlight && (
                          <Badge variant="default" className="bg-amber-500">
                            ハイライト
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                      {note.target_company_id && (
                        <p className="text-xs text-muted-foreground">
                          対象:{' '}
                          {
                            linkedTargets.find(
                              (target) => target.target_company_id === note.target_company_id
                            )?.name
                          }
                        </p>
                      )}
                    </div>
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
          )}
        </section>
      </main>
    </div>
  );
}
