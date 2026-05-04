'use client';

import React from 'react';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';

interface CanProps {
  /** Một quyền cụ thể (hành vi mặc định). */
  permission?: string;
  /** Ít nhất một quyền trong danh sách (OR) — dùng khi trùng với `canAccessRoute`. */
  anyOf?: readonly string[] | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children if the user has `permission`, or if `anyOf` is set, any listed permission.
 */
export function Can({
  permission,
  anyOf,
  children,
  fallback = null,
}: CanProps) {
  const { has } = useCurrentUserPermissions();
  const fromAny = anyOf != null && anyOf.some((name) => has(name));
  const fromSingle = permission != null && has(permission);
  const allowed = fromAny || fromSingle;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
