import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface EmailLog {
  id: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  children_count: number;
  trigger_type: string;
  created_at: string;
}

export function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sent: 0, failed: 0 });

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch email logs:", error);
    } else {
      setLogs(data || []);

      // Calculate stats from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = (data || []).filter(
        (log) => new Date(log.created_at) >= thirtyDaysAgo
      );
      setStats({
        sent: recent.filter((l) => l.status === "sent").length,
        failed: recent.filter((l) => l.status === "failed").length,
      });
    }
    setLoading(false);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">이메일 발송 로그</h1>
        <Link
          to="../admin"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← 관리자 페이지
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{stats.sent}</div>
          <div className="text-sm text-green-600 mt-1">최근 30일 발송 성공</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{stats.failed}</div>
          <div className="text-sm text-red-600 mt-1">최근 30일 발송 실패</div>
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            아직 발송 기록이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((log) => (
              <li key={log.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {log.recipient_email}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      log.status === "sent"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status === "sent" ? "성공" : "실패"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatDate(log.created_at)}</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {log.trigger_type === "test" ? "테스트" : "자동(크론)"}
                  </span>
                  <span>{log.children_count}명</span>
                </div>
                {log.error_message && (
                  <p className="mt-1 text-xs text-red-600 bg-red-50 rounded p-2">
                    {log.error_message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
