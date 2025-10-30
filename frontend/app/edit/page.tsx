'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCardRegistrationStore, useUserStore, useDataStore } from '@/lib/store';
import type { BusinessCard } from '@/types';

export default function EditPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const capturedImage = useCardRegistrationStore((state) => state.capturedImage);
  const scanResult = useCardRegistrationStore((state) => state.scanResult);
  const setCurrentStep = useCardRegistrationStore((state) => state.setCurrentStep);
  const addBusinessCard = useDataStore((state) => state.addBusinessCard);

  const [formData, setFormData] = useState({
    company_name: '',
    departments: '',
    titles: '',
    full_name: '',
    name_reading: '',
    email: '',
    company_url: '',
    address: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!capturedImage || !scanResult) {
      router.push('/camera');
      return;
    }

    setCurrentStep('edit');

    // スキャン結果をコンソールに出力（edit ページでも確認できるように）
    console.log('=== Edit ページ: スキャン結果を受信 ===');
    console.log('会社名:', scanResult.company_name);
    console.log('部署:', scanResult.departments);
    console.log('役職:', scanResult.titles);
    console.log('氏名:', scanResult.full_name);
    console.log('読み方:', scanResult.name_reading);
    console.log('メール:', scanResult.email);
    console.log('URL:', scanResult.company_url);
    console.log('住所:', scanResult.address);
    console.log('生データ:', scanResult);

    // スキャン結果をフォームに反映
    setFormData({
      company_name: scanResult.company_name || '',
      departments: scanResult.departments?.join(', ') || '',
      titles: scanResult.titles?.join(', ') || '',
      full_name: scanResult.full_name || '',
      name_reading: scanResult.name_reading || '',
      email: scanResult.email || '',
      company_url: scanResult.company_url || '',
      address: scanResult.address || '',
    });
  }, [user, capturedImage, scanResult, router]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!user || !capturedImage) return;

    // 名刺データを作成
    const newCard: BusinessCard = {
      card_id: crypto.randomUUID(),
      user_id: user.user_id,
      image_url: capturedImage,
      company_name: formData.company_name,
      departments: formData.departments
        ? formData.departments.split(',').map((d) => d.trim())
        : null,
      titles: formData.titles ? formData.titles.split(',').map((t) => t.trim()) : null,
      full_name: formData.full_name,
      name_reading: formData.name_reading || undefined,
      email: formData.email || undefined,
      company_url: formData.company_url || undefined,
      address: formData.address || undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // データストアに保存
    addBusinessCard(newCard);

    // 商談メモ画面に遷移
    router.push(`/survey/${newCard.card_id}`);
  };

  if (!user || !capturedImage || !scanResult) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-semibold">名刺情報の確認</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {/* 名刺画像 */}
        <div className="mb-6">
          <div className="relative bg-white rounded-lg overflow-hidden shadow-sm border">
            <img
              src={capturedImage}
              alt="撮影した名刺"
              className="w-full h-auto max-h-48 object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            ※ スキャン結果を確認し、必要に応じて修正してください
          </p>
        </div>

        {/* フォーム */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="company_name">会社名 *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="full_name">氏名 *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="name_reading">氏名（ローマ字・フリガナ）</Label>
            <Input
              id="name_reading"
              value={formData.name_reading}
              onChange={(e) => handleChange('name_reading', e.target.value)}
              placeholder="Yamada Taro"
            />
          </div>

          <div>
            <Label htmlFor="departments">部署名（複数の場合は , で区切る）</Label>
            <Input
              id="departments"
              value={formData.departments}
              onChange={(e) => handleChange('departments', e.target.value)}
              placeholder="営業部, 第一営業課"
            />
          </div>

          <div>
            <Label htmlFor="titles">役職（複数の場合は , で区切る）</Label>
            <Input
              id="titles"
              value={formData.titles}
              onChange={(e) => handleChange('titles', e.target.value)}
              placeholder="課長"
            />
          </div>

          <div>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@company.com"
            />
          </div>

          <div>
            <Label htmlFor="company_url">会社URL</Label>
            <Input
              id="company_url"
              type="url"
              value={formData.company_url}
              onChange={(e) => handleChange('company_url', e.target.value)}
              placeholder="https://company.com"
            />
          </div>

          <div>
            <Label htmlFor="address">会社住所</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="東京都千代田区..."
            />
          </div>
        </div>
      </main>

      {/* 固定フッター */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="container mx-auto">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={!formData.company_name || !formData.full_name}
            className="w-full"
          >
            <Save className="w-5 h-5 mr-2" />
            更新して商談メモへ
          </Button>
        </div>
      </div>
    </div>
  );
}
