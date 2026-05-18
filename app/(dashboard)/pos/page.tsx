'use client';

import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
  Plus,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Users,
  Phone,
  MapPin,
  X,
  UserPlus,
  ShoppingBag,
  Calendar,
  Clock,
  History,
  Banknote,
} from 'lucide-react';
import { useGetCustomer } from '@/hooks/customer/useGetCustomer';
import { useGetCustomerOrders } from '@/hooks/customer/useGetCustomerOrders';
import { useCreateCustomer } from '@/hooks/customer/useCreateCustomer';
import { useCreateOrder } from '@/api/orders';
import { useEmployees } from '@/api/users';
import { Toast, useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { OrderDetailModal } from '@/components/ui/OrderDetailModal';
import { ItemLabelsPrint } from '@/components/ui/ItemLabelsPrint';
import { InvoicePrint } from '@/components/ui/InvoicePrint';
import { buildOrderForInvoicePrint } from '@/lib/buildOrderForInvoicePrint';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { Customer, Order, User, Role, Payment } from '@/lib/types';
import { validateRequired, validateNumber, validatePhone, validateMaxLength } from '@/lib/validation';
import { isSilentThermalConfigured } from '@/lib/print/thermalPrint';
import { printTargetElementSmart } from '@/lib/printSmart';
import { PRINT_TARGET_LABEL_XP235B, PRINT_TARGET_INVOICE_XP80C } from '@/lib/printTargets';
import { orderStatusBadgeClass, orderStatusLabelVi } from '@/lib/orderStatusUi';
import { dateInputToReturnTime } from '@/lib/canPrintInvoice';

interface PosItem {
  name: string;
  price: number;
  description: string;
  assigned_tailor_id: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [showCustomerList, setShowCustomerList] = useState(false);

  const { data: customerData } = useGetCustomer(0, 100, debouncedSearchTerm);
  const customers = customerData?.data || [];
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
  const { toast, showToast, hideToast } = useToast();
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
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', address: '' });
  const [newCustomerErrors, setNewCustomerErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

  const [customerOrderHistoryOpen, setCustomerOrderHistoryOpen] = useState(false);
  const [posHistoryOrderDetailId, setPosHistoryOrderDetailId] = useState<number | null>(null);

  const { data: customerOrders, isLoading: isLoadingCustomerOrders } = useGetCustomerOrders(
    selectedCustomer?.id ?? '',
    { enabled: Boolean(selectedCustomer?.id && customerOrderHistoryOpen) }
  );
  const customerOrdersList = customerOrders ?? [];

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerOrderHistoryOpen(false);
      setPosHistoryOrderDetailId(null);
    }
  }, [selectedCustomer]);

  const closeCustomerOrderHistory = () => {
    setCustomerOrderHistoryOpen(false);
    setPosHistoryOrderDetailId(null);
  };

  const tailors = useMemo(() =>
    employees?.filter((e: User & { role: Role | null }) =>
      e.role?.name === 'Thợ may'
    ) || [],
    [employees]
  );
  const creatorEmployees = useMemo(
    () =>
      employees?.filter((e: User & { role: Role | null }) => {
        const roleName = e.role?.name?.trim().toLowerCase();
        return roleName === 'kế toán' || roleName === 'ke toan' || roleName === 'account';
      }) || [],
    [employees]
  );

  useEffect(() => {
    if (selectedCreatorId) return;
    const hasCurrentInCreatorList = creatorEmployees.some((u) => String(u.id) === String(currentUserId || ''));
    if (hasCurrentInCreatorList && currentUserId) {
      setSelectedCreatorId(String(currentUserId));
      return;
    }
    if (creatorEmployees.length > 0) {
      setSelectedCreatorId(String(creatorEmployees[0].id));
    }
  }, [currentUserId, selectedCreatorId, creatorEmployees]);

  const addItem = () => setItems([...items, { name: '', price: 0, description: '', assigned_tailor_id: '' }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof PosItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const parsePosMoneyInput = (input: string) => {
    const s = input.trim().replace(/\s/g, '').replace(/,/g, '');
    if (s === '') return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

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

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerList(false);
    setSearchTerm('');
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateRequired(newCustomerForm.name, 'Họ và tên');
    const phoneErr = validatePhone(newCustomerForm.phone, true);
    const addressErr = validateMaxLength(newCustomerForm.address, 500, 'Địa chỉ');
    const errs = { name: nameErr || undefined, phone: phoneErr || undefined, address: addressErr || undefined };
    setNewCustomerErrors(errs);
    if (nameErr || phoneErr || addressErr) return;
    try {
      const created = await mutateAsyncCreateCustomer({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim() || undefined,
        address: newCustomerForm.address.trim() || undefined,
      });
      setSelectedCustomer(created);
      setSearchTerm('');
      setShowCustomerList(false);
      setAddCustomerOpen(false);
      setNewCustomerForm({ name: '', phone: '', address: '' });
      setNewCustomerErrors({});
      showToast('Đã thêm khách hàng và chọn cho đơn hàng.', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      showToast('Vui lòng chọn khách hàng.', 'error');
      return;
    }
    if (!returnDate.trim()) {
      showToast('Vui lòng chọn ngày hẹn trả đồ.', 'error');
      return;
    }
    const return_time = dateInputToReturnTime(returnDate);
    if (!return_time) {
      showToast('Ngày hẹn trả đồ không hợp lệ.', 'error');
      return;
    }
    const filled = items.filter(i => i.name.trim() !== '' || Number(i.price) > 0);
    if (filled.length === 0) {
      showToast('Vui lòng thêm ít nhất một sản phẩm (tên và đơn giá).', 'error');
      return;
    }
    for (let i = 0; i < filled.length; i++) {
      const item = filled[i];
      const nameErr = validateRequired(item.name, 'Tên sản phẩm');
      const priceErr = validateNumber(item.price, { min: 0, fieldName: 'Đơn giá' });
      if (nameErr || priceErr) {
        showToast(`Sản phẩm ${i + 1}: ${nameErr || priceErr}`, 'error');
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
        showToast('Số tiền khoản 1 không hợp lệ.', 'error');
        return;
      }
      if (s2 !== '' && (!Number.isFinite(n2) || n2 < 0)) {
        showToast('Số tiền khoản 2 không hợp lệ.', 'error');
        return;
      }
      if (n1 <= 0 || n2 <= 0) {
        showToast(
          'Chia nhiều phương thức: nhập số tiền lớn hơn 0 cho cả hai khoản.',
          'error',
        );
        return;
      }
      if (n1 + n2 > totalAmount + 0.01) {
        showToast('Tổng hai khoản không được lớn hơn tổng đơn.', 'error');
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
        showToast('Số tiền đã thu không hợp lệ.', 'error');
        return;
      }
      if (paidNum > totalAmount) {
        showToast('Số tiền đã thu không được lớn hơn tổng đơn.', 'error');
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
        updated_by: selectedCreatorId || undefined,
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
        showToast(
          `Đơn đã tạo. Còn nợ ${new Intl.NumberFormat('vi-VN').format(unpaidAfter)}đ — thu bù tại màn Đơn hàng.`,
          'success',
        );
      } else {
        showToast('Đơn hàng đã được tạo thành công!', 'success');
      }
      const creatorName =
        employees?.find((u: User & { role: Role | null }) => String(u.id) === String(selectedCreatorId))?.name ??
        null;
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
      setSelectedCustomer(null);
      setReturnDate('');
      setInitialPaidInput('');
      setInitialPaidInput2('');
      setInitialSplitPay(false);
      setInitialPayMethod('Cash');
      setInitialPayMethod2('Transfer');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2 space-y-4 md:space-y-6">
        {/* Customer Selection */}
        <div className="vuexy-card p-4 md:p-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-bold text-foreground">Thông tin khách hàng</h4>
            <button
              type="button"
              onClick={() => {
                setAddCustomerOpen(true);
                setNewCustomerForm({ name: '', phone: '', address: '' });
                setNewCustomerErrors({});
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary/10 transition-colors"
            >
              <UserPlus size={16} /> Thêm khách hàng
            </button>
          </div>

          {selectedCustomer ? (
            <div className="space-y-3">
              <div className="flex items-stretch justify-between gap-2 p-3 md:p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCustomerOrderHistoryOpen(true)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary -m-1 p-1"
                  title="Xem lịch sử đơn hàng"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Users size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-sm">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={11} />{selectedCustomer.phone || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin size={11} className="shrink-0" />
                      {selectedCustomer.address?.trim() || 'Chưa có địa chỉ'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-primary">
                      <History size={12} className="shrink-0" />
                      Lịch sử đơn hàng
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 self-center text-muted-foreground" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="shrink-0 self-start p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Bỏ chọn khách"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Return appointment (optional) */}
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <div className="space-y-1">
                  <label htmlFor="pos-return-date" className="text-[11px] font-bold text-muted-foreground uppercase">
                    Ngày hẹn trả đồ <span className="text-danger">*</span>
                  </label>
                  <input
                    id="pos-return-date"
                    type="date"
                    required
                    className="w-full bg-muted/20 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Giờ hẹn trả mặc định: 16:00.</p>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="pos-order-creator" className="text-[11px] font-bold text-muted-foreground uppercase">
                  Nhân viên tạo đơn
                </label>
                <div className="relative">
                  <select
                    id="pos-order-creator"
                    className="w-full bg-muted/20 border border-border rounded-md px-3 py-1.5 text-sm appearance-none outline-none focus:ring-1 focus:ring-primary"
                    value={selectedCreatorId}
                    onChange={e => setSelectedCreatorId(e.target.value)}
                  >
                    <option value="">Mặc định theo tài khoản đăng nhập</option>
                    {creatorEmployees.map((u: User & { role: Role | null }) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name}{u.role?.name ? ` (${u.role.name})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT hoặc địa chỉ khách hàng..."
                  className="w-full bg-muted/10 border border-border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)}
                />
              </div>
              {showCustomerList && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                  {customers.length > 0 ? customers.map((c: Customer) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3 border-b border-border/50 last:border-none"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><Users size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.phone || 'Không có SĐT'} {c.address ? `· ${c.address}` : ''}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground italic">
                      {searchTerm ? 'Không tìm thấy khách hàng' : 'Nhập tên, SĐT hoặc địa chỉ để tìm'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products with per-item tailor */}
        <div className="vuexy-card p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-bold text-foreground">Sản phẩm đơn hàng</h4>
            <button onClick={addItem} className="btn-primary px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md flex items-center gap-1.5 md:gap-2">
              <Plus size={14} /> Thêm
            </button>
          </div>

          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-lg text-muted-foreground italic text-sm">
                Chưa có sản phẩm nào. Nhấn &quot;Thêm&quot; để bắt đầu.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={index} className="p-3 md:p-4 border border-border rounded-lg bg-muted/5 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Tên sản phẩm</label>
                      <input className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm" placeholder="vd: Sửa túi da" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Giá tiền</label>
                      <input type="number" className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm" placeholder="0" value={item.price || ''} onChange={e => updateItem(index, 'price', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Mô tả</label>
                      <input className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm" placeholder="Ghi chú thêm..." value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Phân công thợ</label>
                      <div className="relative">
                        <select className="w-full bg-card border border-border rounded px-3 py-1.5 text-sm appearance-none outline-none" value={item.assigned_tailor_id} onChange={e => updateItem(index, 'assigned_tailor_id', e.target.value)}>
                          <option value="">Chưa phân công</option>
                          {tailors.map((t: User & { role: Role | null }) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeItem(index)} className="absolute -top-2 -right-2 bg-danger text-white p-1 rounded-full shadow-md hover:bg-danger/80">
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="space-y-4 md:space-y-6">
        <div className="vuexy-card p-4 md:p-6 lg:sticky lg:top-6">
          <h4 className="text-base md:text-lg font-bold text-foreground mb-4 md:mb-6">Tổng kết đơn hàng</h4>

          {selectedCustomer && (
            <button
              type="button"
              onClick={() => setCustomerOrderHistoryOpen(true)}
              className="mb-4 w-full rounded-lg border border-transparent p-3 text-left text-xs transition-colors hover:border-border hover:bg-muted/30"
              title="Xem lịch sử đơn hàng"
            >
              <p className="font-bold text-foreground">{selectedCustomer.name}</p>
              <p className="text-muted-foreground">{selectedCustomer.phone}</p>
              <p className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary">
                <History size={12} />
                Lịch sử đơn hàng
              </p>
            </button>
          )}

          <div className="space-y-3 mb-6 pt-4 border-t border-border">
            {items.filter(i => i.name).map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate mr-2">{item.name}</span>
                <span className="font-bold text-foreground shrink-0">{new Intl.NumberFormat('vi-VN').format(Number(item.price) || 0)}đ</span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-4">
              <span className="text-foreground">Tổng cộng</span>
              <span className="text-primary">{new Intl.NumberFormat('vi-VN').format(totalAmount)}đ</span>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-lg border border-border bg-muted/10 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
              <Banknote size={14} className="text-primary shrink-0" />
              Đã thu khi lập đơn
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Ghi nhận như màn thanh toán đơn. Thu ít hơn tổng đơn vẫn được: đơn giữ trạng thái Mới, phần chưa thu ghi vào công nợ khách; thu nốt ở màn Đơn hàng. Nếu thu đủ tổng tiền, hệ thống tự đặt trạng thái Đã thanh toán (trừ khi đơn đã ở trạng thái đã xong / đã trả đồ).
            </p>
            {initialPayRemainderPreview != null ? (
              <p className="text-[10px] font-semibold text-warning leading-snug">
                Ước tính còn nợ sau khi tạo đơn:{' '}
                {new Intl.NumberFormat('vi-VN').format(initialPayRemainderPreview)}đ
              </p>
            ) : null}
            <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-card/50 p-2.5">
              <input
                id="pos-initial-split-pay"
                type="checkbox"
                checked={initialSplitPay}
                onChange={(e) => setInitialSplitPay(e.target.checked)}
                disabled={totalAmount <= 0}
                className="mt-0.5 shrink-0"
              />
              <label
                htmlFor="pos-initial-split-pay"
                className="cursor-pointer text-[10px] leading-snug text-muted-foreground"
              >
                <span className="font-bold text-foreground">Chia nhiều phương thức</span>
                {' — '}
                hai khoản khi lập đơn (vd. tiền mặt + chuyển khoản).
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="pos-initial-paid" className="text-[11px] font-semibold text-muted-foreground">
                  {initialSplitPay ? 'Khoản 1 — số tiền (đ)' : 'Số tiền (đ)'}
                </label>
                <input
                  id="pos-initial-paid"
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  placeholder="0 — để trống nếu chưa thu"
                  value={initialPaidInput}
                  onChange={(e) => setInitialPaidInput(e.target.value)}
                  disabled={totalAmount <= 0}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="pos-initial-pay-method" className="text-[11px] font-semibold text-muted-foreground">
                  {initialSplitPay ? 'Khoản 1 — hình thức' : 'Hình thức'}
                </label>
                <select
                  id="pos-initial-pay-method"
                  className="w-full appearance-none rounded-md border border-border bg-card px-3 py-2 text-sm outline-none"
                  value={initialPayMethod}
                  onChange={(e) =>
                    setInitialPayMethod(e.target.value as Payment['payment_method'])
                  }
                  disabled={totalAmount <= 0}
                >
                  <option value="Cash">Tiền mặt</option>
                  <option value="Card">Thẻ</option>
                  <option value="Transfer">Chuyển khoản</option>
                </select>
              </div>
            </div>
            {initialSplitPay ? (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="pos-initial-paid-2" className="text-[11px] font-semibold text-muted-foreground">
                    Khoản 2 — số tiền (đ)
                  </label>
                  <input
                    id="pos-initial-paid-2"
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                    placeholder="0"
                    value={initialPaidInput2}
                    onChange={(e) => setInitialPaidInput2(e.target.value)}
                    disabled={totalAmount <= 0}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="pos-initial-pay-method-2" className="text-[11px] font-semibold text-muted-foreground">
                    Khoản 2 — hình thức
                  </label>
                  <select
                    id="pos-initial-pay-method-2"
                    className="w-full appearance-none rounded-md border border-border bg-card px-3 py-2 text-sm outline-none"
                    value={initialPayMethod2}
                    onChange={(e) =>
                      setInitialPayMethod2(e.target.value as Payment['payment_method'])
                    }
                    disabled={totalAmount <= 0}
                  >
                    <option value="Cash">Tiền mặt</option>
                    <option value="Card">Thẻ</option>
                    <option value="Transfer">Chuyển khoản</option>
                  </select>
                </div>
              </div>
            ) : null}
          </div>

          <button onClick={handleSubmit} disabled={isPendingCreateOrder} className="w-full btn-primary py-3 rounded-md font-bold mb-3 disabled:opacity-50">
            {isPendingCreateOrder ? 'Đang xử lý...' : 'Đặt hàng'}
          </button>
          <div className="flex items-center gap-2 p-3 bg-info/10 rounded border border-info/20">
            <CheckCircle2 size={16} className="text-info shrink-0" />
            <p className="text-[11px] text-info font-medium leading-tight">Kiểm tra kỹ thông tin đơn hàng trước khi xác nhận.</p>
          </div>
        </div>
      </div>

      {/* Add customer modal */}
      <Modal isOpen={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} title="Thêm khách hàng mới">
        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
          <div>
            <label htmlFor="pos-new-customer-name" className="block text-xs font-bold text-muted-foreground uppercase mb-1">Họ và tên *</label>
            <input
              id="pos-new-customer-name"
              className={`w-full bg-muted/20 border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary ${newCustomerErrors.name ? 'border-danger' : 'border-border'}`}
              value={newCustomerForm.name}
              onChange={e => { setNewCustomerForm({ ...newCustomerForm, name: e.target.value }); if (newCustomerErrors.name) setNewCustomerErrors({ ...newCustomerErrors, name: undefined }); }}
              placeholder="Nguyễn Văn A"
            />
            {newCustomerErrors.name && <p className="text-xs text-danger mt-0.5">{newCustomerErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="pos-new-customer-phone" className="block text-xs font-bold text-muted-foreground uppercase mb-1">Số điện thoại *</label>
            <input
              id="pos-new-customer-phone"
              className={`w-full bg-muted/20 border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary ${newCustomerErrors.phone ? 'border-danger' : 'border-border'}`}
              value={newCustomerForm.phone}
              onChange={e => { setNewCustomerForm({ ...newCustomerForm, phone: e.target.value }); if (newCustomerErrors.phone) setNewCustomerErrors({ ...newCustomerErrors, phone: undefined }); }}
              placeholder="0912345678"
            />
            {newCustomerErrors.phone && <p className="text-xs text-danger mt-0.5">{newCustomerErrors.phone}</p>}
          </div>
          <div>
            <label htmlFor="pos-new-customer-address" className="block text-xs font-bold text-muted-foreground uppercase mb-1">Địa chỉ</label>
            <input
              id="pos-new-customer-address"
              className={`w-full bg-muted/20 border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary ${newCustomerErrors.address ? 'border-danger' : 'border-border'}`}
              value={newCustomerForm.address}
              onChange={e => { setNewCustomerForm({ ...newCustomerForm, address: e.target.value }); if (newCustomerErrors.address) setNewCustomerErrors({ ...newCustomerErrors, address: undefined }); }}
              placeholder="Địa chỉ (tùy chọn)"
            />
            {newCustomerErrors.address && <p className="text-xs text-danger mt-0.5">{newCustomerErrors.address}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddCustomerOpen(false)} className="flex-1 py-2.5 rounded-md font-bold text-sm border border-border bg-muted/40 hover:bg-muted transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={isPendingCreateCustomer} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {isPendingCreateCustomer ? 'Đang tạo...' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={customerOrderHistoryOpen && !!selectedCustomer}
        onClose={closeCustomerOrderHistory}
        title={
          selectedCustomer
            ? `Lịch sử đơn hàng — ${selectedCustomer.name}`
            : 'Lịch sử đơn hàng'
        }
        maxWidth="max-w-3xl"
      >
        {selectedCustomer ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Chọn một đơn để xem chi tiết. Số điện thoại:{' '}
              <span className="font-medium text-foreground">{selectedCustomer.phone || 'N/A'}</span>
            </p>
            {isLoadingCustomerOrders ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/20" />
                ))}
              </div>
            ) : customerOrdersList.length > 0 ? (
              <div className="space-y-3">
                {customerOrdersList.map((order: Order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setPosHistoryOrderDetailId(order.id)}
                    className="vuexy-card w-full border border-border p-4 text-left transition-all hover:shadow-md group"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm transition-all group-hover:bg-primary group-hover:text-white">
                          <ShoppingBag size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-foreground">#{order.id}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${orderStatusBadgeClass(order.status)}`}
                            >
                              {orderStatusLabelVi(order.status)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar size={12} className="text-primary" />
                              {new Date(order.receive_time).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Clock size={12} className="text-primary" />
                              {new Date(order.receive_time).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-2 sm:border-none sm:pt-0 sm:text-right">
                        <p className="text-base font-black text-foreground">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            order.total_amount
                          )}
                        </p>
                        <ChevronRight size={18} className="text-primary opacity-70 group-hover:opacity-100" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-14 text-center">
                <ShoppingBag size={40} className="text-muted-foreground opacity-30" />
                <p className="text-sm font-medium italic text-muted-foreground">Chưa có đơn hàng nào cho khách này.</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <OrderDetailModal
        isOpen={posHistoryOrderDetailId != null}
        onClose={() => setPosHistoryOrderDetailId(null)}
        orderId={posHistoryOrderDetailId}
        stackOnTop
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
              <button
                type="button"
                onClick={skipPrintStep}
                className="px-3 py-1.5 text-xs font-bold rounded-md border border-border hover:bg-muted/50"
              >
                Bỏ qua bước này
              </button>
              <button
                type="button"
                onClick={closePrintQueue}
                className="px-3 py-1.5 text-xs font-bold rounded-md border border-border hover:bg-muted/50"
              >
                Đóng hàng đợi
              </button>
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
