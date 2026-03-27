import dotenv from 'dotenv';
import { Config } from './types.js';

dotenv.config();

export function getConfig(): Config {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is required in .env file');
  }

  const subreddits = process.env.SUBREDDITS?.split(',').map(s => s.trim()) || [
    'SaaS',
    'Entrepreneur',
    'startups',
    'smallbusiness',
    'productivity'
  ];

  const maxPostsPerSubreddit = parseInt(process.env.MAX_POSTS_PER_SUBREDDIT || '50');
  const minScoreThreshold = parseInt(process.env.MIN_SCORE_THRESHOLD || '10');

  const modelAnalysis = process.env.MODEL_ANALYSIS || 'claude-haiku-4-5';
  const modelMVP = process.env.MODEL_MVP || 'claude-sonnet-4-6';

  const keywords = {
    money: process.env.MONEY_KEYWORDS?.split(',').map(k => k.trim().toLowerCase()) || [
      "i'd pay for", "i would pay", "take my money", "would definitely pay",
      "worth paying for", "willing to pay", "happy to pay", "shut up and take my money"
    ],
    request: process.env.REQUEST_KEYWORDS?.split(',').map(k => k.trim().toLowerCase()) || [
      "someone should build", "why isn't there", "i wish there was", "is there a tool",
      "is there an app", "looking for a tool", "anyone know a tool", "need a tool that",
      "does anyone know", "can anyone recommend"
    ],
    frustration: process.env.FRUSTRATION_KEYWORDS?.split(',').map(k => k.trim().toLowerCase()) || [
      "frustrated with", "drives me crazy", "waste of time", "hate that",
      "so annoying", "can't believe there's no", "terrible ux", "overpriced",
      "too expensive", "broken workflow"
    ],
    switching: process.env.SWITCHING_KEYWORDS?.split(',').map(k => k.trim().toLowerCase()) || [
      "alternative to", "stopped using", "switched from", "moving away from",
      "looking for replacement", "better than", "replaced"
    ]
  };

  return {
    subreddits,
    maxPostsPerSubreddit,
    minScoreThreshold,
    anthropicApiKey,
    modelAnalysis,
    modelMVP,
    keywords
  };
}
