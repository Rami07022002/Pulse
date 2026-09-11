import { supabase } from "./supabase";
import type { HapticIntensity } from "@/store/types";

// ── Supabase row types ──────────────────────────────────────────────
export interface DbProfile {
  id: string;
  display_name: string;
  avatar_color: string;
  avatar_emoji: string | null;
  phone_number: string | null;
  pairing_code: string | null;
  partner_id: string | null;
  haptic_intensity: HapticIntensity;
  created_at: string;
}

export interface DbStatus {
  id: string;
  user_id: string;
  emoji: string | null;
  label: string;
  icon: string | null;
  set_at: string;
  expires_at: string;
}

export interface DbEvent {
  id: string;
  actor_id: string;
  partner_id: string;
  type: "pulse_sent" | "status_update";
  content: string | null;
  icon: string | null;
  created_at: string;
}

export interface DbStreak {
  id: string;
  user_id: string;
  partner_id: string | null;
  current_streak: number;
  last_active_date: string | null;
  moment_count: number;
  updated_at: string;
}

// ── Profile operations ──────────────────────────────────────────────

export async function createProfile(
  userId: string,
  displayName: string,
  phone?: string,
): Promise<DbProfile> {
  // Generate a unique pairing code via the DB function
  const { data: codeData } = await supabase.rpc("generate_pairing_code");
  const pairingCode =
    (codeData as string) ||
    String(Math.floor(100000 + Math.random() * 900000));

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      display_name: displayName || "Anonymous",
      pairing_code: pairingCode,
      phone_number: phone || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbProfile;
}

export async function getProfile(
  userId: string,
): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as DbProfile | null;
}

export async function getPartnerProfile(
  partnerId: string,
): Promise<DbProfile> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", partnerId)
    .single();

  if (error) throw error;
  return data as DbProfile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<
      DbProfile,
      "display_name" | "avatar_color" | "avatar_emoji" | "haptic_intensity"
    >
  >,
): Promise<DbProfile> {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as DbProfile;
}

// ── Pairing ─────────────────────────────────────────────────────────

export interface PairResult {
  success: boolean;
  partner_id?: string;
  partner_name?: string;
  partner_color?: string;
  error?: string;
}

export async function pairWithCode(code: string): Promise<PairResult> {
  const { data, error } = await supabase.rpc("pair_users", {
    input_code: code,
  });
  if (error) throw error;
  return data as PairResult;
}

export async function unpairUsers(): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("unpair_users");
  if (error) throw error;
  return data as { success: boolean; error?: string };
}

// ── Status ──────────────────────────────────────────────────────────

export async function setStatus(
  userId: string,
  icon: string,
  label: string,
): Promise<DbStatus> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("user_status")
    .upsert(
      {
        user_id: userId,
        icon,
        label,
        set_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as DbStatus;
}

export async function getPartnerStatus(
  partnerId: string,
): Promise<DbStatus | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_status")
    .select("*")
    .eq("user_id", partnerId)
    .gt("expires_at", now)
    .order("set_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as DbStatus | null;
}

// ── Pulse / Events ──────────────────────────────────────────────────

export interface PulseResult {
  success: boolean;
  is_moment: boolean;
  streak: number;
  moment_count: number;
  error?: string;
}

export async function sendPulseEvent(): Promise<PulseResult> {
  const { data, error } = await supabase.rpc("send_pulse");
  if (error) throw error;
  return data as PulseResult;
}

export async function insertStatusEvent(
  userId: string,
  partnerId: string,
  label: string,
  icon: string,
): Promise<void> {
  const { error } = await supabase.from("events").insert({
    actor_id: userId,
    partner_id: partnerId,
    type: "status_update",
    content: `updated status: ${label}`,
    icon,
  });
  if (error) throw error;
}

export async function getTodayEvents(
  userId: string,
  partnerId: string,
): Promise<DbEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or(
      `and(actor_id.eq.${userId},partner_id.eq.${partnerId}),and(actor_id.eq.${partnerId},partner_id.eq.${userId})`,
    )
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as DbEvent[];
}

// ── Streaks ─────────────────────────────────────────────────────────

export async function getStreak(userId: string): Promise<DbStreak | null> {
  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as DbStreak | null;
}
