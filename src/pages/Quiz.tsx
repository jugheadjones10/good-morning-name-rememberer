import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { QuizCard } from "../components/QuizCard";
import type { Child, UserChildProgress } from "../lib/database.types";

interface ChildWithProgress extends Child {
  progress?: UserChildProgress;
}

interface QuizState {
  children: ChildWithProgress[];
  currentIndex: number;
  answers: { childId: string; answer: string; isCorrect: boolean }[];
  showResult: boolean;
  completed: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function Quiz() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalChildren, setTotalChildren] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>({
    children: [],
    currentIndex: 0,
    answers: [],
    showResult: false,
    completed: false,
  });

  useEffect(() => {
    if (user) {
      fetchChildrenDueForReview();
    }
  }, [user]);

  async function fetchChildrenDueForReview() {
    if (!user) return;

    // Get all children
    const { data: allChildren, error: childrenError } = await supabase
      .from("children")
      .select("*");

    if (childrenError) {
      console.error("Error fetching children:", childrenError);
      setLoading(false);
      return;
    }

    setTotalChildren(allChildren?.length || 0);

    // Get user's progress for all children
    const { data: progressData, error: progressError } = await supabase
      .from("user_child_progress")
      .select("*")
      .eq("user_id", user.id);

    if (progressError) {
      console.error("Error fetching progress:", progressError);
    }

    const progressMap = new Map<string, UserChildProgress>();
    ((progressData as UserChildProgress[]) || []).forEach((p) => {
      progressMap.set(p.child_id, p);
    });

    const today = getTodayDate();

    // Filter children that are due for review:
    // 1. No progress record (new child) -> due immediately
    // 2. next_review_date <= today -> due for review
    const dueChildren: ChildWithProgress[] = ((allChildren as Child[]) || [])
      .filter((child) => {
        const progress = progressMap.get(child.id);
        if (!progress) return true; // New child, due immediately
        return progress.next_review_date <= today;
      })
      .map((child) => ({
        ...child,
        progress: progressMap.get(child.id),
      }));

    setQuiz((prev) => ({
      ...prev,
      children: shuffleArray(dueChildren),
    }));
    setLoading(false);
  }

  const handleAnswer = useCallback(
    async (isCorrect: boolean, answer: string) => {
      const currentChild = quiz.children[quiz.currentIndex];

      // Record the attempt
      await supabase.from("quiz_attempts").insert({
        user_id: user!.id,
        child_id: currentChild.id,
        user_answer: answer,
        is_correct: isCorrect,
      } as any);

      // Update spaced repetition progress
      await updateProgress(currentChild, isCorrect);

      setQuiz((prev) => ({
        ...prev,
        answers: [
          ...prev.answers,
          { childId: currentChild.id, answer, isCorrect },
        ],
        showResult: true,
      }));
    },
    [quiz.children, quiz.currentIndex, user]
  );

  async function updateProgress(child: ChildWithProgress, isCorrect: boolean) {
    if (!user) return;

    // First, get the CURRENT progress from DB (not stale local copy)
    // This handles the case where user restarts quiz and answers same child again
    const { data: currentProgress } = await supabase
      .from("user_child_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("child_id", child.id)
      .single();

    const existingProgress = currentProgress as UserChildProgress | null;

    if (existingProgress) {
      // Update existing progress
      let newIntervalWeeks: number;
      let newConsecutiveCorrect: number;

      if (isCorrect) {
        // Correct: increase interval by 1 week
        newIntervalWeeks = existingProgress.interval_weeks + 1;
        newConsecutiveCorrect = existingProgress.consecutive_correct + 1;
      } else {
        // Incorrect: reset to 1 week
        newIntervalWeeks = 1;
        newConsecutiveCorrect = 0;
      }

      // Calculate next review date
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + newIntervalWeeks * 7);
      const nextReviewDate = nextReview.toISOString().split("T")[0];

      await supabase
        .from("user_child_progress")
        .update({
          interval_weeks: newIntervalWeeks,
          next_review_date: nextReviewDate,
          last_reviewed_at: new Date().toISOString(),
          consecutive_correct: newConsecutiveCorrect,
        } as any)
        .eq("id", existingProgress.id);
    } else {
      // Create new progress record
      const intervalWeeks = isCorrect ? 2 : 1; // If correct first time, start at 2 weeks
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + intervalWeeks * 7);
      const nextReviewDate = nextReview.toISOString().split("T")[0];

      await supabase.from("user_child_progress").insert({
        user_id: user.id,
        child_id: child.id,
        interval_weeks: intervalWeeks,
        next_review_date: nextReviewDate,
        last_reviewed_at: new Date().toISOString(),
        consecutive_correct: isCorrect ? 1 : 0,
      } as any);
    }
  }

  function handleNext() {
    const nextIndex = quiz.currentIndex + 1;
    if (nextIndex >= quiz.children.length) {
      setQuiz((prev) => ({ ...prev, completed: true }));
    } else {
      setQuiz((prev) => ({
        ...prev,
        currentIndex: nextIndex,
        showResult: false,
      }));
    }
  }

  function restartQuiz() {
    setQuiz({
      children: shuffleArray(quiz.children),
      currentIndex: 0,
      answers: [],
      showResult: false,
      completed: false,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (totalChildren === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          등록된 아이가 없습니다
        </h3>
        <p className="text-gray-600">
          관리자에게 아이들의 사진을 등록해달라고 요청하세요.
        </p>
      </div>
    );
  }

  if (quiz.children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          오늘 복습 완료!
        </h3>
        <p className="text-gray-600 mb-4">
          복습할 아이가 없습니다. 잘 하셨어요!
        </p>
        <p className="text-sm text-gray-500 mb-6">
          전체 {totalChildren}명 중 모든 아이의 다음 복습일이 아직 오지
          않았습니다.
        </p>
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          홈으로
        </Link>
      </div>
    );
  }

  // Quiz completed
  if (quiz.completed) {
    const correctCount = quiz.answers.filter((a) => a.isCorrect).length;
    const totalCount = quiz.answers.length;
    const accuracy = (correctCount / totalCount) * 100;

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-6xl mb-4">
          {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">퀴즈 완료!</h2>

        <div className="my-6">
          <div className="text-5xl font-bold text-blue-600">
            {accuracy.toFixed(0)}%
          </div>
          <div className="text-gray-600 mt-2">
            {totalCount}명 중 {correctCount}명 정답
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={restartQuiz}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 touch-target text-lg"
          >
            다시 시작
          </button>
          <Link
            to="/"
            className="block w-full bg-gray-100 text-gray-700 py-4 rounded-lg font-medium hover:bg-gray-200 touch-target text-lg"
          >
            홈으로
          </Link>
        </div>

        {/* Show wrong answers */}
        {quiz.answers.filter((a) => !a.isCorrect).length > 0 && (
          <div className="mt-6 text-left">
            <h3 className="font-medium text-gray-900 mb-3">틀린 문제</h3>
            <div className="space-y-2">
              {quiz.answers
                .filter((a) => !a.isCorrect)
                .map((a, i) => {
                  const child = quiz.children.find((c) => c.id === a.childId);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-red-50 rounded-lg p-3"
                    >
                      <img
                        src={child?.photo_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-sm text-gray-600">
                          입력:{" "}
                          <span className="text-red-600 font-medium">
                            {a.answer}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          정답:{" "}
                          <span className="text-green-600 font-medium">
                            {child?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentChild = quiz.children[quiz.currentIndex];
  const currentAnswer = quiz.answers.find((a) => a.childId === currentChild.id);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>진행률</span>
          <span>
            {quiz.currentIndex + 1} / {quiz.children.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                ((quiz.currentIndex + 1) / quiz.children.length) * 100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Quiz card */}
      <QuizCard
        child={currentChild}
        onAnswer={handleAnswer}
        showResult={quiz.showResult}
        userAnswer={currentAnswer?.answer ?? null}
      />

      {/* Next button */}
      {quiz.showResult && (
        <button
          onClick={handleNext}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 touch-target text-lg"
        >
          {quiz.currentIndex + 1 >= quiz.children.length ? "결과 보기" : "다음"}
        </button>
      )}
    </div>
  );
}
