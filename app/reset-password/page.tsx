'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Loader2, Circle } from 'lucide-react';
import { validatePassword } from '@/lib/validation';

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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm">Đang xác thực link...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="vuexy-card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger mx-auto">
            <Lock size={24} />
          </div>
          <h1 className="text-lg font-bold text-foreground">Link không hợp lệ hoặc đã hết hạn</h1>
          <p className="text-sm text-muted-foreground">
            Link đặt lại mật khẩu chỉ dùng được một lần và có thời hạn. Vui lòng yêu cầu gửi lại email đặt mật khẩu.
          </p>
          <Link
            href="/login"
            className="inline-block btn-primary px-5 py-2.5 rounded-md font-bold text-sm"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="vuexy-card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success mx-auto">
            <Circle size={24} fill="currentColor" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Đặt mật khẩu thành công</h1>
          <p className="text-sm text-muted-foreground">Đang chuyển về trang đăng nhập...</p>
          <Loader2 className="animate-spin mx-auto text-primary" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="w-full max-w-[450px] space-y-8 relative z-10">
        <div className="vuexy-card p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
              <Circle size={24} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Đặt lại mật khẩu</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Nhập mật khẩu mới (tối thiểu 6 ký tự).
          </p>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-md text-[13px] mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                Mật khẩu mới
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                placeholder="············"
                className="w-full bg-transparent border border-border rounded-md py-2.5 px-4 outline-none focus:ring-1 focus:ring-primary text-sm text-foreground"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                placeholder="············"
                className="w-full bg-transparent border border-border rounded-md py-2.5 px-4 outline-none focus:ring-1 focus:ring-primary text-sm text-foreground"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Đặt mật khẩu'}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary font-bold hover:underline">
              ← Về trang đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
