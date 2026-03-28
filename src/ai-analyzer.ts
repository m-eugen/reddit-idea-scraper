/**
 * AI analysis using Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  RedditPost,
  ScoredIdea,
  MVPSpecification,
  KeywordMatch,
} from './types.js';
import {
  DEFAULT_MODELS,
  TOKEN_LIMITS,
  COST_ESTIMATES,
  MIN_PROBLEM_SCORE,
  AI_REQUEST_DELAY_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_INITIAL_DELAY_MS,
  MVP_MAX_RETRIES,
  MVP_INITIAL_DELAY_MS,
  PROGRESS_SAVE_INTERVAL,
} from './constants.js';
import {
  buildPostAnalysisPrompt,
  buildMVPSpecPrompt,
  buildKeywordContext,
  KeywordContextData,
} from './prompts.js';
import { createLogger } from './logger.js';
import { retryWithBackoff, sleep } from './retry.js';
import {
  isInsufficientCreditsError,
  isServerError,
  formatError,
} from './errors.js';
import { saveProgress, loadProgress, clearProgress, displayProgress } from './progress.js';

const logger = createLogger('AIAnalyzer');

export class AIAnalyzer {
  private readonly client: Anthropic;
  private readonly modelAnalysis: string;
  private readonly modelMVP: string;

  constructor(
    apiKey: string,
    modelAnalysis: string = DEFAULT_MODELS.analysis,
    modelMVP: string = DEFAULT_MODELS.mvp
  ) {
    this.client = new Anthropic({ apiKey });
    this.modelAnalysis = modelAnalysis;
    this.modelMVP = modelMVP;
  }

  /**
   * Analyze a single post
   */
  async analyzePost(
    post: RedditPost,
    keywordMatches?: KeywordMatch[],
    keywordScore?: number
  ): Promise<ScoredIdea | null> {
    try {
      const keywordContext = this.buildKeywordContextString(
        keywordMatches,
        keywordScore
      );
      const prompt = buildPostAnalysisPrompt(post, keywordContext);

      const message = await retryWithBackoff(
        () =>
          this.client.messages.create({
            model: this.modelAnalysis,
            max_tokens: TOKEN_LIMITS.analysis,
            messages: [{ role: 'user', content: prompt }],
          }),
        {
          maxRetries: DEFAULT_MAX_RETRIES,
          initialDelay: DEFAULT_INITIAL_DELAY_MS,
        }
      );

      const analysis = this.parseAnalysisResponse(message);
      if (!analysis) {
        return null;
      }

      if (!analysis.isProblem || analysis.problemScore < MIN_PROBLEM_SCORE) {
        return null;
      }

      const totalScore = (analysis.problemScore + analysis.potentialScore) / 2;

      return {
        post,
        problemScore: analysis.problemScore,
        potentialScore: analysis.potentialScore,
        totalScore,
        problemDescription: analysis.problemDescription,
        reasoning: analysis.reasoning,
        keywordMatches,
        keywordScore,
      };
    } catch (error: any) {
      if (isInsufficientCreditsError(error)) {
        this.logInsufficientCreditsError();
        throw error;
      }

      logger.error(`Error analyzing post ${post.id}:`, formatError(error));
      return null;
    }
  }

  /**
   * Analyze multiple posts with progress tracking
   */
  async analyzePosts(posts: RedditPost[]): Promise<ScoredIdea[]> {
    const progress = await loadProgress();
    let scoredIdeas: ScoredIdea[] = progress?.ideas || [];
    const processedIds: Set<string> = new Set(progress?.processedIds || []);

    const postsToAnalyze = posts.filter((p) => !processedIds.has(p.id));

    if (progress) {
      displayProgress(processedIds.size, scoredIdeas.length, postsToAnalyze.length);
    }

    this.logAnalysisStart(postsToAnalyze.length);

    for (let i = 0; i < postsToAnalyze.length; i++) {
      const post = postsToAnalyze[i];

      const { keywordMatches, keywordScore } = this.extractKeywordData(post);

      this.logAnalyzingPost(i, postsToAnalyze.length, post, keywordScore);

      const scored = await this.analyzePost(post, keywordMatches, keywordScore);
      processedIds.add(post.id);

      if (scored) {
        scoredIdeas.push(scored);
        this.logPostAnalyzed(scored);
      } else {
        logger.info('  ✗ Not a viable problem/idea');
      }

      if ((i + 1) % PROGRESS_SAVE_INTERVAL === 0 || i === postsToAnalyze.length - 1) {
        await saveProgress(scoredIdeas, Array.from(processedIds));
        logger.info(`  💾 Progress saved (${i + 1}/${postsToAnalyze.length})`);
      }

      if (i < postsToAnalyze.length - 1) {
        await sleep(AI_REQUEST_DELAY_MS);
      }
    }

    scoredIdeas.sort((a, b) => b.totalScore - a.totalScore);

    logger.success(`Found ${scoredIdeas.length} viable ideas`);
    await clearProgress();

    return scoredIdeas;
  }

  /**
   * Generate MVP specification for a single idea
   */
  async generateMVPSpec(idea: ScoredIdea): Promise<MVPSpecification> {
    try {
      const prompt = buildMVPSpecPrompt(
        idea.problemDescription,
        idea.post.title,
        idea.post.selftext,
        idea.post.subreddit
      );

      const message = await retryWithBackoff(
        () =>
          this.client.messages.create({
            model: this.modelMVP,
            max_tokens: TOKEN_LIMITS.mvp,
            messages: [{ role: 'user', content: prompt }],
          }),
        {
          maxRetries: MVP_MAX_RETRIES,
          initialDelay: MVP_INITIAL_DELAY_MS,
        }
      );

      const specification =
        message.content[0].type === 'text' ? message.content[0].text : '';

      return {
        idea,
        specification,
      };
    } catch (error) {
      logger.error(
        `Error generating MVP spec for post ${idea.post.id}:`,
        formatError(error)
      );
      throw error;
    }
  }

  /**
   * Generate MVP specifications for top ideas
   */
  async generateTopMVPSpecs(
    ideas: ScoredIdea[],
    topN: number = 5
  ): Promise<MVPSpecification[]> {
    const topIdeas = ideas.slice(0, Math.min(topN, ideas.length));
    const specs: MVPSpecification[] = [];

    logger.info(`\nGenerating MVP specifications for top ${topIdeas.length} ideas...`);

    for (let i = 0; i < topIdeas.length; i++) {
      const idea = topIdeas[i];

      logger.info(`\nGenerating MVP spec ${i + 1}/${topIdeas.length}:`);
      logger.info(`  ${idea.problemDescription.substring(0, 80)}...`);

      try {
        const spec = await this.generateMVPSpec(idea);
        specs.push(spec);
        logger.success('MVP spec generated successfully');
      } catch (error: any) {
        if (isServerError(error)) {
          logger.warning(
            '500 Internal Server Error - skipping this MVP (API server issue)'
          );
          logger.info(
            "This is a temporary issue on Anthropic's side. You can try generating this MVP later."
          );
        } else if (isInsufficientCreditsError(error)) {
          this.logInsufficientCreditsError();
          throw error;
        } else {
          logger.error(
            `Error: ${formatError(error)} - skipping this MVP`
          );
        }
      }

      if (i < topIdeas.length - 1) {
        await sleep(AI_REQUEST_DELAY_MS);
      }
    }

    return specs;
  }

  // Private helper methods

  private buildKeywordContextString(
    keywordMatches?: KeywordMatch[],
    keywordScore?: number
  ): string {
    if (!keywordMatches || keywordMatches.length === 0) {
      return '';
    }

    const keywordsByCategory = keywordMatches.reduce((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m.keyword);
      return acc;
    }, {} as Record<string, string[]>);

    const data: KeywordContextData = {
      ...keywordsByCategory,
      keywordScore: keywordScore || 0,
    };

    return buildKeywordContext(data);
  }

  private parseAnalysisResponse(message: any): any | null {
    try {
      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse analysis response:', formatError(error));
      return null;
    }
  }

  private extractKeywordData(post: RedditPost): {
    keywordMatches?: KeywordMatch[];
    keywordScore?: number;
  } {
    const postWithKeywords =
      (post as any).keywordMatches !== undefined ? (post as any) : null;
    return {
      keywordMatches: postWithKeywords?.keywordMatches,
      keywordScore: postWithKeywords?.keywordScore,
    };
  }

  private logAnalysisStart(count: number): void {
    const estimatedCost = (count * COST_ESTIMATES.perPostAnalysis).toFixed(4);
    logger.info(`\nAnalyzing ${count} posts with AI (${this.modelAnalysis})...`);
    logger.info(`⚠️  Estimated cost: ~$${estimatedCost} USD\n`);
  }

  private logAnalyzingPost(
    index: number,
    total: number,
    post: RedditPost,
    keywordScore?: number
  ): void {
    const keywordInfo = keywordScore ? ` [Keywords: ${keywordScore}]` : '';
    const title = post.title.substring(0, 50);
    logger.info(`Analyzing ${index + 1}/${total}: ${title}...${keywordInfo}`);
  }

  private logPostAnalyzed(scored: ScoredIdea): void {
    const keywordTag = scored.keywordScore ? ` 💎 KW:${scored.keywordScore}` : '';
    logger.success(
      `Score: ${scored.totalScore.toFixed(1)} (Problem: ${scored.problemScore}, Potential: ${scored.potentialScore})${keywordTag}`
    );
  }

  private logInsufficientCreditsError(): void {
    logger.error('Insufficient credits on Anthropic API');
    logger.info('Solution:');
    logger.info('1. Open https://console.anthropic.com/');
    logger.info('2. Go to "Plans & Billing"');
    logger.info('3. Click "Buy credits" and purchase credits (minimum $5)');
    logger.info('\nProgress saved. Run the script again after adding credits.\n');
  }
}
