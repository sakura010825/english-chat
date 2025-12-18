API設計書：AI チャット英語学習システム

1. 概要
   1.1. 目的
   本ドキュメントは、AI チャット英語学習システムの API 設計を定義するものである。Next.js Server Actions および Supabase を活用した API の仕様を記載する。

   1.2. 対象読者
   - バックエンドエンジニア
   - フロントエンドエンジニア
   - QA エンジニア

   1.3. 技術スタック
   - **Next.js Server Actions**: サーバーサイドロジックの実装
   - **Supabase Auth**: ユーザー認証
   - **Supabase Postgres**: データベース
   - **Vercel AI SDK**: AI 連携

   1.4. 認証方式
   - Supabase Auth による JWT トークンベースの認証
   - 各 API リクエストには認証トークンが必要（認証不要のエンドポイントを除く）
   - トークンは HTTP ヘッダーまたは Cookie で送信

2. データモデル
   2.1. データベーススキーマ

   **bookmarks テーブル**
   | カラム名 | 型 | 制約 | 説明 |
   |---------|-----|------|------|
   | id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | ブックマークの一意ID |
   | user_id | uuid | NOT NULL, FOREIGN KEY (auth.users.id) | ユーザーID（Supabase Auth） |
   | english_text | text | NOT NULL | 英語例文 |
   | japanese_text | text | NOT NULL | 日本語訳 |
   | created_at | timestamp | NOT NULL, DEFAULT now() | 作成日時 |
   | updated_at | timestamp | NOT NULL, DEFAULT now() | 更新日時 |

   **インデックス**
   - `user_id` にインデックスを設定（一覧取得のパフォーマンス向上）

   **RLS (Row Level Security) ポリシー**
   - ユーザーは自身のブックマークのみ閲覧・作成・削除可能

3. API エンドポイント一覧
   3.1. チャット関連 API

   **API-01: 初期メッセージ取得**
   - **機能ID**: F-01
   - **メソッド**: Server Action
   - **エンドポイント**: `getInitialMessage()`
   - **認証**: 不要
   - **説明**: システム起動時に表示する AI からの初回メッセージを取得する
   - **リクエスト**: なし
   - **レスポンス**:
     ```typescript
     {
       message: string; // 例: "こんにちは！今日はどんな英語を学びたいですか？"
     }
     ```
   - **エラーレスポンス**:
     ```typescript
     {
       error: string;
     }
     ```

   **API-02: AI 提案取得（ストリーミング）**
   - **機能ID**: F-02, F-03
   - **メソッド**: Server Action (Streaming)
   - **エンドポイント**: `getAISuggestions(userInput: string)`
   - **認証**: 不要（将来的にユーザーごとの学習履歴を保存する場合は認証が必要）
   - **説明**: ユーザーの入力に基づき、AI が 3 つの英語表現を生成する。ストリーミング形式で返却する
   - **リクエスト**:
     ```typescript
     {
       userInput: string; // ユーザーの入力テキスト
     }
     ```
   - **レスポンス（ストリーミング）**:
     ```typescript
     // 各提案メッセージが順次ストリーミングされる
     {
       id: string; // 提案メッセージの一意ID（クライアント側で生成）
       englishText: string; // 英語例文
       japaneseText: string; // 日本語訳
       index: number; // 1, 2, 3 のいずれか
     }
     ```
   - **エラーレスポンス**:
     ```typescript
     {
       error: string;
     }
     ```
   - **パフォーマンス要件**: ユーザー送信後、5 秒以内に最初の提案が表示されること

   3.2. ブックマーク関連 API

   **API-03: ブックマーク登録**
   - **機能ID**: F-05
   - **メソッド**: Server Action
   - **エンドポイント**: `createBookmark(englishText: string, japaneseText: string)`
   - **認証**: 必須
   - **説明**: 提案メッセージをブックマークとして保存する
   - **リクエスト**:
     ```typescript
     {
       englishText: string; // 英語例文
       japaneseText: string; // 日本語訳
     }
     ```
   - **レスポンス**:
     ```typescript
     {
       id: string; // 作成されたブックマークのID
       englishText: string;
       japaneseText: string;
       createdAt: string; // ISO 8601形式の日時
     }
     ```
   - **エラーレスポンス**:
     ```typescript
     {
       error: string; // 例: "認証が必要です", "ブックマークの作成に失敗しました"
     }
     ```
   - **バリデーション**:
     - `englishText`: 必須、最大 1000 文字
     - `japaneseText`: 必須、最大 1000 文字

   **API-04: ブックマーク一覧取得**
   - **機能ID**: F-06
   - **メソッド**: Server Action
   - **エンドポイント**: `getBookmarks()`
   - **認証**: 必須
   - **説明**: 認証済みユーザーのブックマーク一覧を取得する
   - **リクエスト**: なし
   - **レスポンス**:
     ```typescript
     {
       bookmarks: Array<{
         id: string;
         englishText: string;
         japaneseText: string;
         createdAt: string; // ISO 8601形式の日時
       }>;
     }
     ```
   - **エラーレスポンス**:
     ```typescript
     {
       error: string; // 例: "認証が必要です", "ブックマークの取得に失敗しました"
     }
     ```
   - **ソート**: 作成日時の降順（新しいものから）

   **API-05: ブックマーク削除**
   - **機能ID**: F-08
   - **メソッド**: Server Action
   - **エンドポイント**: `deleteBookmark(bookmarkId: string)`
   - **認証**: 必須
   - **説明**: 指定されたブックマークを削除する。削除前に確認は行わない（フロントエンド側でモーダル表示）
   - **リクエスト**:
     ```typescript
     {
       bookmarkId: string; // 削除するブックマークのID
     }
     ```
   - **レスポンス**:
     ```typescript
     {
       success: boolean;
       message?: string; // 成功メッセージ
     }
     ```
   - **エラーレスポンス**:
     ```typescript
     {
       error: string; // 例: "認証が必要です", "ブックマークが見つかりません", "削除権限がありません"
     }
     ```
   - **セキュリティ**: ユーザーは自身のブックマークのみ削除可能（RLS ポリシーで保証）

4. エラーハンドリング
   4.1. エラーコード一覧
   | エラーコード | HTTPステータス | 説明 | 対処方法 |
   |------------|--------------|------|---------|
   | AUTH_REQUIRED | 401 | 認証が必要 | ログイン画面にリダイレクト |
   | AUTH_INVALID | 401 | 認証トークンが無効 | トークンを再取得 |
   | FORBIDDEN | 403 | アクセス権限がない | エラーメッセージを表示 |
   | NOT_FOUND | 404 | リソースが見つからない | エラーメッセージを表示 |
   | VALIDATION_ERROR | 400 | リクエストのバリデーションエラー | 入力内容を確認 |
   | AI_SERVICE_ERROR | 500 | AI サービスとの通信エラー | リトライまたはエラーメッセージを表示 |
   | DATABASE_ERROR | 500 | データベースエラー | エラーログを記録し、ユーザーに通知 |
   | RATE_LIMIT_EXCEEDED | 429 | レート制限超過 | しばらく待ってから再試行 |

   4.2. エラーレスポンス形式
   ```typescript
   {
     error: string; // エラーメッセージ（ユーザー向け）
     code?: string; // エラーコード
     details?: any; // 詳細情報（開発用）
   }
   ```

5. パフォーマンス要件
   5.1. 応答時間
   - **API-01 (初期メッセージ取得)**: 1 秒以内
   - **API-02 (AI 提案取得)**: 最初の提案が 5 秒以内にストリーミング開始
   - **API-03 (ブックマーク登録)**: 1 秒以内
   - **API-04 (ブックマーク一覧取得)**: 2 秒以内（100 件以下の場合）
   - **API-05 (ブックマーク削除)**: 1 秒以内

   5.2. レート制限
   - **API-02 (AI 提案取得)**: ユーザーあたり 1 分間に 10 リクエストまで
   - その他の API: ユーザーあたり 1 分間に 60 リクエストまで

6. セキュリティ要件
   6.1. 認証・認可
   - すべてのブックマーク関連 API は認証必須
   - Supabase RLS (Row Level Security) により、ユーザーは自身のデータのみアクセス可能
   - JWT トークンの有効期限は 1 時間（リフレッシュトークンで更新可能）

   6.2. 入力検証
   - すべてのユーザー入力に対してサニタイゼーションを実施
   - SQL インジェクション対策: Supabase のクライアントライブラリを使用（パラメータ化クエリ）
   - XSS 対策: フロントエンド側で適切にエスケープ処理を実施

   6.3. CORS 設定
   - 本番環境では特定のオリジンのみ許可
   - 開発環境では localhost を許可

7. 実装例（Next.js Server Actions）
   7.1. ブックマーク登録の実装例
   ```typescript
   'use server';
   
   import { createClient } from '@/utils/supabase/server';
   import { revalidatePath } from 'next/cache';
   
   export async function createBookmark(
     englishText: string,
     japaneseText: string
   ) {
     const supabase = createClient();
     
     // 認証チェック
     const { data: { user }, error: authError } = await supabase.auth.getUser();
     if (authError || !user) {
       return { error: '認証が必要です' };
     }
     
     // バリデーション
     if (!englishText || !japaneseText) {
       return { error: '英語例文と日本語訳は必須です' };
     }
     
     if (englishText.length > 1000 || japaneseText.length > 1000) {
       return { error: 'テキストは1000文字以内で入力してください' };
     }
     
     // ブックマーク作成
     const { data, error } = await supabase
       .from('bookmarks')
       .insert({
         user_id: user.id,
         english_text: englishText,
         japanese_text: japaneseText,
       })
       .select()
       .single();
     
     if (error) {
       return { error: 'ブックマークの作成に失敗しました' };
     }
     
     revalidatePath('/bookmarks');
     
     return {
       id: data.id,
       englishText: data.english_text,
       japaneseText: data.japanese_text,
       createdAt: data.created_at,
     };
   }
   ```

   7.2. AI 提案取得の実装例（ストリーミング）
   ```typescript
   'use server';
   
   import { streamText } from 'ai';
   import { google } from '@ai-sdk/google';
   
   export async function getAISuggestions(userInput: string) {
     if (!userInput || userInput.trim().length === 0) {
       return { error: '入力内容を入力してください' };
     }
     
     try {
       const result = streamText({
         model: google('gemini-pro'),
         prompt: `ユーザーが「${userInput}」について学びたいと言っています。関連する英語表現を3つ提案してください。各提案は以下のJSON形式で返してください：
         {
           "englishText": "英語例文",
           "japaneseText": "日本語訳"
         }`,
       });
       
       return result.toDataStreamResponse();
     } catch (error) {
       return { error: 'AI サービスとの通信に失敗しました' };
     }
   }
   ```

8. テスト要件
   8.1. 単体テスト
   - 各 Server Action の正常系・異常系のテスト
   - バリデーションロジックのテスト
   - エラーハンドリングのテスト

   8.2. 統合テスト
   - Supabase との連携テスト
   - AI サービスとの連携テスト
   - 認証フローのテスト

   8.3. E2E テスト
   - チャット機能の一連のフロー
   - ブックマーク機能の一連のフロー

9. 変更履歴
   | バージョン | 日付 | 変更内容 | 変更者 |
   |-----------|------|---------|--------|
   | 1.0 | 2024-XX-XX | 初版作成 | - |

