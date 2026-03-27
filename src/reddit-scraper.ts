import { RedditPost, KeywordMatch, PostWithKeywords, KeywordCategories } from './types.js';

const REDDIT_API_BASE = 'https://www.reddit.com';
const USER_AGENT = 'Mozilla/5.0 (compatible; RedditIdeaScraper/1.0)';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeSubreddit(
  subreddit: string,
  limit: number = 50
): Promise<RedditPost[]> {
  try {
    console.log(`Scraping r/${subreddit}...`);

    const url = `${REDDIT_API_BASE}/r/${subreddit}/hot.json?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch r/${subreddit}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const posts: RedditPost[] = data.data.children
      .filter((child: any) => child.kind === 't3')
      .map((child: any) => {
        const post = child.data;
        return {
          id: post.id,
          title: post.title,
          selftext: post.selftext || '',
          author: post.author,
          subreddit: post.subreddit,
          score: post.score,
          num_comments: post.num_comments,
          created_utc: post.created_utc,
          url: post.url,
          permalink: `${REDDIT_API_BASE}${post.permalink}`
        };
      });

    console.log(`Found ${posts.length} posts in r/${subreddit}`);
    return posts;
  } catch (error) {
    console.error(`Error scraping r/${subreddit}:`, error);
    return [];
  }
}

export async function scrapeMultipleSubreddits(
  subreddits: string[],
  limit: number = 50
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  for (const subreddit of subreddits) {
    const posts = await scrapeSubreddit(subreddit, limit);
    allPosts.push(...posts);

    await delay(2000);
  }

  console.log(`\nTotal posts scraped: ${allPosts.length}`);
  return allPosts;
}

export function findKeywordMatches(
  text: string,
  keywords: KeywordCategories
): KeywordMatch[] {
  const textLower = text.toLowerCase();
  const matches: KeywordMatch[] = [];

  const categories: Array<keyof KeywordCategories> = ['money', 'request', 'frustration', 'switching'];

  for (const category of categories) {
    for (const keyword of keywords[category]) {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const count = (textLower.match(regex) || []).length;

      if (count > 0) {
        matches.push({ category, keyword, count });
      }
    }
  }

  return matches;
}

export function calculateKeywordScore(matches: KeywordMatch[]): number {
  const weights = {
    money: 10,        // Найвищий пріоритет - готовість платити
    frustration: 7,   // Сильна проблема
    request: 6,       // Активний запит на рішення
    switching: 5      // Незадоволеність існуючим
  };

  let score = 0;
  for (const match of matches) {
    score += weights[match.category] * match.count;
  }

  return Math.min(score, 100); // Max 100
}

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
    keywordScore
  };
}

export function filterAndScorePosts(
  posts: RedditPost[],
  keywords: KeywordCategories,
  minScore: number = 10,
  minTextLength: number = 100,
  minKeywordScore: number = 0
): PostWithKeywords[] {
  const postsWithKeywords = posts.map(post => analyzePostKeywords(post, keywords));

  return postsWithKeywords
    .filter(post => {
      const hasEnoughScore = post.score >= minScore;
      const hasEnoughText = post.selftext.length >= minTextLength;
      const isNotDeleted = post.author !== '[deleted]';
      const hasKeywords = post.keywordScore >= minKeywordScore;

      return hasEnoughScore && hasEnoughText && isNotDeleted && hasKeywords;
    })
    .sort((a, b) => b.keywordScore - a.keywordScore); // Sort by keyword score
}

export function filterPosts(
  posts: RedditPost[],
  minScore: number = 10,
  minTextLength: number = 100
): RedditPost[] {
  return posts.filter(post => {
    const hasEnoughScore = post.score >= minScore;
    const hasEnoughText = post.selftext.length >= minTextLength;
    const isNotDeleted = post.author !== '[deleted]';

    return hasEnoughScore && hasEnoughText && isNotDeleted;
  });
}
