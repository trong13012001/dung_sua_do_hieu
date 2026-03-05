'use client';

import React, { useState } from 'react';
import { Shield, Edit2, Trash2, Plus, Check } from 'lucide-react';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole, useRolePermissions, useSetRolePermissions } from '@/api/roles';
import { usePermissions } from '@/api/permissions';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { Role } from '@/lib/types';

export default function RolesPage() {
  const { data: roles, isLoading } = useRoles();
  const { data: permissions } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const setRolePermissions = useSetRolePermissions();
  const { toast, showToast, hideToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);

  const { data: currentPerms } = useRolePermissions(permRole?.id ?? null);

  const openPermissions = (role: Role) => {
    setPermRole(role);
    setSelectedPerms([]);
  };

  React.useEffect(() => {
    if (currentPerms && permRole) {
      setSelectedPerms(currentPerms.map(rp => rp.permission_id));
    }
  }, [currentPerms, permRole]);

  const togglePerm = (pid: number) => {
    setSelectedPerms(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRole.mutateAsync(roleName);
      setIsAdding(false);
      setRoleName('');
      showToast('Tạo vai trò thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      await updateRole.mutateAsync({ id: editingRole.id, name: roleName });
      setEditingRole(null);
      setRoleName('');
      showToast('Cập nhật vai trò thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    try {
      await deleteRole.mutateAsync(deletingRole.id);
      setDeletingRole(null);
      showToast('Xóa vai trò thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleSavePerms = async () => {
    if (!permRole) return;
    try {
      await setRolePermissions.mutateAsync({ roleId: permRole.id, permissionIds: selectedPerms });
      setPermRole(null);
      showToast('Cập nhật quyền thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Quản lý vai trò</h4>
        <button onClick={() => { setIsAdding(true); setRoleName(''); }} className="w-full sm:w-auto btn-primary px-5 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2"><Plus size={16} /> Thêm vai trò</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="vuexy-card h-32 animate-pulse" />)
        ) : roles && roles.length > 0 ? (
          roles.map(role => (
            <div key={role.id} className="vuexy-card p-5 md:p-6 group hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Shield size={20} /></div>
                  <div>
                    <h5 className="text-base font-bold text-foreground capitalize">{role.name}</h5>
                    <p className="text-[11px] text-muted-foreground">ID: {role.id}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingRole(role); setRoleName(role.name); }} className="p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => setDeletingRole(role)} className="p-1.5 rounded-md bg-muted/50 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <button onClick={() => openPermissions(role)} className="mt-4 w-full bg-muted/40 text-foreground hover:bg-muted py-2 rounded-md text-[11px] font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest border border-border">
                <Shield size={14} /> Phân quyền
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg italic">Chưa có vai trò nào.</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isAdding || !!editingRole} onClose={() => { setIsAdding(false); setEditingRole(null); }} title={editingRole ? 'Sửa vai trò' : 'Thêm vai trò'}>
        <form onSubmit={editingRole ? handleUpdate : handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Tên vai trò</label>
            <input required placeholder="vd: manager" className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm" value={roleName} onChange={e => setRoleName(e.target.value)} />
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => { setIsAdding(false); setEditingRole(null); }} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Hủy</button>
            <button type="submit" disabled={createRole.isPending || updateRole.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">
              {(createRole.isPending || updateRole.isPending) ? 'Đang lưu...' : editingRole ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={!!permRole} onClose={() => setPermRole(null)} title={`Quyền: ${permRole?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Chọn quyền cho vai trò <span className="font-bold text-foreground capitalize">{permRole?.name}</span>:</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {permissions?.map(perm => (
              <label key={perm.id} className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer hover:bg-muted/30 transition-colors">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedPerms.includes(perm.id) ? 'bg-primary border-primary text-white' : 'border-border'}`}>
                  {selectedPerms.includes(perm.id) && <Check size={12} />}
                </div>
                <input type="checkbox" className="hidden" checked={selectedPerms.includes(perm.id)} onChange={() => togglePerm(perm.id)} />
                <span className="text-sm font-medium text-foreground">{perm.name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setPermRole(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Hủy</button>
            <button onClick={handleSavePerms} disabled={setRolePermissions.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">
              {setRolePermissions.isPending ? 'Đang lưu...' : 'Lưu quyền'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deletingRole} onClose={() => setDeletingRole(null)} title="Xóa vai trò">
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">Bạn có chắc chắn muốn xóa vai trò <span className="font-bold text-foreground">{deletingRole?.name}</span>? Tất cả nhân viên thuộc vai trò này sẽ mất liên kết.</p>
          <div className="flex gap-4">
            <button onClick={() => setDeletingRole(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Giữ lại</button>
            <button onClick={handleDelete} disabled={deleteRole.isPending} className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50">
              {deleteRole.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
