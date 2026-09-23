import { useState, useEffect, useCallback } from 'react';

export function useSettings(api) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const fetchSettings = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSettings();
      setSettings(res);
    } catch (err) {
      setError(err.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (payload) => {
    setSaving(true);
    setError(null);
    setSuccess('');
    try {
      const updated = await api.updateSettings(payload);
      setSettings(updated);
      setSuccess('Settings saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    error,
    success,
    refresh: fetchSettings,
    updateSettings
  };
}
