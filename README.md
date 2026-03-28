# Reddit Idea Scraper

Automated script for finding app ideas on Reddit. Scrapes posts, finds user problems, evaluates potential with AI, and generates MVP specifications.

## Features

- 🔍 Reddit scraping (no API keys needed)
- 🎯 **Smart keyword system** - finds posts where people are ready to pay
- 🤖 AI analysis via Claude (Haiku + Sonnet)
- 📝 MVP spec generation for top-5 ideas
- 💾 Auto-save progress every 10 posts
- 🔄 Auto-retry with exponential backoff (529, 503, 502 errors)
- 🧹 Clean output directory on startup (configurable)
- 💰 Cost-effective: ~$0.29 per run (50 posts + 5 MVPs)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Add your API key: ANTHROPIC_API_KEY=sk-ant-...

# 3. Buy API credits ($5 minimum)
# https://console.anthropic.com/ → Plans & Billing → Buy credits

# 4. Run
npm run dev
```

## How It Works

1. **Scrapes Reddit** - Fetches posts from configured subreddits via public JSON endpoints
2. **Keyword Analysis** - Scans for 4 signal categories with weighted scoring
3. **AI Analysis** - Claude Haiku analyzes each post for problems and potential
4. **MVP Generation** - Claude Sonnet creates detailed specs for top 5 ideas
5. **Results** - Saves everything to `output/` directory

## Keywords

The script searches for 4 types of signals:

| Category | Weight | Examples |
|----------|--------|----------|
| 💰 Money | 10 | "I'd pay for", "take my money", "worth paying for" |
| 😤 Frustration | 7 | "drives me crazy", "hate that", "waste of time" |
| 💡 Request | 6 | "someone should build", "is there a tool" |
| 🔄 Switching | 5 | "alternative to", "stopped using" |

**Posts with money keywords get highest priority!**

### Customization

Add your own keywords in `.env`:

```env
MONEY_KEYWORDS=I'd pay for,take my money,worth paying for
FRUSTRATION_KEYWORDS=frustrated with,drives me crazy,waste of time
REQUEST_KEYWORDS=someone should build,is there a tool,need a tool
SWITCHING_KEYWORDS=alternative to,stopped using,better than
```

## Configuration (.env)

```env
# API Key (required!)
ANTHROPIC_API_KEY=sk-ant-api03-your_key

# Subreddits to scrape
SUBREDDITS=SaaS,Entrepreneur,startups,indiehackers,iGaming

# Scraping settings
MAX_POSTS_PER_SUBREDDIT=50
MIN_SCORE_THRESHOLD=10

# Clean output directory on startup (default: true)
CLEAN_OUTPUT_ON_START=true

# AI Models (optional - use if defaults don't work)
MODEL_ANALYSIS=claude-3-haiku-20240307
MODEL_MVP=claude-3-sonnet-20240229
```

### Getting API Key

1. Register at https://console.anthropic.com/
2. Go to **API Keys** → Create Key
3. Go to **Plans & Billing** → **Buy credits** ($5 minimum)
4. Add key to `.env`

⚠️ **Important**: You need to buy API credits separately, not just account balance!

## Usage

```bash
# Development mode (with watch)
npm run dev

# Production mode
npm run build
npm start

# Type checking
npm run build
```

## Output Files

All results are saved to `output/` directory:

```
output/
├── ideas.json                 # All ideas with scores
├── mvp-specs-summary-*.md     # Summary with links
├── mvp-spec-*-1.md            # MVP specification #1
├── mvp-spec-*-2.md            # MVP specification #2
├── mvp-spec-*-3.md            # MVP specification #3
└── progress.json              # Progress tracking (auto-saved)
```

### Output Cleanup

By default, script cleans `output/` on startup (keeps `progress.json` for recovery).

To disable cleanup:
```env
CLEAN_OUTPUT_ON_START=false
```

## Useful Commands

### Analyze Results with jq

```bash
# Show all problem descriptions
cat output/ideas.json | jq '.[].problemDescription'

# Money ideas only
cat output/ideas.json | jq '.[] | select(.keywordMatches[]?.category == "money")'

# Top 5 by score
cat output/ideas.json | jq 'sort_by(.totalScore) | reverse | .[0:5]'

# Count ideas
cat output/ideas.json | jq 'length'

# Clear progress (start fresh)
rm output/progress.json
```

## When to Run?

**Recommended**: Once per week (Wednesday morning)

**Why:**
- Fresh content accumulates
- Avoids duplicates
- Cost-effective (~$1.20/month)

### Automation

**Cron (macOS/Linux):**
```bash
crontab -e
# Add line (runs every Wednesday at 8 AM):
0 8 * * 3 cd /path/to/reddit-scraper && npm run dev
```

**GitHub Actions:**
See [workflow example](https://github.com/anthropics/claude-code/blob/main/.github/workflows/example.yml) or create `.github/workflows/scrape.yml`

## Cost Breakdown

| Operation | Model | Cost per Item | Notes |
|-----------|-------|---------------|-------|
| Post analysis | Haiku | ~$0.0007 | Fast & cheap |
| MVP spec | Sonnet | ~$0.05 | Detailed & quality |
| **Full run** (50+5) | Both | **~$0.29** | 50 posts + 5 MVPs |

**For $5**: ~17 full runs

### Cost Optimization

**Use fewer posts:**
```env
MAX_POSTS_PER_SUBREDDIT=25  # Half cost
```

**Only popular posts:**
```env
MIN_SCORE_THRESHOLD=20  # Higher quality
```

**Use Haiku for everything:**
```env
MODEL_MVP=claude-3-haiku-20240307  # Cheaper but simpler
```

## Error Handling

| Error | Behavior | Action |
|-------|----------|--------|
| **529 Overloaded** | ✅ Auto-retry (2s, 4s, 8s) | Wait, script retries automatically |
| **500 Server Error** | ⚠️ Skips item, continues | Temporary issue, try later |
| **401 Auth** | ❌ Stops | New API key needed |
| **400 No Credits** | ❌ Stops | Buy credits, run again (resumes) |
| **404 Model** | ❌ Stops | Change model in `.env` |

### Auto-Retry Example

```
[AIAnalyzer] ⏳ API overloaded. Waiting 2s before attempt 2/3...
[AIAnalyzer] ⏳ API overloaded. Waiting 4s before attempt 3/3...
[AIAnalyzer] ✅ Score: 7.5 (Problem: 8, Potential: 7) 💎 KW:15
```

### Progress Recovery

Script auto-saves progress every 10 posts. If interrupted:

1. Fix the issue (add credits, change key)
2. Run again: `npm run dev`
3. Script continues from where it stopped

```
[Progress] 📂 Found saved progress:
[Progress]    Already analyzed: 23 posts
[Progress]    Ideas found: 8
[Progress]    Remaining: 27 posts
```

## Project Structure

```
src/
├── constants.ts         # Application constants
├── types.ts            # TypeScript definitions
├── config.ts           # Configuration management
├── errors.ts           # Custom error types
├── logger.ts           # Structured logging
├── retry.ts            # Retry logic with backoff
├── progress.ts         # Progress tracking
├── prompts.ts          # AI prompts
├── reddit-scraper.ts   # Reddit scraping & keywords
├── ai-analyzer.ts      # AI analysis (Claude)
├── output.ts           # File generation
└── index.ts            # Main entry point
```

## Examples

### Find B2B SaaS Ideas

```env
SUBREDDITS=SaaS,Entrepreneur,smallbusiness,B2B
MONEY_KEYWORDS=budget approved,roi,worth the investment,enterprise
```

### Developer Tools

```env
SUBREDDITS=webdev,programming,devops,javascript
FRUSTRATION_KEYWORDS=bad dx,slow build,terrible api,debugging nightmare
```

### iGaming / Casino Ideas

```env
SUBREDDITS=iGaming,gambling,poker,sportsbetting
REQUEST_KEYWORDS=is there a,looking for,need a platform
```

### Only High-Quality Ideas

```env
MIN_SCORE_THRESHOLD=50    # Only very popular posts
MAX_POSTS_PER_SUBREDDIT=100  # More posts to filter from
```

## Troubleshooting

### API Key Not Working

```bash
# 1. Get new key from console
# https://console.anthropic.com/settings/keys

# 2. Buy credits (if you haven't)
# https://console.anthropic.com/ → Plans & Billing

# 3. Update .env
nano .env
```

### Model Not Found (404)

```env
# Change to Claude 3 models
MODEL_ANALYSIS=claude-3-haiku-20240307
MODEL_MVP=claude-3-sonnet-20240229
```

### No Posts Found

```env
# Lower thresholds
MIN_SCORE_THRESHOLD=5
# Try different subreddits
SUBREDDITS=Entrepreneur,SideProject,IMadeThis
```

### Rate Limited by Reddit (429)

- Wait 5-10 minutes
- Reduce `MAX_POSTS_PER_SUBREDDIT`
- Reduce number of subreddits

## Advanced Configuration

### Custom Keyword Scoring

Modify weights in `src/constants.ts`:

```typescript
export const KEYWORD_WEIGHTS = {
  money: 10,        // Highest priority
  frustration: 7,
  request: 6,
  switching: 5,
};
```

### Filter Only Money Keywords

Edit `src/index.ts` in `filterAndScorePosts()`:

```typescript
const filteredPosts = filterAndScorePosts(allPosts, config.keywords, {
  minScore: config.minScoreThreshold,
  minTextLength: 100,
  minKeywordScore: 10,  // Only posts with keywords
});
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **AI**: Anthropic Claude API (Haiku 3 + Sonnet 3)
- **Data Source**: Reddit JSON API (public endpoints)

## Code Quality

- ✅ TypeScript with strict mode
- ✅ ESM modules
- ✅ Comprehensive JSDoc comments
- ✅ Professional error handling
- ✅ Structured logging
- ✅ Modular architecture (12 modules)
- ✅ Single responsibility principle
- ✅ DRY (Don't Repeat Yourself)

See [REFACTORING.md](REFACTORING.md) for details.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT

## Support

- **Issues**: GitHub Issues
- **Anthropic API**: https://console.anthropic.com/
- **API Status**: https://status.anthropic.com/
- **API Docs**: https://docs.anthropic.com/

## Tips for Success

1. **Start small**: Test with 1-2 subreddits first
2. **Monitor costs**: Check usage at console.anthropic.com
3. **Run weekly**: Wednesday mornings work best
4. **Analyze trends**: Compare results over time
5. **Validate ideas**: Look for multiple money signals
6. **Act fast**: Good ideas don't wait

---

**Ready to find your next million-dollar idea?** 🚀

```bash
npm run dev
```
