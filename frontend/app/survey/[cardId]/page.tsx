'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useUserStore, useDataStore } from '@/lib/store';
import {
  DEMO_OPTIONS,
  NEEDS_OPTIONS,
  BACKGROUND_OPTIONS,
  HEAT_LEVEL_OPTIONS,
  POTENTIAL_OPTIONS,
  TIMEFRAME_OPTIONS,
  NEXT_ACTION_OPTIONS,
  type Meeting,
  type Booth,
  type BusinessCard,
} from '@/types';

export default function SurveyPage({ params }: { params: Promise<{ cardId: string }> }) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const businessCards = useDataStore((state) => state.businessCards);
  const addMeeting = useDataStore((state) => state.addMeeting);
  const events = useDataStore((state) => state.events);
  const getBoothsByEvent = useDataStore((state) => state.getBoothsByEvent);

  const [card, setCard] = useState<BusinessCard | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    q1_demo: [] as string[],
    q1_demo_other: '',
    q2_needs: [] as string[],
    q2_needs_other: '',
    q3_background: '',
    q3_background_memo: '',
    q4_heat_level: '',
    q5_potential: '',
    q6_timeframe: '',
    q7_next_action: '',
    q7_action_date: '',
    memo: '',
  });
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedBoothId, setSelectedBoothId] = useState<string>('');
  const [availableBooths, setAvailableBooths] = useState<Booth[]>([]);
  const [boothVisitMemo, setBoothVisitMemo] = useState('');
  const [followupTasksInput, setFollowupTasksInput] = useState('');

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCardId(resolvedParams.cardId);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!cardId) return;

    const foundCard = businessCards.find((c) => c.card_id === cardId);
    if (!foundCard) {
      router.push('/dashboard');
      return;
    }

    setCard(foundCard);
    setSelectedEventId(foundCard.event_id ?? '');
    setSelectedBoothId(foundCard.booth_id ?? '');
    setBoothVisitMemo(foundCard.visit_notes ?? '');
  }, [user, cardId, businessCards, router]);

  useEffect(() => {
    if (!selectedEventId) {
      setAvailableBooths([]);
      setSelectedBoothId('');
      return;
    }

    try {
      const booths = getBoothsByEvent(selectedEventId);
      setAvailableBooths(booths);
      if (booths.every((booth) => booth.booth_id !== selectedBoothId)) {
        setSelectedBoothId('');
      }
    } catch (error) {
      console.error('ブース情報の取得に失敗しました:', error);
      setAvailableBooths([]);
      setSelectedBoothId('');
    }
  }, [selectedEventId, selectedBoothId, getBoothsByEvent]);

  const handleCheckboxChange = (field: 'q1_demo' | 'q2_needs', value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleRadioChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!card || !user) return;

    // 必須項目のバリデーション
    if (!formData.q4_heat_level || !formData.q5_potential || !formData.q7_next_action) {
      alert('必須項目を入力してください (Q4, Q5, Q7)');
      return;
    }

    // その他の項目を含める
    const q1Final = [...formData.q1_demo];
    if (formData.q1_demo_other) {
      q1Final.push(`その他: ${formData.q1_demo_other}`);
    }

    const q2Final = [...formData.q2_needs];
    if (formData.q2_needs_other) {
      q2Final.push(`その他: ${formData.q2_needs_other}`);
    }

    const followupTasks = followupTasksInput
      .split('\n')
      .map((task) => task.trim())
      .filter(Boolean);

    const nowIso = new Date().toISOString();

    const meeting: Meeting = {
      meeting_id: crypto.randomUUID(),
      card_id: card.card_id,
      event_id: selectedEventId || null,
      booth_id: selectedBoothId || null,
      q1_demo: q1Final.length > 0 ? q1Final : null,
      q2_needs: q2Final.length > 0 ? q2Final : null,
      q3_background: formData.q3_background,
      q3_background_memo: formData.q3_background_memo || undefined,
      q4_heat_level: formData.q4_heat_level as 'A' | 'B' | 'C' | 'D',
      q5_potential: formData.q5_potential as '高' | '中' | '低' | '不明',
      q6_timeframe:
        formData.q6_timeframe as 'すぐにでも' | '半年以内' | '1年以内' | '未定' | undefined,
      q7_next_action: formData.q7_next_action,
      q7_action_date: formData.q7_action_date
        ? new Date(formData.q7_action_date).toISOString()
        : null,
      memo: formData.memo || undefined,
      booth_visit_memo: boothVisitMemo || null,
      followup_tasks: followupTasks.length > 0 ? followupTasks : undefined,
      created_at: nowIso,
      updated_at: nowIso,
    };

    addMeeting(meeting);
    router.push('/dashboard');
  };

  if (!user || !card) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-semibold">商談管理アンケート</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6 pb-24 max-w-3xl">
        {/* 名刺情報表示 */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-start gap-4">
            {card.image_url && (
              <img
                src={card.image_url}
                alt="名刺"
                className="w-24 h-16 object-contain bg-slate-50 rounded"
              />
            )}
            <div className="flex-1">
              <h2 className="font-semibold">{card.full_name}</h2>
              <p className="text-sm text-muted-foreground">{card.company_name}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Q1: 最も関心を示した技術デモ */}
          <div className="bg-white rounded-lg border p-6">
          <Label className="text-base font-semibold mb-4 block">展示会コンテキスト</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="event_id" className="flex items-center justify-between">
                <span>参加イベント</span>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto text-xs"
                  onClick={() => router.push('/events')}
                >
                  管理ページへ
                </Button>
              </Label>
              <select
                id="event_id"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">未選択</option>
                {events.map((event) => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="booth_id">訪問ブース</Label>
              <select
                id="booth_id"
                value={selectedBoothId}
                onChange={(e) => setSelectedBoothId(e.target.value)}
                disabled={!selectedEventId}
                className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <option value="">
                  {selectedEventId ? '未選択' : 'イベントを選択してください'}
                </option>
                {availableBooths.map((booth) => (
                  <option key={booth.booth_id} value={booth.booth_id}>
                    {booth.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="boothMemo">ブース訪問メモ</Label>
              <Textarea
                id="boothMemo"
                value={boothVisitMemo}
                onChange={(e) => setBoothVisitMemo(e.target.value)}
                placeholder="展示内容や担当者のコメントなどを記録"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="followupTasks">フォローアップタスク候補 (1行1タスク)</Label>
              <Textarea
                id="followupTasks"
                value={followupTasksInput}
                onChange={(e) => setFollowupTasksInput(e.target.value)}
                placeholder={`例:\n・翌週中に提案資料を送付\n・PoCの要件確認ミーティングを調整`}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
            <Label className="text-base font-semibold mb-4 block">
              Q1. 最も関心を示した技術デモ (複数選択可)
            </Label>
            <div className="space-y-3">
              {DEMO_OPTIONS.map((option) => (
                <div key={option} className="flex items-start space-x-3">
                  <Checkbox
                    id={`demo-${option}`}
                    checked={formData.q1_demo.includes(option)}
                    onCheckedChange={() => handleCheckboxChange('q1_demo', option)}
                  />
                  <Label htmlFor={`demo-${option}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
              <div className="mt-2">
                <Input
                  placeholder="その他 (自由記述)"
                  value={formData.q1_demo_other}
                  onChange={(e) => handleInputChange('q1_demo_other', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Q2: 顧客の主な課題・ニーズ */}
          <div className="bg-white rounded-lg border p-6">
            <Label className="text-base font-semibold mb-4 block">
              Q2. 顧客の主な課題・ニーズ (複数選択可)
            </Label>
            <div className="space-y-3">
              {NEEDS_OPTIONS.map((option) => (
                <div key={option} className="flex items-start space-x-3">
                  <Checkbox
                    id={`needs-${option}`}
                    checked={formData.q2_needs.includes(option)}
                    onCheckedChange={() => handleCheckboxChange('q2_needs', option)}
                  />
                  <Label htmlFor={`needs-${option}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
              <div className="mt-2">
                <Input
                  placeholder="その他 (自由記述)"
                  value={formData.q2_needs_other}
                  onChange={(e) => handleInputChange('q2_needs_other', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Q3: 関心の背景・具体的な相談内容 */}
          <div className="bg-white rounded-lg border p-6">
            <Label className="text-base font-semibold mb-4 block">
              Q3. 関心の背景・具体的な相談内容 (単一選択)
            </Label>
            <RadioGroup
              value={formData.q3_background}
              onValueChange={(value) => handleRadioChange('q3_background', value)}
            >
              {BACKGROUND_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={`bg-${option.value}`} />
                  <Label htmlFor={`bg-${option.value}`} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formData.q3_background === 'A' && (
              <div className="mt-4">
                <Input
                  placeholder="自社の「〇〇」に活用できそう (具体的に記入)"
                  value={formData.q3_background_memo}
                  onChange={(e) => handleInputChange('q3_background_memo', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Q4: 顧客の熱量・反応 */}
          <div className="bg-white rounded-lg border p-6">
            <Label className="text-base font-semibold mb-4 block">
              Q4. 顧客の熱量・反応 (単一選択) <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.q4_heat_level}
              onValueChange={(value) => handleRadioChange('q4_heat_level', value)}
            >
              {HEAT_LEVEL_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={`heat-${option.value}`} />
                  <Label htmlFor={`heat-${option.value}`} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Q5: 協業・案件化の可能性 */}
          <div className="bg-white rounded-lg border p-6">
            <Label className="text-base font-semibold mb-4 block">
              Q5. 協業・案件化の可能性 (単一選択) <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.q5_potential}
              onValueChange={(value) => handleRadioChange('q5_potential', value)}
            >
              {POTENTIAL_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={`potential-${option.value}`} />
                  <Label htmlFor={`potential-${option.value}`} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Q6: 時期感 (Q5で「高」の場合のみ表示) */}
          {formData.q5_potential === '高' && (
            <div className="bg-white rounded-lg border p-6">
              <Label className="text-base font-semibold mb-4 block">
                Q6. 時期感 (単一選択)
              </Label>
              <RadioGroup
                value={formData.q6_timeframe}
                onValueChange={(value) => handleRadioChange('q6_timeframe', value)}
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={option.value} id={`time-${option.value}`} />
                    <Label htmlFor={`time-${option.value}`} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Q7: 次のアクション */}
          <div className="bg-white rounded-lg border p-6">
            <Label className="text-base font-semibold mb-4 block">
              Q7. 次のアクション (単一選択) <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.q7_next_action}
              onValueChange={(value) => handleRadioChange('q7_next_action', value)}
            >
              {NEXT_ACTION_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={`action-${option.value}`} />
                  <Label htmlFor={`action-${option.value}`} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formData.q7_next_action === 'アポ設定済み' && (
              <div className="mt-4">
                <Label htmlFor="action-date">アポ日時</Label>
                <Input
                  id="action-date"
                  type="date"
                  value={formData.q7_action_date}
                  onChange={(e) => handleInputChange('q7_action_date', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 自由記述欄 */}
          <div className="bg-white rounded-lg border p-6">
            <Label htmlFor="memo" className="text-base font-semibold mb-4 block">
              特記事項・会話メモ
            </Label>
            <Textarea
              id="memo"
              placeholder="展示会での会話内容や特記事項を自由に記入してください..."
              rows={6}
              value={formData.memo}
              onChange={(e) => handleInputChange('memo', e.target.value)}
            />
          </div>
        </div>
      </main>

      {/* 固定フッター */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="container mx-auto max-w-3xl">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={!formData.q4_heat_level || !formData.q5_potential || !formData.q7_next_action}
            className="w-full"
          >
            <Save className="w-5 h-5 mr-2" />
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
