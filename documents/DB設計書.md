# DB設計書：AI チャット英語学習システム

## 1. 概要

本ドキュメントは、AI チャット英語学習システムのデータベース設計を定義するものである。  
データベースには Supabase Postgres を使用し、ユーザー認証は Supabase Auth を利用する。

## 2. 設計方針

- **正規化**: 第3正規形を基本とする
- **拡張性**: 将来的に英語以外の言語学習にも対応できるよう、言語コードを考慮した設計とする
- **パフォーマンス**: インデックスを適切に設定し、クエリ性能を最適化する
- **データ整合性**: 外部キー制約により、参照整合性を保証する

## 3. テーブル一覧

| テーブル名 | 説明 | 備考 |
|----------|------|------|
| `users` | ユーザー情報 | Supabase Auth の `auth.users` テーブルを参照 |
| `chat_sessions` | チャットセッション | 会話のセッション管理 |
| `messages` | メッセージ | ユーザーとAIのメッセージ |
| `proposal_messages` | 提案メッセージ | AIが生成する英語表現の提案 |
| `bookmarks` | ブックマーク | ユーザーが保存した提案メッセージ |

## 4. テーブル定義

### 4.1. users（ユーザー情報）

Supabase Auth の `auth.users` テーブルを使用する。  
必要に応じて、追加のユーザー情報を保存する `user_profiles` テーブルを拡張として定義する。

#### 4.1.1. user_profiles（ユーザープロフィール拡張）

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY, NOT NULL | ユーザーID（`auth.users.id` を参照） |
| `display_name` | VARCHAR(100) | | 表示名 |
| `preferred_language` | VARCHAR(10) | DEFAULT 'en' | 優先言語コード（ISO 639-1形式、例：'en', 'ja'） |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 更新日時 |

**インデックス:**
- `idx_user_profiles_id`: `id` (PRIMARY KEY)

**外部キー:**
- `fk_user_profiles_users`: `id` → `auth.users.id` (ON DELETE CASCADE)

---

### 4.2. chat_sessions（チャットセッション）

ユーザーごとのチャットセッションを管理する。将来的に複数セッション対応を考慮。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | セッションID |
| `user_id` | UUID | NOT NULL | ユーザーID（`auth.users.id` を参照） |
| `title` | VARCHAR(200) | | セッションタイトル（最初のユーザーメッセージから自動生成） |
| `language_code` | VARCHAR(10) | NOT NULL, DEFAULT 'en' | 学習言語コード（ISO 639-1形式） |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 更新日時 |

**インデックス:**
- `idx_chat_sessions_user_id`: `user_id`
- `idx_chat_sessions_created_at`: `created_at DESC`

**外部キー:**
- `fk_chat_sessions_users`: `user_id` → `auth.users.id` (ON DELETE CASCADE)

---

### 4.3. messages（メッセージ）

ユーザーとAIのメッセージを保存する。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | メッセージID |
| `session_id` | UUID | NOT NULL | セッションID（`chat_sessions.id` を参照） |
| `role` | VARCHAR(20) | NOT NULL | メッセージの送信者（'user' または 'assistant'） |
| `content` | TEXT | NOT NULL | メッセージ内容 |
| `sequence_number` | INTEGER | NOT NULL | セッション内でのメッセージ順序 |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時 |

**インデックス:**
- `idx_messages_session_id`: `session_id`
- `idx_messages_session_sequence`: `session_id`, `sequence_number`
- `idx_messages_created_at`: `created_at DESC`

**外部キー:**
- `fk_messages_sessions`: `session_id` → `chat_sessions.id` (ON DELETE CASCADE)

**チェック制約:**
- `chk_messages_role`: `role IN ('user', 'assistant')`

---

### 4.4. proposal_messages（提案メッセージ）

AIが生成する英語表現の提案（3つ）を保存する。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | 提案メッセージID |
| `message_id` | UUID | NOT NULL | 親メッセージID（`messages.id` を参照、role='assistant'のメッセージ） |
| `english_text` | TEXT | NOT NULL | 英語例文 |
| `japanese_text` | TEXT | NOT NULL | 日本語訳 |
| `proposal_order` | INTEGER | NOT NULL | 提案の順序（1, 2, 3） |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時 |

**インデックス:**
- `idx_proposal_messages_message_id`: `message_id`
- `idx_proposal_messages_message_order`: `message_id`, `proposal_order`

**外部キー:**
- `fk_proposal_messages_messages`: `message_id` → `messages.id` (ON DELETE CASCADE)

**チェック制約:**
- `chk_proposal_messages_order`: `proposal_order IN (1, 2, 3)`

---

### 4.5. bookmarks（ブックマーク）

ユーザーが保存した提案メッセージを管理する。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | ブックマークID |
| `user_id` | UUID | NOT NULL | ユーザーID（`auth.users.id` を参照） |
| `proposal_message_id` | UUID | NOT NULL | 提案メッセージID（`proposal_messages.id` を参照） |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時 |

**インデックス:**
- `idx_bookmarks_user_id`: `user_id`
- `idx_bookmarks_proposal_message_id`: `proposal_message_id`
- `idx_bookmarks_user_created`: `user_id`, `created_at DESC`
- `idx_bookmarks_unique`: `user_id`, `proposal_message_id` (UNIQUE)

**外部キー:**
- `fk_bookmarks_users`: `user_id` → `auth.users.id` (ON DELETE CASCADE)
- `fk_bookmarks_proposal_messages`: `proposal_message_id` → `proposal_messages.id` (ON DELETE CASCADE)

**ユニーク制約:**
- `uk_bookmarks_user_proposal`: `user_id`, `proposal_message_id`（同一ユーザーが同じ提案メッセージを重複してブックマークできないようにする）

---

## 5. ER図（テーブル関係）

```
auth.users (Supabase Auth)
    │
    ├── user_profiles (拡張情報)
    │
    ├── chat_sessions
    │       │
    │       └── messages
    │               │
    │               └── proposal_messages
    │                       │
    │                       └── bookmarks
    │
    └── bookmarks (直接参照)
```

## 6. 主要なクエリパターン

### 6.1. チャット履歴の取得

```sql
-- セッション内のメッセージと提案メッセージを取得
SELECT 
    m.id,
    m.role,
    m.content,
    m.sequence_number,
    m.created_at,
    pm.id as proposal_id,
    pm.english_text,
    pm.japanese_text,
    pm.proposal_order
FROM messages m
LEFT JOIN proposal_messages pm ON m.id = pm.message_id
WHERE m.session_id = :session_id
ORDER BY m.sequence_number, pm.proposal_order;
```

### 6.2. ブックマーク一覧の取得

```sql
-- ユーザーのブックマーク一覧を取得
SELECT 
    b.id as bookmark_id,
    b.created_at as bookmarked_at,
    pm.english_text,
    pm.japanese_text,
    pm.id as proposal_message_id
FROM bookmarks b
INNER JOIN proposal_messages pm ON b.proposal_message_id = pm.id
WHERE b.user_id = :user_id
ORDER BY b.created_at DESC;
```

### 6.3. ブックマーク状態の確認

```sql
-- 特定の提案メッセージがブックマークされているか確認
SELECT EXISTS(
    SELECT 1 
    FROM bookmarks 
    WHERE user_id = :user_id 
    AND proposal_message_id = :proposal_message_id
) as is_bookmarked;
```

## 7. データ型の補足説明

- **UUID**: PostgreSQL の `uuid` 型を使用。Supabase との互換性を考慮。
- **TIMESTAMP WITH TIME ZONE**: タイムゾーン情報を含む日時型。Supabase の標準に合わせる。
- **TEXT**: 長文テキスト用。メッセージ内容や英語例文に使用。
- **VARCHAR**: 固定長または短い文字列用。制約に応じて適切な長さを設定。

## 8. セキュリティ考慮事項

- **Row Level Security (RLS)**: Supabase の RLS ポリシーを設定し、ユーザーは自身のデータのみアクセス可能にする。
- **認証**: すべてのテーブル操作は認証済みユーザーのみが実行可能とする。
- **外部キー制約**: データ整合性を保証するため、すべての外部キーに CASCADE DELETE を設定。

## 9. 拡張性の考慮

- **多言語対応**: `language_code` カラムにより、将来的に英語以外の言語学習にも対応可能。
- **セッション管理**: `chat_sessions` テーブルにより、複数の会話セッションを管理可能。
- **メタデータ拡張**: 必要に応じて、各テーブルに JSONB 型のカラムを追加し、柔軟なメタデータを保存可能。

## 10. マイグレーション方針

- Supabase のマイグレーション機能を使用して、テーブル定義を管理する。
- 初期マイグレーションで上記のテーブル定義を実装する。
- 将来的な変更は、新しいマイグレーションファイルとして追加する。

