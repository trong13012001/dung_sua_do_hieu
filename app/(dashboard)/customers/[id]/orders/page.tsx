'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ShoppingBag,
  Calendar,
  Clock,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Search,
  Receipt
} from 'lucide-react';
import { useGetCustomerOrders } from '@/hooks/customer/useGetCustomerOrders';
import { useGetCustomerDetail } from '@/hooks/customer/useGetCustomerDetail';
import { OrderDetailModal } from '@/components/ui/OrderDetailModal';
import { Order } from '@/lib/types';

export default function CustomerOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = params.id as string;

  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomerDetail(customerId);
  const { data: orders, isLoading: isLoadingOrders } = useGetCustomerOrders(customerId);

  const selectedOrderId = searchParams.get('orderId');

  const handleBack = () => {
    router.push('/customers');
  };

  const handleViewDetails = (orderId: number) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('orderId', orderId.toString());
    router.push(`?${newParams.toString()}`);
  };

  const closeOrderDetail = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('orderId');
    router.push(`?${newParams.toString()}`);
  };

  if (isLoadingCustomer) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={handleBack}
            className="p-1.5 md:p-2 rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h4 className="text-lg md:text-xl font-bold text-foreground">Lịch sử đơn hàng</h4>
            <p className="text-xs md:text-sm text-muted-foreground">Khách hàng: <span className="font-bold text-primary">{customer?.name}</span></p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-success/10 text-success px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-success/20 flex items-center gap-2">
            <Receipt size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">Tổng đơn: {orders?.length || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-2 md:px-0">
        {/* Customer Info Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="vuexy-card p-4 md:p-6">
            <h5 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 md:mb-6 flex items-center gap-2">
              <User size={12} className="md:w-[14px] md:h-[14px]" /> Thông tin khách hàng
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <User size={14} className="md:w-[16px] md:h-[16px]" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">Họ tên</p>
                  <p className="text-xs md:text-sm font-bold text-foreground">{customer?.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Phone size={14} className="md:w-[16px] md:h-[16px]" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">Số điện thoại</p>
                  <p className="text-xs md:text-sm font-bold text-foreground">{customer?.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin size={14} className="md:w-[16px] md:h-[16px]" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase">Địa chỉ</p>
                  <p className="text-xs md:text-sm font-bold text-foreground truncate max-w-[150px] sm:max-w-none">{customer?.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List Content */}
        <div className="lg:col-span-3 space-y-4">
          {isLoadingOrders ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="vuexy-card h-32 animate-pulse"></div>
            ))
          ) : orders && orders.length > 0 ? (
            orders.map((order: Order) => (
              <div
                key={order.id}
                className="vuexy-card p-4 md:p-5 border border-border hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleViewDetails(order.id)}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                      <ShoppingBag size={20} className="md:w-[24px] md:h-[24px]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 md:gap-3">
                        <h6 className="font-bold text-foreground md:text-lg">#{order.id}</h6>
                        <span className={`px-2 py-0.5 rounded text-[9px] md:text-[10px] font-black uppercase tracking-widest
                          ${order.status === 'New' ? 'bg-info/10 text-info' :
                            order.status === 'In Progress' ? 'bg-warning/10 text-warning' :
                              order.status === 'Ready' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'}`}>
                          {order.status === 'New' ? 'Mới' :
                            order.status === 'In Progress' ? 'Đang làm' :
                              order.status === 'Ready' ? 'Đã xong' : 'Đã giao'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar size={12} className="text-primary md:w-[14px] md:h-[14px]" />
                          {new Date(order.receive_time).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={12} className="text-primary md:w-[14px] md:h-[14px]" />
                          {new Date(order.receive_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-none pt-2 sm:pt-0 mt-1 sm:mt-0">
                    <p className="text-base md:text-lg font-black text-foreground">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}
                    </p>
                    <div className="text-[9px] md:text-[10px] font-bold text-muted-foreground mt-0.5 md:mt-1 uppercase tracking-widest flex items-center justify-start sm:justify-end gap-1">
                      {order.paid_amount >= order.total_amount ? (
                        <span className="text-success flex items-center gap-1 font-black">
                          Đã thanh toán <ChevronRight size={10} className="rotate-90 hidden sm:block" />
                        </span>
                      ) : (
                        <span className="text-warning flex items-center gap-1 font-black">
                          Còn nợ: {new Intl.NumberFormat('vi-VN').format(order.total_amount - (order.paid_amount || 0))}đ
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <div className="flex gap-2">
                    {order.details && order.details.slice(0, 3).map((detail, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-1 bg-muted/30 rounded border border-border font-medium text-muted-foreground">
                        {detail.item_name}
                      </span>
                    ))}
                    {order.details && order.details.length > 3 && (
                      <span className="text-[10px] px-2 py-1 bg-muted/30 rounded border border-border font-medium text-muted-foreground">
                        +{order.details.length - 3} nữa
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                    Chi tiết <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="vuexy-card p-20 text-center flex flex-col items-center justify-center gap-4 bg-transparent border-2 border-dashed border-border shadow-none">
              <ShoppingBag size={48} className="text-muted-foreground opacity-20" />
              <p className="text-muted-foreground font-medium italic">Không tìm thấy đơn hàng nào cho khách hàng này.</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={closeOrderDetail}
        orderId={selectedOrderId}
      />
    </div>
  );
}
