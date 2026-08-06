# Стратегія тестування MealMind

## Призначення

Стратегія визначає рівні, інструменти та правила автоматизованого тестування MealMind. Її мета — зменшити ризик регресій у критичній поведінці системи та забезпечити відтворювані докази якості програмного забезпечення.

Тестування застосовує ризик-орієнтований підхід. Пріоритет перевірки зростає разом із можливим впливом дефекту на цілісність даних, авторизацію, приватність, розрахунки та основні користувацькі сценарії. Проєкт не встановлює штучної вимоги досягти 100% покриття коду.

## Рівні тестування

### Unit-тести

Unit-тести перевіряють ізольовані функції та доменні правила без мережі, бази даних і зовнішніх сервісів. Вони є основним засобом перевірки розрахунків, перетворень, валідації та переходів між станами.

Unit-тест розташовується поруч із кодом і має назву `*.test.ts`.

### Component-тести

Component-тести перевіряють спостережувану поведінку React-компонентів: доступний текст, елементи керування, стани завантаження, помилки та реакцію на дії користувача. Внутрішні деталі реалізації, CSS-класи й структура компонентів без поведінкового значення не є самостійними цілями тестування.

Component-тест розташовується поруч із компонентом і має назву `*.test.tsx`. Для тестів використовується Testing Library із запитами, наближеними до способу взаємодії користувача з інтерфейсом.

Синхронні Next.js Server Components можна перевіряти компонентними тестами. Для асинхронних Server Components із серверним отриманням даних перевага надається integration- або E2E-тестам, оскільки вони точніше відтворюють середовище виконання Next.js.

### Integration-тести

Integration-тести перевіряють взаємодію між кількома частинами системи: HTTP-маршрутами, middleware, сервісами, репозиторіями та базою даних.

Для Express API використовується Supertest. Express application передається в тест без виклику `listen()`, тому перевірка HTTP-контракту не потребує окремого мережевого порту. Тести, що працюватимуть із базою даних, повинні використовувати ізольоване тестове середовище, а не development або production database.

Integration-тести мають назву `*.test.ts`. Спільні fixtures допускається розміщувати в окремій директорії `tests/fixtures` відповідного workspace, коли повторне використання буде практично обґрунтоване.

### E2E-тести

E2E-тести перевірятимуть наскрізні сценарії через реальний користувацький інтерфейс і запущені компоненти системи. До них належатимуть лише критичні сценарії MVP, які неможливо достатньо надійно перевірити на нижчих рівнях.

E2E-інфраструктура додається окремо після появи завершених наскрізних сценаріїв. Такі тести матимуть назву `*.spec.ts` і розміщуватимуться в окремій директорії `e2e/`.

## Інструменти

- **Vitest** — запуск unit-, component- та integration-тестів;
- **Testing Library** — перевірка поведінки React-компонентів;
- **Supertest** — перевірка HTTP-маршрутів Express без запуску окремого порту;
- **V8 coverage** — формування текстового, HTML- та LCOV-звітів про покриття.
- **HTML Validate** — локальна перевірка валідності й семантичної структури
  згенерованої HTML-розмітки;
- **axe-core** — автоматизована перевірка доступності React-компонентів і
  composition fixtures.

Поточний базовий набір містить integration-тест `GET /health` для API, по одному component smoke test для Web Admin і Web Client, database smoke tests для baseline migration та reference seed, а також unit tests політики Sentry event sanitization і transport mocks для observability metadata. E2E-тести будуть додані разом із завершеними наскрізними сценаріями.

## Валідність розмітки та доступність

Цільовим рівнем доступності web-застосунків MealMind є WCAG 2.2 Level AA.

`npm run test:ui-quality` перевіряє композиції application shell, навігації,
форм, modal dialogs і стандартних page states в обох web workspace.

Автоматизована перевірка складається з двох рівнів:

- HTML Validate перевіряє синтаксичну валідність, вкладеність елементів,
  обов’язкові атрибути та частину семантичних правил HTML;
- axe-core перевіряє доступні назви, ARIA, landmarks, структуру форм,
  навігацію та автоматизовану частину вимог WCAG.

Автоматизований тест не доводить повну відповідність WCAG 2.2 AA. JSDOM не
відтворює реальний layout, CSS rendering, browser focus navigation або
візуальне сприйняття. Зокрема, правило `color-contrast` вимкнено в JSDOM і
перевіряється в реальному браузері.

Перед завершенням frontend pull request вручну перевіряються:

- керування тільки клавіатурою;
- видимість і логічний порядок focus;
- skip link і переміщення до основного вмісту;
- focus behavior і закриття modal dialogs;
- послідовна ієрархія заголовків;
- читабельність і контраст тексту та controls;
- масштаб браузера 200%;
- відсутність горизонтального overflow на ширині 320 CSS px;
- loading, empty, error і disabled states.

Зовнішній W3C validation service не використовується як обов’язковий CI gate,
оскільки перевірки повинні бути локальними, детермінованими та не передавати
розмітку сторонньому сервісу.

### Перевірки бази даних

Database foundation перевіряється в окремій локальній базі `mealmind_test`, а не в development database `postgres`. Тестовий helper:

- дозволяє роботу лише з локальним PostgreSQL на порту Supabase CLI `54322` і базою з точною назвою `mealmind_test`;
- відтворює чисту тестову базу перед кожним сценарієм;
- застосовує baseline migration і перевіряє таблицю `_prisma_migrations`;
- запускає reference seed двічі та підтверджує його ідемпотентність;
- перевіряє точні кількості восьми довідників, унікальність UUID і кодів та незмінність службових часових міток під час повторного запуску.

Після baseline migration і reference seed окремий product repository integration test перевіряє на
реальному PostgreSQL:

- атомарне створення product разом із nutrients і portions;
- збереження relations, коли поле відсутнє в update, та явне очищення порожнім масивом;
- конфлікт duplicate GTIN;
- server-side search, count і pagination.

Окремий account repository integration test перевіряє:

- створення локального `User` із database default `USER`;
- ідемпотентний повторний bootstrap;
- unique email conflict для іншого external subject;
- відмову автоматично відновлювати soft-deleted account.

Auth unit/component tests окремо перевіряють identity-only bootstrap, заборону
role injection, password schemas, нейтральні recovery states, same-origin
`returnTo`, admin role gate та HTML/axe semantics auth forms.

Перевірки не використовують staging або production credentials і не змінюють локальну development database.

## Перевірки Sentry

Observability tests не виконують реальний network call до Sentry.

Unit tests для sanitizer/`beforeSend` перевіряють видалення:

- authorization headers;
- cookies;
- request і response body;
- token-like query values;
- email та імені;
- антропометричних, алергічних, медичних і харчових полів.

Transport mock окремо перевіряє:

- `environment`;
- `release`;
- tag `application`;
- tag `runtime`;
- tag `request_id`, коли request ID доступний;
- відсутність event dispatch у local/test за default configuration.

Для API integration test підтверджує, що неочікувана помилка зберігає
стандартний зовнішній `500 INTERNAL_SERVER_ERROR` contract і capture-иться
один раз, а Sentry error handler не замінює final application middleware.

Source-map correctness і правильність project DSN не доводяться unit test.
Вони перевіряються контрольованою staging-помилкою окремо для
`web-client`, `web-admin` і API. Після перевірки debug endpoint або test button
видаляється і не доступний у production.

Staging acceptance підтверджує:

1. event потрапив до правильного project;
2. environment, release і application відповідають deployment;
3. API event має request ID, який зіставляється зі structured log;
4. stack trace веде до TypeScript source;
5. raw event не містить synthetic sensitive payload;
6. application працює, якщо Sentry transport тимчасово недоступний.

## Розташування і назви

```text
apps/api/src/**/*.test.ts
apps/web-admin/src/**/*.test.tsx
apps/web-client/src/**/*.test.tsx
packages/*/src/**/*.test.ts
e2e/**/*.spec.ts
apps/web-admin/src/test/ui-quality.test.tsx
apps/web-client/src/test/ui-quality.test.tsx
```

Тести розташовуються поруч із кодом, коли вони перевіряють окремий модуль або компонент. Окремі test-директорії використовуються лише для integration- та E2E-сценаріїв зі спільним середовищем або fixtures.

## Тестові дані та безпека

- тести не використовують production data, production credentials або персональні дані реальних користувачів;
- секрети не зберігаються у вихідному коді, fixtures, snapshots, логах або coverage-звітах;
- тестові дані мають бути мінімальними, синтетичними та детермінованими;
- зовнішні інтеграції замінюються контрольованими тестовими середовищами або mock-реалізаціями, якщо перевірка реальної інтеграції не є метою тесту;
- тести не повинні залежати від порядку запуску та мають очищати створені ними дані.

## Покриття коду

Coverage використовується як діагностичний показник, а не як самостійна мета якості. Звіт допомагає знаходити неперевірені критичні гілки, але високий відсоток не доводить коректність поведінки системи.

Глобальний поріг покриття на поточному етапі не встановлюється. Якщо поріг буде введено пізніше, він має спиратися на фактичний baseline і не стимулювати створення формальних тестів без поведінкової цінності.

## Команди

```bash
npm run test
npm run test:coverage
npm run db:test:migrations
npm run db:test:seed
npm run db:test
npm run api:test:products:db
npm run api:test:accounts:db
npm run check
npm run test:ui-quality
```

- `npm run test` запускає всі наявні тести;
- `npm run test:coverage` запускає тести та формує coverage-звіти;
- `npm run db:test:migrations` відтворює `mealmind_test` і перевіряє застосування baseline migration до чистої бази;
- `npm run db:test:seed` відтворює `mealmind_test`, застосовує migration і перевіряє reference seed двома послідовними запусками;
- `npm run db:test` послідовно виконує обидві database-перевірки;
- `npm run api:test:products:db` після `npm run db:test` перевіряє product repository лише в
  локальній `mealmind_test` на `127.0.0.1:54322`;
- `npm run api:test:accounts:db` після `npm run db:test` перевіряє account
  bootstrap repository у тій самій ізольованій test database;
- `npm run check` послідовно перевіряє форматування, lint, типи, frontend
  markup/accessibility baseline, тести з coverage та production build.
- `npm run test:ui-quality` перевіряє валідність згенерованої HTML-розмітки
  та автоматизовану accessibility baseline обох web workspace;

Згенеровані директорії `coverage/` не додаються до Git. У CI вони можуть публікуватися як тимчасовий artifact для аналізу результатів.

## Правило для функціональних змін

Кожний vertical slice повинен додавати тести одночасно з реалізацією критичної поведінки. Рівень тесту обирається за найнижчим рівнем, який надійно підтверджує потрібний результат без надлишкового дублювання.

Виправлення дефекту має супроводжуватися regression-тестом, якщо помилку можна стабільно відтворити автоматизовано. Зміни документації, типів або статичної розмітки можуть не потребувати окремого тесту, якщо їх достатньо перевіряють форматування, lint, typecheck, build та ручний перегляд.
