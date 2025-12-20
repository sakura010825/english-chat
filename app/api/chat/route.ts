import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('Chat API called');
    const { messages } = await req.json();
    console.log('Received messages:', messages);
    const userMessage = messages[messages.length - 1]?.content;
    console.log('User message:', userMessage);

    if (!userMessage || userMessage.trim().length === 0) {
      console.warn('Empty user message');
      return new Response(
        JSON.stringify({ error: '入力内容を入力してください' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI APIキーが設定されていません' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: `あなたは英語学習をサポートするAIアシスタントです。ユーザーのリクエストに基づいて、実用的な英語表現を3つ提案してください。
各提案は必ず以下のJSON形式で返してください：
{
  "englishText": "英語例文",
  "japaneseText": "日本語訳"
}

3つの提案を配列形式で返してください。JSON以外の説明文は不要です。`,
      prompt: `ユーザーが「${userMessage}」について学びたいと言っています。関連する英語表現を3つ提案してください。

必ず以下の形式のJSON配列で返してください：
[
  {
    "englishText": "英語例文1",
    "japaneseText": "日本語訳1"
  },
  {
    "englishText": "英語例文2",
    "japaneseText": "日本語訳2"
  },
  {
    "englishText": "英語例文3",
    "japaneseText": "日本語訳3"
  }
]

JSON以外の説明文は不要です。`,
    });

    // useChatフックと互換性のある形式で返す
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI service error:', error);
    return new Response(
      JSON.stringify({ error: 'AI サービスとの通信に失敗しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

