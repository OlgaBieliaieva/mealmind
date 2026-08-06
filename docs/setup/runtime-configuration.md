# Runtime-конфігурація та середовища

## Призначення

Цей документ визначає контракт runtime-конфігурації MealMind, правила ізоляції середовищ і цільові deployment boundaries. Він описує лише назви, власників і класифікацію параметрів. Реальні credentials, project references і персональні дані в документації не зберігаються.

Кожний deployable application перевіряє власні environment variables на своїй startup boundary. API приймає тільки server runtime configuration, а web-застосунки — тільки явно визначені `NEXT_PUBLIC_*` параметри.

## Середовища

| Середовище | Призначення                                              | Дані та credentials                                                      | Поточний стан                                                |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Local      | Розроблення й ручна перевірка на робочій станції         | Локальні PostgreSQL, Auth, Storage і ключі Supabase CLI                  | Реалізовано                                                  |
| Test       | Автоматизовані unit та integration tests                 | Окрема локальна `mealmind_test` і синтетичні fixtures                    | Clean migration і reference seed verification реалізовано    |
| Staging    | Preview, acceptance і перевірка migrations перед release | Окремий Supabase project і окремі deployment credentials                 | Цільова конфігурація; deployment виконується пізніше         |
| Production | Робоче середовище стабільного release                    | Окремий Supabase project, мінімально необхідні secrets і production data | Цільова конфігурація; deployment виконується у release phase |

Local, test, staging і production не використовують спільні databases, buckets або server secrets. Staging не є джерелом fixtures для автоматизованих тестів, а production ніколи не використовується для development чи CI.

## Класи конфігурації

| Клас                  | Приклади                                                           | Правило                                                                      |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Public build-time     | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, publishable key | Може потрапляти до browser bundle; не надає підвищених привілеїв             |
| Server-only runtime   | `SUPABASE_SECRET_KEY`, CORS allowlist, API origin                  | Доступний лише API або server-side deployment environment                    |
| Database credentials  | `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL`                  | Вважається secret навіть тоді, коли URL має локальний приклад                |
| Deployment metadata   | `NODE_ENV`, `PORT`, service URL                                    | Не є secret, але задається платформою або environment-specific configuration |
| Observability runtime | Sentry DSN, environment і release                                  | DSN є public ingestion endpoint; metadata не є secret                        |
| Build-only credential | `SENTRY_AUTH_TOKEN`                                                | Secret тільки для CI або deployment build; не потрапляє до runtime bundle    |

Префікс `NEXT_PUBLIC_` означає технічну можливість опублікувати значення, а не автоматично робить довільну змінну безпечною. Secret key, database URL і privileged Storage credentials ніколи не отримують цей префікс.

## Environment variables

| Variable                               | Owner                          | Consumers                    | Environments                     | Classification            | Purpose                                            |
| -------------------------------------- | ------------------------------ | ---------------------------- | -------------------------------- | ------------------------- | -------------------------------------------------- |
| `NODE_ENV`                             | API runtime                    | `apps/api`                   | Local, Test, Staging, Production | Non-secret                | Вибір дозволеного runtime mode                     |
| `PORT`                                 | API runtime / hosting platform | `apps/api`                   | Local, Staging, Production       | Non-secret                | HTTP port Express server                           |
| `API_ORIGIN`                           | API deployment                 | `apps/api`                   | Local, Staging, Production       | Non-secret                | Канонічний origin API                              |
| `CORS_ALLOWED_ORIGINS`                 | API security boundary          | `apps/api`                   | Local, Test, Staging, Production | Non-secret runtime policy | Список дозволених web origins                      |
| `DATABASE_URL`                         | Database connectivity          | API, Prisma runtime          | Local, Staging, Production       | Secret                    | Pooled або application PostgreSQL connection       |
| `DIRECT_URL`                           | Database migrations            | Prisma tooling               | Local, Staging, Production       | Secret                    | Пряме з'єднання для migrations, якщо потрібне      |
| `TEST_DATABASE_URL`                    | Test infrastructure            | Prisma та integration tests  | Test                             | Secret                    | Окрема локальна database `mealmind_test`           |
| `SUPABASE_URL`                         | Supabase platform              | `apps/api`                   | Local, Staging, Production       | Public metadata           | Server-side endpoint Supabase API                  |
| `SUPABASE_PUBLISHABLE_KEY`             | Supabase platform              | `apps/api`                   | Local, Staging, Production       | Public                    | Низькопривілейований application key               |
| `SUPABASE_SECRET_KEY`                  | Supabase platform              | Тільки `apps/api`            | Local, Staging, Production       | Secret                    | Привілейований server key; не передається браузеру |
| `NEXT_PUBLIC_API_URL`                  | Web deployment                 | `web-admin`, `web-client`    | Local, Staging, Production       | Public build-time         | Browser endpoint MealMind API                      |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase platform              | `web-admin`, `web-client`    | Local, Staging, Production       | Public build-time         | Browser endpoint Supabase                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase platform              | `web-admin`, `web-client`    | Local, Staging, Production       | Public build-time         | Низькопривілейований browser key                   |
| `APP_ORIGIN`                           | Web deployment                 | Кожний web application       | Local, Staging, Production       | Non-secret server runtime | Канонічний origin callback і redirects             |
| `WEB_CLIENT_ORIGIN`                    | Web deployment                 | `web-admin`                  | Local, Staging, Production       | Non-secret server runtime | Безпечне посилання з access-denied state           |
| `NEXT_PUBLIC_SENTRY_DSN`               | Sentry project                 | `web-admin` або `web-client` | Preview, Staging, Production     | Public ingestion endpoint | DSN відповідного frontend project                  |
| `SENTRY_DSN`                           | Sentry project                 | `apps/api`                   | Staging, Production              | Public ingestion endpoint | DSN API project                                    |
| `SENTRY_ENVIRONMENT`                   | Deployment metadata            | Усі deployable applications  | Preview, Staging, Production     | Non-secret                | `preview`, `staging` або `production`              |
| `SENTRY_RELEASE`                       | Deployment metadata            | Build і runtime              | Preview, Staging, Production     | Non-secret                | `<application>@<git-sha>`                          |
| `SENTRY_ORG`                           | Sentry source-map upload       | Build only                   | Preview, Staging, Production     | Non-secret                | Organization для upload                            |
| `SENTRY_PROJECT`                       | Sentry source-map upload       | Build only                   | Preview, Staging, Production     | Non-secret                | Project відповідного application                   |
| `SENTRY_AUTH_TOKEN`                    | Sentry source-map upload       | Build only                   | Preview, Staging, Production     | Secret                    | Upload source maps; ніколи не доступний browser    |

`DIRECT_URL` використовується Prisma tooling для контрольованих migrations. `TEST_DATABASE_URL` приймається лише database test utilities і має вказувати на окрему локальну database `mealmind_test`.

## Валідація

- API перевіряє environment до відкриття HTTP port.
- Кожний web application перевіряє public variables на build boundary, а
  server-only `APP_ORIGIN` — на callback/access boundary.
- URL, port і CORS origins нормалізуються та перевіряються.
- Validation errors містять назви некоректних variables, але не їхні значення.
- Static quality gate `npm run verify` не потребує локальних secrets.
- Production build web-застосунків потребує public build-time configuration; CI використовує лише безпечні non-production values.

Environment contract покритий unit tests у кожному deployable application.

Sentry transport у local development і automated tests вимкнено за
замовчуванням. Відсутній DSN поза production не блокує startup. Build-only
`SENTRY_AUTH_TOKEN` не читається runtime-кодом і не має `NEXT_PUBLIC_`
префікса.

## Supabase Auth

- `web-client` і `web-admin` використовують окремі host-scoped cookie
  sessions через `@supabase/ssr`.
- Локальний `site_url` — `http://localhost:3000`; callback URLs обох
  застосунків для `localhost` і `127.0.0.1` внесені до exact redirect
  allowlist.
- Email confirmation увімкнено локально та перевіряється через Mailpit.
- Мінімальна довжина пароля — 8 символів.
- Confirmation і recovery templates зберігаються у `supabase/templates`.
- Production потребує custom SMTP, SPF/DKIM/DMARC, CAPTCHA та exact staging і
  production redirects.
- Google OAuth provider залишається вимкненим; майбутній client secret
  зберігатиметься тільки у Supabase/provider secrets.

## Локальний запуск

### Передумови

- Node.js і npm у версіях із `.nvmrc` та `package.json`;
- Docker Desktop або інший Docker-compatible runtime;
- щонайменше 7 GB доступної Docker memory для повного локального Supabase stack.

### Підготовка

Встановити відтворювані залежності:

```bash
npm ci
```

Запустити локальний Supabase:

```bash
npm run supabase:start
npm run supabase:status
```

`supabase status` показує локальні URLs і credentials. Його вивід не можна копіювати до Git, документації, issue, pull request або CI logs.

Створити ignored local configuration:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web-admin/.env.example apps/web-admin/.env.local
cp apps/web-client/.env.example apps/web-client/.env.local
```

У локальних файлах потрібно замінити placeholders значеннями з локального Supabase. Файли `.env` і `.env.local` не комітяться.

Запустити applications:

```bash
npm run dev
```

Зупинити stack зі збереженням Docker volumes:

```bash
npm run supabase:stop
```

Команди з destructive defaults не входять до root scripts. Підключення до remote project через `supabase link` не потрібне для локального запуску.

## Ізоляція тестового середовища

Unit і component tests не читають локальні `.env` та отримують контрольовані in-memory fixtures.

Database integration tests використовують тільки `TEST_DATABASE_URL`. Реалізований test helper:

- перевіряє local host, порт локального Supabase PostgreSQL і точну назву `mealmind_test`;
- не дозволяє використовувати development, staging або production database;
- відтворює test database з `template0` та UTF-8;
- застосовує reviewed Prisma baseline migration;
- запускає reference seed двічі;
- перевіряє 181 reference record, унікальність UUID/code та незмінність `updatedAt` під час повторного запуску.

Integration tests не підключаються до development, staging або production database. Довідникові дані відтворюються контрольованим reference seed, а scenario data створюються fixtures/factories і очищаються між тестами.

Основні команди:

```bash
npm run db:test:migrations
npm run db:test:seed
npm run db:test
```

## Supabase і Prisma ownership

Supabase надає інфраструктурні можливості:

- PostgreSQL;
- Auth;
- Storage;
- локальний Docker stack через Supabase CLI.

Prisma є єдиним власником прикладної PostgreSQL schema, constraints і migration history. Тому `db.migrations` і `db.seed` у `supabase/config.toml` вимкнені.

Supabase-specific SQL допускається лише для platform capabilities, яких не описує Prisma, наприклад:

- Row Level Security;
- Storage policies;
- platform extensions;
- Auth або Storage integration.

Кожна така SQL-зміна повинна мати явного owner, порядок застосування, rollback consideration та integration test. Одна таблиця або constraint не описується паралельно у Prisma і Supabase migrations.

## Deployment inventory

Нижче наведено цільовий inventory, а не твердження про вже виконане production deployment.

| Platform boundary   | Repository scope                                              | Build/start contract                                                             | Configuration source                                |
| ------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| Vercel web-client   | `apps/web-client` у root npm workspace                        | `npm ci`; `npm run build -w @mealmind/web-client`                                | Тільки `NEXT_PUBLIC_*` для відповідного environment |
| Vercel web-admin    | `apps/web-admin` у root npm workspace                         | `npm ci`; `npm run build -w @mealmind/web-admin`                                 | Тільки `NEXT_PUBLIC_*` для відповідного environment |
| Render API          | Repository root; `apps/api` і `packages/db` як npm workspaces | `npm ci --include=dev`; filtered Turbo build; Prisma deploy migration; API start | Server-only API, database і Supabase variables      |
| Supabase staging    | Окремий cloud project                                         | Prisma migrations перед rollout; reference/staging seed за policy                | Окремі staging database, buckets і credentials      |
| Supabase production | Окремий cloud project                                         | Контрольовані Prisma migrations перед rollout                                    | Окремі production database, buckets і credentials   |
| Sentry              | Одна organization, три application projects                   | Runtime event ingestion; source-map upload під час build                         | Окремі DSN; build-only auth token                   |

Фактичні Vercel project settings, Render service, DNS, staging acceptance і production rollout перевіряються під час release hardening. Project IDs, connection strings і credentials не додаються до repository.

### Render API

Файл `render.yaml` у корені репозиторію описує цільовий deployment contract
MealMind API.

Render виконує команди з кореня монорепозиторію, оскільки API залежить від
root lockfile, Turborepo configuration і пакета `@mealmind/db`.

Послідовність deployment:

```text
npm ci --include=dev
        ↓
npm run build -- --filter=@mealmind/api
        ↓
npm run db:migrate:deploy
        ↓
npm run start -w @mealmind/api
```

`prisma migrate deploy` застосовує тільки reviewed migrations. Reference seed
не запускається автоматично під час кожного deployment.

Render використовує `/health` як platform health check. Endpoint `/ready`
залишається окремою перевіркою доступності PostgreSQL.

`PORT` надається платформою і не зберігається у Blueprint. Решта
environment-specific values задаються через Render Dashboard.

Blueprint містить лише назви:

- `API_ORIGIN`;
- `CORS_ALLOWED_ORIGINS`;
- `DATABASE_URL`;
- `DIRECT_URL`;
- `SUPABASE_URL`;
- `SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SECRET_KEY`.

Значення цих параметрів не зберігаються у Git.

Target Blueprint використовує paid starter instance, оскільки
`preDeployCommand` для database migrations не підтримується free web service.
Сам Blueprint не створює зовнішніх ресурсів, доки його явно не синхронізовано
з Render.

Регіон Render потрібно остаточно звірити з регіоном Supabase staging project
до першого Blueprint sync. Після створення Render service його region не
можна змінити.

## Security rules

1. `SUPABASE_SECRET_KEY` використовується тільки API і ніколи не передається в browser bundle.
2. Database URLs і server secrets не записуються у `.env.example`, документацію, tests або logs.
3. Local, test, staging і production використовують різні дані та credentials.
4. CI не отримує production database або Supabase secrets.
5. Старі або потенційно розкриті credentials ротуються до використання середовища.
6. Auth users, Storage objects і database rows розглядаються як окремі набори даних під час backup, очищення й deployment.
7. `supabase/.temp`, `supabase/.branches`, generated output і local env files не комітяться.
8. Remote database commands виконуються лише після явного вибору target environment; local development не потребує linked project.
9. `SENTRY_AUTH_TOKEN` зберігається тільки в deployment/CI secrets, має
   мінімально необхідні права й не потрапляє до browser bundle.
10. Sentry DSN не класифікується як адміністративний secret, але кожний
    application використовує DSN тільки свого project.

## References

- [Supabase CLI local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase local configuration and secrets](https://supabase.com/docs/guides/local-development/managing-config)
- [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables)
