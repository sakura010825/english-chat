import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Next.jsでは、クライアント側の環境変数はNEXT_PUBLIC_プレフィックスが必要
  // ビルド時に値が埋め込まれるため、開発サーバー再起動が必要な場合がある
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 環境変数のチェック
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    const errorMsg = 'NEXT_PUBLIC_SUPABASE_URLが設定されていません。Vercelの環境変数設定を確認してください。';
    console.error(errorMsg);
    // 本番環境ではエラーをthrowせず、警告のみ
    if (process.env.NODE_ENV === 'development') {
      throw new Error(errorMsg);
    }
    // 本番環境ではダミーのURLを使用（エラーを防ぐため）
    console.warn('Supabase URL is not set. Using placeholder. Please configure environment variables in Vercel.');
  }

  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    const errorMsg = 'NEXT_PUBLIC_SUPABASE_ANON_KEYが設定されていません。Vercelの環境変数設定を確認してください。';
    console.error(errorMsg);
    if (process.env.NODE_ENV === 'development') {
      throw new Error(errorMsg);
    }
    console.warn('Supabase Anon Key is not set. Using placeholder. Please configure environment variables in Vercel.');
  }

  // 環境変数が設定されていない場合は、ダミーの値を使用（エラーを防ぐため）
  const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
  const finalKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder';

  // URL形式の検証
  try {
    new URL(finalUrl);
  } catch {
    const errorMsg = `NEXT_PUBLIC_SUPABASE_URLが無効な形式です: "${finalUrl}"。正しいHTTP/HTTPS URLを設定してください。`;
    console.error(errorMsg);
    if (process.env.NODE_ENV === 'development') {
      throw new Error(errorMsg);
    }
  }

  return createBrowserClient(finalUrl, finalKey);
}

