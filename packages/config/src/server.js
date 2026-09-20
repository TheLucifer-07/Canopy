/**
 * @canopy/config/server — server-only configuration
 *
 * This file MUST NEVER be imported by browser code (apps/web).
 * It reads process.env at import time and validates required variables.
 *
 * Do not import from VITE_ prefixed env vars — those are browser-only.
 */

function requireEnv(name) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value || '';
}

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const xaiApiKey = process.env.XAI_API_KEY || '';

const SUPPORTED_MODELS = Object.freeze({
  geminiImage: new Set([
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image'
  ]),
  geminiVision: new Set([
    'gemini-3-flash',
    'gemini-3-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
  ]),
  geminiEmbedding: new Set([
    'gemini-embedding-2',
    'gemini-embedding-001'
  ]),
  grokText: new Set([
    'grok-4.6'
  ])
});

function isConfiguredModel(value, supported) {
  return Boolean(value) && supported.has(value);
}

const geminiImageModel = process.env.GEMINI_IMAGE_MODEL || '';
const geminiVisionModel = process.env.GEMINI_VISION_MODEL || '';
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || '';
const grokReasoningModel = process.env.GROK_REASONING_MODEL || '';
const grokSummaryModel = process.env.GROK_SUMMARY_MODEL || '';

export const serverConfig = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || process.env.PORT || '3000', 10),
  host: process.env.API_HOST || process.env.HOST || '0.0.0.0',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  supabase: {
    url: requireEnv('SUPABASE_URL'),
    anonKey: requireEnv('SUPABASE_ANON_KEY'),
    // !! SERVICE ROLE — only available in server context, never exposed to browser
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'canopy-assets'
  },

  ai: {
    // Future AI phases; not required for the Phase 1 Core lifecycle.
    geminiApiKey: geminiApiKey || null,
    geminiConfigured: Boolean(geminiApiKey),
    geminiImageModel,
    geminiImageConfigured: Boolean(geminiApiKey) && isConfiguredModel(geminiImageModel, SUPPORTED_MODELS.geminiImage),
    geminiVisionModel,
    geminiVisionConfigured: Boolean(geminiApiKey) && isConfiguredModel(geminiVisionModel, SUPPORTED_MODELS.geminiVision),
    geminiEmbeddingModel,
    geminiEmbeddingConfigured: Boolean(geminiApiKey) && isConfiguredModel(geminiEmbeddingModel, SUPPORTED_MODELS.geminiEmbedding),
    xaiApiKey: xaiApiKey || null,
    xaiConfigured: Boolean(xaiApiKey),
    xaiBaseUrl: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
    grokReasoningModel,
    grokReasoningConfigured: Boolean(xaiApiKey) && isConfiguredModel(grokReasoningModel, SUPPORTED_MODELS.grokText),
    grokSummaryModel,
    grokSummaryConfigured: Boolean(xaiApiKey) && isConfiguredModel(grokSummaryModel, SUPPORTED_MODELS.grokText),
    dailyCostLimit: process.env.AI_DAILY_COST_LIMIT || '',
    dailyTokenLimit: process.env.AI_DAILY_TOKEN_LIMIT || '',
    supportedModels: SUPPORTED_MODELS
  }
});
