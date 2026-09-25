# MealMind API — адміністративна аналітика

## Призначення

Модуль `admin-analytics` надає агреговані показники для `web-admin` без
персональних даних користувачів і сімей. Він є окремим read-only контуром:
не змінює доменні сутності та не дублює CRUD-маршрути продуктів, рецептів і
довідників.

Усі маршрути підключені до composition root API, використовують bearer
authentication, перевіряють `ApplicationRole.ADMIN`, мають rate limit і
повертають `Cache-Control: private, no-store`.

## Структура модуля

```text
apps/api/src/modules/admin-analytics/
  application/admin-analytics-service.ts
  domain/admin-analytics-repository.ts
  domain/admin-analytics-types.ts
  infrastructure/prisma-admin-analytics-repository.ts
  transport/admin-analytics-controller.ts
  transport/admin-analytics-router.ts
  transport/admin-analytics-schema.ts
  admin-analytics-module.ts
  admin-analytics-openapi.ts
```

## HTTP-контракт

Реалізовані endpoints:

```text
GET /api/v1/admin/analytics/overview
GET /api/v1/admin/analytics/users
GET /api/v1/admin/analytics/products
GET /api/v1/admin/analytics/recipes
GET /api/v1/admin/analytics/references
```

`overview`, `users`, `products` і `recipes` приймають:

- `from` і `to` у форматі `YYYY-MM-DD`; параметри передаються лише разом;
- `granularity=day|week|month`;
- IANA `timezone`, за замовчуванням `Europe/Kyiv`.

Максимальна довжина періоду — 732 дні. Якщо період не передано, API використовує
останні 12 місяців до поточної локальної дати. Автоматична granularity: `day` до
31 дня, `week` до 180 днів, інакше `month`.

`references` не залежить від періоду. Всі відповіді мають envelope `{ data }`.
Актуальний машинний контракт експортується до Postman через
`npm run api:openapi:export`.

## Семантика показників

### Загальний огляд

All-time/current показники:

- активні користувачі — `User.applicationRole = USER` і `User.deletedAt IS NULL`;
- активні сім’ї — створені користувачем із `applicationRole = USER` та
  `Family.archivedAt IS NULL`;
- усі продукти й рецепти — включно з архівними;
- продукти без перевірки — лише неархівні, не `ARCHIVED`, зі статусом
  `UNVERIFIED`;
- чернетки рецептів — лише неархівні зі статусом `DRAFT`.

За вибраний період рахуються історичні створення користувачів і сімей, тижні
`MealPlan` за `weekStart`, завершені `CookingSession` за `completedAt` та
підтверджені `ConsumptionEntry` за `consumedAt`.

### Користувачі та сім’ї

User totals, onboarding і creation series враховують лише облікові записи з
`applicationRole = USER`. Family totals, averages і creation series враховують
лише сім’ї, створені таким користувачем; ADMIN-акаунт і створена ним технічна
сім’я не спотворюють продуктову статистику. `PersonProfile` залишається окремою
метрикою людей і не фільтрується за роллю акаунта. Completion та averages
рахуються лише на активній базі. Creation comparisons і series є історичними:
пізніше видалений або архівований запис не зникає з періоду створення.

### Продукти

Totals і enum breakdowns охоплюють весь каталог. Операційні KPI та rankings
виключають архівні продукти. Creation comparison і series є історичними.

Походження визначається одним primary `ProductSourceReference`. Якщо primary
source відсутній, продукт потрапляє до `UNASSIGNED`; кілька source references не
мають подвоювати кількість продуктів. Підтримуються `USDA`, `MEALMIND_ADMIN` і
`MEALMIND_USER`.

### Рецепти

Доменний автор і створювач запису мають різну семантику:

- `authorId` і `Author.type` описують автора рецепта;
- `createdByUserId` разом із поточною `User.applicationRole` визначає походження
  запису;
- `USER` — рецепт створено користувачем із роллю `USER`;
- `SYSTEM` — `createdByUserId` відсутній або створювач має роль `ADMIN`.

Та сама умова використовується в analytics breakdown і CRUD-фільтрі
`/api/v1/admin/recipes?creatorOrigin=...`, тому drill-down не змінює вибірку.

### Довідники

Endpoint повертає inventory для allergens, authors, brands, cuisines,
dietary tags, meal types, measurement units, nutrients, product categories і
recipe types. Додатково повертаються status/verification breakdown брендів,
типи авторів та сигнали якості: невикористані категорії, типи рецептів, кухні й
dietary tags.

Нульове використання є інформаційним сигналом, а не автоматичною помилкою.

## Реалізація і продуктивність

Незалежні `count`, `groupBy` і ranking queries виконуються паралельно. Часові
series і primary-source breakdown використовують parameterized Prisma raw SQL;
дані не конкатенуються в SQL-рядки. Додатковий cache або materialized views не
використовуються, доки немає підтвердженої потреби навантаженням.

## Перевірки

```text
npm run typecheck -w @mealmind/api
npm test -w @mealmind/api
npm run lint -w @mealmind/api
npm run db:test
npm run api:test:admin-analytics:db
npm run api:openapi:check
```

Integration test працює лише з локальною ізольованою базою
`mealmind_test` на `127.0.0.1:54322`.

## Поточні обмеження

- окремі dashboards Planning, Shopping, Cooking і Consumption не реалізовані;
  загальний Overview містить лише їхні ключові activity counts;
- users/families є інформаційною сторінкою без admin CRUD-списків;
- widgets однієї сторінки завантажуються одним endpoint, тому помилка
  відображається на рівні сторінки;
- endpoint не повертає email, health/nutrition details або інші персональні дані.
