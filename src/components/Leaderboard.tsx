import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGroup } from "../context/GroupContext";

interface LeaderboardEntry {
  id: string;
  name: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  masteredChildren: number;
}

export function Leaderboard() {
  const { user } = useAuth();
  const { group } = useGroup();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [group]);

  async function fetchLeaderboard() {
    setLoading(true);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setLoading(false);
      return;
    }

    // Get children IDs for this group to scope attempts and progress
    const { data: groupChildren } = await supabase
      .from("children")
      .select("id")
      .eq("group_type", group);

    const childIds = new Set((groupChildren || []).map((c) => c.id));

    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("user_id, child_id, is_correct");

    if (attemptsError) {
      console.error("Error fetching attempts:", attemptsError);
    }

    const { data: progress, error: progressError } = await supabase
      .from("user_child_progress")
      .select("user_id, child_id, interval_days, mastered");

    if (progressError) {
      console.error("Error fetching progress:", progressError);
    }

    const leaderboard: LeaderboardEntry[] = [];

    for (const profile of (profiles || []) as { id: string; name: string }[]) {
      if (!profile.name) continue;

      const userAttempts = (attempts || []).filter(
        (a: { user_id: string; child_id: string; is_correct: boolean }) =>
          a.user_id === profile.id && childIds.has(a.child_id)
      );
      const totalAttempts = userAttempts.length;
      const correctAttempts = userAttempts.filter(
        (a: { is_correct: boolean }) => a.is_correct
      ).length;

      const userProgress = (progress || []).filter(
        (p: {
          user_id: string;
          child_id: string;
          interval_days: number;
          mastered?: boolean;
        }) => p.user_id === profile.id && childIds.has(p.child_id)
      );
      const masteredChildren = userProgress.filter(
        (p: { interval_days: number; mastered?: boolean }) =>
          p.interval_days >= 30 || p.mastered === true
      ).length;

      leaderboard.push({
        id: profile.id,
        name: profile.name,
        totalAttempts,
        correctAttempts,
        accuracy:
          totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
        masteredChildren,
      });
    }

    leaderboard.sort((a, b) => {
      if (b.masteredChildren !== a.masteredChildren) {
        return b.masteredChildren - a.masteredChildren;
      }
      return b.accuracy - a.accuracy;
    });

    // Only show users who have attempted at least once in this group
    setEntries(leaderboard.filter((e) => e.totalAttempts > 0));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">리더보드</h3>
        <div className="text-gray-500 text-center py-4">로딩 중...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🏆 리더보드
      </h3>

      <div className="space-y-3">
        {entries.map((entry, index) => {
          const isCurrentUser = entry.id === user?.id;
          const rank = index + 1;
          const medal =
            rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isCurrentUser
                  ? "bg-blue-50 border-2 border-blue-200"
                  : "bg-gray-50"
              }`}
            >
              <div className="w-8 text-center font-bold text-lg">
                {medal || rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium truncate ${
                      isCurrentUser ? "text-blue-700" : "text-gray-900"
                    }`}
                  >
                    {entry.name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                      나
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {entry.totalAttempts > 0
                    ? `정답률 ${entry.accuracy.toFixed(0)}% · ${
                        entry.totalAttempts
                      }회 시도`
                    : "아직 퀴즈 기록 없음"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {entry.masteredChildren}
                </div>
                <div className="text-xs text-gray-500">외운 아이</div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        * 외운 아이: 30일 이상 간격으로 복습 중인 아이 수
      </p>
    </div>
  );
}
