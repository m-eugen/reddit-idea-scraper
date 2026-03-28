/**
 * Progress tracking utilities
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ScoredIdea } from './types.js';
import { PROGRESS_FILE_PATH } from './constants.js';
import { createLogger } from './logger.js';

const logger = createLogger('Progress');

export interface ProgressData {
  ideas: ScoredIdea[];
  processedIds: string[];
  timestamp: number;
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDir(): Promise<void> {
  const dir = path.dirname(PROGRESS_FILE_PATH);
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Save progress to file
 */
export async function saveProgress(
  ideas: ScoredIdea[],
  processedIds: string[]
): Promise<void> {
  try {
    await ensureOutputDir();

    const data: ProgressData = {
      ideas,
      processedIds,
      timestamp: Date.now(),
    };

    await fs.writeFile(
      PROGRESS_FILE_PATH,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  } catch (error) {
    logger.error('Failed to save progress:', error);
    throw error;
  }
}

/**
 * Load progress from file
 */
export async function loadProgress(): Promise<ProgressData | null> {
  try {
    if (!existsSync(PROGRESS_FILE_PATH)) {
      return null;
    }

    const content = await fs.readFile(PROGRESS_FILE_PATH, 'utf-8');
    const data: ProgressData = JSON.parse(content);

    return data;
  } catch (error) {
    logger.warning('Failed to load progress, starting fresh:', error);
    return null;
  }
}

/**
 * Clear progress file
 */
export async function clearProgress(): Promise<void> {
  try {
    if (existsSync(PROGRESS_FILE_PATH)) {
      await fs.unlink(PROGRESS_FILE_PATH);
    }
  } catch (error) {
    logger.warning('Failed to clear progress:', error);
  }
}

/**
 * Display progress info
 */
export function displayProgress(
  processedCount: number,
  ideasCount: number,
  remainingCount: number
): void {
  logger.info('📂 Found saved progress:');
  logger.info(`   Already analyzed: ${processedCount} posts`);
  logger.info(`   Ideas found: ${ideasCount}`);
  logger.info(`   Remaining: ${remainingCount} posts\n`);
}
