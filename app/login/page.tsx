'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, Circle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -ml-48 -mb-48"></div>

      <div className="w-full max-w-[450px] space-y-8 relative z-10">
        <div className="vuexy-card p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
              <Circle size={24} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Vuexy</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground">Chào mừng bạn đến với Dũng Sửa Đồ Hiệu! 👋</h2>
            <p className="text-sm text-muted-foreground mt-1">Vui lòng đăng nhập vào tài khoản của bạn để bắt đầu</p>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-md text-[13px] mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-border rounded-md py-2.5 px-4 outline-none focus:ring-1 focus:ring-primary text-sm text-foreground transition-all"
                placeholder="admin@vuexy.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Mật khẩu</label>
                <a href="#" className="text-[11px] font-bold text-primary hover:underline">Quên mật khẩu?</a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border border-border rounded-md py-2.5 px-4 outline-none focus:ring-1 focus:ring-primary text-sm text-foreground transition-all"
                placeholder="············"
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer" />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">Ghi nhớ đăng nhập</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có tài khoản? <a href="#" className="text-primary font-bold hover:underline">Tạo một cái mới</a>
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            &copy; 2024 Dũng Sửa Đồ Hiệu. Được làm với ❤️
          </p>
        </div>
      </div>
    </div>
  );
}
