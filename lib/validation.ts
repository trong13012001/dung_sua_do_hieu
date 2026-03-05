/**
 * Text input validation helpers. Returns error message (Vietnamese) or null if valid.
 */

export function validateRequired(value: string | undefined | null, fieldName = 'Trường này'): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length === 0) return `${fieldName} không được để trống`;
  return null;
}

export function validateMinLength(value: string | undefined | null, min: number, fieldName = 'Trường này'): string | null {
  const v = typeof value === 'string' ? value : '';
  if (v.length > 0 && v.length < min) return `${fieldName} tối thiểu ${min} ký tự`;
  return null;
}

export function validateMaxLength(value: string | undefined | null, max: number, fieldName = 'Trường này'): string | null {
  const v = typeof value === 'string' ? value : '';
  if (v.length > max) return `${fieldName} tối đa ${max} ký tự`;
  return null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateEmail(value: string | undefined | null): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length === 0) return 'Email không được để trống';
  if (!EMAIL_REGEX.test(v)) return 'Email không hợp lệ';
  return null;
}

/** Vietnamese phone: 10–11 digits, optional leading 0 */
const PHONE_REGEX = /^0?\d{9,10}$/;
export function validatePhone(value: string | undefined | null, required = false): string | null {
  const v = typeof value === 'string' ? value.trim().replaceAll(/\s/g, '') : '';
  if (v.length === 0) return required ? 'Số điện thoại không được để trống' : null;
  if (!PHONE_REGEX.test(v)) return 'Số điện thoại không hợp lệ (9–10 chữ số)';
  return null;
}

export function validateNumber(value: string | number | undefined | null, options: { min?: number; max?: number; required?: boolean; fieldName?: string } = {}): string | null {
  const { min, max, required = true, fieldName = 'Giá trị' } = options;
  const raw = value === undefined || value === null ? '' : String(value).trim();
  if (raw.length === 0) return required ? `${fieldName} không được để trống` : null;
  const num = Number(raw);
  if (Number.isNaN(num)) return `${fieldName} phải là số`;
  if (min !== undefined && num < min) return `${fieldName} tối thiểu ${min}`;
  if (max !== undefined && num > max) return `${fieldName} tối đa ${max}`;
  return null;
}

export function validatePassword(value: string | undefined | null, minLength = 6): string | null {
  const v = typeof value === 'string' ? value : '';
  if (v.length === 0) return 'Mật khẩu không được để trống';
  if (v.length < minLength) return `Mật khẩu tối thiểu ${minLength} ký tự`;
  return null;
}

/** Run validators in order; return first error or null */
export function firstError(...results: (string | null)[]): string | null {
  for (const r of results) {
    if (r != null) return r;
  }
  return null;
}
