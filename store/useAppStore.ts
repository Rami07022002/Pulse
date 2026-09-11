import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AppState,
  EventActor,
  HapticIntensity,
  TimelineEvent,
} from "./types";

const PARTNER_ID = "partner-alex";

const generatePairingCode = (): string =>
  `${Math.floor(100000 + Math.random() * 900000)}`;

const createId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const dateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const yesterdayKey = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateKey(yesterday.getTime());
};

const makeEvent = (
  actor: EventActor,
  type: TimelineEvent["type"],
  content: string,
  timestamp: number,
  icon?: string,
): TimelineEvent => ({
  id: createId(),
  actor,
  type,
  content,
  timestamp,
  ...(icon ? { icon } : {}),
});

const initialUser = {
  userId: "local-user",
  displayName: "Jamie",
  avatarColor: "#F472B6",
  phoneNumber: "",
  pairingCode: generatePairingCode(),
  isAuthenticated: false,
  isPaired: false,
  partnerId: null,
  partnerName: "Alex",
  partnerAvatarColor: "#A78BFA",
  hapticIntensity: "medium" as HapticIntensity,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      error: null,
      user: initialUser,
      status: {
        myStatus: null,
        partnerStatus: null,
        lastPulseAt: null,
        partnerLastPulseAt: null,
      },
      streak: {
        currentStreak: 0,
        lastActiveDate: null,
        momentCount: 0,
      },
      events: [],
      completeAuth: (phoneNumber, displayName) => {
        try {
          const safeName = displayName.trim() || "Jamie";
          set((state) => ({
            user: {
              ...state.user,
              phoneNumber: phoneNumber.trim(),
              displayName: safeName,
              isAuthenticated: true,
            },
            error: null,
          }));
        } catch {
          set({ error: "We couldn't save your profile. Please try again." });
        }
      },
      resetAuth: () => {
        try {
          set((state) => ({
            user: {
              ...state.user,
              phoneNumber: "",
              isAuthenticated: false,
              isPaired: false,
              partnerId: null,
            },
            status: {
              myStatus: null,
              partnerStatus: null,
              lastPulseAt: null,
              partnerLastPulseAt: null,
            },
            events: [],
            error: null,
          }));
        } catch {
          set({ error: "We couldn't reset your local profile. Please try again." });
        }
      },
      pairWithPartner: (code) => {
        const normalizedCode = code.replace(/\D/g, "");
        if (normalizedCode !== get().user.pairingCode) {
          set({ error: "That code does not match. Check the six digits and try again." });
          return false;
        }

        try {
          const now = Date.now();
          const partnerStatusAt = now - 12 * 60 * 1000;
          const partnerPulseAt = now - 4 * 60 * 1000;
          set((state) => ({
            user: {
              ...state.user,
              isPaired: true,
              partnerId: PARTNER_ID,
            },
            status: {
              ...state.status,
              partnerStatus: {
                icon: "cafe-outline",
                label: "Coffee Break",
                setAt: partnerStatusAt,
              },
              partnerLastPulseAt: partnerPulseAt,
            },
            events: [
              makeEvent(
                "partner",
                "status_update",
                "Alex updated status: Coffee Break",
                partnerStatusAt,
                "cafe-outline",
              ),
              makeEvent("partner", "pulse_received", "Alex sent a pulse", partnerPulseAt, "heart"),
            ],
            error: null,
          }));
          return true;
        } catch {
          set({ error: "Pairing failed locally. Please try the code again." });
          return false;
        }
      },
      setMyStatus: (icon, label) => {
        try {
          const now = Date.now();
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
        } catch {
          set({ error: "Your status could not be updated. Please try again." });
        }
      },
      sendPulse: () => {
        try {
          const now = Date.now();
          const partnerLastPulseAt = get().status.partnerLastPulseAt;
          const isMoment =
            partnerLastPulseAt !== null &&
            Math.abs(now - partnerLastPulseAt) <= 5 * 60 * 1000;
          const previousDate = get().streak.lastActiveDate;
          const today = dateKey(now);
          const nextStreak =
            previousDate === today
              ? get().streak.currentStreak
              : previousDate === yesterdayKey()
                ? get().streak.currentStreak + 1
                : 1;

          set((state) => ({
            status: { ...state.status, lastPulseAt: now },
            streak: {
              currentStreak: nextStreak,
              lastActiveDate: today,
              momentCount: state.streak.momentCount + (isMoment ? 1 : 0),
            },
            events: [
              ...state.events,
              makeEvent("me", "pulse_sent", "You sent a pulse", now, "heart-outline"),
            ].slice(-100),
            error: null,
          }));
        } catch {
          set({ error: "Your pulse could not be sent. Please try again." });
        }
      },
      updateDisplayName: (displayName) => {
        try {
          set((state) => ({
            user: { ...state.user, displayName: displayName.trim() || state.user.displayName },
            error: null,
          }));
        } catch {
          set({ error: "Your display name could not be saved." });
        }
      },
      updateAvatarColor: (avatarColor) => {
        try {
          set((state) => ({ user: { ...state.user, avatarColor }, error: null }));
        } catch {
          set({ error: "Your avatar color could not be saved." });
        }
      },
      updateHapticIntensity: (hapticIntensity) => {
        try {
          set((state) => ({
            user: { ...state.user, hapticIntensity },
            error: null,
          }));
        } catch {
          set({ error: "Haptic preferences could not be saved." });
        }
      },
      unpair: () => {
        try {
          set((state) => ({
            user: { ...state.user, isPaired: false, partnerId: null },
            status: {
              ...state.status,
              partnerStatus: null,
              partnerLastPulseAt: null,
            },
            events: [],
            error: null,
          }));
        } catch {
          set({ error: "We couldn't unpair right now. Please try again." });
        }
      },
      clearError: () => set({ error: null }),
      pruneTimeline: () => {
        try {
          const today = dateKey(Date.now());
          set((state) => ({
            events: state.events.filter((event) => dateKey(event.timestamp) === today),
            error: null,
          }));
        } catch {
          set({ error: "Today's timeline could not be loaded." });
        }
      },
    }),
    {
      name: "pulse-local-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        status: state.status,
        streak: state.streak,
        events: state.events,
      }),
      onRehydrateStorage: () => (state, hydrationError) => {
        if (hydrationError) {
          useAppStore.setState({
            hydrated: true,
            error: "Your local Pulse data could not be loaded.",
          });
          return;
        }
        state?.pruneTimeline();
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);
