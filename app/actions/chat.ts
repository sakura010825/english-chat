'use server';

import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function getAISuggestions(userInput: string) {
  if (!userInput || userInput.trim().length === 0) {
    return { error: '入力内容を入力してください' };
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { error: 'AI APIキーが設定されていません' };
  }

  try {
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: `あなたは英語学習をサポートするAIアシスタントです。ユーザーのリクエストに基づいて、実用的な英語表現を3つ提案してください。
各提案は必ず以下のJSON形式で返してください：
{
  "englishText": "英語例文",
  "japaneseText": "日本語訳"
}

3つの提案を配列形式で返してください。JSON以外の説明文は不要です。`,
      prompt: `ユーザーが「${userInput}」について学びたいと言っています。関連する英語表現を3つ提案してください。

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

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI service error:', error);
    return { error: 'AI サービスとの通信に失敗しました' };
  }
}

export async function getInitialMessage() {
  return {
    message: 'こんにちは！今日はどんな英語を学びたいですか？',
  };
}

