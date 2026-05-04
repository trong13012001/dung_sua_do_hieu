'use client';

import { useEffect } from 'react';
import {
  PRINT_TARGET_INVOICE_XP80C,
  PRINT_TARGET_LABEL_XP235B,
} from '@/lib/printTargets';
import { filterOutermostItemLabelPrintHosts } from '@/lib/print/itemLabelPrintHosts';

const PRINT_ROOT_ID = 'print-root';

/** Trình duyệt không chọn máy in giúp được; gợi ý XP-235B / XP-80C qua tiêu đề khi mở hộp thoại in. */
let printTitleBackup: string | null = null;

function isElementVisibleForPrint(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  let node: HTMLElement | null = el;
  while (node) {
    const s = globalThis.getComputedStyle(node);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    node = node.parentElement;
  }
  return true;
}

function setupPrintRoot() {
  const root = document.getElementById(PRINT_ROOT_ID);
  if (root) root.remove();

  const printRoot = document.createElement('div');
  printRoot.id = PRINT_ROOT_ID;
  document.body.appendChild(printRoot);

  /** Tem nhãn: chỉ clone vùng .item-labels-print (tránh trộn với phiếu XP-80C khi nhiều modal / nhiều .invoice-print-area). */
  const labelRoots = document.querySelectorAll('.item-labels-print');
  const visibleLabels = [...labelRoots].filter(
    (e): e is HTMLElement =>
      e instanceof HTMLElement && isElementVisibleForPrint(e),
  );
  const labelHosts = filterOutermostItemLabelPrintHosts(visibleLabels);
  if (labelHosts.length > 0) {
    /* Một host ngoài cùng (cả lô); bỏ qua host lồng nhau trên từng dòng (In tem này). */
    const el = labelHosts.at(-1);
    if (el) {
      printRoot.dataset.printTarget = PRINT_TARGET_LABEL_XP235B;
      if (printTitleBackup === null) {
        printTitleBackup = document.title;
        document.title = `[XP-235B · tem nhãn] ${printTitleBackup}`;
      }
      printRoot.appendChild(el.cloneNode(true));
    }
    return;
  }

  let appendedInvoice = false;
  const areas = document.querySelectorAll('.invoice-print-area');
  for (const el of areas) {
    if (isElementVisibleForPrint(el)) {
      printRoot.appendChild(el.cloneNode(true));
      appendedInvoice = true;
    }
  }
  if (appendedInvoice) {
    printRoot.dataset.printTarget = PRINT_TARGET_INVOICE_XP80C;
    if (printTitleBackup === null) {
      printTitleBackup = document.title;
      document.title = `[XP-80C · hóa đơn] ${printTitleBackup}`;
    }
  }
}

function removePrintRoot() {
  document.getElementById(PRINT_ROOT_ID)?.remove();
  if (printTitleBackup !== null) {
    document.title = printTitleBackup;
    printTitleBackup = null;
  }
}

export function PrintRoot() {
  useEffect(() => {
    globalThis.addEventListener('beforeprint', setupPrintRoot);
    globalThis.addEventListener('afterprint', removePrintRoot);
    return () => {
      globalThis.removeEventListener('beforeprint', setupPrintRoot);
      globalThis.removeEventListener('afterprint', removePrintRoot);
    };
  }, []);
  return null;
}
