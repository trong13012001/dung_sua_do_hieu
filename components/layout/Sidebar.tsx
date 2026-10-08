'use client';

import React, { memo, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Scissors,
  UserPen,
  LogOut,
  X,
  Shield,
  Key,
  ClipboardList,
  UserCircle,
  PackageCheck,
  Hammer,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { canAccessRoute } from '@/lib/permissions';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavItemDef = { name: string; href: string; icon: LucideIcon };

const navSections: { label: string; items: NavItemDef[] }[] = [
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
      { name: 'Cửa hàng & Máy in', href: '/settings', icon: Settings },
    ],
  },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function initialsOf(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const NavItem = memo(function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItemDef;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon
        size={17}
        className={cn('shrink-0', active ? 'text-primary-foreground' : 'text-foreground/70 group-hover:text-primary')}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
});

type SidebarBodyProps = {
  pathname: string;
  sections: typeof navSections;
  userName: string | null;
  roleName: string | null;
  onNavigate: () => void;
  onLogout: () => void;
  /** Chỉ bản mobile (trong Sheet) có nút đóng. */
  closeButton?: React.ReactNode;
};

/** Nội dung sidebar dùng chung cho bản desktop (cố định) và mobile (Sheet). */
const SidebarBody = memo(function SidebarBody({
  pathname,
  sections,
  userName,
  roleName,
  onNavigate,
  onLogout,
  closeButton,
}: SidebarBodyProps) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between gap-2 p-5">
        <Link href="/dashboard" onClick={onNavigate} className="group flex min-w-0 items-center gap-3">
          <BrandLogo className="h-11 w-auto shrink-0 object-contain object-left transition-opacity group-hover:opacity-90" />
          <span className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-foreground">
            Dũng Sửa Đồ Hiệu
          </span>
        </Link>
        {closeButton}
      </div>

      <nav aria-label="Điều hướng chính" className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </div>
            <div className="mt-1 space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={isActiveRoute(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <Separator />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5">
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initialsOf(userName)}
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{userName ?? '—'}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roleName ?? '—'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 px-3 text-[13px] text-foreground/70 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={17} />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
});

/** Hằng module để SidebarBody (memo) không nhận element mới mỗi lần render. */
const SHEET_CLOSE_BUTTON = (
  <SheetClose asChild>
    <Button variant="ghost" size="icon-sm" aria-label="Đóng menu" className="text-muted-foreground">
      <X />
    </Button>
  </SheetClose>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, isLoading, currentUser } = useCurrentUserPermissions();

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  // Khi đang tải quyền thì hiện đủ menu như trước (tránh menu nháy rỗng), rồi lọc theo quyền.
  const sections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => isLoading || canAccessRoute(permissions, item.href)),
        }))
        .filter((section) => section.items.length > 0),
    [permissions, isLoading],
  );

  const bodyProps = {
    pathname,
    sections,
    userName: currentUser?.name ?? null,
    roleName: currentUser?.role?.name ?? null,
    onNavigate: onClose,
    onLogout: handleLogout,
  };

  return (
    <>
      {/* Desktop: cố định bên trái */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] border-r border-border lg:block">
        <SidebarBody {...bodyProps} />
      </aside>

      {/* Mobile / tablet: ngăn kéo */}
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="left" showCloseButton={false} className="w-[280px] max-w-[85vw] gap-0 p-0 lg:hidden">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Điều hướng giữa các màn hình</SheetDescription>
          <SidebarBody
            {...bodyProps}
            closeButton={SHEET_CLOSE_BUTTON}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
