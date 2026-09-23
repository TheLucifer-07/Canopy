import React from 'react';
import { ApiKeysManager } from '../../developers/components/ApiKeysManager.jsx';

export function ApiTokensSettings({ api }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Personal Access Tokens</h2>
        <p className="text-xs text-canopy-secondary mt-1">
          Manage secure PAT machine credentials for authenticating MCP clients, scripts, and external tools with your Canopy account.
        </p>
      </div>

      <ApiKeysManager api={api} />
    </div>
  );
}
