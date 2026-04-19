"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function PresenceSync() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let channel: any = null;

    const syncPresence = async () => {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

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
          // Sync logic
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

    syncPresence();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}
