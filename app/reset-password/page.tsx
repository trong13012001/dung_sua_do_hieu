'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { validatePassword } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/common/FormField';
import { AuthNotice, AuthShell } from '@/components/common/AuthShell';

type Status = 'loading' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const hasHash = typeof globalThis.window !== 'undefined' && (globalThis.window.location.hash?.length ?? 0) > 0;
      if (session?.user) {
        setStatus('ready');
        return;
      }
      if (hasHash) {
        // Give Supabase a moment to process the hash
        await new Promise((r) => setTimeout(r, 500));
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (s2?.user) {
          setStatus('ready');
          return;
        }
      }
      setStatus('invalid');
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pErr = validatePassword(password, 6);
    if (pErr) {
      setError(pErr);
      return;
    }
    if (password !== confirm) {
      setError('Hai mật khẩu không trùng khớp');
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStatus('success');
      await supabase.auth.signOut();
      setTimeout(() => router.push('/login?reset=success'), 1500);
    } catch (err) {
      setError((err as Error).message || 'Đặt mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <AuthShell className="items-center text-center">
        <Loader2 className="mb-4 animate-spin text-muted-foreground" size={32} />
        <p className="text-sm text-muted-foreground">Đang xác thực link...</p>
      </AuthShell>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthShell className="items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock size={24} />
        </div>
        <h1 className="text-lg font-bold text-foreground">Link không hợp lệ hoặc đã hết hạn</h1>
        <p className="text-sm text-muted-foreground">
          Link đặt lại mật khẩu chỉ dùng được một lần và có thời hạn. Vui lòng yêu cầu gửi lại email đặt mật khẩu.
        </p>
        <Button asChild>
          <Link href="/login">Về trang đăng nhập</Link>
        </Button>
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell className="items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="text-lg font-bold text-foreground">Đặt mật khẩu thành công</h1>
        <p className="text-sm text-muted-foreground">Đang chuyển về trang đăng nhập...</p>
        <Loader2 className="animate-spin text-primary" size={24} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
          <Lock size={20} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Đặt lại mật khẩu</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Nhập mật khẩu mới (tối thiểu 6 ký tự).</p>

      {error && <AuthNotice tone="error">{error}</AuthNotice>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Mật khẩu mới" htmlFor="new-password">
          <Input
            id="new-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="············"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <FormField label="Xác nhận mật khẩu" htmlFor="confirm-password">
          <Input
            id="confirm-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="············"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </FormField>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" /> : 'Đặt mật khẩu'}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/login" className="text-sm font-bold text-primary hover:underline">
          ← Về trang đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
