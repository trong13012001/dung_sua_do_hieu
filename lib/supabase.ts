import { createClient } from "@supabase/supabase-js";
import { processLock } from "@supabase/auth-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "Supabase URL or Anon Key is missing. Please check your .env.local file.",
    );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
    auth: {
        // processLock tránh deadlock Web Locks API (Next.js Strict Mode / nhiều tab).
        // lockAcquireTimeout: mặc định 5s dễ timeout khi nhiều hook gọi auth cùng lúc.
        lock: processLock,
        lockAcquireTimeout: 20_000,
    },
    realtime: {
        heartbeatIntervalMs: 5000,
        heartbeatCallback: (status: string) => {
            if (
                status === "disconnected" ||
                status === "timeout" ||
                status === "error"
            ) {
                supabase.realtime.connect();
            }
        },
        worker: true,
    },
});
