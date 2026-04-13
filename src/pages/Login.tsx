import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error, needsName: isNewUser } = await signIn(email);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (isNewUser) {
      // New user - need to enter name
      setNeedsName(true);
    } else {
      // Existing user - logged in
      navigate("/");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signUp(email, name);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="나섬 아이들" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">나섬 아이들</h1>
          <p className="text-gray-600 mt-2">아이들의 이름을 기억해보세요</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {!needsName ? (
            // Step 1: Enter email
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="email@example.com"
                />
                <p className="mt-2 text-sm text-gray-500">
                  이메일로 로그인하거나 새로 가입할 수 있어요
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target text-base"
              >
                {loading ? "확인 중..." : "계속하기"}
              </button>
            </form>
          ) : (
            // Step 2: Enter name (new user)
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm mb-4">
                환영합니다! 처음 오셨네요. 이름을 입력해주세요.
              </div>

              <div>
                <label
                  htmlFor="email-display"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  이메일
                </label>
                <input
                  id="email-display"
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-base"
                />
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  이름 (리더보드에 표시됩니다)
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="홍길동"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNeedsName(false);
                    setName("");
                    setError(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 touch-target text-base"
                >
                  뒤로
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target text-base"
                >
                  {loading ? "가입 중..." : "가입하기"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
