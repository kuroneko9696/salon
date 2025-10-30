'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore, useDataStore } from '@/lib/store';
import type { BusinessCard } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const businessCards = useDataStore((state) => state.businessCards);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCards, setFilteredCards] = useState<BusinessCard[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = businessCards.filter(
        (card) =>
          card.full_name.toLowerCase().includes(query) ||
          card.company_name.toLowerCase().includes(query) ||
          card.departments?.some((dept) => dept.toLowerCase().includes(query))
      );
      setFilteredCards(filtered);
    } else {
      setFilteredCards(businessCards);
    }
  }, [searchQuery, businessCards]);

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">名刺管理</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{user.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* 検索バー */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="氏名、会社名、部署名で検索..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        {filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? '該当する名刺が見つかりません' : '名刺がまだ登録されていません'}
            </p>
            {!searchQuery && (
              <Button onClick={handleAddCard}>
                <Plus className="w-4 h-4 mr-2" />
                名刺を追加
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map((card) => (
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
                <CardContent>
                  {card.departments && card.departments.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {card.departments.join(' / ')}
                    </p>
                  )}
                  {card.titles && card.titles.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {card.titles.join(' / ')}
                    </p>
                  )}
                  {card.image_url && (
                    <div className="mt-3 aspect-video relative bg-slate-100 rounded overflow-hidden">
                      <img
                        src={card.image_url}
                        alt={`${card.full_name}の名刺`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* FAB (Floating Action Button) */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={handleAddCard}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
