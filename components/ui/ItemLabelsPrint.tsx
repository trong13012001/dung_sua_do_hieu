'use client';

import React from 'react';
import { OrderBarcode } from '@/components/ui/OrderBarcode';
import { encodeItemBarcode } from '@/lib/barcode';

export interface ItemLabelData {
  readonly name: string;
  readonly description?: string;
}

export interface ItemLabelsPrintProps {
  readonly orderId: number;
  readonly items: readonly ItemLabelData[];
  readonly onClose?: () => void;
  readonly customerName?: string;
  readonly receiveTime?: string;
}

/** Print sheet: one barcode label per item. */
export function ItemLabelsPrint({ orderId, items, onClose, customerName, receiveTime }: Readonly<ItemLabelsPrintProps>) {
  const handlePrint = () => {
    globalThis.print();
  };

  if (!orderId || items.length === 0) return null;

  return (
    <div className="invoice-print-area bg-white text-black p-4 md:p-5 max-w-lg mx-auto rounded-lg border border-border print:p-4 print:max-w-none print:border-0 print:rounded-none">
      <div className="non-print flex flex-wrap justify-between items-center gap-2 mb-4 shrink-0">
        <h3 className="text-sm md:text-base font-bold text-foreground">
          Tem barcode từng món · Đơn #{orderId.toString().padStart(5, '0')}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-primary text-white rounded-md font-bold text-xs md:text-sm hover:opacity-90"
          >
            In tem
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-border rounded-md font-bold text-xs md:text-sm hover:bg-muted/50"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const code = encodeItemBarcode(orderId, index + 1);
          const receiveLabel = receiveTime
            ? new Date(receiveTime).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;
          return (
            <div
              key={`${index}-${item.name}`}
              className="border border-gray-300 rounded-md px-3 py-2 flex flex-col gap-1 text-[11px]"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-gray-600 leading-snug break-words">
                      {item.description}
                    </p>
                  )}
                  {(customerName || receiveLabel) && (
                    <div className="mt-0.5 space-y-0.5">
                      {customerName && (
                        <p className="text-gray-700">
                          KH: <span className="font-medium">{customerName}</span>
                        </p>
                      )}
                      {receiveLabel && (
                        <p className="text-gray-600">
                          Hẹn trả: {receiveLabel}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <OrderBarcode value={code} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

