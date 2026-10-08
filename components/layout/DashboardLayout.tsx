'use client';

import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ShopSettingsSync } from '@/components/providers/ShopSettingsSync';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useRealtimeSubscription();

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <ShopSettingsSync />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* min-w-0: flex item mặc định không co nhỏ hơn nội dung → một bảng/hàng rộng sẽ đẩy cả trang cuộn ngang trên mobile. */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[260px]">
        {/* Mobile-only top bar */}
        <div className="sticky top-0 z-30 lg:hidden flex items-center gap-3 px-4 h-14 bg-card/80 backdrop-blur-md border-b border-border">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Mở menu" className="-ml-1">
            <Menu className="size-5" />
          </Button>
          <span className="flex items-center gap-2 min-w-0">
            <BrandLogo className="h-8 w-auto shrink-0 object-contain object-left" />
            <span className="text-sm font-bold text-foreground truncate">Dũng Sửa Đồ Hiệu</span>
          </span>
        </div>

        <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
