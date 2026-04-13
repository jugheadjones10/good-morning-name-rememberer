const MAX_STARS = 4;

function intervalToStarLevel(days: number): number {
  if (days <= 0) return 0;
  if (days <= 6) return 1;
  if (days <= 29) return 2;
  if (days <= 179) return 3;
  return 4;
}

function formatInterval(days: number): string {
  if (days <= 0) return "";
  if (days === 1) return "1일 후";
  if (days < 7) return `${days}일 후`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks}주 후`;
  }
  const months = Math.round(days / 30);
  return `${months}개월 후`;
}

interface MemoryLevelProps {
  intervalDays: number;
  showResult: boolean;
  answerResult?: {
    wasDue: boolean;
    newIntervalDays: number;
  };
  isCorrect: boolean | null;
}

export function MemoryLevel({
  intervalDays,
  showResult,
  answerResult,
  isCorrect,
}: MemoryLevelProps) {
  const displayInterval = showResult && answerResult
    ? answerResult.newIntervalDays
    : intervalDays;

  const starLevel = intervalToStarLevel(displayInterval);
  const isMastered = displayInterval >= 180;
  const wasReset = showResult && isCorrect === false;

  let intervalText: string | null = null;
  if (showResult && answerResult) {
    if (isMastered) {
      intervalText = "완벽하게 외웠어요!";
    } else if (isCorrect && !answerResult.wasDue) {
      intervalText = "이미 복습 예정이에요";
    } else if (isCorrect) {
      intervalText = `다음 복습: ${formatInterval(answerResult.newIntervalDays)}`;
    } else {
      intervalText = `다음 복습: ${formatInterval(answerResult.newIntervalDays)}`;
    }
  }

  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_STARS }).map((_, i) => {
          const filled = i < starLevel;
          const isAnimating = showResult && answerResult && (
            (isCorrect && answerResult.wasDue && i === starLevel - 1) ||
            wasReset
          );

          return (
            <span
              key={i}
              className={`text-sm transition-all duration-500 ${
                isMastered
                  ? "text-yellow-400 scale-110"
                  : filled
                  ? "text-yellow-400"
                  : "text-gray-300"
              } ${isAnimating ? "animate-pulse" : ""}`}
            >
              ★
            </span>
          );
        })}
        <span className="text-xs text-gray-400 ml-1">
          {starLevel}/{MAX_STARS}
        </span>
      </div>

      {intervalText && (
        <span
          className={`text-xs font-medium ${
            isMastered
              ? "text-yellow-600"
              : isCorrect
              ? "text-green-600"
              : "text-red-500"
          }`}
        >
          {intervalText}
        </span>
      )}
    </div>
  );
}

export { intervalToStarLevel };
