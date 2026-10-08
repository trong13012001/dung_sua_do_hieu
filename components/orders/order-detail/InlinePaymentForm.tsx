'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useProcessPayment } from '@/api/payments';
import type { Order, Payment } from '@/lib/types';
import { onlyDigits, validateNumber } from '@/lib/validation';
import { errorMessage } from '@/lib/utils';
import { formatNumber, formatVnd } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/common/FormField';

type Method = Payment['payment_method'];

const METHODS: { value: Method; label: string }[] = [
  { value: 'Cash', label: 'Tiền mặt' },
  { value: 'Card', label: 'Thẻ' },
  { value: 'Transfer', label: 'Chuyển khoản' },
];

function MethodSelect({ id, value, onChange }: { id: string; value: Method; onChange: (v: Method) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Method)}>
      <SelectTrigger id={id} className="w-full bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {METHODS.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const parsePositive = (s: string) => {
  const n = Number(s.trim());
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Thu tiền ngay trong modal chi tiết đơn. Giữ state riêng — gõ số tiền không render lại cả modal.
 * Trang gọi đổi `key` theo số tiền đã thu, nên sau mỗi lần thu form tự điền lại "còn nợ" mới.
 * `initialMethod` = phương thức vừa dùng (nhớ giữa các lần thu như trước).
 */
export function InlinePaymentForm({
  order,
  currentUserId,
  initialMethod,
  onPaid,
}: {
  order: Order;
  currentUserId: string | null;
  initialMethod: Method;
  onPaid: (method: Method) => void;
}) {
  const debt = Math.max(0, order.total_amount - (order.paid_amount ?? 0));
  const { mutateAsync: processPayment, isPending } = useProcessPayment();
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(debt > 0 ? String(debt) : '');
  const [method, setMethod] = useState<Method>(initialMethod);
  const [splitPay, setSplitPay] = useState(false);
  const [amount2, setAmount2] = useState('');
  const [method2, setMethod2] = useState<Method>('Transfer');

  const thisPayment = useMemo(
    () => parsePositive(amount) + (splitPay ? parsePositive(amount2) : 0),
    [amount, amount2, splitPay],
  );
  const remainingAfter = Math.max(0, debt - thisPayment);

  const pay = (amt: number, m: Method) =>
    processPayment({ order_id: order.id, amount: amt, payment_method: m, updated_by: currentUserId ?? undefined });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (splitPay) {
      const err =
        validateNumber(amount, { min: 1, fieldName: 'Số tiền khoản 1' }) ||
        validateNumber(amount2, { min: 1, fieldName: 'Số tiền khoản 2' });
      if (err) {
        toast.error(err);
        return;
      }
      if (Number(amount) + Number(amount2) > debt + 0.01) {
        toast.error(`Tổng hai khoản không được vượt còn lại (${formatNumber(debt)}đ).`);
        return;
      }
    } else {
      const err = validateNumber(amount, { min: 1, fieldName: 'Số tiền thanh toán' });
      if (err) {
        toast.error(err);
        return;
      }
    }
    setBusy(true);
    try {
      await pay(Number(amount), method);
      if (splitPay) await pay(Number(amount2), method2);
      toast.success('Đã ghi nhận thanh toán.');
      // Chia hai khoản thì lần sau quay về Tiền mặt như trước; một khoản thì nhớ phương thức vừa dùng.
      onPaid(splitPay ? 'Cash' : method);
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitting = isPending || busy;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Ghi nhận tiền đã thu. Khi đủ tiền, hệ thống tự cập nhật trạng thái thanh toán; nếu đơn đang Trả thiếu tiền, có
        thể chuyển sang Đã trả đồ sau khi thu đủ.
      </p>
      <div className="space-y-1.5 rounded-lg border border-border bg-card p-3 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Còn nợ hiện tại</span>
          <span className="font-bold text-primary">{formatVnd(debt)}</span>
        </div>
        {thisPayment > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sau lần này (dự kiến)</span>
            <span className="font-bold">{formatVnd(remainingAfter)}</span>
          </div>
        )}
      </div>

      <label
        htmlFor="order-detail-split-pay"
        className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card p-2.5"
      >
        <Checkbox
          id="order-detail-split-pay"
          checked={splitPay}
          onCheckedChange={(c) => setSplitPay(c === true)}
          className="mt-0.5"
        />
        <span className="text-[11px] leading-snug text-muted-foreground">
          <span className="font-bold text-foreground">Chia nhiều phương thức</span>
          {' — '}ghi hai khoản trong một lần (vd. một phần tiền mặt, một phần chuyển khoản).
        </span>
      </label>

      <FormField label={splitPay ? 'Khoản 1 — số tiền' : 'Số tiền thu'} htmlFor="detail-pay-amount">
        <Input
          id="detail-pay-amount"
          required
          inputMode="numeric"
          className="bg-card"
          value={amount}
          onChange={(e) => setAmount(onlyDigits(e.target.value))}
        />
      </FormField>
      <FormField label={splitPay ? 'Khoản 1 — phương thức' : 'Phương thức'} htmlFor="detail-pay-method">
        <MethodSelect id="detail-pay-method" value={method} onChange={setMethod} />
      </FormField>
      {splitPay && (
        <>
          <FormField label="Khoản 2 — số tiền" htmlFor="detail-pay-amount-2">
            <Input
              id="detail-pay-amount-2"
              required
              inputMode="numeric"
              className="bg-card"
              value={amount2}
              onChange={(e) => setAmount2(onlyDigits(e.target.value))}
            />
          </FormField>
          <FormField label="Khoản 2 — phương thức" htmlFor="detail-pay-method-2">
            <MethodSelect id="detail-pay-method-2" value={method2} onChange={setMethod2} />
          </FormField>
        </>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Đang xử lý...' : 'Ghi nhận thanh toán'}
      </Button>
    </form>
  );
}
