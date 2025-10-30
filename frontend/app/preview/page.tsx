'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCardRegistrationStore, useUserStore } from '@/lib/store';

export default function PreviewPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const capturedImage = useCardRegistrationStore((state) => state.capturedImage);
  const setCurrentStep = useCardRegistrationStore((state) => state.setCurrentStep);
  const setScanResult = useCardRegistrationStore((state) => state.setScanResult);
  const setIsScanning = useCardRegistrationStore((state) => state.setIsScanning);
  const isScanning = useCardRegistrationStore((state) => state.isScanning);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!capturedImage) {
      router.push('/camera');
      return;
    }

    setCurrentStep('preview');
  }, [user, capturedImage, router]);

  const handleRetake = () => {
    router.push('/camera');
  };

  const handleScan = async () => {
    if (!capturedImage) return;

    setIsScanning(true);

    try {
      // Gemini APIを呼び出して名刺をスキャン
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: capturedImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'スキャンに失敗しました');
      }

      const scanResult = await response.json();

      // コンソールに結果を出力（ページ遷移前に必ず実行）
      console.log('=== Gemini スキャン結果 ===');
      console.log('会社名:', scanResult.company_name);
      console.log('部署:', scanResult.departments);
      console.log('役職:', scanResult.titles);
      console.log('氏名:', scanResult.full_name);
      console.log('読み方:', scanResult.name_reading);
      console.log('メール:', scanResult.email);
      console.log('URL:', scanResult.company_url);
      console.log('住所:', scanResult.address);
      console.log('生データ:', scanResult);

      // 結果をストアに保存
      setScanResult(scanResult);
      setCurrentStep('edit');

      // 少し待機してからページ遷移（コンソールログが確実に出力されるように）
      setTimeout(() => {
        router.push('/edit');
      }, 100);
    } catch (error) {
      console.error('スキャンに失敗しました:', error);
      alert(
        error instanceof Error
          ? `スキャンに失敗しました: ${error.message}`
          : 'スキャンに失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsScanning(false);
    }
  };

  if (!user || !capturedImage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetake}
            className="text-white hover:bg-slate-700"
            disabled={isScanning}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold text-white">撮影結果を確認</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* 画像プレビュー */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="relative bg-white rounded-lg overflow-hidden shadow-xl">
            <img
              src={capturedImage}
              alt="撮影した名刺"
              className="w-full h-auto"
            />
          </div>

          <div className="mt-4 text-center text-white/70 text-sm">
            画像が鮮明で、枠内に収まっているか確認してください
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="p-6 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRetake}
            disabled={isScanning}
            className="flex-1"
          >
            <Camera className="w-5 h-5 mr-2" />
            再撮影
          </Button>
          <Button
            size="lg"
            onClick={handleScan}
            disabled={isScanning}
            className="flex-1"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                スキャン中...
              </>
            ) : (
              'スキャン'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
