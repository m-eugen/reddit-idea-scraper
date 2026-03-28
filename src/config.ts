/**
 * Configuration management
 */

import dotenv from 'dotenv';
import { Config } from './types.js';
import { DEFAULT_CONFIG, DEFAULT_MODELS } from './constants.js';

dotenv.config();

/**
 * Parse comma-separated environment variable
 */
function parseCommaSeparated(value: string | undefined, defaultValue: string[]): string[] {
  if (!value) return defaultValue;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Parse integer environment variable
 */
function parseInteger(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const lowerValue = value.toLowerCase().trim();
  if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
    return true;
  }
  if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
    return false;
  }
  return defaultValue;
}

/**
 * Parse keyword categories from environment variables
 */
function parseKeywords() {
  const defaultKeywords = {
    money: [
      "i'd pay for",
      'i would pay',
      'take my money',
      'would definitely pay',
      'worth paying for',
      'willing to pay',
      'happy to pay',
      'shut up and take my money',
    ],
    request: [
      'someone should build',
      "why isn't there",
      'i wish there was',
      'is there a tool',
      'is there an app',
      'looking for a tool',
      'anyone know a tool',
      'need a tool that',
      'does anyone know',
      'can anyone recommend',
    ],
    frustration: [
      'frustrated with',
      'drives me crazy',
      'waste of time',
      'hate that',
      'so annoying',
      "can't believe there's no",
      'terrible ux',
      'overpriced',
      'too expensive',
      'broken workflow',
    ],
    switching: [
      'alternative to',
      'stopped using',
      'switched from',
      'moving away from',
      'looking for replacement',
      'better than',
      'replaced',
    ],
  };

  const parseKeywordList = (envVar: string | undefined, defaults: string[]) =>
    parseCommaSeparated(envVar, defaults).map((k) => k.toLowerCase());

  return {
    money: parseKeywordList(process.env.MONEY_KEYWORDS, defaultKeywords.money),
    request: parseKeywordList(process.env.REQUEST_KEYWORDS, defaultKeywords.request),
    frustration: parseKeywordList(process.env.FRUSTRATION_KEYWORDS, defaultKeywords.frustration),
    switching: parseKeywordList(process.env.SWITCHING_KEYWORDS, defaultKeywords.switching),
  };
}

/**
 * Get application configuration from environment variables
 */
export function getConfig(): Config {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is required in .env file');
  }

  return {
    subreddits: parseCommaSeparated(
      process.env.SUBREDDITS,
      DEFAULT_CONFIG.subreddits
    ),
    maxPostsPerSubreddit: parseInteger(
      process.env.MAX_POSTS_PER_SUBREDDIT,
      DEFAULT_CONFIG.maxPostsPerSubreddit
    ),
    minScoreThreshold: parseInteger(
      process.env.MIN_SCORE_THRESHOLD,
      DEFAULT_CONFIG.minScoreThreshold
    ),
    anthropicApiKey,
    modelAnalysis: process.env.MODEL_ANALYSIS || DEFAULT_MODELS.analysis,
    modelMVP: process.env.MODEL_MVP || DEFAULT_MODELS.mvp,
    keywords: parseKeywords(),
    cleanOutputOnStart: parseBoolean(
      process.env.CLEAN_OUTPUT_ON_START,
      DEFAULT_CONFIG.cleanOutputOnStart
    ),
  };
}
