import { useState, useRef, useEffect } from "react";
import type { Child } from "../lib/database.types";
import { matchName } from "../lib/koreanName";

interface QuizCardProps {
  child: Child;
  onAnswer: (isCorrect: boolean, answer: string) => void;
  onMarkMastered?: () => void;
  showResult: boolean;
  userAnswer: string | null;
  hideSurname?: boolean;
}

export function QuizCard({
  child,
  onAnswer,
  onMarkMastered,
  showResult,
  userAnswer,
  hideSurname = false,
}: QuizCardProps) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isCorrect =
    userAnswer !== null ? matchName(userAnswer, child.name, hideSurname) : null;

  // Display name based on hideSurname setting
  const displayName = hideSurname ? child.name.slice(1) : child.name;

  useEffect(() => {
    // Clear answer and focus input when moving to a new child
    setAnswer("");
    if (!showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [child.id]);

  useEffect(() => {
    // Focus input when result is hidden (new question ready)
    if (!showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showResult]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answer.trim() && !showResult) {
      onAnswer(matchName(answer, child.name, hideSurname), answer.trim());
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm mx-auto">
      {/* Photo */}
      <div className="aspect-square bg-gray-100 relative">
        <img
          src={child.photo_url}
          alt="아이 사진"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Input area */}
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이 아이의 이름은?
          </label>

          {!showResult ? (
            <>
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="이름 입력"
                maxLength={5}
                className="w-full px-4 py-4 text-xl text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={answer.trim().length < 2 || answer.trim().length > 5}
                className="w-full mt-4 bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target text-lg"
              >
                확인
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {/* Result feedback */}
              <div
                className={`px-4 py-4 rounded-lg text-center text-xl font-bold ${
                  isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isCorrect ? "정답입니다! 🎉" : "틀렸습니다 😢"}
              </div>

              {/* Show user's answer vs correct answer */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">입력한 답:</span>
                  <span
                    className={`font-bold text-lg ${
                      isCorrect ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {userAnswer}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">정답:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {displayName}
                    </span>
                  </div>
                )}
              </div>

              {/* Mark as mastered button - only show on correct answers */}
              {isCorrect && onMarkMastered && (
                <button
                  type="button"
                  onClick={onMarkMastered}
                  className="w-full mt-2 text-sm bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 hover:border-purple-400 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  완전히 외웠어요 (더 이상 안 봐도 됨)
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
