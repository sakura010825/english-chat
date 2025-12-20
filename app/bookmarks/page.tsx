'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import { getBookmarks, deleteBookmark } from '@/app/actions/bookmarks';

interface Bookmark {
  id: string;
  englishText: string;
  japaneseText: string;
  createdAt: string;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    setLoading(true);
    setError(null);
    const result = await getBookmarks();
    if (result.error) {
      setError(result.error);
      if (result.error.includes('認証')) {
        router.push('/login');
      }
    } else if (result.bookmarks) {
      setBookmarks(result.bookmarks);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このブックマークを削除しますか？')) {
      return;
    }

    setDeletingId(id);
    const result = await deleteBookmark(id);
    if (result.error) {
      alert(result.error);
    } else {
      setBookmarks(bookmarks.filter((b) => b.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">ブックマーク</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-2">ブックマークがありません</p>
                <p className="text-gray-400 text-sm">
                  チャット画面で⭐ボタンを押してブックマークを追加してください
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm font-semibold">⭐</span>
                  </div>
                  <div className="flex-1">
                    <ChatMessage
                      englishText={bookmark.englishText}
                      japaneseText={bookmark.japaneseText}
                      isBookmarked={true}
                      onBookmark={() => handleDelete(bookmark.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

