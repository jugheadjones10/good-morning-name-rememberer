import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabase";

interface DailyStats {
  date: string;
  accuracy: number;
  attempts: number;
}

interface ProgressChartProps {
  userId: string;
}

interface QuizAttempt {
  is_correct: boolean;
  attempted_at: string;
}

export function ProgressChart({ userId }: ProgressChartProps) {
  const [data, setData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyStats();
  }, [userId]);

  async function fetchDailyStats() {
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("is_correct, attempted_at")
      .eq("user_id", userId)
      .order("attempted_at", { ascending: true });

    const typedAttempts = (attempts || []) as QuizAttempt[];

    if (typedAttempts.length > 0) {
      // Group by date
      const dailyMap = new Map<string, { correct: number; total: number }>();

      for (const attempt of typedAttempts) {
        const date = new Date(attempt.attempted_at).toLocaleDateString(
          "ko-KR",
          {
            month: "short",
            day: "numeric",
          }
        );
        const existing = dailyMap.get(date);
        if (existing) {
          existing.total++;
          if (attempt.is_correct) existing.correct++;
        } else {
          dailyMap.set(date, {
            total: 1,
            correct: attempt.is_correct ? 1 : 0,
          });
        }
      }

      // Convert to array and calculate accuracy
      const stats: DailyStats[] = Array.from(dailyMap.entries()).map(
        ([date, data]) => ({
          date,
          accuracy: Math.round((data.correct / data.total) * 100),
          attempts: data.total,
        })
      );

      // Keep only last 14 days
      setData(stats.slice(-14));
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500">
        차트를 표시하려면 더 많은 데이터가 필요합니다
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">정답률 추이</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "정답률"]}
              labelStyle={{ color: "#374151" }}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: "#3B82F6", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#3B82F6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
