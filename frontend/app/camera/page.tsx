'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, FlipHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCardRegistrationStore, useUserStore } from '@/lib/store';

export default function CameraPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const setCapturedImage = useCardRegistrationStore((state) => state.setCapturedImage);
  const setCurrentStep = useCardRegistrationStore((state) => state.setCurrentStep);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    setCurrentStep('camera');
    startCamera();

    return () => {
      stopCamera();
    };
  }, [user, router, facingMode]);

  const startCamera = async () => {
    try {
      setError(null);

      // 既存のストリームを停止
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // カメラの制約設定（高解像度を優先）
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 4096 },
          height: { ideal: 3072 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('カメラの起動に失敗しました:', err);
      setError('カメラの起動に失敗しました。カメラの使用を許可してください。');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // ビデオの実際の解像度
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const videoAspect = videoWidth / videoHeight;

    // ビデオ要素の表示サイズ
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;
    const displayAspect = displayWidth / displayHeight;

    // object-cover での実際の表示領域を計算
    let renderWidth, renderHeight, offsetX, offsetY;

    if (videoAspect > displayAspect) {
      // ビデオが横長: 高さを基準に表示
      renderHeight = videoHeight;
      renderWidth = displayAspect * videoHeight;
      offsetX = (videoWidth - renderWidth) / 2;
      offsetY = 0;
    } else {
      // ビデオが縦長: 幅を基準に表示
      renderWidth = videoWidth;
      renderHeight = videoWidth / displayAspect;
      offsetX = 0;
      offsetY = (videoHeight - renderHeight) / 2;
    }

    // ガイド枠のサイズ（表示領域に対する割合）
    const frameWidthRatio = 0.9; // 90%
    const frameAspectRatio = 1.6; // 名刺の横長比率

    // 切り取り領域の計算（実際の解像度ベース）
    const cropWidth = renderWidth * frameWidthRatio;
    const cropHeight = cropWidth / frameAspectRatio;

    // 中央に配置するためのオフセット（実際の解像度ベース）
    const cropX = offsetX + (renderWidth - cropWidth) / 2;
    const cropY = offsetY + (renderHeight - cropHeight) / 2;

    // デバッグ情報をコンソールに出力
    console.log('Video resolution:', videoWidth, 'x', videoHeight);
    console.log('Display size:', displayWidth, 'x', displayHeight);
    console.log('Render area:', renderWidth, 'x', renderHeight);
    console.log('Crop area:', cropX, cropY, cropWidth, cropHeight);

    // キャンバスのサイズを切り取り領域のサイズに設定
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // ビデオフレームの指定領域だけをキャンバスに描画
    context.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight, // ソース（切り取り元）
      0, 0, cropWidth, cropHeight // ディスティネーション（描画先）
    );

    // Base64エンコードされた画像データを取得
    const imageData = canvas.toDataURL('image/jpeg', 0.95);

    // ストアに保存
    setCapturedImage(imageData);
    setCurrentStep('preview');

    // カメラを停止
    stopCamera();

    // プレビュー画面に遷移
    router.push('/preview');
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleClose = () => {
    stopCamera();
    router.push('/dashboard');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between text-white">
          <h1 className="text-lg font-semibold">名刺を撮影</h1>
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* カメラプレビュー */}
      <div className="relative w-full h-full flex items-center justify-center">
        {error ? (
          <div className="text-center p-6">
            <p className="text-white mb-4">{error}</p>
            <Button onClick={startCamera}>再試行</Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* ガイド枠 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[90%] max-w-md aspect-[1.6/1] border-2 border-white rounded-lg shadow-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/70 text-sm text-center">
                  名刺を枠内に収めてください
                </div>
              </div>
            </div>
          </>
        )}

        {/* 非表示のキャンバス（撮影用） */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* コントロールボタン */}
      {!error && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="w-16" />

            {/* 撮影ボタン */}
            <Button
              size="lg"
              onClick={handleCapture}
              className="rounded-full w-20 h-20 bg-white hover:bg-gray-100 shadow-xl"
            >
              <Camera className="w-10 h-10 text-black" />
            </Button>

            {/* カメラ切り替えボタン */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCamera}
              className="text-white hover:bg-white/20 w-16 h-16"
            >
              <FlipHorizontal className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
