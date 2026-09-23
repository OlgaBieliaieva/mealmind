# Cooking Mode — API

## Призначення

Модуль `cooking` фіксує одне конкретне виконання запланованого рецепта та
відокремлює канонічний `Recipe` від фактично використаних інгредієнтів,
виконаних кроків, виходу страви й фінальної поживності.

```text
Recipe → MealEntry → CookingSession → ConsumptionEntry
```

`Recipe` залишається шаблоном. `MealEntry` описує актуальний план,
`CookingSession` — snapshot конкретного приготування, а `ConsumptionEntry` —
історичний факт споживання.

## Життєвий цикл

```text
IN_PROGRESS → COMPLETED
IN_PROGRESS → CANCELLED
```

- session створюється лише для recipe-based `MealEntry`;
- одна session може охоплювати кілька позицій плану того самого рецепта;
- один `MealEntry` може мати лише одну невивільнену cooking allocation;
- `CANCELLED` session зберігається в історії, але її allocations отримують
  `releasedAt`, тому для тих самих днів можна почати нове приготування;
- allocation завершеної session не звільняється, тому той самий `MealEntry`
  повторно приготувати не можна;
- completed і cancelled sessions immutable для звичайних commands.

Запуск ідемпотентний за `requestId`. Повтор із тим самим набором entries
повертає створену session; повторне використання `requestId` з іншим payload
завершується `409 CONFLICT`.

## Snapshot і масштабування

Під час старту API:

1. перевіряє active family, роль, участь MEMBER у кожному entry, revision і
   доступність recipe-based позицій;
2. обчислює demand як суму `MealEntryParticipant.quantityInGrams`;
3. використовує `Recipe.yieldWeightG`, а якщо його немає — суму відомих
   `RecipeIngredient.gramWeight`;
4. масштабує planned quantities за сумарним demand;
5. атомарно створює recipe metadata, ingredient, step і plan-context snapshots.

Snapshot зберігає назву, короткий і довгий опис, складність, час, storage path
основного зображення, інструкції кроків і planned ingredient values. API
перетворює storage path на короткоживучий signed `imageUrl`.

## Зміни плану

До появи cooking progress Meal Plan може синхронізувати session:

- зміна порцій перераховує demand, planned yield та scaled ingredients;
- вилучення одного entry звільняє його allocation і перераховує решту;
- вилучення останнього entry автоматично переводить незапущену по суті session
  у `CANCELLED`.

Після першої фактичної дії CookingSession стає cooking truth і більше не
перебудовується через зміни плану. Видалення `MealEntry` з cooking або
consumption history має soft-delete семантику (`removedAt`,
`removedByUserId`). Активні planning/shopping projections не показують такий
entry, але історичні зв’язки зберігаються.

## Інгредієнти та кроки

Recipe ingredients підтримують:

```text
PENDING → USED | OMITTED | SUBSTITUTED
```

- швидке `USED` копіює planned values в actual;
- edited `USED` зберігає фактичну вагу в грамах;
- `OMITTED` не робить внеску в nutrition;
- `SUBSTITUTED` зберігає planned product, але рахує replacement product;
- `ADDED_DURING_COOKING` створюється одразу як `USED` і може бути фізично
  видалений до завершення;
- recipe-derived ingredient фізично не видаляється.

Кроки підтримують:

```text
PENDING → COMPLETED | SKIPPED
```

Кожна mutation приймає `expectedRevision`. Застарілий write повертає `409`,
не перезаписуючи новіший стан.

## Вихід і поживність

Фактичний вихід необов’язковий:

- `DIRECT` — готова вага;
- `CONTAINER_DIFFERENCE` — `grossWeightG - tareWeightG`;
- `method: null` — очистити фактичне вимірювання.

Для preview і completion внесок нутрієнта обчислюється лише з resolved actual
ingredients:

```text
ingredientValue = actualGramWeight / 100 × productValuePer100g
totalValue = Σ ingredientValue
```

Пріоритет basis для значення на 100 г:

1. actual yield → `ACTUAL`;
2. planned yield → `PLANNED_ESTIMATE`;
3. відсутній yield → `UNAVAILABLE`.

Completeness використовує `COMPLETE`, `PARTIAL` або `UNVERIFIED`. Завершення
атомарно зберігає `CookingSessionNutrient` із calculator version і timestamp.

## Явне завершення

Останній checkbox ніколи не завершує session автоматично. Проєкція лише
повертає `canComplete: true`.

`POST /complete` виконується тільки після окремої дії користувача:

- `resolvePending: false` вимагає, щоб усі ingredient і step snapshots були
  resolved;
- `resolvePending: true` після явного confirmation переводить pending
  ingredients у `USED` із planned values, pending steps — у `COMPLETED`.

Completion створює фінальний nutrient snapshot і виставляє `preparedAt` для
всіх активних allocations в одній транзакції. Звичайний manual prepared
endpoint не може скинути стан, авторитетно встановлений completed session.

## HTTP API

Усі маршрути належать `/api/v1`, вимагають authentication і повертають
актуальну `CookingSession` projection.

```http
POST   /api/v1/cooking-sessions
GET    /api/v1/cooking-sessions/:sessionId
PATCH  /api/v1/cooking-sessions/:sessionId/ingredients/:ingredientId
POST   /api/v1/cooking-sessions/:sessionId/ingredients
DELETE /api/v1/cooking-sessions/:sessionId/ingredients/:ingredientId
PATCH  /api/v1/cooking-sessions/:sessionId/steps/:stepId
PATCH  /api/v1/cooking-sessions/:sessionId/yield
POST   /api/v1/cooking-sessions/:sessionId/complete
POST   /api/v1/cooking-sessions/:sessionId/cancel
```

Start body містить `requestId` і від 1 до 31 `{ id, expectedRevision }`
позицій. History/list endpoint у поточному increment не реалізований.

## Authorization і privacy

- OWNER працює із sessions активної сім’ї;
- MEMBER має доступ лише тоді, коли є учасником кожного алокованого MealEntry;
- cross-family або недоступний identifier повертає not-found semantics;
- імена продуктів, ваги, request body, nutrient values та authorization headers
  не логуються;
- application administrator не отримує автоматичного доступу до family data.

## Інтеграції

- Meal Plan показує active CookingSession і захищає session-controlled
  prepared state;
- Shopping List і planning queries виключають soft-removed entries;
- Consumption Diary для completed session використовує cooking nutrient
  snapshot і пропорційно масштабує його за фактичним/planned yield;
- prepared продукт у Meal Plan називається «Придбано», prepared рецепт —
  «Приготовано»; persistence contract залишається спільним.

## Перевірки

Основні команди:

```text
npm run db:test
npm run api:test:cooking:db
npm run api:test:meal-plans:db
npm run api:test:shopping-lists:db
npm run api:test:consumption:db
npm test -w @mealmind/api
npm run typecheck -w @mealmind/api
npm run lint -w @mealmind/api
npm run api:openapi:check
```

DB integration test використовує лише ізольовану `mealmind_test` на локальному
PostgreSQL/Supabase.

## Відкладено

- history/list UI та query by recipe;
- timers, background notifications і voice mode;
- збереження фактичної варіації як нового recipe;
- cookware catalog і автоматичне списання pantry;
- realtime transport; поточна collaboration використовує optimistic revision.
