# API-контракти

## Призначення

Цей документ визначає публічні правила HTTP API MealMind: структуру маршрутів,
формати запитів і відповідей, автентифікацію, обробку помилок, версіонування та
підхід до OpenAPI.

Документ описує як фактичний стан API після створення його платформного шару,
так і правила для наступних доменних модулів. Заплановані маршрути не вважаються
реалізованими, доки вони не з'явилися в коді, автоматизованих тестах та OpenAPI.

## Архітектурне рішення

MealMind використовує REST API з JSON-представленням даних.

Основні правила:

- прикладні маршрути розміщуються під префіксом `/api/v1`;
- операційні маршрути `/health` і `/ready` не входять до версії прикладного API;
- HTTP-шар залежить від application services, а не напряму від Prisma;
- Prisma-моделі та згенеровані Prisma-типи не є публічними API-контрактами;
- transport DTO, схеми валідації та presenters належать відповідному API-модулю;
- Zod-схеми є виконуваним джерелом правил валідації на межі API;
- OpenAPI 3.1 має формуватися з тих самих схем і метаданих маршрутів.

Окремий пакет `@mealmind/contracts` не створюється наперед. Він може з'явитися
лише після підтвердженого повторного використання стабільних контрактів API та
web-застосунками.

## Маршрути і версіонування

### Операційні маршрути

Операційні маршрути призначені для моніторингу процесу та інфраструктури. Вони
не використовують envelope прикладного API.

| Method | Path      | Authentication | Success         | Призначення                                      |
| ------ | --------- | -------------- | --------------- | ------------------------------------------------ |
| `GET`  | `/health` | Не потрібна    | `200`           | Перевіряє, що процес API працює                  |
| `GET`  | `/ready`  | Не потрібна    | `200` або `503` | Перевіряє готовність обов'язкової інфраструктури |

Поточні відповіді:

```json
{
  "status": "ok"
}
```

```json
{
  "status": "ready",
  "checks": {
    "database": "up"
  }
}
```

Якщо база даних недоступна, `/ready` повертає `503`:

```json
{
  "status": "not_ready",
  "checks": {
    "database": "down"
  }
}
```

Ці відповіді не повинні містити connection strings, credentials, stack traces
або інші внутрішні подробиці.

### Поточний прикладний маршрут

| Method | Path              | Authentication      | Success | Призначення                                       |
| ------ | ----------------- | ------------------- | ------- | ------------------------------------------------- |
| `GET`  | `/api/v1/session` | Bearer access token | `200`   | Повертає поточний прикладний контекст користувача |

Поточна відповідь:

```json
{
  "data": {
    "user": {
      "id": "00000000-0000-0000-0000-000000000000",
      "email": "user@example.com",
      "applicationRole": "USER"
    }
  }
}
```

`applicationRole` визначається прикладною базою даних, а не довільним claim із
клієнтського запиту.

### Політика версій

Поточна основна версія прикладного API — `v1`.

- додавання необов'язкового поля або нового маршруту може залишатися у `v1`;
- зміна значення чи типу наявного поля, видалення поля або зміна семантики
  маршруту є breaking change;
- breaking changes потребують нової основної версії або контрольованого періоду
  сумісності й deprecation;
- версія API не повинна залежати від версії Prisma schema або внутрішньої
  структури модулів.

## Контракти запитів

### Формат

- API приймає JSON для структурованих request bodies;
- `Content-Type` для JSON-запитів — `application/json`;
- максимальний розмір JSON body — `256 KiB`;
- multipart uploads не приймаються платформним шаром API;
- медіафайли не передаються як base64 у JSON;
- завантаження медіа в майбутніх доменних модулях має використовувати окремий
  контрольований Storage flow.

### Валідація

Path parameters, query parameters і request body перевіряються до виклику
application service.

- UUID перевіряються як UUID, а не як довільні рядки;
- дати перевіряються відповідно до їхньої календарної або часової семантики;
- сортування та фільтри використовують явні allowlists;
- довільні назви полів клієнта не перетворюються на Prisma `where` або `orderBy`;
- некоректний JSON повертає `INVALID_JSON`;
- коректний JSON, який не відповідає схемі, повертає `VALIDATION_ERROR`.

Для mutation-запитів схеми мають бути строгими: невідомі поля потрібно
відхиляти, щоб помилки клієнта не маскувалися.

### Ідентифікатор запиту

API повертає заголовок `x-request-id`. Безпечний вхідний request ID може бути
повторно використаний; в інших випадках сервер генерує власне значення.

Request ID призначений для трасування технічного запиту і не є засобом
автентифікації чи ідемпотентності.

## Контракти відповідей

### Успішна відповідь

Одиничний прикладний ресурс повертається в envelope:

```json
{
  "data": {
    "id": "00000000-0000-0000-0000-000000000000"
  }
}
```

Колекція повертає масив у `data`. За потреби pagination metadata додається
окремим об'єктом `meta`:

```json
{
  "data": [],
  "meta": {
    "nextCursor": null
  }
}
```

Точний склад `meta` визначається контрактом конкретного маршруту і
документується в OpenAPI.

### HTTP status codes

- `200 OK` — успішне читання або mutation з response body;
- `201 Created` — синхронне створення ресурсу;
- `202 Accepted` — лише для фактично асинхронної операції;
- `204 No Content` — успішна операція без response body;
- `400 Bad Request` — синтаксично або семантично некоректний запит;
- `401 Unauthorized` — відсутня або невалідна автентифікація;
- `403 Forbidden` — користувача автентифіковано, але доступ заборонено;
- `404 Not Found` — маршрут або доступний користувачу ресурс не знайдено;
- `409 Conflict` — конфлікт стану, версії або унікальності;
- `413 Payload Too Large` — перевищено дозволений розмір body;
- `429 Too Many Requests` — перевищено дозволену частоту запитів;
- `422 Unprocessable Content` — доменна команда синтаксично валідна, але не
  може бути виконана за поточного стану;
- `500 Internal Server Error` — неочікувана внутрішня помилка;
- `503 Service Unavailable` — тимчасово недоступна обов'язкова залежність.

Статуси `409` і `422` є правилами для майбутніх mutation-маршрутів; PR-006 не
зобов'язаний уже мати приклад їх використання.

## Контракт помилок

Усі помилки прикладного API мають єдину форму:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "issues": [
      {
        "path": "body.name",
        "code": "too_small",
        "message": "Name is required"
      }
    ]
  }
}
```

`issues` є необов'язковим і використовується лише для безпечних деталей
валідації.

Поточні платформні коди помилок:

| Code                            | Status | Значення                                     |
| ------------------------------- | ------ | -------------------------------------------- |
| `INVALID_JSON`                  | `400`  | Request body не є коректним JSON             |
| `VALIDATION_ERROR`              | `400`  | Вхідні дані не відповідають схемі            |
| `AUTHENTICATION_REQUIRED`       | `401`  | Bearer token відсутній або невалідний        |
| `ACCOUNT_ACCESS_DENIED`         | `403`  | Прикладний обліковий запис не має доступу    |
| `FAMILY_ACCESS_DENIED`          | `403`  | Немає дозволеного активного доступу до сім'ї |
| `ROUTE_NOT_FOUND`               | `404`  | HTTP-маршрут не існує                        |
| `PAYLOAD_TOO_LARGE`             | `413`  | Перевищено ліміт request body                |
| `RATE_LIMIT_EXCEEDED`           | `429`  | Перевищено дозволену частоту API-запитів     |
| `INTERNAL_SERVER_ERROR`         | `500`  | Неочікувана внутрішня помилка                |
| `IDENTITY_PROVIDER_UNAVAILABLE` | `503`  | Провайдер ідентичності тимчасово недоступний |

Коди є стабільними machine-readable identifiers. Клієнтська логіка має
реагувати на `code`, а не порівнювати текст `message`.

Відповіді помилок не повинні містити stack traces, SQL, Prisma errors,
credentials, Supabase keys, access tokens або персональні медичні дані.

## Автентифікація й авторизація

### Автентифікація

Захищений маршрут приймає:

```http
Authorization: Bearer <access-token>
```

API:

1. передає token до server-side Supabase identity adapter;
2. отримує перевірений зовнішній subject;
3. зіставляє subject з активним прикладним `User`;
4. формує внутрішній authenticated user context.

`x-user-id`, `x-family-id`, request body і query parameters не можуть бути
джерелом ідентичності користувача.

### Авторизація

- глобальна роль застосунку й роль у сім'ї є різними поняттями;
- роль `ADMIN` не надає автоматичного доступу до приватних сімейних даних;
- доступ до сімейного ресурсу перевіряється через активне membership;
- `familyId` береться з валідованого маршруту або встановленого resource
  context, а не з неперевіреного заголовка;
- CORS обмежує браузерні origins, але не замінює автентифікацію й
  авторизацію.

Точні permissions визначаються application service відповідного домену.

## Представлення даних

### Ідентифікатори

Публічні ідентифікатори передаються як UUID strings. Клієнт не повинен
покладатися на порядок або спосіб генерації UUID.

### Дати й час

- календарні дати передаються як `YYYY-MM-DD`;
- timestamps передаються у форматі RFC 3339/ISO 8601 в UTC;
- часовий пояс, який впливає на бізнес-день сім'ї, передається або
  визначається окремим доменним контрактом;
- клієнт не повинен виводити календарну дату через неявне перетворення
  локального timestamp.

### Точні числові значення

Грошові суми, точні кількості та nutrition values, для яких важлива
десяткова точність, передаються рядком:

```json
{
  "quantity": "125.500"
}
```

Це запобігає втраті точності JavaScript `number`. Presenter, а не Prisma,
відповідає за перетворення `Decimal` у transport representation.

### Enum values

Кожен DTO явно визначає дозволені string values. Публічний контракт не
виводиться автоматично з PostgreSQL або Prisma enum naming. Точні значення
фіксуються схемою та OpenAPI.

## Колекції, фільтри й сортування

Для великих або часто змінюваних колекцій перевага надається cursor
pagination. Невеликі стабільні reference-каталоги можуть повертатися повністю,
якщо це явно визначено контрактом.

Кожен list endpoint має окремо визначати:

- дозволені фільтри;
- дозволені поля й напрямки сортування;
- максимальний `limit`;
- структуру cursor;
- стабільний tie-breaker;
- поведінку порожньої сторінки.

API не приймає довільні Prisma filters від клієнта.

## Rate limiting

Прикладні endpoints під `/api/v1` мають базовий IP-based rate limit.
Операційні `/health` і `/ready` не використовують цю quota.

Поточний платформний contract:

- 120 запитів на 60 секунд;
- standard `RateLimit` headers;
- `429 RATE_LIMIT_EXCEEDED` після вичерпання quota;
- limiter виконується до authentication, database access і JSON body parsing.

Rate limiting є захистом від надмірного використання ресурсів, але не замінює
authentication, authorization, request validation або інфраструктурний DDoS
захист.

## OpenAPI

MealMind використовуватиме OpenAPI 3.1 як публічний машинозчитуваний опис API.

### Джерело правди

Transport schemas і route metadata мають бути єдиним джерелом для:

- runtime validation;
- TypeScript DTO;
- OpenAPI schemas;
- прикладів запитів і відповідей;
- contract tests.

Не допускається ручне ведення незалежних Zod і OpenAPI схем, які можуть
розійтися.

### Етапи впровадження

- у PR-006 фіксується стратегія, базові platform contracts і фактичні
  операційні маршрути;
- у PR-009, разом із першим повним доменним API slice, додається
  детерміновано сформований і перевірений OpenAPI artifact;
- наступні доменні PR оновлюють artifact разом із transport schemas і
  contract tests;
- у PR-020 OpenAPI перевіряється як частина фінальної документації та
  release hardening.

Планове розташування committed artifact:

```text
apps/api/openapi/openapi.yaml
```

Порожній або вигаданий OpenAPI-файл у PR-006 не створюється: документація не
повинна заявляти маршрути, яких ще немає.

## Заплановане розширення API

| Етап   | Контрактний scope                                                    |
| ------ | -------------------------------------------------------------------- |
| PR-009 | Reference data endpoints, transport schemas, перший OpenAPI artifact |
| PR-010 | Products, media metadata та окремі public/admin DTO                  |
| PR-011 | Recipes, ingredients, nutrition і recipe presenters                  |
| PR-013 | Unified discovery із discriminated union `product \| recipe`         |
| PR-014 | Meal plan composite read model зі стабільною публічною формою        |
| PR-016 | Advanced planning commands і перевірка конфліктів                    |
| PR-017 | Shopping List snapshot, revisions і mutation contracts               |
| PR-018 | Cooking mode sessions та optimistic concurrency                      |
| PR-019 | Consumption diary, privacy-aware reads і family dashboard summary    |
| PR-020 | Фінальний аудит API/OpenAPI, security і документації                 |

Ця таблиця визначає напрям розвитку, але не гарантує остаточні назви маршрутів.
Точний endpoint вважається погодженим лише після реалізації transport schema,
authorization policy, тестів і OpenAPI operation.

## Стабільність і зміни контрактів

Зміна API-контракту має включати:

1. transport schema;
2. presenter або response mapper;
3. route metadata;
4. unit чи integration tests;
5. OpenAPI artifact після його впровадження;
6. оновлення цього документа, якщо змінюється загальне правило.

Contract tests мають перевіряти status code, response envelope, error code,
обов'язкові поля та відсутність внутрішніх Prisma-полів. Для критичних
composite read models допускаються snapshot tests, якщо snapshot невеликий і
перевіряється під час review.

## Security і privacy rules

- access tokens, cookies, authorization headers і credentials не логуються;
- request bodies і query values не потрапляють до стандартного request log;
- API не повертає server-only environment variables;
- service-role key доступний тільки server-side infrastructure;
- health і readiness не розкривають конфігурацію залежностей;
- чутливі сімейні, харчові й медичні дані повертаються лише після доменної
  авторизації;
- адміністратор застосунку не отримує неявного доступу до приватних даних;
- CI та contract tests не використовують production credentials або
  production data.

## Відомі межі поточного стану

Після PR-006 API має platform foundation, але ще не має повного доменного CRUD:

- реалізовано health, readiness і session boundary;
- реалізовано стандартизовані errors, validation, authentication,
  authorization boundaries, logging і graceful shutdown;
- доменні endpoints, pagination contracts та OpenAPI artifact додаються
  поступово у відповідних pull requests;
- Sentry належить окремому observability етапу і не змінює публічну форму
  HTTP-контрактів;
- для неочікуваних помилок API передає безпечний `x-request-id` до Sentry tag
  `request_id`, але не передає request body, authorization headers, cookies
  або персональні дані.
