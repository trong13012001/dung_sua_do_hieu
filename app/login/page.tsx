"use client";

import React, { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { validateEmail, validatePassword } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/common/FormField";
import { AuthNotice, AuthShell } from "@/components/common/AuthShell";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const resetSuccess = searchParams.get("reset") === "success";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const emailErr = validateEmail(email);
        const passwordErr = validatePassword(password, 1);
        if (emailErr || passwordErr) {
            setError(emailErr || passwordErr || null);
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) throw error;

            router.push("/dashboard");
        } catch (err) {
            setError((err as Error).message || "Đăng nhập thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <div className="mb-8 flex flex-col items-center text-center">
                <BrandLogo priority className="mb-6 h-28 w-auto object-contain sm:h-32" />
                <h1 className="text-xl font-bold text-foreground">Chào mừng bạn đến với Dũng Sửa Đồ Hiệu! 👋</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Vui lòng đăng nhập vào tài khoản của bạn để bắt đầu
                </p>
            </div>

            {resetSuccess && (
                <AuthNotice tone="success">
                    Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
                </AuthNotice>
            )}
            {error && <AuthNotice tone="error">{error}</AuthNotice>}

            <form onSubmit={handleLogin} className="space-y-5">
                <FormField label="Email" htmlFor="login-email">
                    <Input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ten@email.com"
                    />
                </FormField>
                <FormField label="Mật khẩu" htmlFor="login-password">
                    <Input
                        id="login-password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="············"
                    />
                </FormField>

                <div className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="cursor-pointer font-normal text-muted-foreground">
                        Ghi nhớ đăng nhập
                    </Label>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin" /> : "Đăng nhập"}
                </Button>
            </form>
        </AuthShell>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <Loader2
                        className="animate-spin text-muted-foreground"
                        size={32}
                    />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
