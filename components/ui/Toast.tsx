'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="text-success" size={20} />,
    error: <AlertCircle className="text-danger" size={20} />,
    info: <Info className="text-info" size={20} />,
  };

  const bgColors = {
    success: 'bg-success/10 border-success/20',
    error: 'bg-danger/10 border-danger/20',
    info: 'bg-info/10 border-info/20',
  };

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg z-[200] animate-in slide-in-from-right-4 duration-300 ${bgColors[type]}`}>
      {icons[type]}
      <span className="text-sm font-medium text-foreground">{message}</span>
      <button onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
        <X size={16} />
      </button>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  return { toast, showToast, hideToast };
};
