'use client';

import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Banknote, CheckCircle2, ChevronRight, History, MapPin, Phone, Plus, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCustomer } from '@/hooks/customer/useCreateCustomer';
import { useCreateOrder } from '@/api/orders';
import { useEmployees } from '@/api/users';
import { Modal } from '@/components/ui/Modal';
import { OrderDetailModal } from '@/components/ui/OrderDetailModal';
import { ItemLabelsPrint } from '@/components/ui/ItemLabelsPrint';
import { InvoicePrint } from '@/components/ui/InvoicePrint';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { FormField } from '@/components/common/FormField';
import { IconAction } from '@/components/common/IconAction';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { buildOrderForInvoicePrint } from '@/lib/buildOrderForInvoicePrint';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { Customer, Order, Payment } from '@/lib/types';
import { validateRequired, validateNumber, onlyDigits } from '@/lib/validation';
import { isSilentThermalConfigured } from '@/lib/print/thermalPrint';
import { printTargetElementSmart } from '@/lib/printSmart';
import { PRINT_TARGET_LABEL_XP235B, PRINT_TARGET_INVOICE_XP80C } from '@/lib/printTargets';
import { dateInputToReturnTime } from '@/lib/canPrintInvoice';
import { errorMessage } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { CustomerPicker } from './_components/CustomerPicker';
import { CustomerHistoryDialog } from './_components/CustomerHistoryDialog';
import { PosItemRow, type PosItem } from './_components/PosItemRow';

/** Radix Select không nhận value rỗng. */
const DEFAULT_CREATOR = '__default__';

const PAYMENT_METHODS: { value: Payment['payment_method']; label: string }[] = [
  { value: 'Cash', label: 'Tiền mặt' },
  { value: 'Card', label: 'Thẻ' },
  { value: 'Transfer', label: 'Chuyển khoản' },
];

function parsePosMoneyInput(input: string) {
  const s = input.trim().replace(/\s/g, '').replace(/,/g, '');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

type PosPrintStep = 'labels' | 'invoice';

interface PosPrintQueue {
  step: PosPrintStep;
  orderId: number;
  transactionCode: string | null;
  labelItems: PosItem[];
  customerName: string | null;
  customerAddress: string | null;
  returnTime: string | null;
  invoiceOrder: Order;
}

function PrintQueueHint({
  step,
  silent,
}: Readonly<{ step: PosPrintStep; silent: boolean }>) {
  if (silent && step === 'invoice') {
    return (
      <div className="non-print rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-bold text-foreground">Bước 1/2 — XP-80C (hóa đơn):</span>{' '}
        đang in im lặng (Electron hoặc agent). Tự chuyển sang bước 2 khi hoàn tất.
      </div>
    );
  }
  if (silent) {
    return (
      <div className="non-print rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-bold text-foreground">Bước 2/2 — XP-235B (tem):</span>{' '}
        đang in im lặng (Electron hoặc agent).
      </div>
    );
  }
  if (step === 'invoice') {
    return (
      <div className="non-print rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-bold text-foreground">Bước 1 — Xprinter XP-80C (80mm):</span>{' '}
        cửa sổ in <span className="font-bold text-foreground">tự mở</span> ngay sau khi tạo đơn. Sau khi bạn in xong và đóng hộp thoại, hệ thống tự mở{' '}
        <span className="font-bold text-foreground">bước 2 — XP-235B</span> cho tem barcode món.
      </div>
    );
  }
  return (
    <div className="non-print rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
      <span className="font-bold text-foreground">Bước 2 — Xprinter XP-235B (tem):</span>{' '}
      cửa sổ in tự mở — chọn máy in tem và in. Đóng hộp thoại in để kết thúc hàng đợi.
    </div>
  );
}

export default function POSPage() {
  const { data: employees } = useEmployees();
  const {
    mutateAsync: mutateAsyncCreateOrder,
    isPending: isPendingCreateOrder,
  } = useCreateOrder();
  const {
    mutateAsync: mutateAsyncCreateCustomer,
    isPending: isPendingCreateCustomer,
  } = useCreateCustomer();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<PosItem[]>([]);
  const currentUserId = useCurrentUserId();
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');

  // Optional return appointment date (time defaults to 16:00)
  const [returnDate, setReturnDate] = useState('');
  /** Thu ngay khi lập đơn (tùy chọn) */
  const [initialPaidInput, setInitialPaidInput] = useState('');
  const [initialPayMethod, setInitialPayMethod] = useState<Payment['payment_method']>('Cash');
  const [initialSplitPay, setInitialSplitPay] = useState(false);
  const [initialPaidInput2, setInitialPaidInput2] = useState('');
  const [initialPayMethod2, setInitialPayMethod2] = useState<Payment['payment_method']>('Transfer');

  /** Hàng đợi in sau tạo đơn: 1) hóa đơn XP-80C → 2) tem XP-235B */
  const [printQueue, setPrintQueue] = useState<PosPrintQueue | null>(null);
  /** Chỉ tự chuyển bước sau afterprint khi print() do hàng đợi gọi (không áp dụng khi bấm "In lại"). */
  const printQueueAdvanceRef = useRef<PosPrintStep | null>(null);
  /** Khi in im lặng (Electron/agent) đang chạy, tránh trùng lệnh. */
  const silentPrintBusyRef = useRef(false);
  /** React Strict Mode chạy useLayoutEffect 2 lần — tránh gửi in hóa đơn trùng. */
  const invoiceAutoPrintKeyRef = useRef<string | null>(null);

  const silentAutoPrint = isSilentThermalConfigured();

  const closePrintQueue = () => setPrintQueue(null);

  useEffect(() => {
    if (printQueue == null) invoiceAutoPrintKeyRef.current = null;
  }, [printQueue]);

  const skipPrintStep = () => {
    setPrintQueue((q) => {
      if (!q) return null;
      if (q.step === 'invoice') return { ...q, step: 'labels' };
      return null;
    });
  };

  /**
   * In tự động sau tạo đơn (Electron silent → agent → dialog).
   * `silentAutoPrint` chỉ nghĩa là *có thể* im lặng; nếu rơi về dialog vẫn chờ xong rồi chuyển bước.
   */
  const runSilentAutoPrint = useCallback(async (step: PosPrintStep) => {
    if (silentPrintBusyRef.current) return;
    silentPrintBusyRef.current = true;
    try {
      const target = step === 'labels' ? PRINT_TARGET_LABEL_XP235B : PRINT_TARGET_INVOICE_XP80C;
      await new Promise((r) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(r)));
      const result = await printTargetElementSmart(target);
      const advance =
        result.method === 'silent' ||
        (result.method === 'browser' && result.error == null);
      if (advance) {
        if (step === 'invoice') {
          setPrintQueue((q) => (q?.step === 'invoice' ? { ...q, step: 'labels' } : q));
        } else {
          setPrintQueue(null);
        }
      } else if (result.error) {
        console.warn('[POS auto-print]', result.error);
      }
    } catch (err) {
      console.error('[POS silent auto-print]', err);
    } finally {
      silentPrintBusyRef.current = false;
    }
  }, []);

  /** Browser print flow: afterprint tự chuyển bước (chỉ khi không in im lặng). */
  useEffect(() => {
    if (silentAutoPrint) return;
    const onAfterPrint = () => {
      const expected = printQueueAdvanceRef.current;
      printQueueAdvanceRef.current = null;
      if (!expected) return;
      setPrintQueue((q) => {
        if (!q) return null;
        if (expected === 'invoice' && q.step === 'invoice') return { ...q, step: 'labels' };
        if (expected === 'labels' && q.step === 'labels') return null;
        return q;
      });
    };
    globalThis.addEventListener('afterprint', onAfterPrint);
    return () => globalThis.removeEventListener('afterprint', onAfterPrint);
  }, [silentAutoPrint]);

  /**
   * Bước 2 (tem): tự động in khi chuyển step.
   * Electron/agent → im lặng; ngược lại → window.print().
   */
  useLayoutEffect(() => {
    if (!printQueue || printQueue.step !== 'labels') return;

    if (silentAutoPrint) {
      const dedupeKey = `${printQueue.orderId}-labels`;
      if (invoiceAutoPrintKeyRef.current === dedupeKey) return;
      invoiceAutoPrintKeyRef.current = dedupeKey;
      runSilentAutoPrint('labels');
      return;
    }

    printQueueAdvanceRef.current = 'labels';
    let id0 = 0;
    let id1 = 0;
    id0 = globalThis.requestAnimationFrame(() => {
      id1 = globalThis.requestAnimationFrame(() => {
        globalThis.print();
      });
    });
    return () => {
      globalThis.cancelAnimationFrame(id0);
      globalThis.cancelAnimationFrame(id1);
    };
  }, [printQueue?.step, printQueue?.orderId, silentAutoPrint, runSilentAutoPrint]);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  // Đổi key mỗi lần mở để form thêm khách bắt đầu trống.
  const [addCustomerKey, setAddCustomerKey] = useState(0);

  const [customerOrderHistoryOpen, setCustomerOrderHistoryOpen] = useState(false);
  const [posHistoryOrderDetailId, setPosHistoryOrderDetailId] = useState<number | null>(null);

  /** Bỏ chọn khách thì đóng luôn lịch sử đơn (trước đây làm bằng useEffect). */
  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerOrderHistoryOpen(false);
    setPosHistoryOrderDetailId(null);
  };

  const tailors = useMemo(() => (employees ?? []).filter((e) => e.role?.name === 'Thợ may'), [employees]);
  const creatorEmployees = useMemo(
    () =>
      (employees ?? []).filter((e) => {
        const roleName = e.role?.name?.trim().toLowerCase();
        return roleName === 'kế toán' || roleName === 'ke toan' || roleName === 'account';
      }),
    [employees],
  );

  // Chưa chọn tay thì mặc định: chính người đang đăng nhập (nếu là kế toán), không thì kế toán đầu tiên.
  // (Trước đây đặt bằng useEffect + setState.)
  const defaultCreatorId = useMemo(() => {
    if (currentUserId && creatorEmployees.some((u) => String(u.id) === String(currentUserId))) {
      return String(currentUserId);
    }
    return creatorEmployees.length > 0 ? String(creatorEmployees[0].id) : '';
  }, [creatorEmployees, currentUserId]);
  const creatorId = selectedCreatorId || defaultCreatorId;

  const addItem = () => setItems((prev) => [...prev, { name: '', price: 0, description: '', assigned_tailor_id: '' }]);
  const removeItem = useCallback((index: number) => setItems((prev) => prev.filter((_, i) => i !== index)), []);
  // Tạo object mới cho dòng bị sửa (bản cũ sửa thẳng vào object trong state).
  const updateItem = useCallback((index: number, field: keyof PosItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const initialPaidLine1 = useMemo(
    () => parsePosMoneyInput(initialPaidInput),
    [initialPaidInput],
  );
  const initialPaidLine2 = useMemo(
    () => parsePosMoneyInput(initialPaidInput2),
    [initialPaidInput2],
  );

  const initialPaidCombined = useMemo(() => {
    if (!initialSplitPay) return initialPaidLine1 ?? 0;
    return (initialPaidLine1 ?? 0) + (initialPaidLine2 ?? 0);
  }, [initialSplitPay, initialPaidLine1, initialPaidLine2]);

  const initialPayRemainderPreview =
    initialPaidCombined > 0 && initialPaidCombined < totalAmount
      ? totalAmount - initialPaidCombined
      : null;

  const handleAddCustomer = async (values: { name: string; phone?: string; address?: string }) => {
    try {
      const created = await mutateAsyncCreateCustomer(values);
      setSelectedCustomer(created);
      setAddCustomerOpen(false);
      toast.success('Đã thêm khách hàng và chọn cho đơn hàng.');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error('Vui lòng chọn khách hàng.');
      return;
    }
    if (!returnDate.trim()) {
      toast.error('Vui lòng chọn ngày hẹn trả đồ.');
      return;
    }
    const return_time = dateInputToReturnTime(returnDate);
    if (!return_time) {
      toast.error('Ngày hẹn trả đồ không hợp lệ.');
      return;
    }
    const filled = items.filter(i => i.name.trim() !== '' || Number(i.price) > 0);
    if (filled.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm (tên và đơn giá).');
      return;
    }
    for (let i = 0; i < filled.length; i++) {
      const item = filled[i];
      const nameErr = validateRequired(item.name, 'Tên sản phẩm');
      const priceErr = validateNumber(item.price, { min: 0, fieldName: 'Đơn giá' });
      if (nameErr || priceErr) {
        toast.error(`Sản phẩm ${i + 1}: ${nameErr || priceErr}`);
        return;
      }
    }
    let initial_payment:
      | { amount: number; payment_method: Payment['payment_method'] }
      | undefined;
    let initial_payments:
      | { amount: number; payment_method: Payment['payment_method'] }[]
      | undefined;

    if (initialSplitPay) {
      const s1 = initialPaidInput.trim().replace(/\s/g, '').replace(/,/g, '');
      const s2 = initialPaidInput2.trim().replace(/\s/g, '').replace(/,/g, '');
      const n1 = s1 === '' ? 0 : Number(s1);
      const n2 = s2 === '' ? 0 : Number(s2);
      if (s1 !== '' && (!Number.isFinite(n1) || n1 < 0)) {
        toast.error('Số tiền khoản 1 không hợp lệ.');
        return;
      }
      if (s2 !== '' && (!Number.isFinite(n2) || n2 < 0)) {
        toast.error('Số tiền khoản 2 không hợp lệ.');
        return;
      }
      if (n1 <= 0 || n2 <= 0) {
        toast.error('Chia nhiều phương thức: nhập số tiền lớn hơn 0 cho cả hai khoản.');
        return;
      }
      if (n1 + n2 > totalAmount + 0.01) {
        toast.error('Tổng hai khoản không được lớn hơn tổng đơn.');
        return;
      }
      initial_payments = [
        { amount: n1, payment_method: initialPayMethod },
        { amount: n2, payment_method: initialPayMethod2 },
      ];
    } else {
      const paidStr = initialPaidInput.trim().replace(/\s/g, '').replace(/,/g, '');
      const paidNum = paidStr === '' ? 0 : Number(paidStr);
      if (paidStr !== '' && (!Number.isFinite(paidNum) || paidNum < 0)) {
        toast.error('Số tiền đã thu không hợp lệ.');
        return;
      }
      if (paidNum > totalAmount) {
        toast.error('Số tiền đã thu không được lớn hơn tổng đơn.');
        return;
      }
      initial_payment =
        paidNum > 0
          ? { amount: paidNum, payment_method: initialPayMethod }
          : undefined;
    }
    try {
      const created = await mutateAsyncCreateOrder({
        order: {
          customer_id: selectedCustomer.id,
          total_amount: totalAmount,
          status: 'New',
          return_time,
        } as Partial<Order>,
        items: items.filter(i => i.name.trim() !== '' && Number(i.price) >= 0).map(i => ({
          name: i.name.trim(),
          price: Number(i.price),
          description: i.description?.trim() ?? '',
          assigned_tailor_id: i.assigned_tailor_id || null,
        })),
        updated_by: creatorId || undefined,
        initial_payment,
        initial_payments,
      });
      const unpaidAfter = Math.max(
        0,
        Math.round(
          Number((created as Order).total_amount) - Number((created as Order).paid_amount ?? 0),
        ),
      );
      if (unpaidAfter > 0) {
        toast.success(`Đơn đã tạo. Còn nợ ${formatNumber(unpaidAfter)}đ — thu bù tại màn Đơn hàng.`);
      } else {
        toast.success('Đơn hàng đã được tạo thành công!');
      }
      const creatorName = employees?.find((u) => String(u.id) === String(creatorId))?.name ?? null;
      const invoiceOrder = buildOrderForInvoicePrint(
        created as Order,
        selectedCustomer,
        filled,
        tailors,
        creatorName,
      );
      flushSync(() => {
        setPrintQueue({
          step: 'invoice',
          orderId: created.id,
          transactionCode: (created as Order).transaction_code ?? null,
          labelItems: filled,
          customerName: selectedCustomer.name,
          customerAddress: selectedCustomer.address ?? null,
          returnTime: created.return_time ?? null,
          invoiceOrder,
        });
      });

      if (silentAutoPrint) {
        runSilentAutoPrint('invoice');
      } else {
        printQueueAdvanceRef.current = 'invoice';
        globalThis.requestAnimationFrame(() => {
          globalThis.requestAnimationFrame(() => {
            globalThis.print();
          });
        });
      }
      setItems([]);
      clearSelectedCustomer();
      setReturnDate('');
      setInitialPaidInput('');
      setInitialPaidInput2('');
      setInitialSplitPay(false);
      setInitialPayMethod('Cash');
      setInitialPayMethod2('Transfer');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  const methodSelect = (
    id: string,
    value: Payment['payment_method'],
    onChange: (v: Payment['payment_method']) => void,
  ) => (
    <Select value={value} onValueChange={(v) => onChange(v as Payment['payment_method'])} disabled={totalAmount <= 0}>
      <SelectTrigger id={id} className="w-full bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_METHODS.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const namedItems = items.filter((i) => i.name);

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
      <div className="space-y-4 md:space-y-6 lg:col-span-2">
        {/* Khách hàng */}
        <Card className="gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground md:text-lg">Thông tin khách hàng</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddCustomerKey((k) => k + 1);
                setAddCustomerOpen(true);
              }}
              className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <UserPlus /> Thêm khách hàng
            </Button>
          </div>

          {selectedCustomer ? (
            <div className="space-y-4">
              <div className="flex items-stretch justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 md:p-4">
                <button
                  type="button"
                  onClick={() => setCustomerOrderHistoryOpen(true)}
                  className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left outline-none transition-colors hover:bg-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  title="Xem lịch sử đơn hàng"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{selectedCustomer.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone size={11} />
                      {selectedCustomer.phone || 'N/A'}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin size={11} className="shrink-0" />
                      {selectedCustomer.address?.trim() || 'Chưa có địa chỉ'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary">
                      <History size={12} className="shrink-0" />
                      Lịch sử đơn hàng
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 self-center text-muted-foreground" aria-hidden />
                </button>
                <IconAction icon={X} label="Bỏ chọn khách" tone="danger" onClick={clearSelectedCustomer} className="self-start" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label={
                    <>
                      Ngày hẹn trả đồ <span className="text-destructive">*</span>
                    </>
                  }
                  htmlFor="pos-return-date"
                  hint="Giờ hẹn trả mặc định: 16:00."
                >
                  <Input
                    id="pos-return-date"
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </FormField>
                <FormField label="Nhân viên tạo đơn" htmlFor="pos-order-creator">
                  <Select
                    value={creatorId || DEFAULT_CREATOR}
                    onValueChange={(v) => setSelectedCreatorId(v === DEFAULT_CREATOR ? '' : v)}
                  >
                    <SelectTrigger id="pos-order-creator" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_CREATOR}>Mặc định theo tài khoản đăng nhập</SelectItem>
                      {creatorEmployees.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                          {u.role?.name ? ` (${u.role.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>
          ) : (
            <CustomerPicker onSelect={setSelectedCustomer} />
          )}
        </Card>

        {/* Sản phẩm */}
        <Card className="gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground md:text-lg">Sản phẩm đơn hàng</h2>
            <Button size="sm" onClick={addItem}>
              <Plus /> Thêm
            </Button>
          </div>
          {items.length === 0 ? (
            <EmptyState title={'Chưa có sản phẩm nào. Nhấn "Thêm" để bắt đầu.'} className="py-10" />
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <PosItemRow
                  key={index}
                  index={index}
                  item={item}
                  tailors={tailors}
                  onChange={updateItem}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tổng kết */}
      <div>
        <Card className="gap-4 p-4 md:p-6 lg:sticky lg:top-6">
          <h2 className="text-base font-bold text-foreground md:text-lg">Tổng kết đơn hàng</h2>

          {selectedCustomer && (
            <button
              type="button"
              onClick={() => setCustomerOrderHistoryOpen(true)}
              className="w-full rounded-lg border border-transparent p-3 text-left text-xs outline-none transition-colors hover:border-border hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              title="Xem lịch sử đơn hàng"
            >
              <p className="font-bold text-foreground">{selectedCustomer.name}</p>
              <p className="text-muted-foreground">{selectedCustomer.phone}</p>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                <History size={12} />
                Lịch sử đơn hàng
              </p>
            </button>
          )}

          <div className="space-y-3 border-t border-border pt-4">
            {namedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="mr-2 truncate text-muted-foreground">{item.name}</span>
                <span className="shrink-0 font-bold text-foreground">{formatNumber(Number(item.price) || 0)}đ</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-4 text-lg font-bold">
              <span className="text-foreground">Tổng cộng</span>
              <span className="text-primary">{formatNumber(totalAmount)}đ</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <Banknote size={14} className="shrink-0 text-primary" />
              Đã thu khi lập đơn
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Ghi nhận như màn thanh toán đơn. Thu ít hơn tổng đơn vẫn được: đơn giữ trạng thái Mới, phần chưa thu ghi
              vào công nợ khách; thu nốt ở màn Đơn hàng. Nếu thu đủ tổng tiền, hệ thống tự đặt trạng thái Đã thanh toán
              (trừ khi đơn đã ở trạng thái đã xong / đã trả đồ).
            </p>
            {initialPayRemainderPreview != null && (
              <p className="text-[11px] font-semibold leading-snug text-warning">
                Ước tính còn nợ sau khi tạo đơn: {formatNumber(initialPayRemainderPreview)}đ
              </p>
            )}
            <label
              htmlFor="pos-initial-split-pay"
              className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-2.5"
            >
              <Checkbox
                id="pos-initial-split-pay"
                checked={initialSplitPay}
                onCheckedChange={(c) => setInitialSplitPay(c === true)}
                disabled={totalAmount <= 0}
                className="mt-0.5"
              />
              <span className="text-[11px] leading-snug text-muted-foreground">
                <span className="font-bold text-foreground">Chia nhiều phương thức</span>
                {' — '}hai khoản khi lập đơn (vd. tiền mặt + chuyển khoản).
              </span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label={initialSplitPay ? 'Khoản 1 — số tiền (đ)' : 'Số tiền (đ)'} htmlFor="pos-initial-paid">
                <Input
                  id="pos-initial-paid"
                  inputMode="numeric"
                  className="bg-card"
                  placeholder="0 — để trống nếu chưa thu"
                  value={initialPaidInput}
                  onChange={(e) => setInitialPaidInput(onlyDigits(e.target.value))}
                  disabled={totalAmount <= 0}
                />
              </FormField>
              <FormField label={initialSplitPay ? 'Khoản 1 — hình thức' : 'Hình thức'} htmlFor="pos-initial-pay-method">
                {methodSelect('pos-initial-pay-method', initialPayMethod, setInitialPayMethod)}
              </FormField>
              {initialSplitPay && (
                <>
                  <FormField label="Khoản 2 — số tiền (đ)" htmlFor="pos-initial-paid-2">
                    <Input
                      id="pos-initial-paid-2"
                      inputMode="numeric"
                      className="bg-card"
                      placeholder="0"
                      value={initialPaidInput2}
                      onChange={(e) => setInitialPaidInput2(onlyDigits(e.target.value))}
                      disabled={totalAmount <= 0}
                    />
                  </FormField>
                  <FormField label="Khoản 2 — hình thức" htmlFor="pos-initial-pay-method-2">
                    {methodSelect('pos-initial-pay-method-2', initialPayMethod2, setInitialPayMethod2)}
                  </FormField>
                </>
              )}
            </div>
          </div>

          <Button size="lg" onClick={handleSubmit} disabled={isPendingCreateOrder} className="w-full font-bold">
            {isPendingCreateOrder ? 'Đang xử lý...' : 'Đặt hàng'}
          </Button>
          <div className="flex items-center gap-2 rounded-md border border-info/20 bg-info/10 p-3">
            <CheckCircle2 size={16} className="shrink-0 text-info" />
            <p className="text-[11px] font-medium leading-tight text-info">
              Kiểm tra kỹ thông tin đơn hàng trước khi xác nhận.
            </p>
          </div>
        </Card>
      </div>

      <CustomerFormDialog
        key={addCustomerKey}
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        title="Thêm khách hàng mới"
        submitLabel="Thêm"
        pendingLabel="Đang tạo..."
        phoneRequired
        isPending={isPendingCreateCustomer}
        onSubmit={handleAddCustomer}
        idPrefix="pos-new-customer"
      />

      <CustomerHistoryDialog
        open={customerOrderHistoryOpen}
        onOpenChange={(next) => {
          setCustomerOrderHistoryOpen(next);
          if (!next) setPosHistoryOrderDetailId(null);
        }}
        customer={selectedCustomer}
        onOpenOrder={setPosHistoryOrderDetailId}
      />

      <OrderDetailModal
        isOpen={posHistoryOrderDetailId != null}
        onClose={() => setPosHistoryOrderDetailId(null)}
        orderId={posHistoryOrderDetailId}
      />

      {/* Hàng đợi in: hóa đơn XP-80C → tem XP-235B */}
      <Modal
        isOpen={printQueue != null && printQueue.labelItems.length > 0}
        onClose={closePrintQueue}
        title={
          printQueue
            ? printQueue.step === 'invoice'
              ? `Hàng đợi 1/2 · Hóa đơn XP-80C · Đơn #${printQueue.orderId.toString().padStart(5, '0')}`
              : `Hàng đợi 2/2 · Tem XP-235B · Đơn #${printQueue.orderId.toString().padStart(5, '0')}`
            : 'In sau tạo đơn'
        }
        maxWidth="max-w-xl"
      >
        {printQueue != null && printQueue.labelItems.length > 0 && (
          <div className="space-y-4">
            <PrintQueueHint step={printQueue.step} silent={silentAutoPrint} />
            <div className="non-print flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={skipPrintStep}>
                Bỏ qua bước này
              </Button>
              <Button variant="outline" size="sm" onClick={closePrintQueue}>
                Đóng hàng đợi
              </Button>
            </div>
            {printQueue.step === 'invoice' ? (
              <InvoicePrint order={printQueue.invoiceOrder} onClose={closePrintQueue} />
            ) : (
              <ItemLabelsPrint
                orderId={printQueue.orderId}
                transactionCode={printQueue.transactionCode}
                items={printQueue.labelItems.map((i) => ({ name: i.name, description: i.description }))}
                customerName={printQueue.customerName ?? undefined}
                customerAddress={printQueue.customerAddress ?? undefined}
                returnTime={printQueue.returnTime ?? undefined}
                onClose={closePrintQueue}
              />
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
