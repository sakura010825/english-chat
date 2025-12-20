'use client';

import { useState, useEffect, useRef } from 'react';

interface DialogTurn {
  speaker: 'A' | 'B';
  englishText: string;
  japaneseText: string;
}

interface ConversationBlockProps {
  dialogs: DialogTurn[];
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

export default function ConversationBlock({
  dialogs,
  isBookmarked = false,
  onBookmark,
}: ConversationBlockProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDialogIndex, setCurrentDialogIndex] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceA, setVoiceA] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceB, setVoiceB] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 音声リストの読み込みと話者別音声の選択
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        const englishVoices = availableVoices.filter(
          (voice) => voice.lang.startsWith('en')
        );
        setVoices(englishVoices);

        if (englishVoices.length === 0) return;

        // Person A用: 女性風の音声を選択（優先順位順に検索）
        let femaleVoice: SpeechSynthesisVoice | null = null;
        
        // 1. 明示的に女性とマークされている音声（型アサーションを使用）
        femaleVoice = englishVoices.find(
          (voice) => (voice as any).gender === 'female'
        ) || null;

        // 2. 名前で女性風を判定
        if (!femaleVoice) {
          femaleVoice = englishVoices.find(
            (voice) =>
              voice.name.toLowerCase().includes('zira') ||
              voice.name.toLowerCase().includes('samantha') ||
              voice.name.toLowerCase().includes('karen') ||
              voice.name.toLowerCase().includes('susan') ||
              voice.name.toLowerCase().includes('victoria') ||
              voice.name.toLowerCase().includes('female')
          ) || null;
        }

        // 3. フォールバック: 最初の音声（女性でない可能性があるが、とりあえず使用）
        if (!femaleVoice) {
          femaleVoice = englishVoices[0];
        }

        // Person B用: 男性風の音声を選択（Person Aと異なる音声を確実に選択）
        let maleVoice: SpeechSynthesisVoice | null = null;

        // 1. 明示的に男性とマークされている音声（かつPerson Aと異なる）（型アサーションを使用）
        maleVoice = englishVoices.find(
          (voice) => (voice as any).gender === 'male' && voice !== femaleVoice
        ) || null;

        // 2. 名前で男性風を判定（かつPerson Aと異なる）
        if (!maleVoice) {
          maleVoice = englishVoices.find(
            (voice) =>
              (voice.name.toLowerCase().includes('david') ||
               voice.name.toLowerCase().includes('mark') ||
               voice.name.toLowerCase().includes('richard') ||
               voice.name.toLowerCase().includes('daniel') ||
               voice.name.toLowerCase().includes('james') ||
               voice.name.toLowerCase().includes('male')) &&
              voice !== femaleVoice
          ) || null;
        }

        // 3. フォールバック: Person Aと異なる最初の音声を選択
        if (!maleVoice) {
          maleVoice = englishVoices.find((voice) => voice !== femaleVoice) || null;
        }

        // 4. それでも見つからない場合（音声が1つしかない場合）、Person Aと同じ音声を使用（仕方ない）
        if (!maleVoice) {
          maleVoice = femaleVoice;
        }

        setVoiceA(femaleVoice);
        setVoiceB(maleVoice);

        // デバッグ用ログ
        console.log('Selected voices:', {
          voiceA: femaleVoice?.name,
          voiceB: maleVoice?.name,
          areDifferent: femaleVoice !== maleVoice,
        });
      }
    };

    // 初回読み込み
    loadVoices();

    // 音声リストが非同期で読み込まれる場合があるため、voiceschangedイベントを監視
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // 連続再生の実装
  const playNextDialog = (index: number) => {
    if (index >= dialogs.length) {
      // すべての対話が終了
      setIsPlaying(false);
      setCurrentDialogIndex(null);
      return;
    }

    if ('speechSynthesis' in window) {
      const dialog = dialogs[index];
      const utterance = new SpeechSynthesisUtterance(dialog.englishText);
      utterance.lang = 'en-US';
      utterance.rate = playbackRate;
      utterance.pitch = 1;

      // 話者に応じた音声を設定
      if (dialog.speaker === 'A' && voiceA) {
        utterance.voice = voiceA;
      } else if (dialog.speaker === 'B' && voiceB) {
        utterance.voice = voiceB;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setCurrentDialogIndex(index);
      };

      utterance.onend = () => {
        // 次の対話を再生
        playNextDialog(index + 1);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setCurrentDialogIndex(null);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePlayAll = () => {
    if ('speechSynthesis' in window) {
      // 既存の音声を停止
      window.speechSynthesis.cancel();
      // 最初の対話から再生開始
      playNextDialog(0);
    }
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentDialogIndex(null);
      utteranceRef.current = null;
    }
  };

  // コンポーネントのアンマウント時に音声を停止
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 再生速度が変更された場合、再生中の場合は停止して再開
  useEffect(() => {
    if (isPlaying && currentDialogIndex !== null && utteranceRef.current) {
      // 現在の再生を停止して、現在の位置から再開
      window.speechSynthesis.cancel();
      // playNextDialogを直接呼び出すのではなく、現在のインデックスから再開
      const index = currentDialogIndex;
      if (index < dialogs.length) {
        const dialog = dialogs[index];
        const utterance = new SpeechSynthesisUtterance(dialog.englishText);
        utterance.lang = 'en-US';
        utterance.rate = playbackRate; // 選択された速度を適用
        utterance.pitch = 1;

        // 話者に応じた音声を設定
        if (dialog.speaker === 'A' && voiceA) {
          utterance.voice = voiceA;
        } else if (dialog.speaker === 'B' && voiceB) {
          utterance.voice = voiceB;
        }

        utterance.onstart = () => {
          setIsPlaying(true);
          setCurrentDialogIndex(index);
        };

        utterance.onend = () => {
          playNextDialog(index + 1);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          setCurrentDialogIndex(null);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackRate, voiceA, voiceB]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-2xl">
      {/* コントロールエリア（上部） */}
      <div className="flex items-center gap-3 justify-end mb-4 flex-wrap">
        {/* 音声速度選択 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">速度:</label>
          <select
            value={playbackRate}
            onChange={(e) => {
              setPlaybackRate(parseFloat(e.target.value));
            }}
            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isPlaying}
          >
            <option value="1.0">1.0倍速</option>
            <option value="0.75">0.75倍速</option>
            <option value="0.5">0.5倍速</option>
          </select>
        </div>

        {/* 全体再生ボタン */}
        <button
          onClick={isPlaying ? handleStopAudio : handlePlayAll}
          className={`
            p-2 rounded-full transition-colors
            ${isPlaying ? 'bg-blue-100' : 'bg-gray-100 hover:bg-gray-200'}
          `}
          aria-label={isPlaying ? '音声を停止' : 'すべての会話を再生'}
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
        {onBookmark && (
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
        )}
      </div>

      {/* 対話リスト */}
      <div className="space-y-4">
        {dialogs.map((dialog, index) => (
          <div
            key={index}
            className={`
              p-3 rounded-lg border-2 transition-all duration-200
              ${
                currentDialogIndex === index && isPlaying
                  ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }
            `}
          >
            {/* 話者表示 */}
            <div className="mb-2">
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                dialog.speaker === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {dialog.speaker === 'A' ? 'Person A' : 'Person B'}
              </span>
            </div>

            {/* 英語例文 */}
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {dialog.englishText}
            </div>

            {/* 日本語訳 */}
            <div className="text-sm text-gray-600">
              {dialog.japaneseText}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

