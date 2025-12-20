'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // デバッグログ（開発時のみ、console.logでエラーとして表示されない）
        console.log('Sign in error details:', {
          message: signInError.message,
          status: (signInError as any).status,
          code: (signInError as any).code,
        });
        
        // より詳細なエラーメッセージを表示
        const errorMessage = signInError.message || '';
        const errorCode = (signInError as any).code || '';
        const errorStatus = (signInError as any).status || '';
        
        // メール確認エラーのチェック（複数のパターンを確認）
        if (errorMessage.toLowerCase().includes('email not confirmed') || 
            errorMessage.toLowerCase().includes('email_not_confirmed') ||
            errorCode === 'email_not_confirmed' ||
            errorStatus === 'email_not_confirmed') {
          setError('メールアドレスの確認が完了していません。登録時に送信されたメールを確認して、メールアドレスを確認してください。');
        } else if (errorMessage.includes('Invalid login credentials') || 
                   errorMessage.includes('invalid_credentials') ||
                   errorCode === 'invalid_credentials') {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else {
          // デフォルトのエラーメッセージ
          setError(errorMessage || 'メールアドレスまたはパスワードが正しくありません');
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // ログイン成功、チャット画面に遷移
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Supabase環境変数')) {
          setError('Supabase環境変数が設定されていません。.env.localファイルを確認してください。');
        } else {
          setError(err.message);
        }
      } else {
        setError('通信エラーが発生しました。しばらく待ってから再度お試しください');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">English Chat</h1>
        </header>

        {/* ログインフォーム */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">ログイン</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* パスワード */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          {/* 新規登録画面へのリンク */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでないですか？{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                新規登録画面へ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

