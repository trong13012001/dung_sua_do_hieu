import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
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
      <body className={`${montserrat.variable} antialiased`}>
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
