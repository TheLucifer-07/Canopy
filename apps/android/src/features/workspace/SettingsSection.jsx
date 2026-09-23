import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../../theme/index.js';
import { AppIcon } from '../../components/icons/AppIcon.jsx';

export function SettingsSection({ api, user }) {
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState(null);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdSecret, setCreatedSecret] = useState(null);
  const [tokenToRevokeId, setTokenToRevokeId] = useState(null);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [settRes, secRes, tokRes] = await Promise.all([
        api.getSettings().catch(() => ({ data: {} })),
        api.getSecurityStatus().catch(() => ({ data: {} })),
        api.listTokens().catch(() => ({ data: [] }))
      ]);
      setSettings(settRes.data || settRes);
      setSecurityStatus(secRes.data || secRes);
      setTokens(tokRes.data || tokRes || []);
    } catch (err) {
      setError(err?.message || 'Failed to load security settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [api]);

  async function handleUpdateSettings(patch) {
    setSaving(true);
    setError('');
    try {
      const res = await api.updateSettings(patch);
      setSettings(res.data || res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateToken() {
    if (!newTokenName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.createToken({
        name: newTokenName.trim(),
        scopes: ['projects:read', 'versions:read']
      });
      const data = res.data || res;
      setCreatedSecret(data.token);
      setNewTokenName('');
      const listRes = await api.listTokens().catch(() => ({ data: [] }));
      setTokens(listRes.data || listRes || []);
    } catch (err) {
      setError(err?.message || 'Failed to create token.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmRevokeToken(tokenId, tokenName) {
    setSaving(true);
    setError('');
    try {
      await api.revokeToken(tokenId);
      setTokenToRevokeId(null);
      const listRes = await api.listTokens().catch(() => ({ data: [] }));
      setTokens(listRes.data || listRes || []);
    } catch (err) {
      setError(err?.message || 'Failed to revoke token.');
    } finally {
      setSaving(false);
    }
  }

  const appearance = settings?.appearance || {};
  const preferences = settings?.preferences || {};
  const ai = settings?.ai || {};
  const account = settings?.account || securityStatus?.account || {};

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Platform & Security Settings</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { id: 'account', label: 'Account' },
          { id: 'security', label: 'Security' },
          { id: 'tokens', label: 'Tokens' },
          { id: 'appearance', label: 'Appearance' },
          { id: 'preferences', label: 'Preferences' },
          { id: 'ai', label: 'AI' },
          { id: 'services', label: 'Services' }
        ].map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.green} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.panel}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {saveSuccess ? <Text style={styles.successText}>✓ Settings saved</Text> : null}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Account Email</Text>
              <Text style={styles.fieldValue}>{account.email || user?.email || 'N/A'}</Text>
              <Text style={styles.fieldLabel}>Username</Text>
              <Text style={styles.fieldValue}>@{account.username || 'creator'}</Text>
              <Text style={styles.fieldLabel}>Authentication Method</Text>
              <Text style={styles.fieldValue}>Canopy Signed JWT Bearer</Text>
            </View>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Active Bearer Session</Text>
              <Text style={styles.fieldValue}>User ID: {account.id ? `${account.id.slice(0, 8)}...` : 'Active'}</Text>
              <Text style={styles.fieldNote}>
                Signed cryptographic JWT token valid for 7 days.
              </Text>

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Credential Security</Text>
              <Text style={styles.fieldValue}>Bcrypt Salted Password Hash</Text>

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Two-Factor (2FA) & OAuth</Text>
              <Text style={styles.fieldNote}>
                TOTP 2FA, WebAuthn, and external OAuth identity providers (GitHub, Google, Figma) are not configured in this prototype.
              </Text>
            </View>
          )}

          {/* API Tokens Tab */}
          {activeTab === 'tokens' && (
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Personal Access Tokens (PAT)</Text>
              <TextInput
                value={newTokenName}
                onChangeText={setNewTokenName}
                placeholder="Token name / label"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <Pressable
                disabled={!newTokenName.trim() || saving}
                onPress={handleCreateToken}
                style={[styles.actionBtn, (!newTokenName.trim() || saving) && styles.disabled]}
              >
                <Text style={styles.actionBtnText}>Generate PAT Token</Text>
              </Pressable>

              {createdSecret ? (
                <View style={styles.tokenSecretBox}>
                  <Text style={styles.secretTitle}>Copy your new token now (shown only once):</Text>
                  <Text selectable style={styles.secretValue}>{createdSecret}</Text>
                </View>
              ) : null}

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Existing Tokens ({tokens.length})</Text>
              {tokens.length === 0 ? (
                <Text style={styles.fieldNote}>No tokens created yet.</Text>
              ) : (
                tokens.map((tok) => (
                  <View key={tok.id} style={styles.tokenRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tokenName}>{tok.name}</Text>
                      <Text style={styles.tokenMeta}>
                        {tok.token_prefix ? `${tok.token_prefix}...` : '••••••••'} {tok.revoked_at ? '(Revoked)' : ''}
                      </Text>
                    </View>
                    {!tok.revoked_at && (
                      <Pressable
                        onPress={() => {
                          if (tokenToRevokeId === tok.id) {
                            confirmRevokeToken(tok.id, tok.name);
                          } else {
                            setTokenToRevokeId(tok.id);
                          }
                        }}
                        style={[styles.revokeBtn, tokenToRevokeId === tok.id && styles.revokeBtnConfirm]}
                      >
                        <Text style={styles.revokeBtnText}>
                          {tokenToRevokeId === tok.id ? 'Confirm Revoke' : 'Revoke'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Theme</Text>
              <View style={styles.optionRow}>
                {['canopy-dark', 'system'].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => handleUpdateSettings({ appearance: { theme: t } })}
                    style={[styles.choiceBtn, (appearance.theme || 'canopy-dark') === t && styles.choiceBtnActive]}
                  >
                    <Text style={styles.choiceText}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Layout Density</Text>
              <View style={styles.optionRow}>
                {['comfortable', 'compact'].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => handleUpdateSettings({ appearance: { density: d } })}
                    style={[styles.choiceBtn, (appearance.density || 'comfortable') === d && styles.choiceBtnActive]}
                  >
                    <Text style={styles.choiceText}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Default Landing View</Text>
              <View style={styles.optionRow}>
                {['dashboard', 'projects', 'activity'].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => handleUpdateSettings({ preferences: { default_landing: v } })}
                    style={[styles.choiceBtn, (preferences.default_landing || 'dashboard') === v && styles.choiceBtnActive]}
                  >
                    <Text style={styles.choiceText}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* AI Settings Tab */}
          {activeTab === 'ai' && (
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Copilot Reasoning Style</Text>
              <View style={styles.optionRow}>
                {['strict', 'balanced', 'creative'].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => handleUpdateSettings({ ai: { copilot_groundedness: s } })}
                    style={[styles.choiceBtn, (ai.copilot_groundedness || 'balanced') === s && styles.choiceBtnActive]}
                  >
                    <Text style={styles.choiceText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldNote}>
                AI Engine: Dual Gemini 1.5 & Groq LLaMA 3.3. Server keys are secured internally.
              </Text>
            </View>
          )}

          {/* Connected Services Tab */}
          {activeTab === 'services' && (
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Active Protocol Bridges</Text>
              <Text style={styles.fieldValue}>• Model Context Protocol (MCP v0.1.0)</Text>
              <Text style={styles.fieldValue}>• Dual AI Engine (Gemini + Groq)</Text>
              <Text style={styles.fieldValue}>• Supabase PostgreSQL (pgvector)</Text>
              <Text style={[styles.fieldNote, { marginTop: 8 }]}>
                External OAuth services (GitHub, Figma) are not configured for this prototype.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: theme.spacing.xl },
  headerTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 10 },
  tabRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  tabButton: { borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface },
  tabButtonActive: { borderColor: theme.colors.green, backgroundColor: 'rgba(67, 211, 145, 0.15)' },
  tabText: { color: theme.colors.secondary, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: theme.colors.text },
  panel: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.sm },
  sectionContent: { gap: 8 },
  fieldLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  fieldValue: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  fieldNote: { color: theme.colors.secondary, fontSize: 12, lineHeight: 18 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choiceBtn: { borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.sm, backgroundColor: theme.colors.elevated },
  choiceBtnActive: { borderColor: theme.colors.green, backgroundColor: 'rgba(67, 211, 145, 0.2)' },
  choiceText: { color: theme.colors.text, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  input: { minHeight: 40, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.elevated, borderRadius: theme.radius.sm, color: theme.colors.text, paddingHorizontal: 10, fontSize: 13 },
  actionBtn: { backgroundColor: theme.colors.green, paddingVertical: 10, alignItems: 'center', borderRadius: theme.radius.sm, marginTop: 4 },
  actionBtnText: { color: '#06251A', fontWeight: '800', fontSize: 13 },
  tokenSecretBox: { marginTop: 10, padding: 10, backgroundColor: 'rgba(67, 211, 145, 0.1)', borderWidth: 1, borderColor: theme.colors.green, borderRadius: theme.radius.sm },
  secretTitle: { color: theme.colors.green, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  secretValue: { color: '#fff', fontFamily: 'monospace', fontSize: 12 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 8 },
  tokenName: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  tokenMeta: { color: theme.colors.muted, fontSize: 11, fontFamily: 'monospace' },
  revokeBtn: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.4)', borderRadius: 4 },
  revokeBtnConfirm: { backgroundColor: 'rgba(244, 63, 94, 0.3)', borderColor: '#f43f5e' },
  revokeBtnText: { color: '#f43f5e', fontSize: 11, fontWeight: '700' },
  errorText: { color: '#f43f5e', fontSize: 12, marginBottom: 8 },
  successText: { color: theme.colors.green, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  disabled: { opacity: 0.5 }
});
