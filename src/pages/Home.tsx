import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ProgressChart } from "../components/ProgressChart";
import { Leaderboard } from "../components/Leaderboard";
import type { UserChildProgress } from "../lib/database.types";

interface Stats {
  totalAttempts: number;
  correctAttempts: number;
  totalChildren: number;
  recentAccuracy: number;
  dueForReview: number;
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

export function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [childAccuracies, setChildAccuracies] = useState<ChildAccuracy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  async function fetchStats() {
    setLoading(true);

    // Fetch total children count
    const { data: allChildren } = await supabase.from("children").select("id");

    const childCount = allChildren?.length || 0;

    // Fetch user's progress to calculate due for review
    const { data: progressData } = await supabase
      .from("user_child_progress")
      .select("*")
      .eq("user_id", user!.id);

    const today = new Date().toISOString().split("T")[0];
    const progressMap = new Map<string, UserChildProgress>();
    ((progressData || []) as UserChildProgress[]).forEach((p) => {
      progressMap.set(p.child_id, p);
    });

    // Count children due for review:
    // 1. No progress record (new child) -> due
    // 2. next_review_date <= today -> due
    let dueCount = 0;
    for (const child of allChildren || []) {
      const progress = progressMap.get(child.id);
      if (!progress || progress.next_review_date <= today) {
        dueCount++;
      }
    }

    // Fetch user's quiz attempts
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*, children(name)")
      .eq("user_id", user!.id)
      .order("attempted_at", { ascending: false });

    const typedAttempts = (attempts || []) as QuizAttemptWithChild[];

    if (typedAttempts.length > 0) {
      const totalAttempts = typedAttempts.length;
      const correctAttempts = typedAttempts.filter((a) => a.is_correct).length;

      // Recent accuracy (last 50 attempts)
      const recent = typedAttempts.slice(0, 50);
      const recentCorrect = recent.filter((a) => a.is_correct).length;
      const recentAccuracy =
        recent.length > 0 ? (recentCorrect / recent.length) * 100 : 0;

      setStats({
        totalAttempts,
        correctAttempts,
        totalChildren: childCount,
        recentAccuracy,
        dueForReview: dueCount,
      });

      // Calculate per-child accuracy
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
      // No attempts yet, but still set stats for due count
      setStats({
        totalAttempts: 0,
        correctAttempts: 0,
        totalChildren: childCount,
        recentAccuracy: 0,
        dueForReview: dueCount,
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
      {/* Welcome section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">안녕하세요!</h2>

        {stats && stats.dueForReview > 0 ? (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">오늘 복습할 아이</p>
                <p className="text-sm text-blue-600">
                  총 {stats.totalChildren}명 중
                </p>
              </div>
              <div className="text-4xl font-bold text-blue-600">
                {stats.dueForReview}명
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="text-green-800 font-medium">오늘 복습 완료!</p>
                <p className="text-sm text-green-600">다음 복습일까지 쉬세요</p>
              </div>
            </div>
          </div>
        ) : null}

        <Link
          to="/quiz"
          className={`inline-flex items-center justify-center w-full py-4 rounded-lg font-medium touch-target text-lg ${
            stats && stats.dueForReview > 0
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
          }`}
        >
          {stats && stats.dueForReview > 0
            ? `퀴즈 시작하기 (${stats.dueForReview}명)`
            : "퀴즈 시작하기"}
        </Link>
      </div>

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
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats.totalAttempts}
              </div>
              <div className="text-sm text-gray-600 mt-1">총 시도</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {stats.totalChildren - stats.dueForReview}
              </div>
              <div className="text-sm text-gray-600 mt-1">외운 아이</div>
            </div>
          </div>

          {/* Progress chart */}
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

      {/* Leaderboard */}
      <Leaderboard />

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
