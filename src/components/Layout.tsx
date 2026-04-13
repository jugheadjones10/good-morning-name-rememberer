import { Outlet, NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGroup } from "../context/GroupContext";
import { FeedbackButton } from "./FeedbackButton";

export function Layout() {
  const { profile, signOut } = useAuth();
  const { group, groupLabel } = useGroup();
  const base = `/${group}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="h-8 w-auto" />
              <h1 className="text-xl font-bold text-gray-900">
                나섬 {groupLabel}
              </h1>
            </Link>
            {profile && profile.current_streak > 0 && (
              <span className="flex items-center gap-0.5 text-sm font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                🔥 {profile.current_streak}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <FeedbackButton />
            <button
              onClick={signOut}
              className="text-sm text-gray-600 hover:text-gray-900 touch-target flex items-center"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom navigation - mobile friendly */}
      <nav className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-around">
            <NavLink
              to={base}
              end
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-4 touch-target ${
                  isActive ? "text-blue-600" : "text-gray-600"
                }`
              }
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="text-xs mt-1">홈</span>
            </NavLink>
            <NavLink
              to={`${base}/quiz`}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-4 touch-target ${
                  isActive ? "text-blue-600" : "text-gray-600"
                }`
              }
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <span className="text-xs mt-1">퀴즈</span>
            </NavLink>
            {profile?.is_admin && (
              <NavLink
                to={`${base}/admin`}
                className={({ isActive }) =>
                  `flex flex-col items-center py-3 px-4 touch-target ${
                    isActive ? "text-blue-600" : "text-gray-600"
                  }`
                }
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span className="text-xs mt-1">관리</span>
              </NavLink>
            )}
            <NavLink
              to={`${base}/settings`}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-4 touch-target ${
                  isActive ? "text-blue-600" : "text-gray-600"
                }`
              }
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xs mt-1">설정</span>
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
}
