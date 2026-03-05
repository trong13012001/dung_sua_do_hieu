'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Phone,
  CircleUser,
  Trash2,
  Edit2,
  MapPin,
  CreditCard,
  Mail,
  KeyRound
} from 'lucide-react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useResetEmployeePassword } from '@/api/users';
import { useRoles } from '@/api/roles';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { User, Role } from '@/lib/types';
import { validateRequired, validateEmail, validatePassword, validatePhone } from '@/lib/validation';

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const { data: roles } = useRoles();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const resetPassword = useResetEmployeePassword();
  const { toast, showToast, hideToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [editingEmp, setEditingEmp] = useState<(User & { role: Role | null }) | null>(null);
  const [deletingEmp, setDeletingEmp] = useState<(User & { role: Role | null }) | null>(null);
  const [resettingEmp, setResettingEmp] = useState<(User & { role: Role | null }) | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '', email: '', password: '', phone: '', address: '', id_card: '', role_id: 1,
  });
  const [editForm, setEditForm] = useState({
    name: '', phone: '', address: '', id_card: '', role_id: 1,
  });

  const openAdd = () => {
    setCreateForm({ name: '', email: '', password: '', phone: '', address: '', id_card: '', role_id: roles?.[0]?.id || 1 });
    setIsAdding(true);
  };

  const openEdit = (emp: User & { role: Role | null }) => {
    setEditForm({ name: emp.name, phone: emp.phone || '', address: emp.address || '', id_card: emp.id_card || '', role_id: emp.role_id || 1 });
    setEditingEmp(emp);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateRequired(createForm.name, 'Họ và tên');
    const emailErr = validateEmail(createForm.email);
    const passwordErr = validatePassword(createForm.password, 6);
    const phoneErr = validatePhone(createForm.phone, false);
    const err = nameErr || emailErr || passwordErr || phoneErr;
    if (err) { showToast(err, 'error'); return; }
    try {
      const { password, ...employeeData } = createForm;
      await createEmployee.mutateAsync({ employee: { ...employeeData, name: employeeData.name.trim(), phone: employeeData.phone?.trim() || undefined, address: employeeData.address?.trim() || undefined, id_card: employeeData.id_card?.trim() || undefined }, password });
      setIsAdding(false);
      showToast('Tạo tài khoản nhân viên thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    const nameErr = validateRequired(editForm.name, 'Họ và tên');
    const phoneErr = validatePhone(editForm.phone, false);
    const err = nameErr || phoneErr;
    if (err) { showToast(err, 'error'); return; }
    try {
      await updateEmployee.mutateAsync({ id: editingEmp.id, employee: { ...editForm, name: editForm.name.trim(), phone: editForm.phone?.trim() || undefined, address: editForm.address?.trim() || undefined, id_card: editForm.id_card?.trim() || undefined } });
      setEditingEmp(null);
      showToast('Cập nhật nhân viên thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deletingEmp) return;
    try {
      await deleteEmployee.mutateAsync(deletingEmp.id);
      setDeletingEmp(null);
      showToast('Xóa nhân viên thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleResetPassword = async () => {
    if (!resettingEmp?.email) { showToast('Nhân viên này chưa có email', 'error'); setResettingEmp(null); return; }
    try {
      await resetPassword.mutateAsync(resettingEmp.email);
      setResettingEmp(null);
      showToast('Đã gửi email đặt lại mật khẩu', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const inputClass = "w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm";
  const labelClass = "text-[11px] font-bold text-muted-foreground uppercase opacity-80";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Quản lý nhân viên</h4>
        <button onClick={openAdd} className="w-full sm:w-auto btn-primary px-5 py-2 rounded-md font-bold text-sm">Tạo tài khoản</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="vuexy-card h-56 animate-pulse" />)
        ) : employees && employees.length > 0 ? (
          employees.map((emp) => (
            <div key={emp.id} className="vuexy-card p-4 md:p-6 flex flex-col items-center text-center relative group hover:-translate-y-1 transition-transform">
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(emp)} className="p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Sửa"><Edit2 size={14} /></button>
                {emp.email && (
                  <button onClick={() => setResettingEmp(emp)} className="p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors" title="Đặt lại mật khẩu"><KeyRound size={14} /></button>
                )}
                <button onClick={() => setDeletingEmp(emp)} className="p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors" title="Xóa"><Trash2 size={14} /></button>
              </div>

              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 border-2 border-primary/20">
                <CircleUser size={40} className="md:w-12 md:h-12" />
              </div>

              <h5 className="text-base md:text-lg font-bold text-foreground">{emp.name}</h5>
              <div className="mt-1 flex items-center gap-1.5 px-3 py-0.5 bg-primary/10 text-primary rounded-md text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck size={14} />
                {emp.role?.name}
              </div>

              <div className="mt-4 w-full space-y-1.5 text-xs text-foreground/70 font-medium">
                {emp.email && <div className="flex items-center justify-center gap-2"><Mail size={13} className="text-primary" /><span className="truncate max-w-[180px]">{emp.email}</span></div>}
                <div className="flex items-center justify-center gap-2"><Phone size={13} className="text-primary" />{emp.phone || 'N/A'}</div>
                {emp.address && <div className="flex items-center justify-center gap-2"><MapPin size={13} className="text-primary" />{emp.address}</div>}
                {emp.id_card && <div className="flex items-center justify-center gap-2"><CreditCard size={13} className="text-primary" />{emp.id_card}</div>}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-muted-foreground bg-transparent border-2 border-dashed border-border rounded-lg italic">Chưa có nhân viên nào.</div>
        )}
      </div>

      {/* Create Account Modal */}
      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Tạo tài khoản nhân viên" maxWidth="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1.5"><label className={labelClass}>Họ và tên *</label><input required placeholder="Nguyễn Văn A" className={inputClass} value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className={labelClass}>Email đăng nhập *</label><input required type="email" placeholder="nhanvien@email.com" className={inputClass} value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div>
            <div className="space-y-1.5"><label className={labelClass}>Mật khẩu ban đầu *</label><input required type="password" minLength={6} placeholder="Tối thiểu 6 ký tự" className={inputClass} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className={labelClass}>Số điện thoại</label><input placeholder="091..." className={inputClass} value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><label className={labelClass}>Vai trò *</label><select className={inputClass + ' appearance-none'} value={createForm.role_id} onChange={e => setCreateForm({ ...createForm, role_id: Number(e.target.value) })}>{roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className={labelClass}>Địa chỉ</label><input placeholder="Hà Nội" className={inputClass} value={createForm.address} onChange={e => setCreateForm({ ...createForm, address: e.target.value })} /></div>
            <div className="space-y-1.5"><label className={labelClass}>CMND/CCCD</label><input placeholder="001..." className={inputClass} value={createForm.id_card} onChange={e => setCreateForm({ ...createForm, id_card: e.target.value })} /></div>
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border hover:bg-muted transition-colors">Hủy</button>
            <button type="submit" disabled={createEmployee.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">{createEmployee.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal isOpen={!!editingEmp} onClose={() => setEditingEmp(null)} title="Sửa thông tin nhân viên" maxWidth="max-w-2xl">
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-1.5"><label className={labelClass}>Họ và tên *</label><input required className={inputClass} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className={labelClass}>Số điện thoại</label><input className={inputClass} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><label className={labelClass}>Vai trò</label><select className={inputClass + ' appearance-none'} value={editForm.role_id} onChange={e => setEditForm({ ...editForm, role_id: Number(e.target.value) })}>{roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className={labelClass}>Địa chỉ</label><input className={inputClass} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></div>
            <div className="space-y-1.5"><label className={labelClass}>CMND/CCCD</label><input className={inputClass} value={editForm.id_card} onChange={e => setEditForm({ ...editForm, id_card: e.target.value })} /></div>
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setEditingEmp(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border hover:bg-muted transition-colors">Hủy</button>
            <button type="submit" disabled={updateEmployee.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">{updateEmployee.isPending ? 'Đang lưu...' : 'Cập nhật'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password */}
      <Modal isOpen={!!resettingEmp} onClose={() => setResettingEmp(null)} title="Đặt lại mật khẩu">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-warning/5 border border-warning/20 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0"><KeyRound size={20} /></div>
            <div><p className="text-sm font-bold text-foreground">{resettingEmp?.name}</p><p className="text-xs text-muted-foreground">{resettingEmp?.email}</p></div>
          </div>
          <p className="text-muted-foreground text-sm">Hệ thống sẽ gửi email đặt lại mật khẩu đến <span className="font-bold text-foreground">{resettingEmp?.email}</span>.</p>
          <div className="flex gap-4">
            <button onClick={() => setResettingEmp(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Hủy</button>
            <button onClick={handleResetPassword} disabled={resetPassword.isPending} className="flex-1 bg-warning text-white hover:bg-warning/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50">{resetPassword.isPending ? 'Đang gửi...' : 'Gửi email đặt lại'}</button>
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal isOpen={!!deletingEmp} onClose={() => setDeletingEmp(null)} title="Xóa nhân viên">
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">Bạn có chắc chắn muốn xóa <span className="font-bold text-foreground">{deletingEmp?.name}</span>?</p>
          <div className="flex gap-4">
            <button onClick={() => setDeletingEmp(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Giữ lại</button>
            <button onClick={handleDelete} disabled={deleteEmployee.isPending} className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50">{deleteEmployee.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
