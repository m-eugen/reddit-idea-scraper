/**
 * AI Prompts for analysis and MVP generation
 */

import { RedditPost } from './types.js';

export interface KeywordContextData {
  money?: string[];
  frustration?: string[];
  request?: string[];
  switching?: string[];
  keywordScore: number;
}

/**
 * Build keyword context string for AI analysis
 */
export function buildKeywordContext(data: KeywordContextData): string {
  const sections: string[] = [];

  if (data.money?.length) {
    sections.push(`💰 Willingness to pay: ${data.money.join(', ')}`);
  }
  if (data.frustration?.length) {
    sections.push(`😤 Frustration: ${data.frustration.join(', ')}`);
  }
  if (data.request?.length) {
    sections.push(`💡 Request for solution: ${data.request.join(', ')}`);
  }
  if (data.switching?.length) {
    sections.push(`🔄 Switching from existing: ${data.switching.join(', ')}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `

🔍 IMPORTANT SIGNALS (found keywords):
${sections.join('\n')}

Keyword score: ${data.keywordScore}/100 (higher = more signals about willingness to pay)
`;
}

/**
 * Generate post analysis prompt
 */
export function buildPostAnalysisPrompt(
  post: RedditPost,
  keywordContext: string
): string {
  return `Analyze the following Reddit post and determine if it describes a real user problem/pain point that could be solved with an application.

Title: ${post.title}
Text: ${post.selftext}
Subreddit: r/${post.subreddit}${keywordContext}

Rate on two criteria (0 to 10):
1. problemScore - how clearly the problem/pain is described
2. potentialScore - potential for creating an application (market, feasibility, value)

IMPORTANT: If keywords about willingness to pay (💰) are found - this is a VERY strong signal! Increase potentialScore.

Respond in JSON format:
{
  "isProblem": true/false,
  "problemScore": number from 0 to 10,
  "potentialScore": number from 0 to 10,
  "problemDescription": "brief description of the problem",
  "reasoning": "explanation of scores"
}

If this is not a problem description, set isProblem: false and all scores to 0.`;
}

/**
 * Generate MVP specification prompt
 */
export function buildMVPSpecPrompt(
  problemDescription: string,
  postTitle: string,
  postText: string,
  subreddit: string
): string {
  return `Based on the following problem from Reddit, create a detailed MVP specification for an application.

Problem: ${problemDescription}
Details from post:
Title: ${postTitle}
Text: ${postText}
Subreddit: r/${subreddit}

Create a detailed MVP specification that includes:

1. **Product Name** - short and memorable name

2. **Problem** - clear problem statement

3. **Target Audience** - who will be the users

4. **Solution** - how the application solves the problem

5. **Key MVP Features** (3-5 most important features for first version)
   - Feature 1
   - Feature 2
   - ...

6. **Tech Stack** - recommended technologies

7. **Business Model** - how to monetize

8. **Next Steps** - what to do to launch

Respond in detail in English in Markdown format.`;
}
