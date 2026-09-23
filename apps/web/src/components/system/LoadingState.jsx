import React from 'react';
import { LoadingState as UiLoadingState } from '@canopy/ui';

export function LoadingState({
  label = 'Loading...',
  className = '',
  fullscreen = false
}) {
  if (fullscreen) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canopy-bg">
        <UiLoadingState label={label} className={className} />
      </div>
    );
  }

  return <UiLoadingState label={label} className={className} />;
}
