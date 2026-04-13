import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGroup } from "../context/GroupContext";
import { ProgressChart } from "../components/ProgressChart";
import { Leaderboard } from "../components/Leaderboard";
import { ReviewHistory } from "../components/ReviewHistory";
import { getSgtDateString } from "../lib/date";
import type { UserChildProgress } from "../lib/database.types";

interface MasteryDistribution {
  newCount: number;
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  total: number;
}

interface Stats {
  totalAttempts: number;
  correctAttempts: number;
  recentAccuracy: number;
  mastery: MasteryDistribution;
}

interface ChildAccuracy {
  id: string;
  name: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

interface QuizAttemptWithChild {
  id: string;
  user_id: string;
  child_id: string;
  user_answer: string;
  is_correct: boolean;
  attempted_at: string;
  children: { name: string } | null;
}

function computeMastery(
  allChildren: { id: string }[],
  progressMap: Map<string, UserChildProgress>
): MasteryDistribution {
  let newCount = 0;
  let star1 = 0;
  let star2 = 0;
  let star3 = 0;
  let star4 = 0;

  for (const child of allChildren) {
    const p = progressMap.get(child.id);
    if (!p) {
      newCount++;
    } else if (p.mastered || p.interval_days >= 180) {
      star4++;
    } else if (p.interval_days >= 30) {
      star3++;
    } else if (p.interval_days >= 7) {
      star2++;
    } else {
      star1++;
    }
  }

  return { newCount, star1, star2, star3, star4, total: allChildren.length };
}

export function Home() {
  const { user, profile } = useAuth();
  const { group } = useGroup();
  const [stats, setStats] = useState<Stats | null>(null);
  const [childAccuracies, setChildAccuracies] = useState<ChildAccuracy[]>([]);
  const [loading, setLoading] = useState(true);

  const cardsPerSession = profile?.cards_per_session ?? 20;
  const currentStreak = profile?.current_streak ?? 0;
  const lastSessionDate = profile?.last_session_date ?? null;
  const today = getSgtDateString();
  const completedToday = lastSessionDate === today;

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, group]);

  async function fetchStats() {
    setLoading(true);

    const { data: allChildren } = await supabase
      .from("children")
      .select("id")
      .eq("group_type", group);

    const childIds = new Set((allChildren || []).map((c) => c.id));

    const { data: progressData } = await supabase
      .from("user_child_progress")
      .select("*")
      .eq("user_id", user!.id);

    const progressMap = new Map<string, UserChildProgress>();
    ((progressData || []) as UserChildProgress[]).forEach((p) => {
      if (childIds.has(p.child_id)) {
        progressMap.set(p.child_id, p);
      }
    });

    const mastery = computeMastery(allChildren || [], progressMap);

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*, children(name)")
      .eq("user_id", user!.id)
      .order("attempted_at", { ascending: false });

    const typedAttempts = ((attempts || []) as QuizAttemptWithChild[]).filter(
      (a) => childIds.has(a.child_id)
    );

    if (typedAttempts.length > 0) {
      const totalAttempts = typedAttempts.length;
      const correctAttempts = typedAttempts.filter((a) => a.is_correct).length;

      const recent = typedAttempts.slice(0, 50);
      const recentCorrect = recent.filter((a) => a.is_correct).length;
      const recentAccuracy =
        recent.length > 0 ? (recentCorrect / recent.length) * 100 : 0;

      setStats({
        totalAttempts,
        correctAttempts,
        recentAccuracy,
        mastery,
      });

      const childMap = new Map<
        string,
        { name: string; attempts: number; correct: number }
      >();
      for (const attempt of typedAttempts) {
        const existing = childMap.get(attempt.child_id);
        const childName = attempt.children?.name || "알 수 없음";
        if (existing) {
          existing.attempts++;
          if (attempt.is_correct) existing.correct++;
        } else {
          childMap.set(attempt.child_id, {
            name: childName,
            attempts: 1,
            correct: attempt.is_correct ? 1 : 0,
          });
        }
      }

      const accuracies: ChildAccuracy[] = Array.from(childMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          attempts: data.attempts,
          correct: data.correct,
          accuracy: (data.correct / data.attempts) * 100,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);

      setChildAccuracies(accuracies);
    } else {
      setStats({
        totalAttempts: 0,
        correctAttempts: 0,
        recentAccuracy: 0,
        mastery,
      });
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  const overallAccuracy =
    stats && stats.totalAttempts > 0
      ? (stats.correctAttempts / stats.totalAttempts) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Streak + Daily CTA */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center mb-4">
          {currentStreak > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl">🔥</span>
              <div className="text-center">
                <span className="text-3xl font-bold text-orange-600">
                  {currentStreak}
                </span>
                <span className="text-lg text-orange-600 ml-1">일 연속</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-3xl block mb-1">🔥</span>
              <p className="text-gray-500 font-medium">
                오늘 첫 세션을 시작하세요!
              </p>
            </div>
          )}
        </div>

        {completedToday ? (
          <div className="bg-green-50 rounded-lg p-4 mb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl">✅</span>
              <p className="text-green-800 font-medium">오늘 세션 완료!</p>
            </div>
            <p className="text-sm text-green-600">한 세션 더 할 수 있어요</p>
          </div>
        ) : null}

        <Link
          to="quiz"
          className={`inline-flex items-center justify-center w-full py-4 rounded-lg font-medium touch-target text-lg ${
            completedToday
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {completedToday
            ? "한 세션 더 하기"
            : `오늘의 세션 시작 (${cardsPerSession}장)`}
        </Link>
      </div>

      {/* Mastery distribution */}
      {stats && stats.mastery.total > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            암기 현황
          </h3>

          {/* Stacked progress bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100 mb-4">
            {stats.mastery.star4 > 0 && (
              <div
                className="bg-yellow-400 h-full"
                style={{ width: `${(stats.mastery.star4 / stats.mastery.total) * 100}%` }}
              />
            )}
            {stats.mastery.star3 > 0 && (
              <div
                className="bg-orange-400 h-full"
                style={{ width: `${(stats.mastery.star3 / stats.mastery.total) * 100}%` }}
              />
            )}
            {stats.mastery.star2 > 0 && (
              <div
                className="bg-blue-400 h-full"
                style={{ width: `${(stats.mastery.star2 / stats.mastery.total) * 100}%` }}
              />
            )}
            {stats.mastery.star1 > 0 && (
              <div
                className="bg-sky-300 h-full"
                style={{ width: `${(stats.mastery.star1 / stats.mastery.total) * 100}%` }}
              />
            )}
            {stats.mastery.newCount > 0 && (
              <div
                className="bg-gray-200 h-full"
                style={{ width: `${(stats.mastery.newCount / stats.mastery.total) * 100}%` }}
              />
            )}
          </div>

          {/* Legend rows */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">★★★★</span>
                <span className="text-gray-600">완벽히 외움</span>
              </div>
              <span className="font-bold text-gray-900">{stats.mastery.star4}<span className="font-normal text-gray-500 ml-0.5">명</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span><span className="text-orange-400">★★★</span><span className="text-gray-300">★</span></span>
                <span className="text-gray-600">거의 다 외움</span>
              </div>
              <span className="font-bold text-gray-900">{stats.mastery.star3}<span className="font-normal text-gray-500 ml-0.5">명</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span><span className="text-blue-400">★★</span><span className="text-gray-300">★★</span></span>
                <span className="text-gray-600">알아가는 중</span>
              </div>
              <span className="font-bold text-gray-900">{stats.mastery.star2}<span className="font-normal text-gray-500 ml-0.5">명</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span><span className="text-sky-300">★</span><span className="text-gray-300">★★★</span></span>
                <span className="text-gray-600">막 시작</span>
              </div>
              <span className="font-bold text-gray-900">{stats.mastery.star1}<span className="font-normal text-gray-500 ml-0.5">명</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-300">★★★★</span>
                <span className="text-gray-600">아직 안 본 아이</span>
              </div>
              <span className="font-bold text-gray-900">{stats.mastery.newCount}<span className="font-normal text-gray-500 ml-0.5">명</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Stats overview */}
      {stats && stats.totalAttempts > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            나의 성적
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {overallAccuracy.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">전체 정답률</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.recentAccuracy.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">최근 정답률</div>
            </div>
          </div>

          <ProgressChart userId={user!.id} />
        </div>
      )}

      {/* Children needing practice */}
      {childAccuracies.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            더 연습이 필요한 아이들
          </h3>
          <div className="space-y-3">
            {childAccuracies.slice(0, 5).map((child) => (
              <div key={child.id} className="flex items-center justify-between">
                <span className="text-gray-900 font-medium">{child.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${child.accuracy}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {child.accuracy.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard for kindergarten, ReviewHistory for primary */}
      {group === "primary" ? <ReviewHistory /> : <Leaderboard />}

      {/* Empty state */}
      {stats && stats.totalAttempts === 0 && (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 퀴즈 기록이 없습니다
          </h3>
          <p className="text-gray-600 mb-4">첫 번째 퀴즈를 시작해보세요!</p>
        </div>
      )}
    </div>
  );
}
