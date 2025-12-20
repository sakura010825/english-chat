'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // バリデーション
    if (!email || !password || !confirmPassword) {
      setError('すべての項目を入力してください');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        const errorMessage = signUpError.message || '';
        const errorCode = (signUpError as any).code || '';
        
        // より詳細なエラーハンドリング（既存ユーザーのチェック）
        if (errorMessage.toLowerCase().includes('already registered') || 
            errorMessage.toLowerCase().includes('user already registered') ||
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('email_address_already_exists') ||
            errorCode === 'email_address_already_exists' ||
            errorCode === 'user_already_registered') {
          setError('このメールアドレスは既に登録されています。ログイン画面からログインしてください。');
        } else if (errorMessage.includes('Password') || errorCode.includes('password')) {
          setError('パスワードの要件を満たしていません');
        } else {
          setError(errorMessage || '登録に失敗しました');
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // 既にメール確認済みのユーザーの場合（重複登録の可能性）
        if (data.user.email_confirmed_at !== null) {
          setError('このメールアドレスは既に登録されています。ログイン画面からログインしてください。');
          setIsLoading(false);
          return;
        }
        
        // メール確認が必要な場合の処理
        // メール確認が必要な場合、成功メッセージを表示してログイン画面にリダイレクト
        setSuccessMessage('登録が完了しました。メールアドレスを確認してください。確認後、ログイン画面からログインしてください。');
        setIsLoading(false);
        // 3秒後にログイン画面にリダイレクト
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      } else {
        // ユーザーが作成されなかった場合（メール確認が必要な場合など）
        // Supabaseの設定によっては、既存ユーザーの場合でもここに来る可能性がある
        // エラーメッセージを再確認
        if (signUpError) {
          // エラーが既に処理されている
        } else {
          setSuccessMessage('登録が完了しました。メールアドレスを確認してください。確認後、ログイン画面からログインしてください。');
        }
        setIsLoading(false);
        // 3秒後にログイン画面にリダイレクト
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      console.error('Registration error:', err);
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

        {/* 新規登録フォーム */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">新規登録</h2>

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
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* パスワード確認 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード確認
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 成功メッセージ */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* 新規登録ボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? '登録中...' : '新規登録'}
            </button>
          </form>

          {/* ログイン画面へのリンク */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              既にアカウントをお持ちですか？{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                ログイン画面へ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

