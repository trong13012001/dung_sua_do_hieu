import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "Supabase URL or Anon Key is missing. Please check your .env.local file.",
    );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
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
