export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionTier = "free" | "starter" | "pro";
export type JobSeniority =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "executive";
export type ApplicationStatus =
  | "invited"
  | "in_progress"
  | "completed"
  | "withdrawn";
export type SessionStatus = "pending" | "in_progress" | "completed" | "abandoned";
export type ScoringStatus = "pending" | "processing" | "completed" | "failed";
export type FinalVerdict = "strong_hire" | "hire" | "maybe" | "no_hire";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

export interface Database {
  public: {
    Tables: {
      employers: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          full_name: string;
          email: string;
          subscription_tier: SubscriptionTier;
          onboarding_completed: boolean;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name?: string;
          full_name?: string;
          email: string;
          subscription_tier?: SubscriptionTier;
          onboarding_completed?: boolean;
          stripe_customer_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["employers"]["Insert"]>;
      };
      jobs: {
        Row: {
          id: string;
          employer_id: string;
          title: string;
          description: string;
          required_skills: Json;
          seniority: JobSeniority;
          location: string;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          hiring_priorities: string | null;
          interview_focus: Json | null;
          interview_questions: Json;
          ai_interview_plan_applied: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          title: string;
          description?: string;
          required_skills?: Json;
          seniority?: JobSeniority;
          location?: string;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          hiring_priorities?: string | null;
          interview_focus?: Json | null;
          interview_questions?: Json;
          ai_interview_plan_applied?: boolean | null;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
      };
      candidates: {
        Row: {
          id: string;
          employer_id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["candidates"]["Insert"]>;
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          candidate_id: string;
          stage: string;
          status: ApplicationStatus;
          shortlisted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_id: string;
          stage?: string;
          status?: ApplicationStatus;
          shortlisted?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
      };
      interview_sessions: {
        Row: {
          id: string;
          application_id: string;
          status: SessionStatus;
          started_at: string | null;
          ended_at: string | null;
          duration_seconds: number | null;
          video_storage_path: string | null;
          transcript_complete: boolean;
          scoring_status: ScoringStatus;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          status?: SessionStatus;
          started_at?: string | null;
          ended_at?: string | null;
          duration_seconds?: number | null;
          video_storage_path?: string | null;
          transcript_complete?: boolean;
          scoring_status?: ScoringStatus;
          expires_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["interview_sessions"]["Insert"]
        >;
      };
      interview_transcripts: {
        Row: {
          id: string;
          session_id: string;
          sequence: number;
          question_text: string;
          answer_text: string;
          asked_at: string;
          answered_at: string | null;
          stt_confidence: number | null;
          is_follow_up: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          sequence: number;
          question_text: string;
          answer_text?: string;
          asked_at?: string;
          answered_at?: string | null;
          stt_confidence?: number | null;
          is_follow_up?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["interview_transcripts"]["Insert"]
        >;
      };
      interview_scores: {
        Row: {
          id: string;
          session_id: string;
          overall_score: number;
          communication_score: number;
          role_fit_score: number;
          problem_solving_score: number;
          experience_score: number;
          confidence_score: number;
          strengths: string[];
          weaknesses: string[];
          risks: string[];
          summary: string;
          final_verdict: FinalVerdict;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          overall_score: number;
          communication_score: number;
          role_fit_score: number;
          problem_solving_score: number;
          experience_score: number;
          confidence_score: number;
          strengths?: string[];
          weaknesses?: string[];
          risks?: string[];
          summary: string;
          final_verdict: FinalVerdict;
        };
        Update: Partial<Database["public"]["Tables"]["interview_scores"]["Insert"]>;
      };
      job_candidate_rankings: {
        Row: {
          id: string;
          job_id: string;
          application_id: string;
          rank: number;
          overall_score: number;
          comparison_blurb: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          application_id: string;
          rank: number;
          overall_score: number;
          comparison_blurb?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["job_candidate_rankings"]["Insert"]
        >;
      };
      employer_subscriptions: {
        Row: {
          id: string;
          employer_id: string;
          tier: SubscriptionTier;
          status: SubscriptionStatus;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          tier?: SubscriptionTier;
          status?: SubscriptionStatus;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          current_period_end?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["employer_subscriptions"]["Insert"]
        >;
      };
      employer_usage: {
        Row: {
          id: string;
          employer_id: string;
          period_start: string;
          interviews_count: number;
          invites_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          period_start: string;
          interviews_count?: number;
          invites_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["employer_usage"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      job_seniority: JobSeniority;
      application_status: ApplicationStatus;
      session_status: SessionStatus;
      scoring_status: ScoringStatus;
      final_verdict: FinalVerdict;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
