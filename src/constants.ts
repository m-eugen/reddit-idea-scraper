/**
 * Application-wide constants
 */

// API Configuration
export const REDDIT_API_BASE = 'https://www.reddit.com';
export const USER_AGENT = 'Mozilla/5.0 (compatible; RedditIdeaScraper/2.0)';

// Delays and Timeouts
export const REDDIT_REQUEST_DELAY_MS = 2000;
export const AI_REQUEST_DELAY_MS = 1000;

// Retry Configuration
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_INITIAL_DELAY_MS = 2000;
export const MVP_MAX_RETRIES = 5;
export const MVP_INITIAL_DELAY_MS = 3000;

// HTTP Status Codes
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  OVERLOADED: 529,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Scoring Weights
export const KEYWORD_WEIGHTS = {
  money: 10,
  frustration: 7,
  request: 6,
  switching: 5,
} as const;

// Score Thresholds
export const MIN_PROBLEM_SCORE = 5;
export const MAX_KEYWORD_SCORE = 100;

// Progress Configuration
export const PROGRESS_FILE_PATH = 'output/progress.json';
export const PROGRESS_SAVE_INTERVAL = 10;

// AI Model Configuration
export const DEFAULT_MODELS = {
  analysis: 'claude-3-haiku-20240307',
  mvp: 'claude-3-sonnet-20240229',
} as const;

// AI Token Limits
export const TOKEN_LIMITS = {
  analysis: 1024,
  mvp: 4096,
} as const;

// Cost Estimates (USD)
export const COST_ESTIMATES = {
  perPostAnalysis: 0.0007,
  perMVPSpec: 0.05,
} as const;

// Default Configuration
export const DEFAULT_CONFIG = {
  subreddits: ['SaaS', 'Entrepreneur', 'startups', 'smallbusiness', 'productivity', 'iGaming'] as string[],
  maxPostsPerSubreddit: 50,
  minScoreThreshold: 10,
  minTextLength: 100,
  minKeywordScore: 0,
  topMVPCount: 5,
  cleanOutputOnStart: true, // Clean output directory on startup
};
