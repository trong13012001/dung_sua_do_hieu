'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactBarcode = dynamic(() => import('react-barcode'), { ssr: false });

export interface OrderBarcodeProps {
  readonly value: string;
  readonly className?: string;
}

export function OrderBarcode({ value, className }: Readonly<OrderBarcodeProps>) {
  if (!value) return null;

  return (
    <div className={className ?? ''}>
      <div className="flex flex-col items-end gap-1">
        {/* Barcode image */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ReactBarcode value={value} height={40} width={1.2} displayValue={false} margin={0} background="transparent" lineColor="#000000" /> 
        {/* Human readable text under barcode */}
        <span className="text-[9px] tracking-[0.18em] font-medium text-black">
          {value}
        </span>
      </div>
    </div>
  );
}

