import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGroup } from "../context/GroupContext";
import { QuizCard } from "../components/QuizCard";
import { getDisplayName } from "../lib/koreanName";
import { addDaysToDateString, getSgtDateString } from "../lib/date";
import type { Child, UserChildProgress } from "../lib/database.types";

interface ChildWithProgress extends Child {
  progress?: UserChildProgress;
}

interface QuizState {
  children: ChildWithProgress[];
  currentIndex: number;
  answers: {
    childId: string;
    answer: string;
    isCorrect: boolean;
    wasDue: boolean;
    newIntervalDays: number;
  }[];
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

function getTodayDate(): string {
  return getSgtDateString();
}

function getYesterdayDate(): string {
  return addDaysToDateString(getTodayDate(), -1);
}

function applyFuzz(interval: number): number {
  if (interval < 8) return interval;
  const fuzz = Math.ceil(0.05 * interval);
  const choices = [-fuzz, 0, fuzz];
  return interval + choices[Math.floor(Math.random() * choices.length)];
}

function isMasteredProgress(progress?: UserChildProgress): boolean {
  if (!progress) return false;
  return progress.mastered || progress.interval_days >= 180;
}

export function Quiz() {
  const { user, profile } = useAuth();
  const { group } = useGroup();
  const [loading, setLoading] = useState(true);
  const [totalChildren, setTotalChildren] = useState(0);
  const hideSurname = profile?.hide_surname ?? true;
  const cardsPerSession = profile?.cards_per_session ?? 20;
  const [remainingDue, setRemainingDue] = useState(0);
  const [remainingNew, setRemainingNew] = useState(0);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const [updatedStreak, setUpdatedStreak] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>({
    children: [],
    currentIndex: 0,
    answers: [],
    showResult: false,
    completed: false,
  });

  useEffect(() => {
    if (user) {
      loadChildren();
    }
  }, [user, group]);

  async function loadChildren() {
    if (!user) return;

    const { data: allChildren, error: childrenError } = await supabase
      .from("children")
      .select("*")
      .eq("group_type", group);

    if (childrenError) {
      console.error("Error fetching children:", childrenError);
      setLoading(false);
      return;
    }

    const childrenList = (allChildren as Child[]) || [];
    setTotalChildren(childrenList.length);

    const { data: progressData, error: progressError } = await supabase
      .from("user_child_progress")
      .select("*")
      .eq("user_id", user.id);

    if (progressError) {
      console.error("Error fetching progress:", progressError);
    }

    const pMap = new Map<string, UserChildProgress>();
    ((progressData as UserChildProgress[]) || []).forEach((p) => {
      pMap.set(p.child_id, p);
    });

    const allWithProgress: ChildWithProgress[] = childrenList.map((child) => ({
      ...child,
      progress: pMap.get(child.id),
    }));

    buildSessionDeck(allWithProgress);
    setLoading(false);
  }

  function buildSessionDeck(children: ChildWithProgress[]) {
    const today = getTodayDate();
    const N = cardsPerSession;

    const reviewPool = children.filter((child) => {
      if (!child.progress) return false;
      if (isMasteredProgress(child.progress)) return false;
      return child.progress.next_review_date <= today;
    });

    const newPool = children.filter((child) => !child.progress);

    const shuffledReview = shuffleArray(reviewPool);
    const shuffledNew = shuffleArray(newPool);

    const deck: ChildWithProgress[] = [];
    deck.push(...shuffledReview.slice(0, N));
    if (deck.length < N) {
      deck.push(...shuffledNew.slice(0, N - deck.length));
    }

    const usedReview = Math.min(shuffledReview.length, N);
    const usedNew = Math.min(shuffledNew.length, Math.max(0, N - usedReview));

    setRemainingDue(shuffledReview.length - usedReview);
    setRemainingNew(shuffledNew.length - usedNew);

    const finalDeck = shuffleArray(deck);

    setStreakUpdated(false);
    setQuiz({
      children: finalDeck,
      currentIndex: 0,
      answers: [],
      showResult: false,
      completed: false,
    });
  }

  // Preload next images
  useEffect(() => {
    if (quiz.children.length === 0) return;
    const nextChildren = quiz.children.slice(
      quiz.currentIndex + 1,
      quiz.currentIndex + 3
    );
    nextChildren.forEach((child) => {
      const img = new Image();
      img.src = child.photo_url;
    });
  }, [quiz.currentIndex, quiz.children]);

  const handleAnswer = useCallback(
    async (isCorrect: boolean, answer: string) => {
      const currentChild = quiz.children[quiz.currentIndex];
      const today = getTodayDate();
      const isDue =
        !currentChild.progress ||
        (!isMasteredProgress(currentChild.progress) &&
          currentChild.progress.next_review_date <= today);

      await supabase.from("quiz_attempts").insert({
        user_id: user!.id,
        child_id: currentChild.id,
        user_answer: answer,
        is_correct: isCorrect,
      } as any);

      const result = await updateProgress(currentChild, isCorrect, isDue);

      setQuiz((prev) => ({
        ...prev,
        answers: [
          ...prev.answers,
          {
            childId: currentChild.id,
            answer,
            isCorrect,
            wasDue: isDue,
            newIntervalDays: result.newIntervalDays,
          },
        ],
        showResult: true,
      }));
    },
    [quiz.children, quiz.currentIndex, user]
  );

  async function updateProgress(
    child: ChildWithProgress,
    isCorrect: boolean,
    isDue: boolean
  ): Promise<{ newIntervalDays: number }> {
    if (!user) return { newIntervalDays: 1 };

    // Correct on non-due card: no progress change
    if (isCorrect && !isDue) {
      return { newIntervalDays: child.progress?.interval_days ?? 1 };
    }

    const { data: currentProgress } = await supabase
      .from("user_child_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("child_id", child.id)
      .single();

    const existing = currentProgress as UserChildProgress | null;

    if (existing) {
      let newIntervalDays: number;
      let newEase = existing.ease_factor;
      let newConsecutive = existing.consecutive_correct;
      let mastered = false;

      if (isCorrect) {
        // SM-2: exponential growth via ease factor
        if (existing.interval_days <= 1) {
          newIntervalDays = 3;
        } else {
          newIntervalDays = Math.round(existing.interval_days * newEase);
        }
        newIntervalDays = applyFuzz(newIntervalDays);
        newConsecutive += 1;
        if (newIntervalDays >= 180) mastered = true;
      } else {
        // Wrong: halve interval, reduce ease
        newEase = Math.max(1.3, newEase - 0.2);
        newIntervalDays = Math.max(1, Math.floor(existing.interval_days * 0.5));
        newConsecutive = 0;
        mastered = false;
      }

      const nextReviewDate = addDaysToDateString(
        getTodayDate(),
        mastered ? 3650 : newIntervalDays
      );

      await supabase
        .from("user_child_progress")
        .update({
          interval_days: newIntervalDays,
          ease_factor: newEase,
          next_review_date: nextReviewDate,
          last_reviewed_at: new Date().toISOString(),
          consecutive_correct: newConsecutive,
          mastered,
        } as any)
        .eq("id", existing.id);

      return { newIntervalDays };
    } else {
      // First review: create new progress record
      const intervalDays = isCorrect ? 1 : 1;
      const nextReviewDate = addDaysToDateString(getTodayDate(), intervalDays);

      await supabase.from("user_child_progress").insert({
        user_id: user.id,
        child_id: child.id,
        interval_days: intervalDays,
        ease_factor: 2.5,
        next_review_date: nextReviewDate,
        last_reviewed_at: new Date().toISOString(),
        consecutive_correct: isCorrect ? 1 : 0,
      } as any);

      return { newIntervalDays: intervalDays };
    }
  }

  async function updateStreak() {
    if (!user || !profile || streakUpdated) return;

    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const lastDate = profile.last_session_date;

    let newStreak: number;
    if (lastDate === today) {
      setStreakUpdated(true);
      setUpdatedStreak(profile.current_streak);
      return;
    } else if (lastDate === yesterday) {
      newStreak = profile.current_streak + 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(profile.longest_streak, newStreak);

    await supabase
      .from("profiles")
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_session_date: today,
      } as any)
      .eq("id", profile.id);

    setStreakUpdated(true);
    setUpdatedStreak(newStreak);
  }

  function handleNext() {
    const nextIndex = quiz.currentIndex + 1;
    if (nextIndex >= quiz.children.length) {
      setQuiz((prev) => ({ ...prev, completed: true }));
      updateStreak();
    } else {
      setQuiz((prev) => ({
        ...prev,
        currentIndex: nextIndex,
        showResult: false,
      }));
    }
  }

  async function startAnotherSession() {
    setLoading(true);
    await loadChildren();
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
    const allDone = remainingDue === 0 && remainingNew === 0;
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-6xl mb-4">{allDone ? "🏆" : "🎉"}</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {allDone ? "모든 아이를 외웠어요!" : "오늘 복습 완료!"}
        </h3>
        <p className="text-gray-600 mb-6">
          {allDone
            ? `전체 ${totalChildren}명을 완벽하게 외웠습니다!`
            : "복습할 아이가 없습니다. 잘 하셨어요!"}
        </p>
        <Link
          to=".."
          className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200"
        >
          홈으로
        </Link>
      </div>
    );
  }

  // Quiz completed — show summary
  if (quiz.completed) {
    const correctCount = quiz.answers.filter((a) => a.isCorrect).length;
    const totalCount = quiz.answers.length;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const moreAvailable = remainingDue > 0 || remainingNew > 0;

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-6xl mb-4">
          {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">세션 완료!</h2>

        {streakUpdated && updatedStreak > 0 && (
          <div className="my-4 flex items-center justify-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-bold text-orange-600">
              {updatedStreak}일 연속
            </span>
          </div>
        )}

        <div className="my-6">
          <div className="text-5xl font-bold text-blue-600">
            {accuracy.toFixed(0)}%
          </div>
          <div className="text-gray-600 mt-2">
            {totalCount}명 중 {correctCount}명 정답
          </div>
        </div>

        <div className="space-y-3">
          {moreAvailable && (
            <button
              onClick={startAnotherSession}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 touch-target text-lg"
            >
              한 세션 더 하기
            </button>
          )}
          <Link
            to=".."
            className="block w-full bg-gray-100 text-gray-700 py-4 rounded-lg font-medium hover:bg-gray-200 touch-target text-lg"
          >
            홈으로
          </Link>
        </div>

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
                            {child ? getDisplayName(child.name, hideSurname) : ""}
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
            className="h-2 rounded-full transition-all duration-300 bg-blue-600"
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
        hideSurname={hideSurname}
        intervalDays={currentChild.progress?.interval_days ?? 0}
        answerResult={
          currentAnswer
            ? {
                wasDue: currentAnswer.wasDue,
                newIntervalDays: currentAnswer.newIntervalDays,
              }
            : undefined
        }
      />

      {/* Next button */}
      {quiz.showResult && (
        <div className="max-w-xs mx-auto">
          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 touch-target text-lg"
          >
            {quiz.currentIndex + 1 >= quiz.children.length
              ? "결과 보기"
              : "다음"}
          </button>
        </div>
      )}
    </div>
  );
}
