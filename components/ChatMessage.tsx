'use client';

import { useState } from 'react';

interface ChatMessageProps {
  englishText: string;
  japaneseText: string;
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

export default function ChatMessage({
  englishText,
  japaneseText,
  isBookmarked = false,
  onBookmark,
}: ChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(englishText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-2xl">
      {/* 英語例文 */}
      <div className="text-lg font-semibold text-gray-900 mb-2">
        {englishText}
      </div>

      {/* 日本語訳 */}
      <div className="text-sm text-gray-600 mb-3">{japaneseText}</div>

      {/* アイコンエリア */}
      <div className="flex items-center gap-3 justify-end">
        {/* 音声再生ボタン */}
        <button
          onClick={handlePlayAudio}
          disabled={isPlaying}
          className={`
            p-2 rounded-full transition-colors
            ${isPlaying ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'}
          `}
          aria-label="音声を再生"
        >
          {isPlaying ? (
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-gray-700"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* ブックマークボタン */}
        <button
          onClick={onBookmark}
          className={`
            p-2 rounded-full transition-colors
            ${
              isBookmarked
                ? 'bg-yellow-100 text-yellow-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }
          `}
          aria-label={isBookmarked ? 'ブックマークを解除' : 'ブックマークに追加'}
        >
          <svg
            className="w-5 h-5"
            fill={isBookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}


