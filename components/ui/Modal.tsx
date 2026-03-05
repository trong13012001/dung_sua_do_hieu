'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-card border border-border rounded-none md:rounded-lg p-5 md:p-8 w-full ${maxWidth} max-h-[90vh] md:max-h-[88vh] shadow-2xl relative animate-in slide-in-from-bottom-4 duration-200 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10 shrink-0"
        >
          <X size={20} />
        </button>

        <h3 className="text-base md:text-xl font-bold text-foreground mb-4 pr-10 uppercase tracking-widest shrink-0">{title}</h3>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
