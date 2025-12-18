# DB設計書：AI チャット英語学習システム

## 1. 概要

### 1.1. 目的
本ドキュメントは、AI チャット英語学習システムのデータベース設計を定義するものである。Supabase（PostgreSQL）を使用し、ユーザーのブックマークデータを永続的に保存するためのスキーマを定義する。

### 1.2. データベース環境
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth（ユーザー管理はSupabaseが提供する`auth.users`テーブルを使用）

### 1.3. 設計方針
- ユーザー認証はSupabase Authに委譲し、アプリケーション側で独自のユーザーテーブルは作成しない
- ブックマーク機能に必要な最小限のテーブル構成とする
- 将来的な拡張性（多言語対応など）を考慮した設計とする
- データの整合性を保つため、適切な外部キー制約とインデックスを設定する

## 2. テーブル一覧

| テーブル名 | 説明 | 備考 |
|-----------|------|------|
| `bookmarks` | ユーザーがブックマークした英語表現を保存するテーブル | メインテーブル |

## 3. テーブル詳細設計

### 3.1. bookmarks テーブル

#### 3.1.1. テーブル概要
ユーザーがブックマークした提案メッセージ（英語表現とその日本語訳）を保存するテーブル。

#### 3.1.2. カラム定義

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ブックマークの一意識別子 |
| `user_id` | UUID | NOT NULL, FOREIGN KEY | ブックマークを登録したユーザーのID（`auth.users.id`を参照） |
| `english_text` | TEXT | NOT NULL | ブックマークした英文 |
| `japanese_translation` | TEXT | NOT NULL | 英文の日本語訳 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | ブックマーク登録日時 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | ブックマーク更新日時 |

#### 3.1.3. インデックス

| インデックス名 | 対象カラム | 種類 | 説明 |
|--------------|-----------|------|------|
| `idx_bookmarks_user_id` | `user_id` | B-tree | ユーザーIDによる検索を高速化 |
| `idx_bookmarks_created_at` | `created_at` | B-tree | 作成日時によるソートを高速化 |

#### 3.1.4. 外部キー制約

| 制約名 | 参照先テーブル | 参照先カラム | 削除時の動作 |
|--------|---------------|-------------|-------------|
| `fk_bookmarks_user_id` | `auth.users` | `id` | CASCADE |

#### 3.1.5. Row Level Security (RLS) ポリシー

Supabaseのセキュリティ機能であるRow Level Security（RLS）を有効化し、以下のポリシーを設定する：

- **SELECT**: ユーザーは自分のブックマークのみ閲覧可能
- **INSERT**: ユーザーは自分のブックマークのみ作成可能
- **UPDATE**: ユーザーは自分のブックマークのみ更新可能
- **DELETE**: ユーザーは自分のブックマークのみ削除可能

#### 3.1.6. トリガー

`updated_at`カラムを自動更新するためのトリガーを設定する：

```sql
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

## 4. ER図（概念図）

```
┌─────────────┐
│ auth.users  │ (Supabase Auth管理)
│             │
│ - id (PK)   │
│ - email     │
│ - ...       │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────┐
│   bookmarks     │
│                 │
│ - id (PK)       │
│ - user_id (FK)  │──┐
│ - english_text  │  │
│ - japanese_     │  │
│   translation   │  │
│ - created_at    │  │
│ - updated_at    │  │
└─────────────────┘  │
                     │
                     └───参照: auth.users.id
```

## 5. SQLスキーマ定義

### 5.1. テーブル作成

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
-- SELECT: 自分のブックマークのみ閲覧可能
CREATE POLICY "Users can view their own bookmarks"
    ON bookmarks FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: 自分のブックマークのみ作成可能
CREATE POLICY "Users can insert their own bookmarks"
    ON bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分のブックマークのみ更新可能
CREATE POLICY "Users can update their own bookmarks"
    ON bookmarks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: 自分のブックマークのみ削除可能
CREATE POLICY "Users can delete their own bookmarks"
    ON bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- updated_at 自動更新トリガーの作成
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

## 6. 拡張性の考慮

### 6.1. 多言語対応への拡張

将来的に英語以外の言語学習にも対応する場合、以下のような拡張が可能：

#### 案1: `language_code`カラムを追加
```sql
ALTER TABLE bookmarks 
ADD COLUMN language_code VARCHAR(5) DEFAULT 'en' NOT NULL;
```
- 例: 'en' (英語), 'fr' (フランス語), 'de' (ドイツ語) など
- ISO 639-1 または ISO 639-2 形式を使用

#### 案2: 言語テーブルを分離
```sql
CREATE TABLE languages (
    code VARCHAR(5) PRIMARY KEY,
    name TEXT NOT NULL
);

ALTER TABLE bookmarks 
ADD COLUMN language_code VARCHAR(5) REFERENCES languages(code);
```

### 6.2. チャット履歴の保存（将来の拡張）

要件定義には明記されていないが、将来的にチャット履歴を保存する場合の設計案：

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id, created_at DESC);
```

### 6.3. ブックマークの分類・タグ機能（将来の拡張）

ユーザーがブックマークをカテゴリ別に管理したい場合：

```sql
CREATE TABLE bookmark_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bookmarks 
ADD COLUMN category_id UUID REFERENCES bookmark_categories(id) ON DELETE SET NULL;
```

## 7. データ整合性とパフォーマンス

### 7.1. データ整合性
- 外部キー制約により、存在しないユーザーIDのブックマークは作成できない
- CASCADE削除により、ユーザーが削除された場合、関連するブックマークも自動的に削除される
- RLSポリシーにより、ユーザーは自分のデータのみアクセス可能

### 7.2. パフォーマンス
- `user_id`と`created_at`にインデックスを設定し、ユーザー別の一覧取得とソートを高速化
- テキストカラム（`english_text`, `japanese_translation`）は全文検索が必要な場合、PostgreSQLの全文検索機能（GINインデックス）を追加検討

### 7.3. データ量の見積もり
- 1ユーザーあたりの平均ブックマーク数: 100件を想定
- 1ブックマークあたりのデータサイズ: 約1KB（英文200文字 + 日本語訳200文字）
- 10,000ユーザーで約1GBのデータ量を想定

## 8. マイグレーション手順

### 8.1. 初回セットアップ
1. Supabaseプロジェクトの作成
2. 上記のSQLスキーマ定義をSupabase SQL Editorで実行
3. RLSポリシーが正しく動作することを確認

### 8.2. バージョン管理
- Supabaseのマイグレーション機能または、バージョン管理ツール（例: Supabase CLI）を使用してスキーマ変更を管理することを推奨

## 9. 参考情報

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

