import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@canopy/ui';

export function SaveButton({ hook, entityType, entityId, metadata = {}, className = '' }) {
  const { isSaved, saveItem, unsaveItem } = hook;
  const [loading, setLoading] = useState(false);

  const saved = isSaved(entityType, entityId);

  const handleToggle = async (e) => {
    e?.stopPropagation?.();
    setLoading(true);
    try {
      if (saved) {
        await unsaveItem(entityId);
      } else {
        await saveItem(entityType, entityId, metadata);
      }
    } catch (err) {
      console.error('Failed to toggle save state:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={saved ? 'Remove from saved items' : 'Save for later'}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-green',
        saved
          ? 'border-canopy-green/60 bg-canopy-green/10 text-canopy-green'
          : 'border-canopy-border text-canopy-secondary hover:border-canopy-green hover:text-white bg-canopy-surface',
        className
      )}
    >
      <Bookmark className={cn('h-3.5 w-3.5', saved ? 'fill-canopy-green text-canopy-green' : 'text-canopy-secondary')} />
      <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
}
