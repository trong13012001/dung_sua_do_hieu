'use client';

import React, { useState } from 'react';
import { CircleUser, Save, Lock, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Toast, useToast } from '@/components/ui/Toast';

export default function ProfilePage() {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    displayName: 'Admin',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setProfile(prev => ({
          ...prev,
          email: data.user.email || '',
          displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Admin',
          phone: data.user.phone || '',
        }));
      }
    });
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: profile.displayName },
      });
      if (error) throw error;
      showToast('Cập nhật hồ sơ thành công', 'success');
    } catch (err: any) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Mật khẩu mới không khớp', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Đổi mật khẩu thành công', 'success');
    } catch (err: any) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h4 className="text-lg md:text-xl font-bold text-foreground">Hồ sơ cá nhân</h4>

      {/* Profile card */}
      <div className="vuexy-card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-6 border-b border-border">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
            <CircleUser size={48} />
          </div>
          <div className="text-center sm:text-left">
            <h5 className="text-xl font-bold text-foreground">{profile.displayName}</h5>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Tên hiển thị</label>
              <input required className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm" value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input disabled className="w-full bg-muted/10 border border-border rounded-md pl-10 pr-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" value={profile.email} />
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="vuexy-card p-6 md:p-8">
        <h5 className="text-base font-bold text-foreground mb-6 flex items-center gap-2"><Lock size={18} className="text-primary" /> Đổi mật khẩu</h5>
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Mật khẩu hiện tại</label>
            <input type="password" required className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="············" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Mật khẩu mới</label>
              <input type="password" required className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="············" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Xác nhận mật khẩu mới</label>
              <input type="password" required className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="············" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 disabled:opacity-50">
            <Lock size={16} /> {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
