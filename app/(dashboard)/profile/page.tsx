'use client';

import React, { useState } from 'react';
import { Save, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/common/PageHeader';
import { FormField } from '@/components/common/FormField';

export default function ProfilePage() {
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
      toast.success('Cập nhật hồ sơ thành công');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Đổi mật khẩu thành công');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const initials = (profile.displayName.trim()[0] ?? '?').toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Hồ sơ cá nhân" />

      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-2xl font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h2 className="truncate text-xl font-bold text-foreground">{profile.displayName}</h2>
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <Separator />
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Tên hiển thị" htmlFor="display-name">
                <Input
                  id="display-name"
                  required
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                />
              </FormField>
              <FormField label="Email" htmlFor="profile-email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input id="profile-email" disabled className="pl-9" value={profile.email} />
                </div>
              </FormField>
            </div>
            <Button type="submit" disabled={loading}>
              <Save /> {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock size={18} className="text-primary" /> Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-5">
            <FormField label="Mật khẩu hiện tại" htmlFor="current-password">
              <Input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="············"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Mật khẩu mới" htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="············"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </FormField>
              <FormField label="Xác nhận mật khẩu mới" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="············"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </FormField>
            </div>
            <Button type="submit" disabled={loading}>
              <Lock /> {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
