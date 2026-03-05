'use client';

import { useEffect } from 'react';

const PRINT_ROOT_ID = 'print-root';

function setupPrintRoot() {
  const root = document.getElementById(PRINT_ROOT_ID);
  if (root) root.remove();

  const printRoot = document.createElement('div');
  printRoot.id = PRINT_ROOT_ID;
  document.body.appendChild(printRoot);

  const areas = document.querySelectorAll('.invoice-print-area');
  areas.forEach((el) => printRoot.appendChild(el.cloneNode(true)));
}

function removePrintRoot() {
  document.getElementById(PRINT_ROOT_ID)?.remove();
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
