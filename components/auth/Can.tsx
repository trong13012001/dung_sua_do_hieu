'use client';

import React from 'react';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only if the current user has the given permission.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { has } = useCurrentUserPermissions();
  return has(permission) ? <>{children}</> : <>{fallback}</>;
}
