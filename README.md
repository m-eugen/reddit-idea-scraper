# Reddit Idea Scraper

Automated script for finding app ideas on Reddit. Scrapes posts, finds user problems, evaluates potential with AI, and generates MVP specifications.

## Quick Start

```bash
# 1. Install
npm install

# 2. Setup .env
cp .env.example .env
# Add API key: ANTHROPIC_API_KEY=sk-ant-...

# 3. Buy credits ($5)
# https://console.anthropic.com/ → Plans & Billing → Buy credits

# 4. Run
npm run dev
```

## Features

- 🔍 Reddit scraping (no API keys needed)
- 🎯 **Keyword system** - finds posts where people are ready to pay
- 🤖 AI analysis via Claude (Haiku + Sonnet)
- 📝 MVP spec generation for top-5 ideas
- 💰 ~$0.29 per run (50 posts + 5 MVPs)

## Keywords

The script searches for 4 types of signals:

| Category | Weight | Examples |
|----------|--------|----------|
| 💰 Money | 10 | "I'd pay for", "take my money", "worth paying for" |
| 😤 Frustration | 7 | "drives me crazy", "hate that", "waste of time" |
| 💡 Request | 6 | "someone should build", "is there a tool" |
| 🔄 Switching | 5 | "alternative to", "stopped using" |

**Customization** - add your own in `.env`:
```env
MONEY_KEYWORDS=I'd pay for,take my money
FRUSTRATION_KEYWORDS=frustrated with,drives me crazy
REQUEST_KEYWORDS=someone should build,is there a tool
SWITCHING_KEYWORDS=alternative to,stopped using
```

## .env Configuration

```env
# API key (required!)
ANTHROPIC_API_KEY=sk-ant-api03-your_key

# Subreddits
SUBREDDITS=SaaS,Entrepreneur,startups,indiehackers

# Settings
MAX_POSTS_PER_SUBREDDIT=50
MIN_SCORE_THRESHOLD=10

# Models (if you need to change)
MODEL_ANALYSIS=claude-3-haiku-20240307
MODEL_MVP=claude-3-sonnet-20240229
```

### Where to get API key?

1. Register: https://console.anthropic.com/
2. API Keys → Create Key
3. **Plans & Billing → Buy credits** ($5 minimum)
4. Add key to `.env`

⚠️ **Important**: You need to buy API credits separately, not just balance!

## Usage

```bash
# Run
npm run dev

# Or build
npm run build
npm start
```

## Results

All results in `output/` folder:

```
output/
├── ideas.json              # All ideas with scores
├── mvp-specs-summary-*.md  # Summary
├── mvp-spec-*-1.md         # MVP #1
├── mvp-spec-*-2.md         # MVP #2
└── ...
```

### Useful Commands

```bash
# Show found ideas
cat output/ideas.json | jq '.[].problemDescription'

# Money ideas only
cat output/ideas.json | jq '.[] | select(.keywordMatches[]?.category == "money")'

# Top 5
cat output/ideas.json | jq 'sort_by(.totalScore) | reverse | .[0:5]'

# Clear progress
rm output/progress.json
```

## When to Run?

**Recommended**: once per week (Wednesday morning)

**Why**:
- Enough fresh content
- Avoid duplicates
- Cost-effective (~$1.20/month)

**Automation** (cron):
```bash
crontab -e
# Add:
0 8 * * 3 cd /path/to/reddit-scraper && npm run dev
```

## Errors & Solutions

| Error | What to Do |
|-------|------------|
| **529 Overloaded** | ✅ Auto-retry (2s, 4s, 8s) - do nothing |
| **500 Server Error** | ⚠️ Script skips and continues. Try later |
| **401 Auth** | New API key: https://console.anthropic.com/settings/keys |
| **400 No Credits** | Buy credits: https://console.anthropic.com/ |
| **404 Model** | Change model in `.env` to `claude-3-haiku-20240307` |

### 529 Overloaded (API overload)

Script **automatically** retries with delays. You'll see:
```
⏳ API перевантажений. Чекаємо 2с перед спробою 2/3...
```

If all attempts fail - wait 5-10 min and run again.

### 400 No Credits (insufficient funds)

```bash
# 1. Open console.anthropic.com
# 2. Plans & Billing → Buy credits
# 3. Buy $5
# 4. Run again - continues from where it stopped
```

### 500 Server Error

Temporary issue on Anthropic servers. Script skips the problematic MVP and continues with others. Wait 10-30 min and try again.

## Recovery After Errors

Script **automatically saves progress** every 10 posts. If stopped:

1. Fix the issue (add credits, change key)
2. Run again: `npm run dev`
3. It will continue from where it stopped!

```
📂 Found saved progress:
   Already analyzed: 8 posts
   Ideas found: 3
   Remaining: 58 posts
```

## Cost Optimization

**Current cost** (~$0.29 per run):
- 1 post analysis (Haiku): ~$0.0007
- 1 MVP spec (Sonnet): ~$0.05
- 50 posts + 5 MVPs = ~$0.29

**How to save**:

```env
# Fewer posts
MAX_POSTS_PER_SUBREDDIT=25  # Instead of 50

# Only popular
MIN_SCORE_THRESHOLD=20       # Instead of 10

# Haiku for everything (cheaper but simpler)
MODEL_MVP=claude-3-haiku-20240307
```

**For $5**: ~17 full runs

## Usage Examples

### Find B2B SaaS ideas

```env
SUBREDDITS=SaaS,Entrepreneur,smallbusiness
MONEY_KEYWORDS=budget approved,roi,worth the investment
```

### Developer tools

```env
SUBREDDITS=webdev,programming,devops
FRUSTRATION_KEYWORDS=bad dx,slow build,terrible api
```

### Only with willingness to pay

Change in `src/index.ts` → `filterAndScorePosts()`:
```typescript
const topPosts = filteredPosts.filter(p =>
  p.keywordScore && p.keywordScore >= 10
);
```

## Technologies

- Node.js + TypeScript
- Anthropic Claude API (Haiku 3 + Sonnet 3)
- Reddit JSON API (public endpoints)

## License

MIT
