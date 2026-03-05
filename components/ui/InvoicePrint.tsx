'use client';

import React from 'react';
import { Order } from '@/lib/types';

export function InvoicePrint({ order, onClose }: { order: Order; onClose?: () => void }) {
  const debt = order.total_amount - (order.paid_amount || 0);
  const isPaid = debt <= 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-print-area bg-white text-black p-6 md:p-10 max-w-lg mx-auto print:p-8 print:max-w-none">
      <div className="non-print flex justify-end gap-2 mb-4">
        <button type="button" onClick={handlePrint} className="px-4 py-2 bg-primary text-white rounded font-bold text-sm">
          In phiếu
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded font-bold text-sm">
            Đóng
          </button>
        )}
      </div>

      <div className="border border-gray-300 rounded-lg p-6">
        <h1 className="text-xl font-black text-center mb-6">PHIẾU THANH TOÁN</h1>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <span className="text-gray-600">Mã đơn:</span>
          <span className="font-bold">#{order.id.toString().padStart(5, '0')}</span>
          <span className="text-gray-600">Ngày tạo:</span>
          <span>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
          <span className="text-gray-600">Khách hàng:</span>
          <span className="font-bold">{order.customer?.name || 'Vãng lai'}</span>
          {order.customer?.phone && (
            <>
              <span className="text-gray-600">SĐT:</span>
              <span>{order.customer.phone}</span>
            </>
          )}
        </div>

        <table className="w-full text-sm border-collapse border border-gray-300 mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Sản phẩm</th>
              <th className="border border-gray-300 p-2 text-right w-24">Đơn giá</th>
            </tr>
          </thead>
          <tbody>
            {order.details?.map(d => (
              <tr key={d.id}>
                <td className="border border-gray-300 p-2">{d.item_name}</td>
                <td className="border border-gray-300 p-2 text-right">{new Intl.NumberFormat('vi-VN').format(d.unit_price)}đ</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 text-sm text-right">
          <div className="flex justify-end gap-4">
            <span className="text-gray-600">Tổng cộng:</span>
            <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(order.total_amount)}đ</span>
          </div>
          <div className="flex justify-end gap-4">
            <span className="text-gray-600">Đã thanh toán:</span>
            <span className="font-bold text-green-700">{new Intl.NumberFormat('vi-VN').format(order.paid_amount || 0)}đ</span>
          </div>
          {!isPaid && (
            <div className="flex justify-end gap-4">
              <span className="text-gray-600">Còn lại:</span>
              <span className="font-bold text-orange-600">{new Intl.NumberFormat('vi-VN').format(debt)}đ</span>
            </div>
          )}
        </div>

        {isPaid && (
          <p className="text-center text-green-700 font-bold mt-6 text-lg">ĐÃ THANH TOÁN ĐỦ</p>
        )}
      </div>

      <p className="text-center text-gray-500 text-xs mt-6">Cảm ơn quý khách!</p>
    </div>
  );
}
