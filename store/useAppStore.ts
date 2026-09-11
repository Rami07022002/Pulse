import { create } from "zustand";
import type {
  AppState,
  EventActor,
  HapticIntensity,
  TimelineEvent,
} from "./types";
import {
  createProfile,
  getPartnerProfile,
  getPartnerStatus,
  getProfile,
  getStreak,
  getTodayEvents,
  insertStatusEvent,
  pairWithCode,
  sendPulseEvent,
  setStatus,
  unpairUsers,
  updateProfile,
  type DbEvent,
} from "@/lib/supabase-db";

// ── Module-level helpers (keep create callback simple) ──────────────

const dateKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const makeEvent = (
  actor: EventActor,
  type: TimelineEvent["type"],
  content: string,
  timestamp: number,
  icon?: string,
): TimelineEvent => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  actor,
  type,
  content,
  timestamp,
  ...(icon ? { icon } : {}),
});

async function loadOrCreateProfile(userId: string, email?: string) {
  let profile = await getProfile(userId);
  if (!profile) {
    const name = email?.split("@")[0] || "Anonymous";
    profile = await createProfile(userId, name);
  }
  return profile;
}

async function resolvePartnerInfo(partnerId: string) {
  try {
    const partner = await getPartnerProfile(partnerId);
    return { partnerName: partner.display_name, partnerColor: partner.avatar_color };
  } catch {
    return { partnerName: "Partner", partnerColor: "#A78BFA" };
  }
}

function mapDbEvent(
  e: DbEvent,
  userId: string,
  partnerName: string,
): TimelineEvent {
  const isMine = e.actor_id === userId;
  const type: TimelineEvent["type"] = isMine
    ? e.type === "pulse_sent" ? "pulse_sent" : "status_update"
    : e.type === "pulse_sent" ? "pulse_received" : "status_update";
  const content = isMine
    ? e.type === "pulse_sent" ? "You sent a pulse" : `You ${e.content || "updated status"}`
    : e.type === "pulse_sent" ? `${partnerName} sent a pulse` : `${partnerName} ${e.content || "updated status"}`;
  return {
    id: e.id,
    type,
    actor: isMine ? "me" : "partner",
    content,
    icon: e.icon ?? undefined,
    timestamp: new Date(e.created_at).getTime(),
  };
}

const emptyUser = {
  userId: "",
  displayName: "Anonymous",
  avatarColor: "#F472B6",
  phoneNumber: "",
  pairingCode: "",
  isAuthenticated: false,
  isPaired: false,
  partnerId: null as string | null,
  partnerName: "Partner",
  partnerAvatarColor: "#A78BFA",
  hapticIntensity: "medium" as HapticIntensity,
};

// ── Store ───────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()((set, get) => ({
  hydrated: false,
  error: null,
  user: { ...emptyUser },
  status: {
    myStatus: null,
    partnerStatus: null,
    lastPulseAt: null,
    partnerLastPulseAt: null,
  },
  streak: { currentStreak: 0, lastActiveDate: null, momentCount: 0 },
  events: [],

  initialize: async (userId: string, email?: string) => {
    try {
      const profile = await loadOrCreateProfile(userId, email);
      const isPaired = profile.partner_id !== null;
      const { partnerName, partnerColor } =
        isPaired && profile.partner_id
          ? await resolvePartnerInfo(profile.partner_id)
          : { partnerName: "Partner", partnerColor: "#A78BFA" };

      set({
        hydrated: true,
        error: null,
        user: {
          userId: profile.id,
          displayName: profile.display_name,
          avatarColor: profile.avatar_color,
          phoneNumber: profile.phone_number || "",
          pairingCode: profile.pairing_code || "",
          isAuthenticated: true,
          isPaired,
          partnerId: profile.partner_id,
          partnerName,
          partnerAvatarColor: partnerColor,
          hapticIntensity: profile.haptic_intensity,
        },
      });

      if (isPaired && profile.partner_id) {
        void get().fetchPartnerData();
        void get().fetchEvents();
        void get().fetchStreak();
      }
    } catch {
      set({ hydrated: true, error: "Could not load your profile. Please try again." });
    }
  },

  pairWithPartner: async (code: string) => {
    try {
      const result = await pairWithCode(code);
      if (!result.success) {
        set({ error: result.error || "No matching code found. Check the digits and try again." });
        return false;
      }
      set((state) => ({
        user: {
          ...state.user,
          isPaired: true,
          partnerId: result.partner_id || null,
          partnerName: result.partner_name || "Partner",
          partnerAvatarColor: result.partner_color || "#A78BFA",
        },
        error: null,
      }));
      void get().fetchPartnerData();
      void get().fetchStreak();
      return true;
    } catch {
      set({ error: "Pairing failed. Please check the code and try again." });
      return false;
    }
  },

  setMyStatus: (icon: string, label: string) => {
    const { user } = get();
    const now = Date.now();
    set((state) => ({
      status: {
        ...state.status,
        myStatus: { icon, label, setAt: now, expiresAt: now + 2 * 60 * 60 * 1000 },
      },
      events: [
        ...state.events,
        makeEvent("me", "status_update", `You updated status: ${label}`, now, icon),
      ].slice(-100),
      error: null,
    }));
    void (async () => {
      try {
        await setStatus(user.userId, icon, label);
        if (user.partnerId) {
          await insertStatusEvent(user.userId, user.partnerId, label, icon);
        }
      } catch {
        set({ error: "Status could not be saved to the server." });
      }
    })();
  },

  sendPulse: () => {
    const now = Date.now();
    set((state) => ({
      status: { ...state.status, lastPulseAt: now },
      events: [
        ...state.events,
        makeEvent("me", "pulse_sent", "You sent a pulse", now, "heart"),
      ].slice(-100),
      error: null,
    }));
    void (async () => {
      try {
        const result = await sendPulseEvent();
        if (result.success) {
          set({
            streak: {
              currentStreak: result.streak,
              lastActiveDate: dateKey(now),
              momentCount: result.moment_count,
            },
          });
        }
      } catch {
        set({ error: "Your pulse could not be sent." });
      }
    })();
  },

  updateDisplayName: (displayName: string) => {
    const safeName = displayName.trim();
    if (!safeName) return;
    set((state) => ({ user: { ...state.user, displayName: safeName }, error: null }));
    void (async () => {
      try {
        await updateProfile(get().user.userId, { display_name: safeName });
      } catch {
        set({ error: "Display name could not be saved." });
      }
    })();
  },

  updateAvatarColor: (avatarColor: string) => {
    set((state) => ({ user: { ...state.user, avatarColor }, error: null }));
    void (async () => {
      try {
        await updateProfile(get().user.userId, { avatar_color: avatarColor });
      } catch {
        set({ error: "Avatar color could not be saved." });
      }
    })();
  },

  updateHapticIntensity: (hapticIntensity: HapticIntensity) => {
    set((state) => ({ user: { ...state.user, hapticIntensity }, error: null }));
    void (async () => {
      try {
        await updateProfile(get().user.userId, { haptic_intensity: hapticIntensity });
      } catch {
        set({ error: "Haptic preference could not be saved." });
      }
    })();
  },

  unpair: () => {
    set((state) => ({
      user: { ...state.user, isPaired: false, partnerId: null },
      status: { ...state.status, partnerStatus: null, partnerLastPulseAt: null },
      events: [],
      streak: { currentStreak: 0, lastActiveDate: null, momentCount: 0 },
      error: null,
    }));
    void (async () => {
      try {
        await unpairUsers();
      } catch {
        set({ error: "Could not unpair. Please try again." });
      }
    })();
  },

  fetchPartnerData: async () => {
    const { user } = get();
    if (!user.partnerId) return;
    try {
      const [partner, partnerStat] = await Promise.all([
        getPartnerProfile(user.partnerId),
        getPartnerStatus(user.partnerId),
      ]);
      set((state) => ({
        user: {
          ...state.user,
          partnerName: partner.display_name,
          partnerAvatarColor: partner.avatar_color,
        },
        status: {
          ...state.status,
          partnerStatus: partnerStat
            ? {
                icon: partnerStat.icon || "sparkles-outline",
                label: partnerStat.label,
                setAt: new Date(partnerStat.set_at).getTime(),
              }
            : state.status.partnerStatus,
        },
      }));
    } catch {
      // Silently fail for background fetch
    }
  },

  fetchEvents: async () => {
    const { user } = get();
    if (!user.partnerId) return;
    try {
      const dbEvents = await getTodayEvents(user.userId, user.partnerId);
      set({ events: dbEvents.map((e) => mapDbEvent(e, user.userId, user.partnerName)) });
    } catch {
      // Silently fail for background fetch
    }
  },

  fetchStreak: async () => {
    const { user } = get();
    try {
      const streak = await getStreak(user.userId);
      if (streak) {
        set({
          streak: {
            currentStreak: streak.current_streak,
            lastActiveDate: streak.last_active_date,
            momentCount: streak.moment_count,
          },
        });
      }
    } catch {
      // Silently fail
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      hydrated: false,
      error: null,
      user: { ...emptyUser },
      status: { myStatus: null, partnerStatus: null, lastPulseAt: null, partnerLastPulseAt: null },
      streak: { currentStreak: 0, lastActiveDate: null, momentCount: 0 },
      events: [],
    }),
}));
