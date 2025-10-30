import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    // APIキーの確認
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // リクエストボディから画像データを取得
    const { imageData } = await request.json();
    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Gemini APIの初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Base64データから画像パートを作成
    // imageData は "data:image/jpeg;base64,..." 形式なので、base64部分を抽出
    const base64Data = imageData.split(',')[1];

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg',
      },
    };

    // プロンプト: 名刺から情報を抽出
    const prompt = `この画像は名刺です。以下の情報をJSON形式で抽出してください。情報が見つからない場合は、該当フィールドを空文字列にしてください。

抽出する情報:
- company_name: 会社名
- departments: 部署名（複数の場合は配列）
- titles: 役職（複数の場合は配列）
- full_name: 氏名（姓名をスペースで区切る）
- name_reading: 氏名の読み方（ローマ字またはひらがな）
- email: メールアドレス
- company_url: 会社のウェブサイトURL
- address: 住所

JSON形式で返してください。例:
{
  "company_name": "株式会社サンプル",
  "departments": ["営業部", "第一営業課"],
  "titles": ["課長"],
  "full_name": "山田 太郎",
  "name_reading": "やまだ たろう",
  "email": "yamada@sample.co.jp",
  "company_url": "https://sample.co.jp",
  "address": "東京都千代田区丸の内1-1-1"
}`;

    console.log('=== Gemini API リクエスト開始 ===');

    // Gemini APIを呼び出し
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    console.log('=== Gemini API レスポンス（生データ） ===');
    console.log(text);

    // JSONを抽出（マークダウンのコードブロックを除去）
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
      console.log('=== JSONブロックを検出しました ===');
    } else {
      console.log('=== JSONブロックなし、テキスト全体をパース試行 ===');
    }

    console.log('=== パース前のJSON文字列 ===');
    console.log(jsonText);

    // JSON をパース
    const scanResult = JSON.parse(jsonText);

    console.log('=== パース後の結果 ===');
    console.log(JSON.stringify(scanResult, null, 2));

    // 結果を返す
    return NextResponse.json(scanResult);
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan business card', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
