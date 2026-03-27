import fs from 'fs';
import path from 'path';
import { ScoredIdea, MVPSpecification } from './types.js';

const OUTPUT_DIR = 'output';

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

export function saveIdeas(ideas: ScoredIdea[], filename: string = 'ideas.json'): void {
  ensureOutputDir();
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(ideas, null, 2));
  console.log(`\nSaved ${ideas.length} ideas to ${filepath}`);
}

export function saveMVPSpecs(specs: MVPSpecification[]): void {
  ensureOutputDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

  specs.forEach((spec, index) => {
    const filename = `mvp-spec-${timestamp}-${index + 1}.md`;
    const filepath = path.join(OUTPUT_DIR, filename);

    const keywordInfo = spec.idea.keywordMatches && spec.idea.keywordMatches.length > 0
      ? `\n**🔍 Ключові сигнали** (оцінка: ${spec.idea.keywordScore}/100):\n${spec.idea.keywordMatches.map(m => {
          const emoji = m.category === 'money' ? '💰' : m.category === 'frustration' ? '😤' : m.category === 'request' ? '💡' : '🔄';
          return `- ${emoji} ${m.category}: "${m.keyword}" (${m.count}x)`;
        }).join('\n')}\n`
      : '';

    const content = `# MVP Специфікація ${index + 1}

**Оцінка**: ${spec.idea.totalScore.toFixed(1)}/10 (Проблема: ${spec.idea.problemScore}, Потенціал: ${spec.idea.potentialScore})
${keywordInfo}
**Джерело**: [r/${spec.idea.post.subreddit}](${spec.idea.post.permalink})

**Оригінальний пост**:
> ${spec.idea.post.title}

---

${spec.specification}

---

## Оригінальний текст з Reddit

${spec.idea.post.selftext}

---

*Згенеровано: ${new Date().toLocaleString('uk-UA')}*
`;

    fs.writeFileSync(filepath, content);
    console.log(`Saved: ${filepath}`);
  });

  const summaryFilename = `mvp-specs-summary-${timestamp}.md`;
  const summaryFilepath = path.join(OUTPUT_DIR, summaryFilename);

  const summaryContent = `# Підсумок MVP Специфікацій

**Дата**: ${new Date().toLocaleString('uk-UA')}
**Знайдено ідей**: ${specs.length}

## Список ідей (за рейтингом)

${specs.map((spec, index) => {
  const hasMoney = spec.idea.keywordMatches?.some(m => m.category === 'money');
  const moneyTag = hasMoney ? ' 💰 ГОТОВНІСТЬ ПЛАТИТИ' : '';
  const kwScore = spec.idea.keywordScore ? ` | Ключові слова: ${spec.idea.keywordScore}/100` : '';

  return `
### ${index + 1}. ${spec.idea.problemDescription}${moneyTag}

- **Оцінка**: ${spec.idea.totalScore.toFixed(1)}/10
- **Проблема**: ${spec.idea.problemScore}/10
- **Потенціал**: ${spec.idea.potentialScore}/10${kwScore}
- **Subreddit**: r/${spec.idea.post.subreddit}
- **Пост**: [${spec.idea.post.title}](${spec.idea.post.permalink})
- **Файл**: \`mvp-spec-${timestamp}-${index + 1}.md\`

**Короткий опис проблеми**: ${spec.idea.problemDescription}

---
`;
}).join('\n')}

*Згенеровано автоматично Reddit Idea Scraper*
`;

  fs.writeFileSync(summaryFilepath, summaryContent);
  console.log(`\nSummary saved to ${summaryFilepath}`);
}
