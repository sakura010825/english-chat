# English Chat - AI英語学習システム

AIとの対話を通じて英語を学習するチャットアプリケーションです。

## 機能

- AIとの対話による英語表現の学習
- 3つの英語表現を提案（英語例文 + 日本語訳）
- 音声再生機能（Web Speech API）
- ブックマーク機能（認証が必要）
- レスポンシブデザイン（PC・スマートフォン対応）

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router), React 19, Tailwind CSS
- **バックエンド**: Next.js Server Actions, API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **AI連携**: Vercel AI SDK, Google Gemini
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
yarn install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Generative AI API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key
```

#### Supabaseの設定

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. プロジェクト設定から`URL`と`anon key`を取得
3. `.env.local`に設定

#### Google Generative AI API Keyの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキーを取得
2. `.env.local`に設定

### 3. データベースのセットアップ

SupabaseのSQL Editorで以下のSQLを実行してください：

```sql
-- bookmarks テーブルの作成
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    english_text TEXT NOT NULL,
    japanese_translation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックスの作成
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- RLS の有効化
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS ポリシーの設定
CREATE POLICY "Users can view their own bookmarks"
    ON bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
    ON bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
    ON bookmarks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
    ON bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookmarks_updated_at
    BEFORE UPDATE ON bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4. 開発サーバーの起動

```bash
yarn dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構成

```
english-chat/
├── app/
│   ├── actions/
│   │   └── chat.ts          # Server Actions (AI提案取得)
│   ├── api/
│   │   └── chat/
│   │       └── route.ts     # API Route (ストリーミング処理)
│   ├── page.tsx             # メインページ (AIチャット画面)
│   ├── layout.tsx           # ルートレイアウト
│   └── globals.css          # グローバルスタイル
├── components/
│   ├── Sidebar.tsx          # サイドバーコンポーネント
│   └── ChatMessage.tsx      # チャットメッセージコンポーネント
├── utils/
│   └── supabase/
│       ├── server.ts        # Supabaseサーバーサイドクライアント
│       └── client.ts        # Supabaseクライアントサイドクライアント
└── documents/               # 設計書
    ├── 要件定義.md
    ├── API設計書.md
    ├── DB設計書.md
    └── 画面設計書.md
```

## ライセンス

MIT
