"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";

interface PresenceUser {
  user_id: string;
  name: string;
  role: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUsers: Record<string, PresenceUser[]>;
  onlineStaff: Record<string, PresenceUser>;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser[]>>({});
  const [onlineStaff, setOnlineStaff] = useState<Record<string, PresenceUser>>({});

  useEffect(() => {
    let channel: any = null;

    const setupPresence = async () => {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Fetch profile for role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Staff";

      // 3. Setup Presence Channel
      channel = supabase.channel("pharmacy-presence", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          setOnlineUsers(state as Record<string, PresenceUser[]>);
          
          // Helper: map to specific roles for the staff widget
          const staff: Record<string, PresenceUser> = {};
          Object.keys(state).forEach((key) => {
            const presences = state[key] as unknown as PresenceUser[];
            if (presences && presences.length > 0) {
              const latest = presences[0];
              if (["Pharmacist", "Manager", "Cashier"].includes(latest.role)) {
                staff[latest.role] = latest;
              }
            }
          });
          setOnlineStaff(staff);
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              user_id: user.id,
              name: userName,
              role: profile.role,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    setupPresence();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers, onlineStaff }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return context;
}
