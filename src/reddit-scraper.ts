/**
 * Reddit scraping and keyword analysis
 */

import { RedditPost, KeywordMatch, PostWithKeywords, KeywordCategories } from './types.js';
import {
  REDDIT_API_BASE,
  USER_AGENT,
  REDDIT_REQUEST_DELAY_MS,
  KEYWORD_WEIGHTS,
  MAX_KEYWORD_SCORE,
  DEFAULT_CONFIG,
} from './constants.js';
import { createLogger } from './logger.js';
import { sleep } from './retry.js';

const logger = createLogger('RedditScraper');

/**
 * Scrape posts from a single subreddit
 */
export async function scrapeSubreddit(
  subreddit: string,
  limit: number = DEFAULT_CONFIG.maxPostsPerSubreddit
): Promise<RedditPost[]> {
  try {
    logger.info(`Scraping r/${subreddit}...`);

    const url = `${REDDIT_API_BASE}/r/${subreddit}/hot.json?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      logger.error(`Failed to fetch r/${subreddit}: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      data: {
        children: Array<{ kind: string; data: Record<string, any> }>;
      };
    };
    const posts: RedditPost[] = data.data.children
      .filter((child) => child.kind === 't3')
      .map((child) => mapRedditPost(child.data));

    logger.success(`Found ${posts.length} posts in r/${subreddit}`);
    return posts;
  } catch (error) {
    logger.error(`Error scraping r/${subreddit}:`, error);
    return [];
  }
}

/**
 * Map Reddit API response to RedditPost
 */
function mapRedditPost(data: Record<string, any>): RedditPost {
  return {
    id: data.id,
    title: data.title,
    selftext: data.selftext || '',
    author: data.author,
    subreddit: data.subreddit,
    score: data.score,
    num_comments: data.num_comments,
    created_utc: data.created_utc,
    url: data.url,
    permalink: `${REDDIT_API_BASE}${data.permalink}`,
  };
}

/**
 * Scrape posts from multiple subreddits with rate limiting
 */
export async function scrapeMultipleSubreddits(
  subreddits: string[],
  limit: number = DEFAULT_CONFIG.maxPostsPerSubreddit
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  for (let i = 0; i < subreddits.length; i++) {
    const subreddit = subreddits[i];
    const posts = await scrapeSubreddit(subreddit, limit);
    allPosts.push(...posts);

    // Rate limiting between requests
    if (i < subreddits.length - 1) {
      await sleep(REDDIT_REQUEST_DELAY_MS);
    }
  }

  logger.info(`\nTotal posts scraped: ${allPosts.length}`);
  return allPosts;
}

/**
 * Find keyword matches in text
 */
export function findKeywordMatches(text: string, keywords: KeywordCategories): KeywordMatch[] {
  const textLower = text.toLowerCase();
  const matches: KeywordMatch[] = [];

  const categories: Array<keyof KeywordCategories> = [
    'money',
    'request',
    'frustration',
    'switching',
  ];

  for (const category of categories) {
    for (const keyword of keywords[category]) {
      const regex = createKeywordRegex(keyword);
      const count = (textLower.match(regex) || []).length;

      if (count > 0) {
        matches.push({ category, keyword, count });
      }
    }
  }

  return matches;
}

/**
 * Create regex for keyword matching (escape special chars)
 */
function createKeywordRegex(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'gi');
}

/**
 * Calculate keyword score based on matches and weights
 */
export function calculateKeywordScore(matches: KeywordMatch[]): number {
  let score = 0;

  for (const match of matches) {
    score += KEYWORD_WEIGHTS[match.category] * match.count;
  }

  return Math.min(score, MAX_KEYWORD_SCORE);
}

/**
 * Analyze post for keywords
 */
export function analyzePostKeywords(
  post: RedditPost,
  keywords: KeywordCategories
): PostWithKeywords {
  const fullText = `${post.title} ${post.selftext}`;
  const keywordMatches = findKeywordMatches(fullText, keywords);
  const keywordScore = calculateKeywordScore(keywordMatches);

  return {
    ...post,
    keywordMatches,
    keywordScore,
  };
}

/**
 * Filter and score posts with keyword analysis
 */
export function filterAndScorePosts(
  posts: RedditPost[],
  keywords: KeywordCategories,
  options: {
    minScore?: number;
    minTextLength?: number;
    minKeywordScore?: number;
  } = {}
): PostWithKeywords[] {
  const {
    minScore = DEFAULT_CONFIG.minScoreThreshold,
    minTextLength = DEFAULT_CONFIG.minTextLength,
    minKeywordScore = DEFAULT_CONFIG.minKeywordScore,
  } = options;

  const postsWithKeywords = posts.map((post) => analyzePostKeywords(post, keywords));

  return postsWithKeywords
    .filter((post) => {
      return (
        post.score >= minScore &&
        post.selftext.length >= minTextLength &&
        post.author !== '[deleted]' &&
        post.keywordScore >= minKeywordScore
      );
    })
    .sort((a, b) => b.keywordScore - a.keywordScore);
}

/**
 * Filter posts without keyword analysis (legacy)
 */
export function filterPosts(
  posts: RedditPost[],
  options: {
    minScore?: number;
    minTextLength?: number;
  } = {}
): RedditPost[] {
  const {
    minScore = DEFAULT_CONFIG.minScoreThreshold,
    minTextLength = DEFAULT_CONFIG.minTextLength,
  } = options;

  return posts.filter((post) => {
    return (
      post.score >= minScore && post.selftext.length >= minTextLength && post.author !== '[deleted]'
    );
  });
}
