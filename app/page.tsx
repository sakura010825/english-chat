'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import { createBookmark } from '@/app/actions/bookmarks';

interface Suggestion {
  id: string;
  englishText: string;
  japaneseText: string;
  index: number;
}

export default function Home() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // ローカルステートで入力値を管理（確実に入力できるようにする）
  const [localInput, setLocalInput] = useState('');

  // useChatの設定
  const chatResult = useChat({
    onError: (err) => {
      console.error('Chat error:', err);
    },
    onFinish: (result) => {
      console.log('Message finished:', result);
      try {
        // result.message から content を取得（型アサーションを使用）
        const message = result.message as any;
        const content = typeof message.content === 'string' 
          ? message.content 
          : typeof message.text === 'string'
          ? message.text
          : String(message.content || message.text || '');
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const newSuggestions: Suggestion[] = parsed.map(
              (item: any, index: number) => ({
                id: `suggestion-${Date.now()}-${index}`,
                englishText: item.englishText || item.english_text || '',
                japaneseText: item.japaneseText || item.japanese_text || '',
                index: index + 1,
              })
            );
            setSuggestions(newSuggestions);
          }
        }
      } catch (e) {
        console.error('Failed to parse suggestions:', e);
      }
    },
  });

  // useChatから値を取得（型エラーを回避するため、個別に取得）
  const messages = chatResult.messages || [];
  const input = (chatResult as any).input || '';
  const handleInputChange = (chatResult as any).handleInputChange;
  const setInput = (chatResult as any).setInput;
  const handleSubmit = (chatResult as any).handleSubmit;
  const append = (chatResult as any).append; // appendメソッドを取得
  const isLoading = (chatResult as any).isLoading || false;
  const error = (chatResult as any).error;

  // デバッグ: useChatの利用可能なメソッドを確認
  useEffect(() => {
    console.log('useChat methods:', {
      hasAppend: !!append,
      hasHandleSubmit: !!handleSubmit,
      hasSetInput: !!setInput,
      hasHandleInputChange: !!handleInputChange,
      isLoading,
      messagesCount: messages.length,
    });
  }, [append, handleSubmit, setInput, handleInputChange, isLoading, messages.length]);

  // useChatのinputとローカルステートを同期（useChatが値を管理している場合）
  useEffect(() => {
    if (input !== undefined && input !== localInput) {
      setLocalInput(input);
    }
  }, [input]);

  // 入力値の変更ハンドラー（確実に入力できるようにする）
  const handleInputChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalInput(newValue);
    // useChatのhandleInputChangeが存在する場合はそれも呼び出す
    if (handleInputChange) {
      handleInputChange(e);
    } else if (setInput) {
      setInput(newValue);
    }
  };

  useEffect(() => {
    setInitialMessage('こんにちは！今日はどんな英語を学びたいですか？');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestions]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentInput = localInput.trim();
    if (!currentInput || currentInput.length === 0) return;
    
    console.log('Form submitted with input:', currentInput);
    setSuggestions([]);
    
    // appendメソッドを使用（推奨方法）
    if (append) {
      console.log('Using append method');
      try {
        await append({ role: 'user', content: currentInput });
        setLocalInput('');
        return;
      } catch (err) {
        console.error('Append error:', err);
      }
    }
    
    // フォールバック: handleSubmitを使用
    if (handleSubmit) {
      console.log('Using handleSubmit method');
      // useChatのinputを設定（存在する場合）
      if (setInput) {
        setInput(currentInput);
        // setInputが反映されるまで少し待つ
        setTimeout(() => {
          handleSubmit(e);
        }, 10);
      } else {
        handleSubmit(e);
      }
      setLocalInput('');
    } else {
      console.warn('Neither append nor handleSubmit is available');
      // フォールバック: 直接APIを呼び出す
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: currentInput }],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('API response:', text);
        
        // ストリーミングレスポンスをパース
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const newSuggestions: Suggestion[] = parsed.map(
              (item: any, index: number) => ({
                id: `suggestion-${Date.now()}-${index}`,
                englishText: item.englishText || item.english_text || '',
                japaneseText: item.japaneseText || item.japanese_text || '',
                index: index + 1,
              })
            );
            setSuggestions(newSuggestions);
          }
        }
        setLocalInput('');
      } catch (err) {
        console.error('Direct API call failed:', err);
      }
    }
  };

  const handleBookmark = async (suggestion: Suggestion) => {
    console.log('Bookmark:', suggestion);
    
    try {
      const result = await createBookmark(
        suggestion.englishText,
        suggestion.japaneseText
      );
      
      if (result.error) {
        alert(result.error);
      } else {
        alert('ブックマークに追加しました！');
      }
    } catch (err) {
      console.error('Bookmark error:', err);
      alert('ブックマークの追加に失敗しました');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">AIチャット</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {initialMessage && messages.length === 0 && suggestions.length === 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-sm font-semibold">AI</span>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 max-w-2xl">
                <p className="text-gray-900">{initialMessage}</p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            if (message.role === 'user') {
              // message.content の型を安全に処理（型アサーションを使用）
              const msg = message as any;
              const content = typeof msg.content === 'string' 
                ? msg.content 
                : typeof msg.text === 'string'
                ? msg.text
                : String(msg.content || msg.text || '');
              return (
                <div key={message.id} className="flex items-start gap-3 justify-end">
                  <div className="bg-blue-600 text-white rounded-lg shadow-sm px-4 py-3 max-w-2xl">
                    <p>{content}</p>
                  </div>
                </div>
              );
            }
            return null;
          })}

          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-sm font-semibold">AI</span>
              </div>
              <ChatMessage
                englishText={suggestion.englishText}
                japaneseText={suggestion.japaneseText}
                onBookmark={() => handleBookmark(suggestion)}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-sm font-semibold">AI</span>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-2xl">
                <p className="text-red-800 text-sm">
                  {error instanceof Error ? error.message : 'エラーが発生しました'}
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleFormSubmit} className="flex gap-3">
            <input
              type="text"
              value={localInput}
              onChange={handleInputChangeLocal}
              placeholder="学習したい内容を入力..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              disabled={isLoading}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              送信
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}