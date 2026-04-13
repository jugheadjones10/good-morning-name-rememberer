export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string;
          quiz_day: string;
          email_enabled: boolean;
          email_frequency: "daily" | "weekly" | "off";
          is_admin: boolean;
          hide_surname: boolean;
          group_type: "kindergarten" | "primary";
          cards_per_session: number;
          current_streak: number;
          longest_streak: number;
          last_session_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          name: string;
          quiz_day?: string;
          email_enabled?: boolean;
          email_frequency?: "daily" | "weekly" | "off";
          is_admin?: boolean;
          hide_surname?: boolean;
          group_type?: "kindergarten" | "primary";
          cards_per_session?: number;
          current_streak?: number;
          longest_streak?: number;
          last_session_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string;
          quiz_day?: string;
          email_enabled?: boolean;
          email_frequency?: "daily" | "weekly" | "off";
          is_admin?: boolean;
          hide_surname?: boolean;
          group_type?: "kindergarten" | "primary";
          cards_per_session?: number;
          current_streak?: number;
          longest_streak?: number;
          last_session_date?: string | null;
          created_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          name: string;
          photo_url: string;
          group_type: "kindergarten" | "primary";
          department: string | null;
          grade: number | null;
          class_number: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          photo_url: string;
          group_type?: "kindergarten" | "primary";
          department?: string | null;
          grade?: number | null;
          class_number?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          photo_url?: string;
          group_type?: "kindergarten" | "primary";
          department?: string | null;
          grade?: number | null;
          class_number?: number | null;
          created_at?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          child_id: string;
          user_answer: string;
          is_correct: boolean;
          attempted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          child_id: string;
          user_answer: string;
          is_correct: boolean;
          attempted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          child_id?: string;
          user_answer?: string;
          is_correct?: boolean;
          attempted_at?: string;
        };
      };
      user_child_progress: {
        Row: {
          id: string;
          user_id: string;
          child_id: string;
          interval_days: number;
          ease_factor: number;
          next_review_date: string;
          last_reviewed_at: string | null;
          consecutive_correct: number;
          mastered: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          child_id: string;
          interval_days?: number;
          ease_factor?: number;
          next_review_date?: string;
          last_reviewed_at?: string | null;
          consecutive_correct?: number;
          mastered?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          child_id?: string;
          interval_days?: number;
          ease_factor?: number;
          next_review_date?: string;
          last_reviewed_at?: string | null;
          consecutive_correct?: number;
          mastered?: boolean;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          user_email: string | null;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Child = Database["public"]["Tables"]["children"]["Row"];
export type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"];
export type UserChildProgress =
  Database["public"]["Tables"]["user_child_progress"]["Row"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
