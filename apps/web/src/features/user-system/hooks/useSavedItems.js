import { useState, useEffect, useCallback } from 'react';

export function useSavedItems(api) {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSavedItems = useCallback(async (entityType = null) => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.listSavedItems(entityType ? { entity_type: entityType } : {});
      setSavedItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to load saved items.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const saveItem = async (entityType, entityId, metadata = {}) => {
    try {
      const saved = await api.saveItem({ entity_type: entityType, entity_id: entityId, metadata });
      setSavedItems((prev) => [saved, ...prev.filter((i) => !(i.entity_type === entityType && i.entity_id === entityId))]);
      return saved;
    } catch (err) {
      setError(err.message || 'Failed to save item.');
      throw err;
    }
  };

  const unsaveItem = async (savedItemIdOrEntityId) => {
    try {
      await api.unsaveItem(savedItemIdOrEntityId);
      setSavedItems((prev) => prev.filter((i) => i.id !== savedItemIdOrEntityId && i.entity_id !== savedItemIdOrEntityId));
    } catch (err) {
      setError(err.message || 'Failed to remove saved item.');
      throw err;
    }
  };

  const isSaved = (entityType, entityId) => {
    return savedItems.some((i) => i.entity_type === entityType && i.entity_id === entityId);
  };

  return {
    savedItems,
    loading,
    error,
    refresh: fetchSavedItems,
    saveItem,
    unsaveItem,
    isSaved
  };
}
