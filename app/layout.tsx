import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Dũng sửa đồ hiệu | CRM & POS",
  description: "Hệ thống quản lý sửa chữa đồ hiệu cao cấp",
};

import QueryProvider from "@/components/providers/QueryProvider";
import { PrintRoot } from "@/components/print/PrintRoot";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${publicSans.variable} antialiased`}>
        <QueryProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
          <PrintRoot />
        </QueryProvider>
      </body>
    </html>
  );
}
