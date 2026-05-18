import { createClient } from "@supabase/supabase-js";
import { processLock, type LockFunc } from "@supabase/auth-js";

/** GoTrue mặc định 5s; supabase-js chưa expose lockAcquireTimeout trong auth options. */
const AUTH_LOCK_ACQUIRE_MS = 20_000;
const processLockWithTimeout: LockFunc = (name, _acquireTimeout, fn) =>
    processLock(name, AUTH_LOCK_ACQUIRE_MS, fn);

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
        lock: processLockWithTimeout,
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
