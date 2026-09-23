import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Workspace commands can execute a package with that package as the current
// directory. Resolve the repository-root env file from this server-only module
// so API startup has the same configuration in both invocation styles.
dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  override: false
});

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
const groqApiKey = process.env.GROQ_API_KEY || '';

const SUPPORTED_MODELS = Object.freeze({
  geminiImage: new Set([
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image'
  ]),
  geminiVision: new Set([
    'gemini-3-flash',
    'gemini-3-flash-preview',
    'gemini-3-pro',
    'gemini-3.1-pro-preview',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
  ]),
  geminiEmbedding: new Set([
    'gemini-embedding-2',
    'gemini-embedding-001'
  ]),
  groqText: new Set([
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b'
  ])
});

function isConfiguredModel(value, supported) {
  return Boolean(value) && supported.has(value);
}

const geminiImageModel = process.env.GEMINI_IMAGE_MODEL || '';
const geminiVisionModel = process.env.GEMINI_VISION_MODEL || '';
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || '';
const groqReasoningModel = process.env.GROQ_REASONING_MODEL || '';
const groqSummaryModel = process.env.GROQ_SUMMARY_MODEL || '';

export const serverConfig = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || process.env.PORT || '3000', 10),
  host: process.env.API_HOST || process.env.HOST || '0.0.0.0',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL || '',
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'canopy',
    user: process.env.PGUSER || process.env.USER || 'canopy',
    password: process.env.PGPASSWORD || '',
    ssl: process.env.PGSSL === 'true'
  },
  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET || 'canopy-development-only-change-me',
    tokenTtlSeconds: parseInt(process.env.AUTH_TOKEN_TTL_SECONDS || '604800', 10)
  },
  storage: {
    root: process.env.STORAGE_PATH
      ? resolve(fileURLToPath(new URL('../../../', import.meta.url)), process.env.STORAGE_PATH)
      : resolve(fileURLToPath(new URL('../../../', import.meta.url)), 'storage/data'),
    publicBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/v1'
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
    groqApiKey: groqApiKey || null,
    groqConfigured: Boolean(groqApiKey),
    groqBaseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    groqReasoningModel,
    groqReasoningConfigured: Boolean(groqApiKey) && isConfiguredModel(groqReasoningModel, SUPPORTED_MODELS.groqText),
    groqSummaryModel,
    groqSummaryConfigured: Boolean(groqApiKey) && isConfiguredModel(groqSummaryModel, SUPPORTED_MODELS.groqText),
    dailyCostLimit: process.env.AI_DAILY_COST_LIMIT || '',
    dailyTokenLimit: process.env.AI_DAILY_TOKEN_LIMIT || '',
    supportedModels: SUPPORTED_MODELS
  }
});
