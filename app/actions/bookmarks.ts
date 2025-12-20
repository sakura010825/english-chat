'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createBookmark(
  englishText: string,
  japaneseText: string
) {
  const supabase = await createClient();
  
  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: '認証が必要です。ログインしてください。' };
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
      japanese_translation: japaneseText,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Bookmark creation error:', error);
    return { error: 'ブックマークの作成に失敗しました' };
  }
  
  revalidatePath('/bookmarks');
  
  return {
    id: data.id,
    englishText: data.english_text,
    japaneseText: data.japanese_translation,
    createdAt: data.created_at,
  };
}

export async function getBookmarks() {
  const supabase = await createClient();
  
  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: '認証が必要です。ログインしてください。' };
  }
  
  // ブックマーク一覧取得
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, english_text, japanese_translation, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Bookmark fetch error:', error);
    return { error: 'ブックマークの取得に失敗しました' };
  }
  
  return {
    bookmarks: data.map((item) => ({
      id: item.id,
      englishText: item.english_text,
      japaneseText: item.japanese_translation,
      createdAt: item.created_at,
    })),
  };
}

export async function deleteBookmark(bookmarkId: string) {
  const supabase = await createClient();
  
  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: '認証が必要です。ログインしてください。' };
  }
  
  // ブックマーク削除
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Bookmark deletion error:', error);
    return { error: 'ブックマークの削除に失敗しました' };
  }
  
  revalidatePath('/bookmarks');
  
  return { success: true };
}

