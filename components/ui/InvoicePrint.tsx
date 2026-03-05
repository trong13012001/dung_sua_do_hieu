'use client';

import React from 'react';
import { Order } from '@/lib/types';
import { OrderBarcode } from '@/components/ui/OrderBarcode';
import { encodeInvoiceBarcode } from '@/lib/barcode';

export interface InvoicePrintProps {
  readonly order: Order;
  readonly onClose?: () => void;
  readonly multiPage?: boolean;
}

/** Single invoice: one page. For batch, use InvoicePrintContent + invoice-page class. */
export function InvoicePrint({ order, onClose, multiPage }: Readonly<InvoicePrintProps>) {
  const handlePrint = () => {
    globalThis.print();
  };

  return (
    <div className={`invoice-print-area bg-white text-black p-4 md:p-6 max-w-xl mx-auto rounded-lg border border-border print:p-6 print:max-w-none print:border-0 print:rounded-none ${multiPage ? 'invoice-page' : 'invoice-single'}`}>
      <div className="non-print flex flex-wrap justify-end gap-2 mb-4 shrink-0">
        <button type="button" onClick={handlePrint} className="px-4 py-2 bg-primary text-white rounded-md font-bold text-sm hover:opacity-90">
          In phiếu
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-md font-bold text-sm hover:bg-muted/50">
            Đóng
          </button>
        )}
      </div>
      <div className="min-w-0">
        <InvoicePrintContent order={order} />
      </div>
    </div>
  );
}

export interface InvoicePrintContentProps {
  readonly order: Order;
}

/** Invoice body only (for single or batch). */
export function InvoicePrintContent({ order }: Readonly<InvoicePrintContentProps>) {
  const debt = order.total_amount - (order.paid_amount || 0);
  const isPaid = debt <= 0;
  const orderCode = encodeInvoiceBarcode(order.id);

  return (
    <>
      <div className="border border-gray-300 rounded-lg p-4 md:p-6 print:p-4">
        <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
          <div>
            <p className="text-sm md:text-base font-semibold text-gray-800">Dũng sửa đồ hiệu</p>
            <p className="text-[11px] md:text-xs text-gray-600 leading-tight">Hotline: 0904672288</p>
            <p className="text-[11px] md:text-xs text-gray-600 leading-tight">Địa chỉ: 3 P. Phan Bội Châu, Cửa Nam, Hoàn Kiếm, Hà Nội</p>
            <h1 className="text-lg md:text-xl font-black text-left mt-2">PHIẾU THANH TOÁN</h1>
          </div>
          <OrderBarcode value={orderCode} />
        </div>

        <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-xs md:text-sm mb-3 md:mb-4">
          <span className="text-gray-600">Mã đơn:</span>
          <span className="font-bold">#{order.id.toString().padStart(5, '0')}</span>
          <span className="text-gray-600">Ngày tạo:</span>
          <span>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
          <span className="text-gray-600">Ngày nhận:</span>
          <span>
            {new Date(order.receive_time).toLocaleDateString('vi-VN')}{' '}
            <span className="text-[11px] text-gray-500">
              {new Date(order.receive_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
          {order.return_time && (
            <>
              <span className="text-gray-600">Hẹn trả:</span>
              <span>
                {new Date(order.return_time).toLocaleDateString('vi-VN')}{' '}
                <span className="text-[11px] text-gray-500">
                  {new Date(order.return_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            </>
          )}
          <span className="text-gray-600">Khách hàng:</span>
          <span className="font-bold">{order.customer?.name || 'Vãng lai'}</span>
          {order.customer?.phone && (
            <>
              <span className="text-gray-600">SĐT:</span>
              <span>{order.customer.phone}</span>
            </>
          )}
        </div>

        <table className="w-full text-xs md:text-sm border-collapse border border-gray-300 mt-3 md:mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-1.5 md:p-2 text-left">Sản phẩm</th>
              <th className="border border-gray-300 p-1.5 md:p-2 text-right w-20 md:w-24">Đơn giá</th>
            </tr>
          </thead>
          <tbody>
            {order.details?.map(d => (
              <tr key={d.id}>
                <td className="border border-gray-300 p-1.5 md:p-2">{d.item_name}</td>
                <td className="border border-gray-300 p-1.5 md:p-2 text-right">{new Intl.NumberFormat('vi-VN').format(d.unit_price)}đ</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 md:mt-4 space-y-0.5 md:space-y-1 text-xs md:text-sm text-right">
          <div className="flex justify-end gap-4">
            <span className="text-gray-600">Tổng cộng:</span>
            <span className="font-bold">
              {new Intl.NumberFormat('vi-VN').format(order.total_amount)}đ
            </span>
          </div>
          <div className="flex justify-end gap-4">
            <span className="text-gray-600">Đã thanh toán:</span>
            <span className="font-bold text-green-700">
              {new Intl.NumberFormat('vi-VN').format(order.paid_amount || 0)}đ
            </span>
          </div>
          <div className="flex justify-end gap-4">
            <span className="text-gray-600">Còn lại:</span>
            <span className={`font-bold ${isPaid ? 'text-green-700' : 'text-orange-600'}`}>
              {new Intl.NumberFormat('vi-VN').format(Math.max(debt, 0))}đ
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-gray-500 text-xs mt-4 md:mt-6 print:mt-4">Cảm ơn quý khách!</p>
    </>
  );
}
