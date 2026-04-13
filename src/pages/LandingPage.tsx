import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LandingPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-gray-900">
              나섬 아이들
            </h1>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="나섬 아이들"
              className="h-24 w-auto mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900">
              어떤 부서의 아이들을 외울까요?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/kindergarten"
              className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-8 text-center border-2 border-transparent hover:border-blue-400"
            >
              <div className="text-5xl mb-4">🧒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">굿모닝</h3>
              <p className="text-sm text-gray-500">
                굿모닝 아이들의 이름을 외워요
              </p>
            </Link>

            <Link
              to="/primary"
              className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-8 text-center border-2 border-transparent hover:border-green-400"
            >
              <div className="text-5xl mb-4">🎒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">초등부</h3>
              <p className="text-sm text-gray-500">
                초등부 아이들의 이름을 외워요
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
