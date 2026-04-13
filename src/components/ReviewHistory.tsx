import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGroup } from "../context/GroupContext";

interface DailySession {
  date: string;
  dateLabel: string;
  total: number;
  correct: number;
  accuracy: number;
}

export function ReviewHistory() {
  const { user } = useAuth();
  const { group } = useGroup();
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user, group]);

  async function fetchHistory() {
    setLoading(true);

    const { data: groupChildren } = await supabase
      .from("children")
      .select("id")
      .eq("group_type", group);

    const childIds = new Set((groupChildren || []).map((c: { id: string }) => c.id));

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("is_correct, attempted_at, child_id")
      .eq("user_id", user!.id)
      .order("attempted_at", { ascending: false });

    const filtered = (attempts || []).filter(
      (a: { child_id: string }) => childIds.has(a.child_id)
    );

    const dailyMap = new Map<string, { total: number; correct: number }>();

    for (const attempt of filtered as { is_correct: boolean; attempted_at: string }[]) {
      const dateKey = attempt.attempted_at.split("T")[0];
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.total++;
        if (attempt.is_correct) existing.correct++;
      } else {
        dailyMap.set(dateKey, {
          total: 1,
          correct: attempt.is_correct ? 1 : 0,
        });
      }
    }

    const result: DailySession[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 14)
      .map(([dateKey, data]) => {
        const d = new Date(dateKey + "T00:00:00");
        return {
          date: dateKey,
          dateLabel: d.toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            weekday: "short",
          }),
          total: data.total,
          correct: data.correct,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        };
      });

    setSessions(result);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 학습 기록</h3>
        <div className="text-gray-500 text-center py-4">로딩 중...</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 학습 기록</h3>

      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.date}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {session.dateLabel}
              </div>
              <div className="text-xs text-gray-500">
                {session.total}문제 중 {session.correct}개 정답
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    session.accuracy >= 80
                      ? "bg-green-500"
                      : session.accuracy >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${session.accuracy}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 w-10 text-right">
                {session.accuracy}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
