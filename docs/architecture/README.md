# Архітектура MealMind

## Призначення документа

Цей документ описує цільову архітектуру програмної системи MealMind, межі її основних компонентів, правила взаємодії між ними та ключові технічні обмеження.

На етапі PR-001 наведена архітектура є затвердженим напрямом проєктування, а не твердженням про завершену реалізацію. Фактичний стан системи має уточнюватися під час кожного наступного етапу розробки.

Суттєві архітектурні рішення, їх контекст, альтернативи та наслідки мають бути обґрунтовані у відповідній технічній документації.

## Архітектурні цілі

Архітектура MealMind має забезпечити:

- незалежний розвиток адміністративного та користувацького вебзастосунків;
- централізоване застосування бізнес-правил;
- ізоляцію даних різних сімей;
- детерміновані розрахунки харчової цінності, порцій і списку покупок;
- тестування API без запуску реального HTTP-порту;
- відтворюване локальне, тестове, staging і production середовище;
- контрольований розвиток функціональності без механічного накопичення технічного боргу;
- можливість еволюції системи без передчасного переходу до мікросервісів.

## Архітектурний стиль

MealMind проєктується як TypeScript-монорепозиторій із модульним монолітом на стороні API.

Монорепозиторій забезпечує узгоджені версії інструментів, спільні quality gates і атомарні зміни між API та вебзастосунками. Модульний моноліт дозволяє зберегти чіткі межі предметних областей без операційної складності розподіленої системи.

```text
┌──────────────────────┐       ┌──────────────────────┐
│      Web Client      │       │      Web Admin       │
│    Next.js / React   │       │    Next.js / React   │
└──────────┬───────────┘       └──────────┬───────────┘
           │                              │
           └──────────────┬───────────────┘
                          │ HTTPS / REST
                 ┌────────▼─────────┐
                 │   Express API    │
                 │ Modular Monolith │
                 └───────┬──────────┘
                         │
                    ┌────▼─────┐
                    │  Prisma  │
                    └────┬─────┘
                         │
                ┌────────▼─────────┐
                │     Supabase     │
                │ PostgreSQL/Auth  │
                │     Storage      │
                └──────────────────┘
```

## Структура монорепозиторію

```text
mealmind/
├── apps/
│   ├── api/
│   ├── web-admin/
│   └── web-client/
├── packages/
│   └── db/
├── docs/
├── .github/
├── package.json
├── turbo.json
└── tsconfig.base.json
```

Пакет `packages/contracts` може бути створений у майбутньому лише за наявності підтвердженого спільного використання транспортних контрактів. Доменна логіка не виноситься до спільного пакета без визначеного власника та практично обґрунтованої потреби.

## Контейнери системи

### Web Client

`apps/web-client` — користувацький Next.js-застосунок, орієнтований на mobile-first взаємодію.

Він відповідає за:

- authentication і session bootstrap;
- вибір активної сім’ї;
- керування доступними профілями учасників;
- пошук продуктів і рецептів;
- перегляд деталей та харчової цінності;
- роботу з вибраними продуктами й рецептами;
- тижневе планування харчування;
- налаштування порцій для учасників сім’ї;
- перегляд агрегованих показників плану;
- формування та використання списку покупок.

Web Client не є власником доменних розрахунків і не приймає остаточних authorization-рішень. Дані, розраховані клієнтом для попереднього перегляду, повторно перевіряються API.

### Web Admin

`apps/web-admin` — адміністративний Next.js-застосунок.

Він відповідає за:

- керування категоріями, брендами й іншими довідниками;
- керування продуктами та їх нутрієнтами;
- керування generic і branded products;
- керування рецептами, інгредієнтами та кроками;
- роботу з фотографіями й іншими медіаданими;
- керування статусами, публікацією та архівацією каталогових сутностей.

Наявність або приховування елементів керування в UI не є механізмом безпеки. Адміністративні права завжди повторно перевіряються API.

### API

`apps/api` — Express API і composition root системи.

API відповідає за:

- authentication та побудову перевіреного identity context;
- authorization у межах сім’ї та адміністративних операцій;
- валідацію параметрів, query і request body;
- координацію прикладних сценаріїв;
- застосування доменних правил;
- керування транзакціями;
- доступ до даних через repositories;
- інтеграцію із Supabase Storage;
- формування стабільних транспортних контрактів;
- logging, error handling, health і readiness checks.

Зовнішні REST endpoints версіонуються під префіксом `/api/v1`.

Створення Express application відокремлюється від запуску HTTP server. Функція на зразок `createApp(dependencies)` повинна дозволяти integration testing без відкриття реального мережевого порту.

### Database package

`packages/db`, опублікований усередині workspace як `@mealmind/db`, володіє:

- Prisma schema;
- історією прикладних migrations;
- Prisma client factory і lifecycle;
- reference seeds;
- development fixtures;
- database test utilities.

Prisma є єдиним власником прикладної схеми PostgreSQL і migrations. Supabase CLI відповідає за локальну інфраструктуру, Auth і Storage, але не створює паралельну історію прикладної схеми.

### Contracts package

`packages/contracts` може містити транспортні схеми й типи, які фактично використовуються API та щонайменше одним клієнтом.

Пакет не повинен перетворюватися на невизначений набір загальних типів. Prisma models, Express types і внутрішні domain entities не експортуються клієнтським застосункам.

### Supabase

Supabase використовується як керована платформа для:

- PostgreSQL;
- authentication;
- object storage.

Local, test, staging і production використовують ізольовані databases, buckets, projects і credentials. Production service-role credentials ніколи не передаються до браузера та не зберігаються в Git.

### Sentry

Sentry використовується для контрольованого збору неочікуваних помилок у `web-client`, `web-admin` та `api`.

Для кожного deployable application передбачається окремий Sentry project. Події не повинні містити tokens, cookies, request bodies, алергії, антропометричні параметри або інші чутливі профільні дані.

## Бізнес-модулі API

### Reference Data

Модуль володіє довідниками, необхідними іншим предметним областям:

- категоріями продуктів;
- брендами;
- нутрієнтами;
- одиницями вимірювання;
- типами рецептів;
- типами прийомів їжі;
- дієтичними та іншими класифікаційними ознаками.

Модуль визначає стабільний порядок, правила унікальності та структуру ієрархічних довідників.

### Products and Media

Модуль володіє:

- життєвим циклом продуктів;
- generic і branded variants;
- зв’язками продуктів із категоріями, брендами та нутрієнтами;
- статусами й архівацією;
- метаданими фотографій;
- контрольованим життєвим циклом об’єктів у Storage.

Операції, які одночасно змінюють продукт і його зв’язки, мають явну transaction boundary.

### Recipes and Nutrition

Модуль володіє:

- рецептами;
- інгредієнтами та їх порядком;
- кроками приготування та їх порядком;
- кількістю порцій і вихідною вагою;
- авторами, джерелами й медіаданими;
- статусами публікації;
- правилами розрахунку харчової цінності.

Розрахунок харчової цінності реалізується як детермінований domain service або pure calculator. Формули, одиниці, округлення й поведінка за відсутності даних документуються та тестуються.

### Identity and Family

Модуль володіє:

- зв’язком зовнішньої identity з локальним користувачем;
- сім’ями;
- membership і ролями;
- активним сімейним контекстом;
- профілями учасників;
- харчовими вподобаннями, алергіями й обмеженнями;
- правилами доступу до сімейних даних.

Профіль учасника може представляти зареєстрованого користувача або залежного учасника без власного облікового запису.

### Food Discovery and Favorites

Модуль надає прикладні read models для:

- уніфікованого пошуку продуктів і рецептів;
- стабільного сортування, фільтрації та pagination;
- перегляду деталей продукту;
- перегляду деталей рецепта;
- керування вибраними сутностями.

Canonical data продуктів і рецептів залишаються у відповідних модулях. Search є application query, а не новим власником цих даних.

### Meal Planning

Модуль володіє:

- тижневим сімейним планом;
- meal entries;
- прив’язкою до дати, прийому їжі та учасника;
- статусами запланованих позицій;
- персоналізацією порцій;
- канонічним сортуванням і групуванням;
- агрегацією харчової цінності;
- batch-сценаріями для кількох учасників і днів.

Backend є єдиним власником calendar, timezone, sorting і aggregation semantics. Представлення за днем, прийомом їжі та учасником використовують один канонічний стан плану.

### Shopping List

Модуль формує список покупок на основі вибраного сімейного плану.

Він відповідає за:

- отримання запланованих продуктів і рецептів;
- розгортання рецептів до інгредієнтів;
- масштабування кількості інгредієнтів відповідно до персоналізованих порцій;
- включення продуктів, доданих до плану безпосередньо;
- нормалізацію сумісних одиниць вимірювання;
- агрегацію однакових продуктів;
- групування позицій за категоріями;
- збереження походження розрахованих позицій.

Shopping List читає канонічні дані Meal Planning, Recipes and Nutrition та Products через явні application contracts. Він не дублює recipe або meal-plan logic на frontend.

На початковому етапі до модуля не входять облік домашніх запасів, ціни, бюджетна оптимізація, вибір магазину, доставка або прогнозування закупівель.

## Внутрішня структура API-модуля

Рекомендований напрям залежностей:

```text
Router
  ↓
Controller
  ↓
Application Service
  ↓
Domain Policy / Calculator
  ↓
Repository Port
  ↓
Prisma Repository
```

Presenter формує transport response і не відкриває persistence-only fields.

### Відповідальність шарів

#### Router

- визначає HTTP method і path;
- підключає authentication, authorization та validation middleware;
- передає керування Controller.

#### Controller

- перетворює перевірений HTTP input на application command або query;
- викликає один прикладний сценарій;
- повертає результат через Presenter;
- не містить бізнес-логіки й не звертається до Prisma.

#### Application Service

- координує use case;
- застосовує authorization policy;
- визначає transaction boundary;
- викликає domain services і repository ports;
- не залежить від Express.

#### Domain Policy або Calculator

- реалізує бізнес-правила та обчислення;
- не залежить від HTTP, UI або persistence framework;
- за можливості є pure і детермінованим;
- покривається unit tests.

#### Repository

- реалізує persistence та query operations;
- приховує Prisma-specific details від application layer;
- не визначає transport response shape.

#### Presenter

- формує стабільну зовнішню модель;
- виконує дозволене форматування й mapping;
- не змінює бізнес-значення даних.

## Архітектурні правила

- Router і Controller не звертаються до Prisma напряму.
- Domain та Application layers не імпортують Express types.
- Application Service координує use case і transaction boundary.
- Repository відповідає за persistence і queries.
- Presenter відповідає за зовнішню форму відповіді.
- Залежності передаються явно через factories або constructors.
- Singleton допускається лише в composition root.
- Доменні обчислення реалізуються як pure functions або ізольовані services, де це практично.
- Fire-and-forget operations без ownership, retry та failure policy заборонені.
- Frontend не дублює серверну агрегацію і authorization rules.
- Клієнтські `userId` і `familyId` не є доказом identity або access.
- Між `web-admin` і `web-client` немає прямих імпортів.
- Shared abstractions створюються після підтвердженого повторного використання.
- Persistence entities не використовуються як публічні API contracts.
- Бізнес-правило має одного визначеного власника.

## Frontend-архітектура

Обидва frontend-застосунки використовують feature-oriented structure:

```text
src/
├── app/
├── features/
└── shared/
```

- `app` відповідає за routes, layouts, providers і композицію сторінок;
- `features` містить завершені користувацькі сценарії;
- `shared` містить інфраструктуру та повторно використовувані UI primitives;
- App Router page отримує route context і компонує feature screen;
- server state керується через TanStack Query;
- форми реалізуються через React Hook Form і schema validation;
- локальний UI/draft state може зберігатися в Zustand лише за наявності чіткої lifecycle та isolation policy.

Компонент переноситься до `shared` після другого підтвердженого використання або якщо він є інфраструктурним primitive.

## Дані та обчислення

### Харчова цінність

Формула розрахунку, базові одиниці, правила конвертації, округлення та missing-data policy повинні бути задокументовані й протестовані.

Відсутнє значення нутрієнта не повинно непомітно трактуватися як підтверджений нуль.

### План харчування

Backend є власником:

- початку тижня;
- timezone і calendar-date semantics;
- канонічного сортування;
- групування;
- масштабування порцій;
- агрегації харчової цінності;
- authorization сімейного контексту.

### Список покупок

Алгоритм формування списку повинен:

1. отримати записи плану для визначеної сім’ї та періоду;
2. перевірити доступ користувача до плану;
3. розгорнути рецепти до інгредієнтів;
4. застосувати масштабування персоналізованих порцій;
5. додати безпосередньо заплановані продукти;
6. нормалізувати лише сумісні одиниці;
7. агрегувати однакові продукти;
8. згрупувати результат за категоріями;
9. зберегти зв’язок між результатом і його джерелами.

Несумісні або невідомі одиниці не об’єднуються з втратою інформації. Сервер повторно обчислює список і не довіряє totals, отриманим від клієнта.

## Authentication та authorization

Identity provider adapter перевіряє token і повертає стабільний зовнішній subject. Після цього система знаходить локального користувача та membership в активній сім’ї.

```text
Bearer token
  ↓
Identity verification
  ↓
Local user lookup
  ↓
Family membership lookup
  ↓
Verified request context
  ↓
Application authorization policy
```

Жоден endpoint не повинен довіряти caller-supplied `userId` або `familyId` без server-side policy check. Development identity adapter допускається лише поза production і не може вмикатися production-конфігурацією.

## Безпека та приватність

MealMind може обробляти харчові вподобання, алергії, антропометричні параметри й інші чутливі профільні дані.

Застосовуються такі правила:

- збираються лише дані, необхідні для функцій системи;
- доступ до сімейних даних перевіряється через membership і роль;
- service-role key не потрапляє до browser bundle;
- секрети не зберігаються в Git;
- production, staging, test і local мають різні credentials;
- чутливі дані не потрапляють до logs або Sentry;
- validation errors не містять secret values;
- upload operations перевіряють MIME type, size та ownership;
- передбачаються процедури експорту й видалення персональних даних;
- MealMind не подається як медичний виріб і не замінює консультацію фахівця.

## Runtime-конфігурація

Кожний deployable application перевіряє власні environment variables на startup boundary.

Конфігурація поділяється на:

- server-only variables;
- дозволені browser variables із префіксом `NEXT_PUBLIC_`;
- build-only credentials;
- non-secret deployment metadata.

Environment variable повинна мати owner, purpose, environment і classification. Secret values не записуються в `.env.example`, документацію або CI logs.

## Обробка помилок

API використовує стандартизовану hierarchy прикладних помилок і один error response contract.

Очікувані domain/application errors перетворюються на визначені HTTP status codes. Неочікувані помилки реєструються з request ID, але зовнішня відповідь не містить stack trace, SQL, credentials або внутрішні implementation details.

Frontend перетворює API errors на узгоджені loading, empty, forbidden, not-found і failure states.

## Спостережуваність

Мінімальний production baseline включає:

- `/health` для перевірки працездатності процесу;
- `/ready` для перевірки готовності залежностей;
- structured API logs;
- request/correlation ID;
- стандартизовані error responses;
- Sentry error tracking для трьох застосунків;
- release і commit metadata;
- uptime check для API;
- alert на недоступність API.

Performance tracing, profiling або розширені metrics додаються лише після появи вимірюваної потреби й окремого privacy review.

## Розгортання

Цільова production topology:

```text
mealmind.in.ua          → Vercel web-client
admin.mealmind.in.ua    → Vercel web-admin
api.mealmind.in.ua      → Render API
PostgreSQL/Auth/Storage → Supabase
Error tracking          → Sentry
```

Vercel Preview, staging і production не повинні використовувати спільні production credentials. Database migrations виконуються контрольовано перед application rollout із перевіркою сумісності.

Для production мають бути задокументовані deployment, rollback, migration failure, backup/restore та incident response procedures.

## Якість і тестування

Тестування є risk-based. Формальна мета 100% coverage не встановлюється.

Основні рівні:

- unit tests для calculators, policies, schemas і mappers;
- integration tests для repositories, transactions та API;
- component tests для frontend behavior;
- accessibility smoke tests;
- E2E smoke tests для критичних наскрізних сценаріїв;
- tenant-isolation security tests;
- migration smoke tests на чистій PostgreSQL;
- performance smoke tests для search і складних read models.

Кожний pull request проходить релевантні перевірки formatting, lint, typecheck, tests і build. Warnings у CI вважаються помилками.

## Архітектурна документація

До завершення дипломного release мають бути актуальними:

- C4 context diagram;
- C4 container diagram;
- component diagrams для критичних модулів;
- ERD;
- data dictionary;
- deployment diagram;
- ADR index;
- API/OpenAPI documentation;
- test strategy;
- traceability matrix `requirement → PR → test`.

Документація повинна відрізняти реалізовані можливості від запланованих і прямо називати відомі обмеження.

## Еволюція архітектури

Модульний моноліт є цільовою архітектурою дипломного MVP. Виділення окремого модуля в незалежний сервіс може розглядатися лише за наявності одного або кількох підтверджених факторів:

- незалежне масштабування;
- окремий deployment lifecycle;
- окрема команда-власник;
- ізоляційні або regulatory requirements;
- вимірювана проблема продуктивності чи надійності.

Наявність логічного бізнес-модуля сама по собі не є підставою для створення мікросервісу.

## Пов’язані документи

- [Бачення продукту](../product/vision.md)
- [Межі MVP](../product/mvp-scope.md)
