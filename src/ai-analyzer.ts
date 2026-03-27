import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { RedditPost, ScoredIdea, MVPSpecification, KeywordMatch } from './types.js';

const PROGRESS_FILE = 'output/progress.json';

export class AIAnalyzer {
  private client: Anthropic;
  private modelAnalysis: string;
  private modelMVP: string;

  constructor(apiKey: string, modelAnalysis: string = 'claude-3-haiku-20240307', modelMVP: string = 'claude-3-sonnet-20240229') {
    this.client = new Anthropic({ apiKey });
    this.modelAnalysis = modelAnalysis;
    this.modelMVP = modelMVP;
  }

  private saveProgress(ideas: ScoredIdea[], processedIds: string[]): void {
    const dir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ ideas, processedIds }, null, 2));
  }

  private loadProgress(): { ideas: ScoredIdea[], processedIds: string[] } | null {
    if (!fs.existsSync(PROGRESS_FILE)) {
      return null;
    }
    try {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private clearProgress(): void {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 2000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a retryable error
        const isRetryable =
          error?.status === 529 || // Overloaded
          error?.status === 503 || // Service Unavailable
          error?.status === 502 || // Bad Gateway
          error?.headers?.['x-should-retry'] === 'true';

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff: 2s, 4s, 8s
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`  ⏳ API перевантажений. Чекаємо ${delay/1000}с перед спробою ${attempt + 2}/${maxRetries + 1}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async analyzePost(post: RedditPost, keywordMatches?: KeywordMatch[], keywordScore?: number): Promise<ScoredIdea | null> {
    try {
      let keywordContext = '';
      if (keywordMatches && keywordMatches.length > 0) {
        const keywordsByCategory = keywordMatches.reduce((acc, m) => {
          if (!acc[m.category]) acc[m.category] = [];
          acc[m.category].push(m.keyword);
          return acc;
        }, {} as Record<string, string[]>);

        keywordContext = `\n\n🔍 ВАЖЛИВІ СИГНАЛИ (знайдені ключові слова):
${keywordsByCategory.money ? `💰 Готовність платити: ${keywordsByCategory.money.join(', ')}` : ''}
${keywordsByCategory.frustration ? `😤 Фрустрація: ${keywordsByCategory.frustration.join(', ')}` : ''}
${keywordsByCategory.request ? `💡 Запит на рішення: ${keywordsByCategory.request.join(', ')}` : ''}
${keywordsByCategory.switching ? `🔄 Перехід від існуючого: ${keywordsByCategory.switching.join(', ')}` : ''}

Оцінка ключових слів: ${keywordScore}/100 (вище = більше сигналів про готовність платити)
`;
      }

      const prompt = `Проаналізуй наступний пост з Reddit і визнач, чи описує він реальну проблему/біль користувача, яку можна вирішити через застосунок.

Заголовок: ${post.title}
Текст: ${post.selftext}
Subreddit: r/${post.subreddit}${keywordContext}

Оціни по двох критеріях (від 0 до 10):
1. problemScore - наскільки чітко описана проблема/біль
2. potentialScore - потенціал для створення застосунку (ринок, можливість реалізації, цінність)

ВАЖЛИВО: Якщо знайдені ключові слова про готовність платити (💰) - це ДУЖЕ сильний сигнал! Підвищ potentialScore.

Відповідь надай у форматі JSON:
{
  "isProblem": true/false,
  "problemScore": число від 0 до 10,
  "potentialScore": число від 0 до 10,
  "problemDescription": "короткий опис проблеми",
  "reasoning": "пояснення оцінок"
}

Якщо це не опис проблеми, встанови isProblem: false та всі оцінки в 0.`;

      // Using configurable model for post analysis with retry
      const message = await this.retryWithBackoff(() =>
        this.client.messages.create({
          model: this.modelAnalysis,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      );

      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const analysis = JSON.parse(jsonMatch[0]);

      if (!analysis.isProblem || analysis.problemScore < 5) {
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
        keywordScore
      };
    } catch (error: any) {
      if (error?.status === 400 && error?.message?.includes('credit balance')) {
        console.error('\n❌ ПОМИЛКА: Недостатньо коштів на Anthropic API');
        console.error('Рішення:');
        console.error('1. Відкрийте https://console.anthropic.com/');
        console.error('2. Перейдіть в розділ "Plans & Billing"');
        console.error('3. Натисніть "Buy credits" та придбайте кредити (мінімум $5)');
        console.error('\nПрогрес збережено. Після поповнення запустіть скрипт знову.\n');
        throw error;
      }
      console.error(`Error analyzing post ${post.id}:`, error);
      return null;
    }
  }

  async analyzePosts(posts: RedditPost[]): Promise<ScoredIdea[]> {
    const progress = this.loadProgress();
    let scoredIdeas: ScoredIdea[] = progress?.ideas || [];
    const processedIds: Set<string> = new Set(progress?.processedIds || []);

    const postsToAnalyze = posts.filter(p => !processedIds.has(p.id));

    if (progress) {
      console.log(`\n📂 Знайдено збережений прогрес:`);
      console.log(`   Вже проаналізовано: ${processedIds.size} постів`);
      console.log(`   Знайдено ідей: ${scoredIdeas.length}`);
      console.log(`   Залишилось: ${postsToAnalyze.length} постів\n`);
    }

    console.log(`\nAnalyzing ${postsToAnalyze.length} posts with AI (Claude 3 Haiku)...`);
    console.log(`⚠️  Приблизна вартість аналізу: ~$${(postsToAnalyze.length * 0.0005).toFixed(4)} USD\n`);

    for (let i = 0; i < postsToAnalyze.length; i++) {
      const post = postsToAnalyze[i];

      // Check if post has keyword data (PostWithKeywords)
      const postWithKeywords = (post as any).keywordMatches !== undefined ? post as any : null;
      const keywordMatches = postWithKeywords?.keywordMatches;
      const keywordScore = postWithKeywords?.keywordScore;

      const keywordInfo = keywordScore ? ` [Keywords: ${keywordScore}]` : '';
      console.log(`Analyzing ${i + 1}/${postsToAnalyze.length}: ${post.title.substring(0, 50)}...${keywordInfo}`);

      const scored = await this.analyzePost(post, keywordMatches, keywordScore);
      processedIds.add(post.id);

      if (scored) {
        scoredIdeas.push(scored);
        const keywordTag = scored.keywordScore ? ` 💎 KW:${scored.keywordScore}` : '';
        console.log(`  ✓ Score: ${scored.totalScore.toFixed(1)} (Problem: ${scored.problemScore}, Potential: ${scored.potentialScore})${keywordTag}`);
      } else {
        console.log(`  ✗ Not a viable problem/idea`);
      }

      if ((i + 1) % 10 === 0 || i === postsToAnalyze.length - 1) {
        this.saveProgress(scoredIdeas, Array.from(processedIds));
        console.log(`  💾 Progress saved (${i + 1}/${postsToAnalyze.length})`);
      }

      if (i < postsToAnalyze.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    scoredIdeas.sort((a, b) => b.totalScore - a.totalScore);

    console.log(`\nFound ${scoredIdeas.length} viable ideas`);
    this.clearProgress();
    return scoredIdeas;
  }

  async generateMVPSpec(idea: ScoredIdea): Promise<MVPSpecification> {
    try {
      const prompt = `На основі наступної проблеми з Reddit, створи детальну MVP-специфікацію для застосунку.

Проблема: ${idea.problemDescription}
Деталі з поста:
Заголовок: ${idea.post.title}
Текст: ${idea.post.selftext}
Subreddit: r/${idea.post.subreddit}

Створи детальну MVP-специфікацію, яка включає:

1. **Назва продукту** - коротка і запам'ятовувана назва

2. **Проблема** - чітке формулювання проблеми

3. **Цільова аудиторія** - хто буде користувачами

4. **Рішення** - як застосунок вирішує проблему

5. **Ключові функції MVP** (3-5 найважливіших функцій для першої версії)
   - Функція 1
   - Функція 2
   - ...

6. **Технічний стек** - рекомендовані технології

7. **Бізнес-модель** - як монетизувати

8. **Наступні кроки** - що робити для запуску

Відповідь надай детально українською мовою у форматі Markdown.`;

      // Using configurable model for MVP spec generation with retry
      const message = await this.retryWithBackoff(() =>
        this.client.messages.create({
          model: this.modelMVP,
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: prompt
          }]
        }),
        5, // More retries for MVP generation (expensive operation)
        3000 // Longer initial delay
      );

      const specification = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      return {
        idea,
        specification
      };
    } catch (error) {
      console.error(`Error generating MVP spec for post ${idea.post.id}:`, error);
      throw error;
    }
  }

  async generateTopMVPSpecs(ideas: ScoredIdea[], topN: number = 5): Promise<MVPSpecification[]> {
    const topIdeas = ideas.slice(0, Math.min(topN, ideas.length));
    const specs: MVPSpecification[] = [];

    console.log(`\nGenerating MVP specifications for top ${topIdeas.length} ideas...`);

    for (let i = 0; i < topIdeas.length; i++) {
      const idea = topIdeas[i];
      console.log(`\nGenerating MVP spec ${i + 1}/${topIdeas.length}:`);
      console.log(`  ${idea.problemDescription.substring(0, 80)}...`);

      try {
        const spec = await this.generateMVPSpec(idea);
        specs.push(spec);
        console.log(`  ✅ MVP spec generated successfully`);
      } catch (error: any) {
        // Handle server errors gracefully - don't stop the whole process
        if (error?.status === 500) {
          console.error(`  ⚠️  500 Internal Server Error - skipping this MVP (API server issue)`);
          console.error(`  💡 This is a temporary issue on Anthropic's side. You can try generating this MVP later.`);
        } else if (error?.status === 400 && error?.message?.includes('credit balance')) {
          console.error('\n❌ ПОМИЛКА: Недостатньо коштів на Anthropic API');
          console.error('Рішення:');
          console.error('1. Відкрийте https://console.anthropic.com/');
          console.error('2. Перейдіть в розділ "Plans & Billing"');
          console.error('3. Натисніть "Buy credits" та придбайте кредити (мінімум $5)\n');
          throw error; // Stop execution for payment issues
        } else {
          console.error(`  ❌ Error: ${error?.message || 'Unknown error'} - skipping this MVP`);
        }
        // Continue with next MVP instead of stopping
      }

      if (i < topIdeas.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return specs;
  }
}
