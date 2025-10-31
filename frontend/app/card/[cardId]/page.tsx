'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore, useDataStore } from '@/lib/store';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { StructuredReportDisplay, SearchQueriesList, SourcesList } from '@/components/StructuredReportDisplay';

export default function CardDetailPage({ params }: { params: Promise<{ cardId: string }> }) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const businessCards = useDataStore((state) => state.businessCards);
  const getMeetingByCardId = useDataStore((state) => state.getMeetingByCardId);
  const deleteBusinessCard = useDataStore((state) => state.deleteBusinessCard);

  const [card, setCard] = useState<any>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ title: string; url: string; snippet?: string }>>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
    const foundMeeting = getMeetingByCardId(cardId);
    setMeeting(foundMeeting);
  }, [user, cardId, businessCards, getMeetingByCardId, router]);

  const handleDeleteCard = () => {
    if (!cardId) return;
    deleteBusinessCard(cardId);
    router.push('/dashboard');
  };

  const handleGenerateReport = async () => {
    if (!card) return;

    setIsGeneratingReport(true);

    try {
      // バックエンドAPIを呼び出してDeepリサーチレポートを生成
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/deep-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: card.company_name,
          company_url: card.company_url,
          address: card.address,
          departments: card.departments,
          demo_interests: meeting?.q1_demo,
          customer_needs: meeting?.q2_needs,
          heat_level: meeting?.q4_heat_level,
          potential: meeting?.q5_potential,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setReport(data.report);
      setSources(data.sources || []);
      setSearchQueries(data.search_queries || []);
    } catch (error) {
      console.error('レポート生成に失敗しました:', error);
      alert('レポート生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGeneratingReport(false);
    }
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
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-semibold">名刺詳細</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        <Tabs defaultValue="card" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="card">名刺情報</TabsTrigger>
            <TabsTrigger value="meeting">商談メモ</TabsTrigger>
            <TabsTrigger value="research">Deepリサーチ</TabsTrigger>
          </TabsList>

          {/* タブ1: 名刺情報 */}
          <TabsContent value="card" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>名刺画像</CardTitle>
              </CardHeader>
              <CardContent>
                {card.image_url && (
                  <div className="bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={card.image_url}
                      alt="名刺"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>スキャン結果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">会社名</p>
                  <p className="text-base">{card.company_name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">氏名</p>
                  <p className="text-base">{card.full_name}</p>
                  {card.name_reading && (
                    <p className="text-sm text-muted-foreground">{card.name_reading}</p>
                  )}
                </div>
                {card.departments && card.departments.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">部署</p>
                    <p className="text-base">{card.departments.join(' / ')}</p>
                  </div>
                )}
                {card.titles && card.titles.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">役職</p>
                    <p className="text-base">{card.titles.join(' / ')}</p>
                  </div>
                )}
                {card.email && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">メール</p>
                    <p className="text-base">{card.email}</p>
                  </div>
                )}
                {card.company_url && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">会社URL</p>
                    <a
                      href={card.company_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-blue-600 hover:underline"
                    >
                      {card.company_url}
                    </a>
                  </div>
                )}
                {card.address && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">住所</p>
                    <p className="text-base">{card.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* タブ2: 商談メモ */}
          <TabsContent value="meeting" className="space-y-4 mt-4">
            {meeting ? (
              <>
                {meeting.q1_demo && meeting.q1_demo.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Q1. 関心を示した技術デモ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1">
                        {meeting.q1_demo.map((demo: string, idx: number) => (
                          <li key={idx}>{demo}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {meeting.q2_needs && meeting.q2_needs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Q2. 顧客の課題・ニーズ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1">
                        {meeting.q2_needs.map((need: string, idx: number) => (
                          <li key={idx}>{need}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Q3. 関心の背景</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{meeting.q3_background || 'なし'}</p>
                    {meeting.q3_background_memo && (
                      <p className="mt-2 text-muted-foreground">{meeting.q3_background_memo}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Q4. 顧客の熱量・反応</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{meeting.q4_heat_level}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Q5. 協業・案件化の可能性</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{meeting.q5_potential}</p>
                    {meeting.q6_timeframe && (
                      <p className="mt-2 text-muted-foreground">時期感: {meeting.q6_timeframe}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Q7. 次のアクション</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{meeting.q7_next_action}</p>
                    {meeting.q7_action_date && (
                      <p className="mt-2 text-muted-foreground">
                        日時: {new Date(meeting.q7_action_date).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {meeting.memo && (
                  <Card>
                    <CardHeader>
                      <CardTitle>特記事項・会話メモ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{meeting.memo}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">商談メモがまだ登録されていません</p>
                  <Button onClick={() => router.push(`/survey/${card.card_id}`)}>
                    <Edit className="w-4 h-4 mr-2" />
                    商談メモを追加
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* タブ3: Deepリサーチ */}
          <TabsContent value="research" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Deepリサーチレポート</CardTitle>
              </CardHeader>
              <CardContent>
                {!report ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Google検索でgroundingされたAIによる、最新かつ正確な企業分析とアプローチ提案を生成します。
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      • 企業の基本情報と最新動向<br />
                      • プレスリリース・ニュース<br />
                      • 部署の役割分析<br />
                      • 推奨アプローチ
                    </p>
                    <Button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          レポート生成実行
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* レポート本文 - 構造化表示 */}
                    <div>
                      <StructuredReportDisplay reportText={report} />
                    </div>

                    {/* 検索クエリ */}
                    {searchQueries.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base md:text-lg">使用された検索クエリ</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <SearchQueriesList queries={searchQueries} />
                        </CardContent>
                      </Card>
                    )}

                    {/* ソース情報 */}
                    {sources.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base md:text-lg">情報源（参照URL）</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <SourcesList sources={sources} />
                        </CardContent>
                      </Card>
                    )}

                    {/* 再生成ボタン */}
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="w-full"
                      >
                        {isGeneratingReport ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            レポートを再生成
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteCard}
        title="この名刺を削除しますか?"
        description="削除すると、この名刺に関連する商談メモやレポートも全て削除されます。この操作は取り消せません。"
      />
    </div>
  );
}
