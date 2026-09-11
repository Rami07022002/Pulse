export type HapticIntensity = "light" | "medium" | "heavy";

export type TimelineEventType =
  | "pulse_sent"
  | "pulse_received"
  | "status_update";

export type EventActor = "me" | "partner";

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarColor: string;
  phoneNumber: string;
  pairingCode: string;
  isAuthenticated: boolean;
  isPaired: boolean;
  partnerId: string | null;
  partnerName: string;
  partnerAvatarColor: string;
  hapticIntensity: HapticIntensity;
}

export interface StatusRecord {
  icon: string;
  label: string;
  setAt: number;
  expiresAt: number;
}

export interface PartnerStatusRecord {
  icon: string;
  label: string;
  setAt: number;
}

export interface StatusState {
  myStatus: StatusRecord | null;
  partnerStatus: PartnerStatusRecord | null;
  lastPulseAt: number | null;
  partnerLastPulseAt: number | null;
}

export interface StreakState {
  currentStreak: number;
  lastActiveDate: string | null;
  momentCount: number;
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actor: EventActor;
  content: string;
  icon?: string;
  timestamp: number;
}

export interface AppState {
  hydrated: boolean;
  error: string | null;
  completeHydration: () => void;
  user: UserProfile;
  status: StatusState;
  streak: StreakState;
  events: TimelineEvent[];
  completeAuth: (phoneNumber: string, displayName: string) => void;
  resetAuth: () => void;
  pairWithPartner: (code: string) => boolean;
  setMyStatus: (icon: string, label: string) => void;
  sendPulse: () => void;
  updateDisplayName: (displayName: string) => void;
  updateAvatarColor: (avatarColor: string) => void;
  updateHapticIntensity: (hapticIntensity: HapticIntensity) => void;
  unpair: () => void;
  clearError: () => void;
  pruneTimeline: () => void;
}
