'use client';

import React, { useState } from 'react';
import { Key, Edit2, Trash2, Plus } from 'lucide-react';
import { usePermissions, useCreatePermission, useUpdatePermission, useDeletePermission } from '@/api/permissions';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { Permission } from '@/lib/types';

export default function PermissionsPage() {
  const { data: permissions, isLoading } = usePermissions();
  const createPerm = useCreatePermission();
  const updatePerm = useUpdatePermission();
  const deletePerm = useDeletePermission();
  const { toast, showToast, hideToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [deletingPerm, setDeletingPerm] = useState<Permission | null>(null);
  const [permName, setPermName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPerm.mutateAsync(permName);
      setIsAdding(false);
      setPermName('');
      showToast('Tạo quyền thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerm) return;
    try {
      await updatePerm.mutateAsync({ id: editingPerm.id, name: permName });
      setEditingPerm(null);
      setPermName('');
      showToast('Cập nhật quyền thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deletingPerm) return;
    try {
      await deletePerm.mutateAsync(deletingPerm.id);
      setDeletingPerm(null);
      showToast('Xóa quyền thành công', 'success');
    } catch (err: any) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h4 className="text-lg md:text-xl font-bold text-foreground">Quản lý quyền hạn</h4>
        <button onClick={() => { setIsAdding(true); setPermName(''); }} className="w-full sm:w-auto btn-primary px-5 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2"><Plus size={16} /> Thêm quyền</button>
      </div>

      <div className="vuexy-card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Tên quyền</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-6 py-6 bg-muted/10" /></tr>)
              ) : permissions && permissions.length > 0 ? (
                permissions.map(perm => (
                  <tr key={perm.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">#{perm.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2"><Key size={14} className="text-primary" /><span className="font-medium text-foreground">{perm.name}</span></div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(perm.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingPerm(perm); setPermName(perm.name); }} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => setDeletingPerm(perm)} className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">Chưa có quyền hạn nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4 h-16 animate-pulse bg-muted/10" />)
          ) : permissions && permissions.length > 0 ? (
            permissions.map(perm => (
              <div key={perm.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary"><Key size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{perm.name}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {perm.id}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingPerm(perm); setPermName(perm.name); }} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"><Edit2 size={14} /></button>
                  <button onClick={() => setDeletingPerm(perm)} className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground italic text-sm">Chưa có quyền hạn nào.</div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isAdding || !!editingPerm} onClose={() => { setIsAdding(false); setEditingPerm(null); }} title={editingPerm ? 'Sửa quyền' : 'Thêm quyền'}>
        <form onSubmit={editingPerm ? handleUpdate : handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">Tên quyền</label>
            <input required placeholder="vd: manage_inventory" className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm" value={permName} onChange={e => setPermName(e.target.value)} />
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => { setIsAdding(false); setEditingPerm(null); }} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Hủy</button>
            <button type="submit" disabled={createPerm.isPending || updatePerm.isPending} className="flex-1 btn-primary py-2.5 rounded-md font-bold text-sm disabled:opacity-50">
              {(createPerm.isPending || updatePerm.isPending) ? 'Đang lưu...' : editingPerm ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deletingPerm} onClose={() => setDeletingPerm(null)} title="Xóa quyền">
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">Bạn có chắc chắn muốn xóa quyền <span className="font-bold text-foreground">{deletingPerm?.name}</span>?</p>
          <div className="flex gap-4">
            <button onClick={() => setDeletingPerm(null)} className="flex-1 bg-muted/40 text-foreground py-2.5 rounded-md font-bold text-sm border border-border">Giữ lại</button>
            <button onClick={handleDelete} disabled={deletePerm.isPending} className="flex-1 bg-danger text-white hover:bg-danger/90 py-2.5 rounded-md font-bold text-sm disabled:opacity-50">
              {deletePerm.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
