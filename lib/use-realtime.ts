import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { useAppStore } from "@/store/useAppStore";

/**
 * Subscribe to Supabase Realtime channels for partner updates.
 * Call this once from the tabs layout so subscriptions persist
 * across tab switches.
 */
export function useRealtimeSubscriptions() {
  const userId = useAppStore((s) => s.user.userId);
  const partnerId = useAppStore((s) => s.user.partnerId);
  const isPaired = useAppStore((s) => s.user.isPaired);
  const handlePartnerStatusUpdate = useAppStore(
    (s) => s.handlePartnerStatusUpdate,
  );
  const handlePartnerPulse = useAppStore((s) => s.handlePartnerPulse);
  const fetchPartnerData = useAppStore((s) => s.fetchPartnerData);
  const fetchEvents = useAppStore((s) => s.fetchEvents);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isPaired || !partnerId || !userId) return;

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`pulse-pair-${userId}`)
      // Partner status changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_status",
          filter: `user_id=eq.${partnerId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, string>;
          if (row?.label) {
            handlePartnerStatusUpdate(
              row.icon || "sparkles-outline",
              row.label,
              new Date(row.set_at).getTime(),
            );
          }
        },
      )
      // New events where I am the partner (partner sent something to me)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `partner_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, string>;
          if (row?.type === "pulse_sent" && row.actor_id === partnerId) {
            handlePartnerPulse(new Date(row.created_at).getTime());
          } else if (row?.type === "status_update" && row.actor_id === partnerId) {
            // Refresh events from server to get the full picture
            void fetchEvents();
          }
        },
      )
      // Partner profile changes (e.g. name, avatar color)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${partnerId}`,
        },
        () => {
          void fetchPartnerData();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    userId,
    partnerId,
    isPaired,
    handlePartnerStatusUpdate,
    handlePartnerPulse,
    fetchPartnerData,
    fetchEvents,
  ]);
}

/**
 * Subscribe to the current user's profile for pairing updates.
 * Used on the pairing screen to auto-advance when partner accepts.
 */
export function usePairingListener(onPaired: () => void) {
  const userId = useAppStore((s) => s.user.userId);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`pairing-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, string | null>;
          if (row?.partner_id) {
            onPaired();
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, onPaired]);
}
