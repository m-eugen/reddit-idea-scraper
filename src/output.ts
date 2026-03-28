/**
 * Output file generation
 */

import fs from 'fs/promises';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { ScoredIdea, MVPSpecification } from './types.js';
import { createLogger } from './logger.js';

const OUTPUT_DIR = 'output';
const logger = createLogger('Output');

/**
 * Ensure output directory exists
 */
async function ensureOutputDir(): Promise<void> {
  if (!existsSync(OUTPUT_DIR)) {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Clean output directory (remove all files except progress.json)
 */
export async function cleanOutputDir(keepProgress: boolean = true): Promise<void> {
  try {
    if (!existsSync(OUTPUT_DIR)) {
      logger.info('Output directory does not exist, nothing to clean');
      return;
    }

    const files = readdirSync(OUTPUT_DIR);
    const filesToRemove = files.filter((file) => {
      if (keepProgress && file === 'progress.json') {
        return false;
      }
      const filePath = path.join(OUTPUT_DIR, file);
      return statSync(filePath).isFile();
    });

    if (filesToRemove.length === 0) {
      logger.info('Output directory is already clean');
      return;
    }

    for (const file of filesToRemove) {
      const filePath = path.join(OUTPUT_DIR, file);
      await fs.unlink(filePath);
    }

    logger.success(`Cleaned output directory (removed ${filesToRemove.length} files)`);
  } catch (error) {
    logger.warning('Failed to clean output directory:', error);
  }
}

/**
 * Save ideas to JSON file
 */
export async function saveIdeas(
  ideas: ScoredIdea[],
  filename: string = 'ideas.json'
): Promise<void> {
  await ensureOutputDir();
  const filepath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(ideas, null, 2));
  logger.success(`Saved ${ideas.length} ideas to ${filepath}`);
}

/**
 * Get current date string for filenames
 */
function getDateString(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
}

/**
 * Format keyword info for MVP spec
 */
function formatKeywordInfo(spec: MVPSpecification): string {
  if (!spec.idea.keywordMatches || spec.idea.keywordMatches.length === 0) {
    return '';
  }

  const categoryEmojis = {
    money: '💰',
    frustration: '😤',
    request: '💡',
    switching: '🔄',
  };

  const keywordsList = spec.idea.keywordMatches
    .map((m) => {
      const emoji = categoryEmojis[m.category];
      return `- ${emoji} ${m.category}: "${m.keyword}" (${m.count}x)`;
    })
    .join('\n');

  return `\n**🔍 Key Signals** (score: ${spec.idea.keywordScore}/100):\n${keywordsList}\n`;
}

/**
 * Generate MVP spec content
 */
function generateMVPSpecContent(spec: MVPSpecification, index: number): string {
  const keywordInfo = formatKeywordInfo(spec);

  return `# MVP Specification ${index + 1}

**Score**: ${spec.idea.totalScore.toFixed(1)}/10 (Problem: ${spec.idea.problemScore}, Potential: ${spec.idea.potentialScore})
${keywordInfo}
**Source**: [r/${spec.idea.post.subreddit}](${spec.idea.post.permalink})

**Original Post**:
> ${spec.idea.post.title}

---

${spec.specification}

---

## Original Text from Reddit

${spec.idea.post.selftext}

---

*Generated: ${new Date().toLocaleString('en-US')}*
`;
}

/**
 * Generate summary content
 */
function generateSummaryContent(specs: MVPSpecification[], timestamp: string): string {
  const ideasList = specs
    .map((spec, index) => {
      const hasMoney = spec.idea.keywordMatches?.some((m) => m.category === 'money');
      const moneyTag = hasMoney ? ' 💰 WILLINGNESS TO PAY' : '';
      const kwScore = spec.idea.keywordScore
        ? ` | Keywords: ${spec.idea.keywordScore}/100`
        : '';

      return `
### ${index + 1}. ${spec.idea.problemDescription}${moneyTag}

- **Score**: ${spec.idea.totalScore.toFixed(1)}/10
- **Problem**: ${spec.idea.problemScore}/10
- **Potential**: ${spec.idea.potentialScore}/10${kwScore}
- **Subreddit**: r/${spec.idea.post.subreddit}
- **Post**: [${spec.idea.post.title}](${spec.idea.post.permalink})
- **File**: \`mvp-spec-${timestamp}-${index + 1}.md\`

**Problem Description**: ${spec.idea.problemDescription}

---
`;
    })
    .join('\n');

  return `# MVP Specifications Summary

**Date**: ${new Date().toLocaleString('en-US')}
**Ideas Found**: ${specs.length}

## Ideas List (by rating)

${ideasList}

*Generated automatically by Reddit Idea Scraper*
`;
}

/**
 * Save MVP specifications to files
 */
export async function saveMVPSpecs(specs: MVPSpecification[]): Promise<void> {
  await ensureOutputDir();

  const timestamp = getDateString();

  // Save individual MVP specs
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const filename = `mvp-spec-${timestamp}-${i + 1}.md`;
    const filepath = path.join(OUTPUT_DIR, filename);
    const content = generateMVPSpecContent(spec, i);

    await fs.writeFile(filepath, content);
    logger.info(`Saved: ${filepath}`);
  }

  // Save summary
  const summaryFilename = `mvp-specs-summary-${timestamp}.md`;
  const summaryFilepath = path.join(OUTPUT_DIR, summaryFilename);
  const summaryContent = generateSummaryContent(specs, timestamp);

  await fs.writeFile(summaryFilepath, summaryContent);
  logger.success(`Summary saved to ${summaryFilepath}`);
}
