import React from 'react';
import { EmptyState as UiEmptyState } from '@canopy/ui';

export function EmptyState({
  icon = null,
  title,
  description = null,
  action = null,
  className = ''
}) {
  return (
    <UiEmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
