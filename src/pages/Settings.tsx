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
  const { user, profile, signOut } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [quizDay, setQuizDay] = useState(profile?.quiz_day || "monday");
  const [emailEnabled, setEmailEnabled] = useState(
    profile?.email_enabled ?? true
  );
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savedDay, setSavedDay] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
    if (profile?.quiz_day) {
      setQuizDay(profile.quiz_day);
    }
    if (profile?.email_enabled !== undefined) {
      setEmailEnabled(profile.email_enabled);
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

  async function handleToggleEmail() {
    if (!user) return;

    setSavingEmail(true);
    const newValue = !emailEnabled;

    const { error } = await supabase
      .from("profiles")
      .update({ email_enabled: newValue } as any)
      .eq("id", user.id);

    setSavingEmail(false);

    if (error) {
      console.error("Error saving email settings:", error);
      alert("저장 중 오류가 발생했습니다.");
    } else {
      setEmailEnabled(newValue);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;

    setDeleting(true);
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (error) {
      console.error("Error deleting account:", error);
      alert("계정 삭제 중 오류가 발생했습니다.");
      setDeleting(false);
      return;
    }

    signOut(); // Clear local session
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
          {/* Email enabled toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">주간 퀴즈 이메일 받기</p>
              <p className="text-sm text-gray-500">
                매주 퀴즈 링크가 포함된 이메일을 받습니다.
              </p>
            </div>
            <button
              onClick={handleToggleEmail}
              disabled={savingEmail}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailEnabled ? "bg-blue-600" : "bg-gray-200"
              } ${savingEmail ? "opacity-50" : ""}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  emailEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Day selection - only show if email is enabled */}
          {emailEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 받을 요일
                </label>

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
            </>
          )}
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

      {/* Danger Zone - Delete Account */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-4">계정 삭제</h2>

        <p className="text-sm text-gray-600 mb-4">
          계정을 삭제하면 모든 퀴즈 기록과 학습 진행 상황이 영구적으로
          삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-red-100 text-red-600 border border-red-300 py-3 rounded-lg font-medium hover:bg-red-200 transition-colors"
          >
            계정 삭제하기
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-2">
                정말로 계정을 삭제하시겠습니까?
              </p>
              <p className="text-sm text-red-600">
                삭제되는 데이터: 프로필, 퀴즈 기록, 학습 진행 상황
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "삭제 중..." : "삭제 확인"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
