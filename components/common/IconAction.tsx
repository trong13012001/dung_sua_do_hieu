'use client';

import { memo, type MouseEventHandler } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const TONE_CLASS = {
  default: 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
  danger: 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
  warning: 'text-muted-foreground hover:bg-warning/10 hover:text-warning',
  success: 'text-muted-foreground hover:bg-success/10 hover:text-success',
  info: 'text-muted-foreground hover:bg-info/10 hover:text-info',
} as const;

/** Nút icon nhỏ ở mỗi dòng (sửa, xoá, in…) — có tooltip và aria-label. */
export const IconAction = memo(function IconAction({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
  disabled,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  tone?: keyof typeof TONE_CLASS;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(TONE_CLASS[tone], className)}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
});
