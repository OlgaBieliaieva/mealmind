# Спостережуваність і Sentry

## Призначення

Цей документ визначає production baseline спостережуваності MealMind і правила
використання Sentry у трьох deployable applications:

- `apps/web-client`;
- `apps/web-admin`;
- `apps/api`.

Мета інтеграції — швидко знаходити та діагностувати неочікувані production
exceptions без створення важкого observability stack і без передавання
чутливих даних MealMind сторонньому сервісу.

Sentry доповнює, але не замінює:

- структуровані application logs;
- `x-request-id`;
- `/health` і `/ready`;
- зовнішню uptime-перевірку API;
- platform logs Vercel, Render і Supabase.

## Топологія

Використовується одна Sentry Cloud organization із трьома окремими projects.

| Sentry project        | Repository scope  | Runtime                                                  | Deployment |
| --------------------- | ----------------- | -------------------------------------------------------- | ---------- |
| `mealmind-web-client` | `apps/web-client` | Browser, Next.js Node та Edge за фактичного використання | Vercel     |
| `mealmind-web-admin`  | `apps/web-admin`  | Browser, Next.js Node та Edge за фактичного використання | Vercel     |
| `mealmind-api`        | `apps/api`        | Node.js / Express                                        | Render     |

Projects мають окремі DSN, issue streams і alert rules. Ownership і
діагностика залишаються розділеними, а organization та notification channel —
спільними.

## Event contract

Подія, де відповідні дані доступні, містить:

| Поле або tag  | Значення                                              |
| ------------- | ----------------------------------------------------- |
| `environment` | `preview`, `staging` або `production`                 |
| `release`     | `<application>@<git-sha>`                             |
| `application` | `web-client`, `web-admin` або `api`                   |
| `runtime`     | `browser`, `node`, `edge` або `express`               |
| `request_id`  | Технічний request/correlation ID без бізнес-семантики |
| exception     | Тип, sanitized message і stack trace                  |

`request_id` використовується для зіставлення Sentry event зі structured API
log. Він не є секретом, доказом identity або idempotency key.

## Privacy defaults

У всіх SDK застосовуються такі defaults:

- `sendDefaultPii: false`;
- `tracesSampleRate: 0`;
- Session Replay вимкнено;
- Profiling вимкнено;
- Sentry Logs вимкнено;
- User Feedback вимкнено;
- attachments не надсилаються;
- local variables не збираються;
- user context за замовчуванням не встановлюється.

Application-side sanitizer або `beforeSend` видаляє:

- `authorization`, `cookie`, `set-cookie` та подібні headers;
- request і response body;
- token-like query values;
- email та ім'я;
- дату народження і біологічну стать;
- вагу, зріст та інші антропометричні дані;
- алергії, дієтичні обмеження і цілі;
- назви спожитих страв, кількості та nutrient values;
- довільні extra/context fields із відомими sensitive keys.

Unknown payload не повинен автоматично вважатися безпечним. Для потенційно
чутливих структур застосовується allowlist metadata, а не накопичувальний
denylist усіх можливих персональних полів.

Server-side Data Scrubbing у Sentry є додатковим захистом. Воно не замінює
application-side sanitization.

## Next.js integration

Обидва Next.js applications використовують `@sentry/nextjs`.

Інтеграція охоплює:

- browser initialization;
- Node server initialization;
- Edge initialization лише якщо Edge runtime фактично використовується;
- App Router global error boundary;
- capture server request errors у підтримуваній SDK точці інтеграції;
- source-map upload під час Vercel build;
- окремий DSN для кожного application.

У local development і automated tests event transport вимкнено за
замовчуванням. Відсутність DSN поза production не є startup error.

У production відсутня обов'язкова Sentry-конфігурація повинна бути помітною в
deployment validation, але збій зовнішнього Sentry transport не повинен
порушувати rendering або основний application flow.

## Express integration

API використовує `@sentry/node`.

Initialization виконується до імпорту модулів, які мають бути
інструментовані. Sentry Express error handler підключається після routes і до
власного final error middleware згідно з contract поточної SDK-інтеграції.

API передає до event:

- `application=api`;
- `runtime=express`;
- `request_id`, якщо його вже встановлено request context;
- environment і release із validated runtime configuration.

Неочікувані `5xx` errors capture-яться один раз. Очікувані application/domain
errors не повинні створювати шум, якщо вони коректно відображені у визначений
HTTP contract.

Під час graceful shutdown API виконує flush pending events із коротким
обмеженим timeout. Невдалий flush не блокує завершення процесу безмежно.

## Releases і source maps

Release має однакове значення під час build і runtime:

```text
<application>@<git-sha>
```

Приклади:

```text
web-client@a1b2c3d
web-admin@a1b2c3d
api@a1b2c3d
```

Source maps завантажуються build credential `SENTRY_AUTH_TOKEN`. Token:

- зберігається лише в Vercel, Render або CI secrets;
- не додається до Git;
- не має префікса `NEXT_PUBLIC_`;
- не потрапляє до runtime browser bundle;
- має мінімально необхідні права для release/source-map operation.

Перевірка успішної інтеграції вважається завершеною лише тоді, коли staging
stack trace вказує на TypeScript source і коректний release, а не тільки коли
event з'явився в Sentry.

## Alerts

Для кожного project налаштовуються мінімальні production alerts:

1. перша поява нового issue;
2. regression раніше resolved issue;
3. різкий сплеск кількості events.

Preview events не надсилаються до production notification channel. Alert
notification містить посилання на issue, application, environment і release,
але не копіює potential sensitive payload у сторонні канали.

Автоматичний paging і складна on-call схема не входять до MVP.

## Failure policy

Sentry є необов'язковою зовнішньою observability dependency.

- недоступність ingestion endpoint не змінює HTTP response;
- event capture не додає fire-and-forget operation без SDK ownership;
- sanitizer failure не повинен призводити до надсилання unsanitized event;
- відсутність DSN у local/test вимикає transport;
- debug routes і test buttons не залишаються доступними у production.

## Пов'язані документи

- [Runtime-конфігурація та середовища](../setup/runtime-configuration.md)
- [Налаштування Sentry](../operations/sentry-setup.md)
- [Обробка observability-інцидентів](../operations/incident-response.md)
- [Стратегія тестування](../testing-strategy.md)
- [Контракти REST API](./api-contracts.md)
