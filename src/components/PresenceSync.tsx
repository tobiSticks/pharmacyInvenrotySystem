"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function PresenceSync() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const syncPresence = async () => {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // 2. Fetch profile for display name and role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, email, display_name")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const userName = profile.display_name || user.email?.split('@')[0] || "Staff";

      // 3. Setup Presence Channel
      const channel = supabase.channel("pharmacy-presence", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          // You could track local state here if needed
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              user_id: user.id,
              name: userName,
              role: profile.role,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    };

    syncPresence();
  }, []);

  return null; // This component doesn't render anything
}
