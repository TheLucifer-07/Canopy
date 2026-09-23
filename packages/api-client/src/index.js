/**
 * @canopy/api-client
 * Typed HTTP client for the Canopy REST API (/v1).
 * Used by: apps/web, services/mcp, automated tests.
 *
 * Phase 1: Project, Version, Asset, Memory, and Lineage endpoints.
 */

export class CanopyApiClient {
  constructor({ baseUrl = 'http://localhost:3000/v1', token = null } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  setToken(token) {
    this.token = token;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
      Accept: 'application/json',
      ...options.headers
    };

    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = data?.error || {
        code: 'HTTP_ERROR',
        message: `Request failed with status ${response.status}`
      };
      throw Object.assign(new Error(error.message), { error, status: response.status });
    }

    return data;
  }

  async getHealth() {
    return this.request('/health');
  }

  async register({ email, password, display_name = null }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name })
    });
  }

  async login({ email, password }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async createProject(input) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async listProjects(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null));
    return this.request(`/projects${params.size ? `?${params}` : ''}`);
  }

  async getProject(projectId) {
    return this.request(`/projects/${projectId}`);
  }

  async updateProject(projectId, input) {
    return this.request(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  async archiveProject(projectId) {
    return this.request(`/projects/${projectId}`, { method: 'DELETE' });
  }

  async listTokens() {
    return this.request('/me/tokens');
  }

  async createToken(input) {
    return this.request('/me/tokens', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async revokeToken(tokenId) {
    return this.request(`/me/tokens/${tokenId}`, { method: 'DELETE' });
  }

  // ── Phase 11: Profile & Activity ───────────────────────────────────────────
  async getProfile() {
    return this.request('/me/profile');
  }

  async updateProfile(input) {
    return this.request('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  async getActivity(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null));
    return this.request(`/me/activity${params.size ? `?${params}` : ''}`);
  }

  // ── Phase 12: Notifications ────────────────────────────────────────────────
  async listNotifications(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null));
    return this.request(`/me/notifications${params.size ? `?${params}` : ''}`);
  }

  async getUnreadNotificationCount() {
    return this.request('/me/notifications/unread-count');
  }

  async markNotificationRead(notificationId) {
    return this.request(`/me/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  async markAllNotificationsRead() {
    return this.request('/me/notifications/mark-all-read', {
      method: 'POST'
    });
  }

  // ── Phase 12: Saved Items ──────────────────────────────────────────────────
  async listSavedItems(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null));
    return this.request(`/me/saved-items${params.size ? `?${params}` : ''}`);
  }

  async saveItem(input) {
    return this.request('/me/saved-items', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async unsaveItem(savedItemId) {
    return this.request(`/me/saved-items/${savedItemId}`, {
      method: 'DELETE'
    });
  }

  // ── Phase 13: Settings ─────────────────────────────────────────────────────
  async getSettings() {
    return this.request('/me/settings');
  }

  async updateSettings(input) {
    return this.request('/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  // ── Phase 14: Security ─────────────────────────────────────────────────────
  async getSecurityStatus() {
    return this.request('/me/security');
  }

  async forkProject(projectId, input) {
    return this.request(`/projects/${projectId}/fork`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async importVersion(projectId, input) {
    return this.request(`/projects/${projectId}/versions/import`, {
      method: 'POST',
      headers: input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {},
      body: JSON.stringify({
        asset_id: input.asset_id,
        label: input.label,
        note: input.note
      })
    });
  }

  async commitVersion(projectId, input, { idempotencyKey } = {}) {
    return this.request(`/projects/${projectId}/versions`, {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(input)
    });
  }

  async continueFrom(versionId) {
    return this.request(`/versions/${versionId}/continue`, { method: 'POST' });
  }

  async mergeVersions(projectId, input, { idempotencyKey } = {}) {
    return this.request(`/projects/${projectId}/merge`, {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(input)
    });
  }

  async getLineage(projectId) {
    return this.request(`/projects/${projectId}/lineage`);
  }

  async listProjectVersions(projectId) {
    return this.request(`/projects/${projectId}/versions`);
  }

  async getVersion(versionId) {
    return this.request(`/versions/${versionId}`);
  }

  async listProjectAssets(projectId) {
    return this.request(`/projects/${projectId}/assets`);
  }

  async getAsset(assetId) {
    return this.request(`/assets/${assetId}`);
  }

  async getAssetUrl(assetId) {
    return this.request(`/assets/${assetId}/url`);
  }

  async uploadAsset(projectId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/projects/${projectId}/assets`, {
      method: 'POST',
      body: formData
    });
  }

  async createMemory(projectId, input) {
    return this.request(`/projects/${projectId}/memories`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async proposeMemory(projectId, input) {
    return this.request(`/projects/${projectId}/memories/propose`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async listMemories(projectId, query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null));
    return this.request(`/projects/${projectId}/memories${params.size ? `?${params}` : ''}`);
  }

  async getMemory(memoryId) {
    return this.request(`/memories/${memoryId}`);
  }

  async searchHistory(projectId, query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null));
    return this.request(`/projects/${projectId}/history/search${params.size ? `?${params}` : ''}`);
  }

  async editMemory(memoryId, input) {
    return this.request(`/memories/${memoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  }

  async confirmMemory(memoryId) {
    return this.request(`/memories/${memoryId}/confirm`, { method: 'POST' });
  }

  async archiveMemory(memoryId) {
    return this.request(`/memories/${memoryId}/archive`, { method: 'POST' });
  }

  async createDiff(input) {
    return this.request('/diffs', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async listCopilotConversations(projectId) {
    return this.request(`/projects/${projectId}/copilot/conversations`);
  }

  async getCopilotConversation(conversationId) {
    return this.request(`/copilot/conversations/${conversationId}`);
  }

  async streamCopilot(projectId, input, { signal, onEvent } = {}) {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/copilot/messages`, {
      method: 'POST',
      signal,
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw Object.assign(new Error(data?.error?.message || `Request failed with status ${response.status}`), { status: response.status, error: data?.error });
    }
    if (!response.body) throw new Error('Copilot stream is unavailable.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const chunk of events) {
        const event = chunk.match(/^event: (.+)$/m)?.[1];
        const data = chunk.match(/^data: (.+)$/m)?.[1];
        if (event && data) onEvent?.(event, JSON.parse(data));
      }
      if (done) break;
    }
  }
}
