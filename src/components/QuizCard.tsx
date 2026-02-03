import { useState, useRef, useEffect } from "react";
import type { Child } from "../lib/database.types";
import { matchName } from "../lib/koreanName";

interface QuizCardProps {
  child: Child;
  onAnswer: (isCorrect: boolean, answer: string) => void;
  showResult: boolean;
  userAnswer: string | null;
}

export function QuizCard({
  child,
  onAnswer,
  showResult,
  userAnswer,
}: QuizCardProps) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isCorrect =
    userAnswer !== null ? matchName(userAnswer, child.name) : null;

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
      onAnswer(matchName(answer, child.name), answer.trim());
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
          loading="lazy"
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
                maxLength={4}
                className="w-full px-4 py-4 text-xl text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={answer.trim().length < 2 || answer.trim().length > 4}
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
                      {child.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
