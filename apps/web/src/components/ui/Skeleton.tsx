'use client';

import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'pill' | 'full';
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: SkeletonProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    pill: 'rounded-pill',
    full: 'rounded-full',
  };

  return (
    <div
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      className={`bg-raised/60 border border-line animate-shimmer ${roundedClasses[rounded]} ${className}`}
      aria-hidden="true"
    />
  );
}