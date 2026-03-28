/**
 * Reddit Idea Scraper - Main Entry Point
 */

import { getConfig } from './config.js';
import { scrapeMultipleSubreddits, filterAndScorePosts } from './reddit-scraper.js';
import { AIAnalyzer } from './ai-analyzer.js';
import { saveIdeas, saveMVPSpecs, cleanOutputDir } from './output.js';
import { createLogger } from './logger.js';
import { isInsufficientCreditsError } from './errors.js';
import { DEFAULT_CONFIG, COST_ESTIMATES } from './constants.js';

const logger = createLogger('Main');

/**
 * Display configuration summary
 */
function displayConfig(config: ReturnType<typeof getConfig>): void {
  logger.info('Configuration:');
  logger.info(`  Subreddits: ${config.subreddits.join(', ')}`);
  logger.info(`  Max posts per subreddit: ${config.maxPostsPerSubreddit}`);
  logger.info(`  Min score threshold: ${config.minScoreThreshold}`);
  logger.info(`  Keyword categories: ${Object.keys(config.keywords).length} (money, request, frustration, switching)\n`);
}

/**
 * Display keyword matching statistics
 */
function displayKeywordStats(filteredPosts: ReturnType<typeof filterAndScorePosts>): void {
  const postsWithKeywords = filteredPosts.filter((p) => p.keywordScore > 0);
  const postsWithMoney = filteredPosts.filter((p) =>
    p.keywordMatches.some((m) => m.category === 'money')
  );

  logger.info(`  Posts with ANY keywords: ${postsWithKeywords.length}`);
  logger.info(`  Posts with MONEY keywords: ${postsWithMoney.length} 💰`);

  if (postsWithMoney.length > 0) {
    logger.info(`\n🔥 TOP MONEY SIGNALS:`);
    postsWithMoney.slice(0, 5).forEach((post, i) => {
      const moneyKeywords = post.keywordMatches
        .filter((m) => m.category === 'money')
        .map((m) => `"${m.keyword}"`)
        .join(', ');
      const title = post.title.substring(0, 60);
      logger.info(`  ${i + 1}. [${post.keywordScore}] ${title}...`);
      logger.info(`     💰 ${moneyKeywords}`);
    });
  }
  console.log('');
}

/**
 * Display top ideas summary
 */
function displayTopIdeas(mvpSpecs: Awaited<ReturnType<AIAnalyzer['generateTopMVPSpecs']>>): void {
  logger.info(`\nTop ${mvpSpecs.length} ideas:`);
  mvpSpecs.forEach((spec, i) => {
    const kwTag = spec.idea.keywordScore ? ` [KW: ${spec.idea.keywordScore}]` : '';
    const moneyTag = spec.idea.keywordMatches?.some((m) => m.category === 'money')
      ? ' 💰'
      : '';
    logger.info(`\n${i + 1}. Score: ${spec.idea.totalScore.toFixed(1)}/10${kwTag}${moneyTag}`);
    logger.info(`   ${spec.idea.problemDescription}`);
    logger.info(`   From: r/${spec.idea.post.subreddit}`);
  });
}

/**
 * Main application workflow
 */
async function main(): Promise<void> {
  logger.info('🚀 Reddit Idea Scraper Starting...\n');

  // Step 0: Load configuration
  const config = getConfig();
  displayConfig(config);

  // Clean output directory if configured
  if (config.cleanOutputOnStart) {
    logger.info('=== Cleaning Output Directory ===');
    await cleanOutputDir(true); // Keep progress.json
    console.log('');
  }

  // Step 1: Scrape Reddit
  logger.info('=== Step 1: Scraping Reddit ===');
  const allPosts = await scrapeMultipleSubreddits(
    config.subreddits,
    config.maxPostsPerSubreddit
  );

  // Step 2: Filter and score posts
  logger.info('\n=== Step 2: Filtering Posts & Keyword Analysis ===');
  const filteredPosts = filterAndScorePosts(allPosts, config.keywords, {
    minScore: config.minScoreThreshold,
    minTextLength: DEFAULT_CONFIG.minTextLength,
    minKeywordScore: DEFAULT_CONFIG.minKeywordScore,
  });

  logger.success(`Filtered to ${filteredPosts.length} posts with substantial content`);

  displayKeywordStats(filteredPosts);

  if (filteredPosts.length === 0) {
    logger.warning('No posts found matching criteria. Exiting.');
    return;
  }

  // Step 3: AI Analysis
  logger.info('=== Step 3: AI Analysis ===');
  logger.info(`Using models: ${config.modelAnalysis} (analysis), ${config.modelMVP} (MVP)\n`);

  const analyzer = new AIAnalyzer(
    config.anthropicApiKey,
    config.modelAnalysis,
    config.modelMVP
  );

  let scoredIdeas;
  try {
    scoredIdeas = await analyzer.analyzePosts(filteredPosts);
  } catch (error: any) {
    if (isInsufficientCreditsError(error)) {
      logger.info('\n💡 After adding credits, just run the script again.');
      logger.info('   It will automatically continue from where it stopped.\n');
      process.exit(1);
    }
    throw error;
  }

  if (scoredIdeas.length === 0) {
    logger.warning('No viable ideas found. Exiting.');
    return;
  }

  await saveIdeas(scoredIdeas);

  // Step 4: Generate MVP Specifications
  logger.info('\n=== Step 4: Generating MVP Specifications ===');
  const topN = Math.min(DEFAULT_CONFIG.topMVPCount, scoredIdeas.length);
  const estimatedCost = (topN * COST_ESTIMATES.perMVPSpec).toFixed(2);
  logger.info(`⚠️  Estimated MVP generation cost: ~$${estimatedCost} USD\n`);

  const mvpSpecs = await analyzer.generateTopMVPSpecs(scoredIdeas, topN);

  await saveMVPSpecs(mvpSpecs);

  // Summary
  logger.success('\n✅ Done! Check the output/ directory for results.');
  displayTopIdeas(mvpSpecs);
}

// Execute main function
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
