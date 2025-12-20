import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Next.jsでは、クライアント側の環境変数はNEXT_PUBLIC_プレフィックスが必要
  // ビルド時に値が埋め込まれるため、開発サーバー再起動が必要な場合がある
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // デバッグ用（本番環境では削除推奨）
  if (typeof window !== 'undefined') {
    console.log('Supabase URL:', supabaseUrl ? '設定済み' : '未設定');
    console.log('Supabase Anon Key:', supabaseAnonKey ? '設定済み' : '未設定');
  }

  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URLが設定されていません。.env.localファイルに正しいSupabase URLを設定し、開発サーバーを再起動してください。'
    );
  }

  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEYが設定されていません。.env.localファイルに正しいSupabase Anon Keyを設定し、開発サーバーを再起動してください。'
    );
  }

  // URL形式の検証
  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URLが無効な形式です: "${supabaseUrl}"。正しいHTTP/HTTPS URLを設定してください。`
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

