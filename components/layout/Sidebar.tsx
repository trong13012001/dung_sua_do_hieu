'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Scissors,
  UserPen,
  LogOut,
  Circle,
  X,
  User,
  Shield,
  Key,
  ClipboardList,
  UserCircle,
  PackageCheck,
  Hammer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { canAccessRoute } from '@/lib/permissions';

const navSections = [
  {
    label: 'Ứng dụng',
    items: [
      { name: 'Bảng điều khiển', href: '/dashboard', icon: LayoutDashboard },
      { name: 'POS / Tạo đơn', href: '/pos', icon: ShoppingBag },
      { name: 'Đơn hàng', href: '/orders', icon: ClipboardList },
      { name: 'Trả đồ', href: '/returns', icon: PackageCheck },
      { name: 'Công việc', href: '/tasks', icon: Scissors },
      { name: 'Việc của tôi', href: '/my-tasks', icon: Hammer },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { name: 'Khách hàng', href: '/customers', icon: Users },
      { name: 'Nhân viên', href: '/employees', icon: UserPen },
      { name: 'Vai trò', href: '/roles', icon: Shield },
      { name: 'Quyền hạn', href: '/permissions', icon: Key },
    ],
  },
  {
    label: 'Cài đặt',
    items: [
      { name: 'Hồ sơ', href: '/profile', icon: UserCircle },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, isLoading, currentUser } = useCurrentUserPermissions();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-screen w-[260px] bg-card border-r border-border flex flex-col z-50 transition-transform duration-300
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
              <Circle size={20} fill="currentColor" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Dũng Sửa Đồ Hiệu</h1>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-4 mt-1 pb-4">
          {navSections.map(section => (
            <div key={section.label}>
              <div className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{section.label}</div>
              <div className="space-y-0.5 mt-1">
                {section.items
                  .filter(item => isLoading || canAccessRoute(permissions, item.href))
                  .map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${isActive
                          ? 'bg-linear-to-r from-primary to-[#8f85f3] text-white shadow-[0_2px_6px_0_rgba(115,103,240,0.3)]'
                          : 'text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Icon size={17} className={isActive ? 'text-white' : 'text-foreground/70 group-hover:text-primary'} />
                        <span className="text-[13px] font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-muted/30 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary relative shrink-0">
              <User size={16} />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-success rounded-full border-2 border-card" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{currentUser?.name ?? '—'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{currentUser?.role?.name ?? '—'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-foreground/70 hover:text-danger hover:bg-danger/10 rounded-md transition-colors">
            <LogOut size={17} />
            <span className="text-[13px] font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
