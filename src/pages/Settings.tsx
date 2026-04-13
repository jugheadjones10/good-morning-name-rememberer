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

const CARDS_PER_SESSION_PRESETS = [10, 15, 20, 30];

export function Settings() {
  const { user, profile, signOut } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [hideSurname, setHideSurname] = useState(
    profile?.hide_surname ?? true
  );
  const [savingHideSurname, setSavingHideSurname] = useState(false);

  const [emailFrequency, setEmailFrequency] = useState<"daily" | "weekly" | "off">(
    profile?.email_frequency ?? "daily"
  );
  const [quizDay, setQuizDay] = useState(profile?.quiz_day || "saturday");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);

  const [cardsPerSession, setCardsPerSession] = useState(
    profile?.cards_per_session ?? 20
  );
  const [customCards, setCustomCards] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [savingCards, setSavingCards] = useState(false);
  const [savedCards, setSavedCards] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.quiz_day) setQuizDay(profile.quiz_day);
    if (profile?.hide_surname !== undefined) setHideSurname(profile.hide_surname);
    if (profile?.email_frequency) setEmailFrequency(profile.email_frequency);
    if (profile?.cards_per_session) {
      setCardsPerSession(profile.cards_per_session);
      if (!CARDS_PER_SESSION_PRESETS.includes(profile.cards_per_session)) {
        setShowCustomInput(true);
        setCustomCards(String(profile.cards_per_session));
      }
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

  async function handleToggleHideSurname() {
    if (!user) return;

    setSavingHideSurname(true);
    const newValue = !hideSurname;

    const { error } = await supabase
      .from("profiles")
      .update({ hide_surname: newValue } as any)
      .eq("id", user.id);

    setSavingHideSurname(false);

    if (error) {
      console.error("Error saving hide_surname:", error);
      alert("저장 중 오류가 발생했습니다.");
    } else {
      setHideSurname(newValue);
    }
  }

  async function handleSaveEmailSettings() {
    if (!user) return;

    setSavingEmail(true);
    setSavedEmail(false);

    const updateData: any = { email_frequency: emailFrequency };
    if (emailFrequency === "weekly") {
      updateData.quiz_day = quizDay;
    }
    // Keep email_enabled in sync for backward compat
    updateData.email_enabled = emailFrequency !== "off";

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    setSavingEmail(false);

    if (error) {
      console.error("Error saving email settings:", error);
      alert("저장 중 오류가 발생했습니다.");
    } else {
      setSavedEmail(true);
      setTimeout(() => setSavedEmail(false), 2000);
    }
  }

  async function handleSaveCardsPerSession(value: number) {
    if (!user) return;

    setCardsPerSession(value);
    setSavingCards(true);
    setSavedCards(false);

    const { error } = await supabase
      .from("profiles")
      .update({ cards_per_session: value } as any)
      .eq("id", user.id);

    setSavingCards(false);

    if (error) {
      console.error("Error saving cards_per_session:", error);
      alert("저장 중 오류가 발생했습니다.");
    } else {
      setSavedCards(true);
      setTimeout(() => setSavedCards(false), 2000);
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

    signOut();
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

      {/* Quiz settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">퀴즈 설정</h2>

        {/* Hide surname */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="font-medium text-gray-900">성 숨기기</p>
            <p className="text-sm text-gray-500">
              퀴즈에서 이름의 첫 글자(성)를 숨깁니다. 예: 김민수 → 민수
            </p>
          </div>
          <button
            onClick={handleToggleHideSurname}
            disabled={savingHideSurname}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              hideSurname ? "bg-blue-600" : "bg-gray-200"
            } ${savingHideSurname ? "opacity-50" : ""}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                hideSurname ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Cards per session */}
        <div className="py-4">
          <p className="font-medium text-gray-900 mb-1">세션 당 카드 수</p>
          <p className="text-sm text-gray-500 mb-3">
            한 세션에 풀 퀴즈 카드 수를 선택하세요.
          </p>
          <div className="flex gap-2">
            {CARDS_PER_SESSION_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setShowCustomInput(false);
                  handleSaveCardsPerSession(n);
                }}
                disabled={savingCards}
                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                  cardsPerSession === n && !showCustomInput
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } ${savingCards ? "opacity-50" : ""}`}
              >
                {n}장
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(true);
                setCustomCards(
                  CARDS_PER_SESSION_PRESETS.includes(cardsPerSession)
                    ? ""
                    : String(cardsPerSession)
                );
              }}
              disabled={savingCards}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                showCustomInput
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${savingCards ? "opacity-50" : ""}`}
            >
              직접 입력
            </button>
          </div>
          {showCustomInput && (
            <div className="flex gap-2 mt-3">
              <input
                type="number"
                min={5}
                max={100}
                value={customCards}
                onChange={(e) => setCustomCards(e.target.value)}
                placeholder="5-100"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              <button
                type="button"
                onClick={() => {
                  const n = parseInt(customCards, 10);
                  if (n >= 5 && n <= 100) {
                    handleSaveCardsPerSession(n);
                  }
                }}
                disabled={savingCards || !customCards || parseInt(customCards, 10) < 5 || parseInt(customCards, 10) > 100}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                저장
              </button>
            </div>
          )}
          {savedCards && (
            <p className="text-sm text-green-600 mt-2 text-center">저장됨 ✓</p>
          )}
        </div>
      </div>

      {/* Email settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">이메일 알림</h2>

        <div className="space-y-4">
          {/* Frequency selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              알림 빈도
            </label>
            <div className="flex gap-2">
              {([
                { value: "daily" as const, label: "매일" },
                { value: "weekly" as const, label: "매주" },
                { value: "off" as const, label: "끄기" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEmailFrequency(opt.value)}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                    emailFrequency === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day picker for weekly */}
          {emailFrequency === "weekly" && (
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
          )}

          <button
            onClick={handleSaveEmailSettings}
            disabled={savingEmail}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 touch-target"
          >
            {savingEmail ? "저장 중..." : savedEmail ? "저장됨 ✓" : "이메일 설정 저장"}
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

      {/* Danger Zone */}
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
