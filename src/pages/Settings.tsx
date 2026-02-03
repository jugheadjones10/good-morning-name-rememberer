import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const DAYS_OF_WEEK = [
  { value: "monday", label: "월요일" },
  { value: "tuesday", label: "화요일" },
  { value: "wednesday", label: "수요일" },
  { value: "thursday", label: "목요일" },
  { value: "friday", label: "금요일" },
  { value: "saturday", label: "토요일" },
  { value: "sunday", label: "일요일" },
];

export function Settings() {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [quizDay, setQuizDay] = useState(profile?.quiz_day || "monday");
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savedDay, setSavedDay] = useState(false);

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
    if (profile?.quiz_day) {
      setQuizDay(profile.quiz_day);
    }
  }, [profile]);

  async function handleSaveName() {
    if (!user || !name.trim()) return;

    setSavingName(true);
    setSavedName(false);

    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() } as any)
      .eq("id", user.id);

    setSavingName(false);

    if (error) {
      console.error("Error saving name:", error);
      alert("저장 중 오류가 발생했습니다.");
    } else {
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    }
  }

  async function handleSaveDay() {
    if (!user) return;

    setSavingDay(true);
    setSavedDay(false);

    const { error } = await supabase
      .from("profiles")
      .update({ quiz_day: quizDay } as any)
      .eq("id", user.id);

    setSavingDay(false);

    if (error) {
      console.error("Error saving settings:", error);
      alert("저장 중 오류가 발생했습니다.");
    } else {
      setSavedDay(true);
      setTimeout(() => setSavedDay(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">프로필 설정</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름
            </label>
            <p className="text-sm text-gray-500 mb-3">
              리더보드에 표시되는 이름입니다.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          <button
            onClick={handleSaveName}
            disabled={savingName || !name.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 touch-target"
          >
            {savingName ? "저장 중..." : savedName ? "저장됨 ✓" : "이름 저장"}
          </button>
        </div>
      </div>

      {/* Email settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">이메일 설정</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주간 퀴즈 이메일 받을 요일
            </label>
            <p className="text-sm text-gray-500 mb-3">
              선택한 요일에 퀴즈 링크가 포함된 이메일을 받습니다.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setQuizDay(day.value)}
                  className={`py-3 px-4 rounded-lg font-medium touch-target transition-colors ${
                    quizDay === day.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveDay}
            disabled={savingDay}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 touch-target"
          >
            {savingDay ? "저장 중..." : savedDay ? "저장됨 ✓" : "요일 저장"}
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">계정 정보</h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">이메일</span>
            <span className="text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">이름</span>
            <span className="text-gray-900">{profile?.name || "-"}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">계정 유형</span>
            <span className="text-gray-900">
              {profile?.is_admin ? "관리자" : "일반 사용자"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">가입일</span>
            <span className="text-gray-900">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("ko-KR")
                : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
