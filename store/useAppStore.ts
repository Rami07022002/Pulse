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
} from "@/lib/supabase-db";

const dateKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const makeEvent = (
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

  // ── Initialize ────────────────────────────────────────────────────
  initialize: async (userId: string, email?: string) => {
    try {
      let profile = await getProfile(userId);

      if (!profile) {
        const name = email?.split("@")[0] || "Anonymous";
        profile = await createProfile(userId, name);
      }

      const isPaired = profile.partner_id !== null;
      let partnerName = "Partner";
      let partnerColor = "#A78BFA";

      if (isPaired && profile.partner_id) {
        try {
          const partner = await getPartnerProfile(profile.partner_id);
          partnerName = partner.display_name;
          partnerColor = partner.avatar_color;
        } catch {
          // Partner profile might not be accessible yet
        }
      }

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

      // Load partner data and events in background
      if (isPaired && profile.partner_id) {
        const state = get();
        void state.fetchPartnerData();
        void state.fetchEvents();
        void state.fetchStreak();
      }
    } catch (e) {
      set({
        hydrated: true,
        error: "Could not load your profile. Please try again.",
      });
    }
  },

  // ── Pairing ───────────────────────────────────────────────────────
  pairWithPartner: async (code: string) => {
    try {
      const result = await pairWithCode(code);
      if (!result.success) {
        set({
          error: result.error || "No matching code found. Check the digits and try again.",
        });
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

      // Fetch partner data in background
      void get().fetchPartnerData();
      void get().fetchStreak();

      return true;
    } catch {
      set({
        error: "Pairing failed. Please check the code and try again.",
      });
      return false;
    }
  },

  // ── Status ────────────────────────────────────────────────────────
  setMyStatus: (icon: string, label: string) => {
    const { user } = get();
    const now = Date.now();

    // Optimistic update
    set((state) => ({
      status: {
        ...state.status,
        myStatus: {
          icon,
          label,
          setAt: now,
          expiresAt: now + 2 * 60 * 60 * 1000,
        },
      },
      events: [
        ...state.events,
        makeEvent("me", "status_update", `You updated status: ${label}`, now, icon),
      ].slice(-100),
      error: null,
    }));

    // Background Supabase sync
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

  // ── Pulse ─────────────────────────────────────────────────────────
  sendPulse: () => {
    const now = Date.now();
    const { status } = get();
    const isMoment =
      status.partnerLastPulseAt !== null &&
      Math.abs(now - status.partnerLastPulseAt) <= 5 * 60 * 1000;

    // Optimistic update
    set((state) => ({
      status: { ...state.status, lastPulseAt: now },
      events: [
        ...state.events,
        makeEvent("me", "pulse_sent", "You sent a pulse", now, "heart"),
      ].slice(-100),
      error: null,
    }));

    // Background Supabase sync
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

  // ── Profile updates ───────────────────────────────────────────────
  updateDisplayName: (displayName: string) => {
    const safeName = displayName.trim();
    if (!safeName) return;

    set((state) => ({
      user: { ...state.user, displayName: safeName },
      error: null,
    }));

    void (async () => {
      try {
        await updateProfile(get().user.userId, { display_name: safeName });
      } catch {
        set({ error: "Display name could not be saved." });
      }
    })();
  },

  updateAvatarColor: (avatarColor: string) => {
    set((state) => ({
      user: { ...state.user, avatarColor },
      error: null,
    }));

    void (async () => {
      try {
        await updateProfile(get().user.userId, { avatar_color: avatarColor });
      } catch {
        set({ error: "Avatar color could not be saved." });
      }
    })();
  },

  updateHapticIntensity: (hapticIntensity: HapticIntensity) => {
    set((state) => ({
      user: { ...state.user, hapticIntensity },
      error: null,
    }));

    void (async () => {
      try {
        await updateProfile(get().user.userId, {
          haptic_intensity: hapticIntensity,
        });
      } catch {
        set({ error: "Haptic preference could not be saved." });
      }
    })();
  },

  // ── Unpair ────────────────────────────────────────────────────────
  unpair: () => {
    set((state) => ({
      user: { ...state.user, isPaired: false, partnerId: null },
      status: {
        ...state.status,
        partnerStatus: null,
        partnerLastPulseAt: null,
      },
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

  // ── Data fetching ─────────────────────────────────────────────────
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
      const events: TimelineEvent[] = dbEvents.map((e) => ({
        id: e.id,
        type: e.actor_id === user.userId
          ? (e.type === "pulse_sent" ? "pulse_sent" : "status_update")
          : (e.type === "pulse_sent" ? "pulse_received" : "status_update"),
        actor: (e.actor_id === user.userId ? "me" : "partner") as "me" | "partner",
        content:
          e.actor_id === user.userId
            ? e.type === "pulse_sent"
              ? "You sent a pulse"
              : `You ${e.content || "updated status"}`
            : e.type === "pulse_sent"
              ? `${user.partnerName} sent a pulse`
              : `${user.partnerName} ${e.content || "updated status"}`,
        icon: e.icon || undefined,
        timestamp: new Date(e.created_at).getTime(),
      }));

      set({ events });
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

  // ── Realtime handlers ─────────────────────────────────────────────
  handlePartnerStatusUpdate: (icon: string, label: string, setAt: number) => {
    const { user } = get();
    set((state) => ({
      status: {
        ...state.status,
        partnerStatus: { icon, label, setAt },
      },
      events: [
        ...state.events,
        makeEvent(
          "partner",
          "status_update",
          `${user.partnerName} updated status: ${label}`,
          setAt,
          icon,
        ),
      ].slice(-100),
    }));
  },

  handlePartnerPulse: (timestamp: number) => {
    const { user } = get();
    set((state) => ({
      status: { ...state.status, partnerLastPulseAt: timestamp },
      events: [
        ...state.events,
        makeEvent(
          "partner",
          "pulse_received",
          `${user.partnerName} sent a pulse`,
          timestamp,
          "heart",
        ),
      ].slice(-100),
    }));
  },

  handleNewEvent: (event: TimelineEvent) => {
    set((state) => ({
      events: [...state.events, event].slice(-100),
    }));
  },

  // ── Utility ───────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
  reset: () =>
    set({
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
    }),
}));
