import { useState, useRef, useEffect } from "react";
import type { Child } from "../lib/database.types";
import { matchName, getDisplayName } from "../lib/koreanName";
import { MemoryLevel } from "./MemoryLevel";

interface QuizCardProps {
  child: Child;
  onAnswer: (isCorrect: boolean, answer: string) => void;
  showResult: boolean;
  userAnswer: string | null;
  hideSurname?: boolean;
  intervalDays: number;
  answerResult?: {
    wasDue: boolean;
    newIntervalDays: number;
  };
}

export function QuizCard({
  child,
  onAnswer,
  showResult,
  userAnswer,
  hideSurname = false,
  intervalDays,
  answerResult,
}: QuizCardProps) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isCorrect =
    userAnswer !== null ? matchName(userAnswer, child.name, hideSurname) : null;

  const displayName = getDisplayName(child.name, hideSurname);

  useEffect(() => {
    setAnswer("");
    if (!showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [child.id]);

  useEffect(() => {
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-xs mx-auto">
      {/* Memory level stars */}
      <div className="px-4 pt-2 pb-1">
        <MemoryLevel
          intervalDays={intervalDays}
          showResult={showResult}
          answerResult={answerResult}
          isCorrect={isCorrect}
        />
      </div>

      {/* Photo */}
      <div className="aspect-square bg-gray-100 relative">
        <img
          src={child.photo_url}
          alt="아이 사진"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Input area */}
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
                maxLength={20}
                className="w-full px-4 py-3 text-xl text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={answer.trim().length < 2 || answer.trim().length > 20}
                className="w-full mt-3 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target text-lg"
              >
                확인
              </button>
            </>
          ) : (
            <div className="space-y-3">
              {/* Result feedback */}
              <div
                className={`px-3 py-3 rounded-lg text-center text-lg font-bold ${
                  isCorrect
                    ? answerResult && answerResult.newIntervalDays >= 180
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isCorrect
                  ? answerResult && answerResult.newIntervalDays >= 180
                    ? "완벽하게 외웠어요! 🌟"
                    : "정답입니다! 🎉"
                  : "틀렸습니다 😢"}
              </div>

              {/* Show user's answer vs correct answer */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">입력한 답:</span>
                  <span
                    className={`font-bold text-base ${
                      isCorrect ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {userAnswer}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">정답:</span>
                    <span className="font-bold text-base text-blue-600">
                      {displayName}
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
