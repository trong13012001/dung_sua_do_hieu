'use client';

import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useRealtimeSubscription();

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 lg:ml-[260px] flex flex-col">
        {/* Mobile-only top bar */}
        <div className="sticky top-0 z-30 lg:hidden flex items-center gap-3 px-4 h-14 bg-card/80 backdrop-blur-md border-b border-border">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-1 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-foreground">Dũng Sửa Đồ Hiệu</span>
        </div>

        <main className="flex-1 px-4 md:px-8 py-6 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
