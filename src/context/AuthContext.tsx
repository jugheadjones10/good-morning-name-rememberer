import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/database.types";

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (
    email: string
  ) => Promise<{ error: Error | null; needsName?: boolean }>;
  signUp: (email: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "name-rememberer-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing user
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
        fetchProfile(userData.email);
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchProfile(email: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
    }
    setProfile(data as Profile | null);
    setLoading(false);
  }

  async function signIn(email: string) {
    try {
      // Check if profile exists
      const { data: existing, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (existing) {
        // Existing user - log them in
        const profileData = existing as Profile;
        const userData = { id: profileData.id, email: profileData.email! };
        setUser(userData);
        setProfile(profileData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        return { error: null };
      } else if (fetchError && fetchError.code === "PGRST116") {
        // Profile not found - need to sign up with name
        return { error: null, needsName: true };
      } else if (fetchError) {
        console.error("Fetch error:", fetchError);
        return { error: new Error(`조회 실패: ${fetchError.message}`) };
      } else {
        return { error: new Error("알 수 없는 오류") };
      }
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function signUp(email: string, name: string) {
    try {
      // Create new profile with name
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          email: email,
          name: name,
          quiz_day: "monday",
          is_admin: false,
        } as any)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return { error: new Error(`계정 생성 실패: ${insertError.message}`) };
      }

      const profileData = newProfile as Profile;
      const userData = { id: profileData.id, email: profileData.email! };
      setUser(userData);
      setProfile(profileData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  function signOut() {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
