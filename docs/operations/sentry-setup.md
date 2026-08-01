# Налаштування Sentry

## Призначення

Документ описує відтворюване налаштування Sentry для MealMind без збереження
реальних DSN, project IDs, organization slug або credentials у repository.

## 1. Створення projects

В одній Sentry organization створити три projects:

| Project               | Platform          | Application       |
| --------------------- | ----------------- | ----------------- |
| `mealmind-web-client` | Next.js           | `apps/web-client` |
| `mealmind-web-admin`  | Next.js           | `apps/web-admin`  |
| `mealmind-api`        | Node.js / Express | `apps/api`        |

Не використовувати один project для всіх applications: окремі issue streams
спрощують ownership, alerts і перевірку правильності DSN.

## 2. Runtime variables

Кожний deployment отримує DSN тільки свого project.

### Web Client

```text
NEXT_PUBLIC_SENTRY_DSN
SENTRY_ENVIRONMENT
SENTRY_RELEASE
```

### Web Admin

```text
NEXT_PUBLIC_SENTRY_DSN
SENTRY_ENVIRONMENT
SENTRY_RELEASE
```

### API

```text
SENTRY_DSN
SENTRY_ENVIRONMENT
SENTRY_RELEASE
```

У local development і tests DSN можна не задавати. Runtime code не повинен
підставляти production DSN як fallback.

## 3. Build variables для source maps

Для build environment відповідного application задаються:

```text
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
SENTRY_RELEASE
```

`SENTRY_PROJECT` має відповідати application, який збирається. Один build не
повинен завантажувати artifacts до чужого Sentry project.

`SENTRY_AUTH_TOKEN` є secret. Інші три значення є metadata, але можуть
залишатися deployment-specific.

## 4. Environment mapping

| Deployment context            | `SENTRY_ENVIRONMENT`              |
| ----------------------------- | --------------------------------- |
| Local                         | event transport вимкнено          |
| Automated test                | event transport mock або вимкнено |
| Vercel Preview                | `preview`                         |
| Shared acceptance environment | `staging`                         |
| Production                    | `production`                      |

Preview і staging можуть використовувати ті самі Sentry projects, але мають
різні environment tags і не використовують production alert channel.

## 5. Release mapping

Release формується детерміновано:

```text
<application>@<git-sha>
```

Git SHA береться з metadata deployment platform або CI. Значення build і
runtime повинні збігатися.

Не використовувати `latest`, timestamp без commit identity або номер локального
build як production release.

## 6. Data Scrubbing

У налаштуваннях organization/project увімкнути server-side scrubbing як другий
рівень захисту.

Перевірити правила для:

- authorization headers;
- cookies;
- token, secret, password і key-like values;
- email;
- полів персонального профілю;
- медичних і харчових даних.

Server-side rule не є підставою видаляти application sanitizer tests.

## 7. Alerts

Для кожного project створити production-only rules:

- new issue;
- regression;
- event spike.

Notification channel має бути доступний власнику проєкту. Для дипломного MVP
не потрібні автоматичний paging, escalation chain або цілодобова on-call rota.

## 8. Staging verification

Для кожного application виконати контрольовану перевірку.

### Web Client

1. Відкрити staging/preview deployment.
2. Викликати тимчасовий контрольований exception path.
3. Переконатися, що event потрапив до `mealmind-web-client`.
4. Перевірити `application`, `runtime`, `environment` і `release`.
5. Переконатися, що stack trace веде до TypeScript source.
6. Видалити або вимкнути test path до merge/release.

### Web Admin

Повторити ті самі кроки для `mealmind-web-admin`.

### API

1. Викликати тимчасовий staging endpoint або test-only dependency, що створює
   неочікуваний exception.
2. Переконатися, що зовнішня відповідь зберігає стандартний `500` contract.
3. Зіставити `x-request-id`, structured log і Sentry tag `request_id`.
4. Перевірити environment, release, application і TypeScript stack trace.
5. Видалити debug endpoint до merge/release.

## 9. Privacy verification

У raw event data не повинно бути:

- authorization header;
- cookies;
- request/response body;
- email;
- імені;
- антропометрії;
- алергій або dietary restrictions;
- назв страв, кількостей і nutrient values.

Перевірка виконується на синтетичних staging даних. Реальні персональні дані
не використовуються як тестовий payload.

## 10. Disable/rollback

У разі помилкової конфігурації:

1. вимкнути або прибрати DSN у проблемному deployment;
2. повторно розгорнути application;
3. перевірити, що основний flow працює без Sentry;
4. видалити небезпечні events відповідно до Sentry retention/deletion
   можливостей;
5. виправити sanitizer або environment mapping;
6. повторити staging verification до production rollout.

Компрометація `SENTRY_AUTH_TOKEN` потребує його відкликання і створення нового
token. Browser DSN не має адміністративних прав і не класифікується як secret.
