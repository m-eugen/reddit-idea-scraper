# Швидкий довідник

## 🚀 Базові команди

```bash
# Запустити скрипт
npm run dev

# Встановити залежності
npm install

# Перевірити API ключ
node test-api-key.js

# Збудувати проєкт
npm run build

# Запустити зібраний проєкт
npm start
```

---

## ⏰ Коли запускати?

| Мета | Частота | Коли |
|------|---------|------|
| 🎯 Знайти ідею швидко | Щодня (тиждень) | Пн, Ср, Пт |
| 💼 Регулярний моніторинг | Раз на тиждень | Середа 08:00 |
| 📅 Дайджест трендів | Раз на місяць | 1-ше число |
| 🔥 Валідація ідеї | 3 рази за 2 тижні | День 0, 7, 14 |

**Детальніше:** [SCHEDULING.md](SCHEDULING.md)

---

## 🔧 Налаштування .env

```env
# API ключ (обов'язково!)
ANTHROPIC_API_KEY=sk-ant-api03-ваш_ключ

# Subreddit'и
SUBREDDITS=SaaS,Entrepreneur,startups,indiehackers

# Налаштування
MAX_POSTS_PER_SUBREDDIT=50
MIN_SCORE_THRESHOLD=10

# Моделі
MODEL_ANALYSIS=claude-haiku-4-5
MODEL_MVP=claude-sonnet-4-6

# Ключові слова
MONEY_KEYWORDS=I'd pay for,take my money
FRUSTRATION_KEYWORDS=frustrated with,hate that
REQUEST_KEYWORDS=is there a tool,someone should build
SWITCHING_KEYWORDS=alternative to,stopped using
```

---

## 💰 Ключові слова (категорії)

| Emoji | Категорія | Вага | Приклади |
|-------|-----------|------|----------|
| 💰 | Money | 10 | "I'd pay for", "take my money" |
| 😤 | Frustration | 7 | "drives me crazy", "hate that" |
| 💡 | Request | 6 | "someone should build", "is there a tool" |
| 🔄 | Switching | 5 | "alternative to", "stopped using" |

**Детальніше:** [KEYWORDS.md](KEYWORDS.md)

---

## 📊 Вартість

| Операція | Модель | Вартість |
|----------|--------|----------|
| Аналіз 1 поста | Haiku | ~$0.0007 |
| 1 MVP-специфікація | Sonnet | ~$0.05 |
| **Повний запуск** (50+5) | Обидві | **~$0.29** |

**За $5:** 17-18 повних запусків

**Детальніше:** [OPTIMIZATION.md](OPTIMIZATION.md)

---

## 🎯 Моделі Claude

### Claude 4 (рекомендовано)

```env
MODEL_ANALYSIS=claude-haiku-4-5    # Швидкий і дешевий
MODEL_MVP=claude-sonnet-4-6        # Якісний
```

### Claude 3 (якщо 4 не працює)

```env
MODEL_ANALYSIS=claude-3-haiku-20240307
MODEL_MVP=claude-3-sonnet-20240229
```

**Детальніше:** [MODEL_SETUP.md](MODEL_SETUP.md)

---

## ❌ Помилки

| Помилка | Рішення |
|---------|---------|
| 529 Overloaded | ✅ Автоматичний retry (2с, 4с, 8с) |
| 500 Server Error | ⚠️ Пропускає, продовжує далі |
| 401 Auth | Новий API ключ в `.env` |
| 400 No Credits | Buy credits ($5 мінімум) |
| 404 Model | Змініть модель в `.env` |

**Детальніше:** [ERROR_HANDLING.md](ERROR_HANDLING.md)

---

## 📁 Структура результатів

```
output/
├── ideas.json              # Всі ідеї з оцінками
├── mvp-specs-summary-*.md  # Підсумок
├── mvp-spec-*-1.md         # MVP специфікація #1
├── mvp-spec-*-2.md         # MVP специфікація #2
└── progress.json           # Прогрес (авто)
```

---

## 🔍 Корисні команди

```bash
# Подивитись знайдені ідеї
cat output/ideas.json | jq '.[].problemDescription'

# Показати тільки money ідеї
cat output/ideas.json | jq '.[] | select(.keywordMatches[]?.category == "money")'

# Показати топ 5 за оцінкою
cat output/ideas.json | jq 'sort_by(.totalScore) | reverse | .[0:5]'

# Кількість знайдених ідей
cat output/ideas.json | jq 'length'

# Очистити прогрес (почати з нуля)
rm output/progress.json
```

---

## ⚡ Швидкий старт

### 1. Перший раз

```bash
# Клонуйте/створіть проєкт
cd reddit-scraper

# Встановіть
npm install

# Налаштуйте .env
cp .env.example .env
nano .env  # Додайте API ключ

# Купіть API credits ($5)
# https://console.anthropic.com/

# Запустіть!
npm run dev
```

### 2. Наступні рази

```bash
npm run dev
```

Все! ✨

---

## 🎓 Документація

| Файл | Опис |
|------|------|
| [README.md](README.md) | Загальний огляд |
| [QUICK_START.md](QUICK_START.md) | Швидкий старт |
| [KEYWORDS.md](KEYWORDS.md) | 🔥 Система ключових слів |
| [SCHEDULING.md](SCHEDULING.md) | 📅 Коли запускати |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | ❌ Обробка помилок |
| [MODEL_SETUP.md](MODEL_SETUP.md) | 🤖 Налаштування моделей |
| [ANTHROPIC_SETUP.md](ANTHROPIC_SETUP.md) | 💳 Налаштування API |
| [OPTIMIZATION.md](OPTIMIZATION.md) | 💰 Економія витрат |
| [CHANGELOG.md](CHANGELOG.md) | 📝 Історія змін |

---

## 💡 Приклади використання

### Знайти ідеї для B2B SaaS

```env
SUBREDDITS=SaaS,Entrepreneur,smallbusiness
MONEY_KEYWORDS=budget approved,roi,worth the investment
```

### Знайти ідеї для developer tools

```env
SUBREDDITS=webdev,programming,devops
FRUSTRATION_KEYWORDS=bad dx,slow build,terrible api
```

### Знайти ідеї з готовністю платити

```env
MIN_KEYWORD_SCORE=10  # Тільки з money keywords
```

(Змінити в `src/index.ts` → `filterAndScorePosts`)

---

## 🤖 Автоматизація

### Щотижневий запуск (cron)

```bash
crontab -e

# Додайте (кожну середу о 08:00)
0 8 * * 3 cd /path/to/reddit-scraper && npm run dev
```

### GitHub Actions

Створіть `.github/workflows/scrape.yml` - див. [SCHEDULING.md](SCHEDULING.md)

---

## 📞 Підтримка

- **GitHub Issues**: https://github.com/your-repo/issues
- **Anthropic Support**: https://support.anthropic.com/
- **API Status**: https://status.anthropic.com/

---

## ⚠️ Швидкі виправлення

### API ключ не працює
```bash
# Створіть новий ключ
# https://console.anthropic.com/settings/keys

# Оновіть .env
nano .env
```

### Недостатньо коштів
```bash
# Купіть credits
# https://console.anthropic.com/ → Buy credits
```

### Overloaded (529)
```bash
# Нічого не робіть - автоматичний retry!
# Або зачекайте 5-10 хв і запустіть знову
```

### Модель не знайдена (404)
```bash
# Змініть модель в .env
MODEL_MVP=claude-3-sonnet-20240229
```

---

## 🎯 Чеклист для успіху

- [ ] API ключ в `.env`
- [ ] Купили API credits ($5+)
- [ ] Налаштували ключові слова
- [ ] Вибрали subreddit'и
- [ ] Запустили: `npm run dev`
- [ ] Перевірили `output/`
- [ ] Обрали найкращу ідею
- [ ] Почали будувати MVP! 🚀

---

**Все готово! Запускайте та знаходьте мільйонні ідеї!** 💎

```bash
npm run dev
```
