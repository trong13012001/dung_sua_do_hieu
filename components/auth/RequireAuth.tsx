"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AppShellSkeleton } from '@/components/ui/loading-skeletons';

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setAllowed(true);
            } else {
                router.replace("/login");
                return;
            }
            setLoading(false);
        });
    }, [router]);

    if (loading || !allowed) {
        return <AppShellSkeleton />;
    }

    return <>{children}</>;
}
