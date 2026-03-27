export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
}

export interface KeywordMatch {
  category: 'money' | 'request' | 'frustration' | 'switching';
  keyword: string;
  count: number;
}

export interface PostWithKeywords extends RedditPost {
  keywordMatches: KeywordMatch[];
  keywordScore: number;
}

export interface ScoredIdea {
  post: RedditPost;
  problemScore: number;
  potentialScore: number;
  totalScore: number;
  problemDescription: string;
  reasoning: string;
  keywordMatches?: KeywordMatch[];
  keywordScore?: number;
}

export interface MVPSpecification {
  idea: ScoredIdea;
  specification: string;
}

export interface KeywordCategories {
  money: string[];
  request: string[];
  frustration: string[];
  switching: string[];
}

export interface Config {
  subreddits: string[];
  maxPostsPerSubreddit: number;
  minScoreThreshold: number;
  anthropicApiKey: string;
  modelAnalysis: string;
  modelMVP: string;
  keywords: KeywordCategories;
}
