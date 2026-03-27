import { getConfig } from './config.js';
import { scrapeMultipleSubreddits, filterAndScorePosts } from './reddit-scraper.js';
import { AIAnalyzer } from './ai-analyzer.js';
import { saveIdeas, saveMVPSpecs } from './output.js';

async function main() {
  console.log('🚀 Reddit Idea Scraper Starting...\n');

  const config = getConfig();

  console.log('Configuration:');
  console.log(`  Subreddits: ${config.subreddits.join(', ')}`);
  console.log(`  Max posts per subreddit: ${config.maxPostsPerSubreddit}`);
  console.log(`  Min score threshold: ${config.minScoreThreshold}`);
  console.log(`  Keyword categories: ${Object.keys(config.keywords).length} (money, request, frustration, switching)\n`);

  console.log('=== Step 1: Scraping Reddit ===');
  const allPosts = await scrapeMultipleSubreddits(
    config.subreddits,
    config.maxPostsPerSubreddit
  );

  console.log('\n=== Step 2: Filtering Posts & Keyword Analysis ===');
  const filteredPosts = filterAndScorePosts(
    allPosts,
    config.keywords,
    config.minScoreThreshold,
    100, // min text length
    0    // min keyword score (0 = all posts, increase to filter for keyword matches only)
  );

  console.log(`Filtered to ${filteredPosts.length} posts with substantial content`);

  // Show stats about keyword matches
  const postsWithKeywords = filteredPosts.filter(p => p.keywordScore > 0);
  const postsWithMoney = filteredPosts.filter(p =>
    p.keywordMatches.some(m => m.category === 'money')
  );

  console.log(`  Posts with ANY keywords: ${postsWithKeywords.length}`);
  console.log(`  Posts with MONEY keywords: ${postsWithMoney.length} 💰`);

  if (postsWithMoney.length > 0) {
    console.log(`\n🔥 TOP MONEY SIGNALS:`);
    postsWithMoney.slice(0, 5).forEach((post, i) => {
      const moneyKeywords = post.keywordMatches
        .filter(m => m.category === 'money')
        .map(m => `"${m.keyword}"`)
        .join(', ');
      console.log(`  ${i + 1}. [${post.keywordScore}] ${post.title.substring(0, 60)}...`);
      console.log(`     💰 ${moneyKeywords}`);
    });
  }

  console.log('');

  if (filteredPosts.length === 0) {
    console.log('No posts found matching criteria. Exiting.');
    return;
  }

  console.log('=== Step 3: AI Analysis ===');
  console.log(`Using models: ${config.modelAnalysis} (analysis), ${config.modelMVP} (MVP)\n`);
  const analyzer = new AIAnalyzer(config.anthropicApiKey, config.modelAnalysis, config.modelMVP);

  let scoredIdeas;
  try {
    scoredIdeas = await analyzer.analyzePosts(filteredPosts);
  } catch (error: any) {
    if (error?.status === 400 && error?.message?.includes('credit balance')) {
      console.error('\n💡 Після поповнення балансу просто запустіть скрипт знову.');
      console.error('   Він автоматично продовжить з місця зупинки.\n');
      process.exit(1);
    }
    throw error;
  }

  if (scoredIdeas.length === 0) {
    console.log('No viable ideas found. Exiting.');
    return;
  }

  saveIdeas(scoredIdeas);

  console.log('\n=== Step 4: Generating MVP Specifications ===');
  const topN = Math.min(5, scoredIdeas.length);
  console.log(`⚠️  Приблизна вартість генерації MVP (Claude Sonnet): ~$${(topN * 0.05).toFixed(2)} USD\n`);

  const mvpSpecs = await analyzer.generateTopMVPSpecs(scoredIdeas, topN);

  saveMVPSpecs(mvpSpecs);

  console.log('\n✅ Done! Check the output/ directory for results.');
  console.log(`\nTop ${mvpSpecs.length} ideas:`);
  mvpSpecs.forEach((spec, i) => {
    const kwTag = spec.idea.keywordScore ? ` [KW: ${spec.idea.keywordScore}]` : '';
    const moneyTag = spec.idea.keywordMatches?.some(m => m.category === 'money') ? ' 💰' : '';
    console.log(`\n${i + 1}. Score: ${spec.idea.totalScore.toFixed(1)}/10${kwTag}${moneyTag}`);
    console.log(`   ${spec.idea.problemDescription}`);
    console.log(`   From: r/${spec.idea.post.subreddit}`);
  });
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
