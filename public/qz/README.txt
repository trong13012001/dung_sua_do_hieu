QZ Tray — cấu hình nhanh cho dự án Next.js này
==============================================

1) Cài QZ Tray trên máy quầy: https://qz.io/download/

2) Tạo cặp khóa (dev): QZ Tray → Advanced → Site Manager → + → Create New →
   bật tạo key; bản sao "QZ Tray Demo Cert" trên Desktop có:
   - digital-certificate.txt  → copy vào thư mục này (cùng cấp file README)
   - private-key.pem          → đặt ở THƯ MỤC GỐC project với tên qz-private-key.pem
     (file .pem đã nằm trong .gitignore, không commit)

3) Trong .env.local (tạo file nếu chưa có):
   NEXT_PUBLIC_QZ_ENABLED=1
   NEXT_PUBLIC_QZ_PRINTER_INVOICE=Tên máy in XP-80C trong Windows
   NEXT_PUBLIC_QZ_PRINTER_LABEL=Tên máy in tem XP-235B trong Windows

4) Chạy npm run dev, mở POS/đơn, bấm "In QZ". Trình duyệt và QZ Tray phải chạy
   trên cùng máy quầy.

Production: dùng chứng chỉ từ portal QZ (renew định kỳ), không dùng Demo Cert.
