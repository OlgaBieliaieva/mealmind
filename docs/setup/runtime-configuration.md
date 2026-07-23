# Runtime-конфігурація та середовища

## Призначення

Цей документ визначає контракт runtime-конфігурації MealMind, правила ізоляції середовищ і цільові deployment boundaries. Він описує лише назви, власників і класифікацію параметрів. Реальні credentials, project references і персональні дані в документації не зберігаються.

Кожний deployable application перевіряє власні environment variables на своїй startup boundary. API приймає тільки server runtime configuration, а web-застосунки — тільки явно визначені `NEXT_PUBLIC_*` параметри.

## Середовища

| Середовище | Призначення                                              | Дані та credentials                                                      | Поточний стан                                                |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Local      | Розроблення й ручна перевірка на робочій станції         | Локальні PostgreSQL, Auth, Storage і ключі Supabase CLI                  | Реалізовано                                                  |
| Test       | Автоматизовані unit та integration tests                 | Ізольована test database/schema і синтетичні fixtures                    | Контракт визначено; database setup додається у PR-005        |
| Staging    | Preview, acceptance і перевірка migrations перед release | Окремий Supabase project і окремі deployment credentials                 | Цільова конфігурація; deployment виконується пізніше         |
| Production | Робоче середовище стабільного release                    | Окремий Supabase project, мінімально необхідні secrets і production data | Цільова конфігурація; deployment виконується у release phase |

Local, test, staging і production не використовують спільні databases, buckets або server secrets. Staging не є джерелом fixtures для автоматизованих тестів, а production ніколи не використовується для development чи CI.

## Класи конфігурації

| Клас                 | Приклади                                                           | Правило                                                                      |
| -------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Public build-time    | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, publishable key | Може потрапляти до browser bundle; не надає підвищених привілеїв             |
| Server-only runtime  | `SUPABASE_SECRET_KEY`, CORS allowlist, API origin                  | Доступний лише API або server-side deployment environment                    |
| Database credentials | `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL`                  | Вважається secret навіть тоді, коли URL має локальний приклад                |
| Deployment metadata  | `NODE_ENV`, `PORT`, service URL                                    | Не є secret, але задається платформою або environment-specific configuration |

Префікс `NEXT_PUBLIC_` означає технічну можливість опублікувати значення, а не автоматично робить довільну змінну безпечною. Secret key, database URL і privileged Storage credentials ніколи не отримують цей префікс.

## Environment variables

| Variable                               | Owner                          | Consumers                   | Environments                     | Classification            | Purpose                                            |
| -------------------------------------- | ------------------------------ | --------------------------- | -------------------------------- | ------------------------- | -------------------------------------------------- |
| `NODE_ENV`                             | API runtime                    | `apps/api`                  | Local, Test, Staging, Production | Non-secret                | Вибір дозволеного runtime mode                     |
| `PORT`                                 | API runtime / hosting platform | `apps/api`                  | Local, Staging, Production       | Non-secret                | HTTP port Express server                           |
| `API_ORIGIN`                           | API deployment                 | `apps/api`                  | Local, Staging, Production       | Non-secret                | Канонічний origin API                              |
| `CORS_ALLOWED_ORIGINS`                 | API security boundary          | `apps/api`                  | Local, Test, Staging, Production | Non-secret runtime policy | Список дозволених web origins                      |
| `DATABASE_URL`                         | Database connectivity          | API, Prisma runtime         | Local, Staging, Production       | Secret                    | Pooled або application PostgreSQL connection       |
| `DIRECT_URL`                           | Database migrations            | Prisma tooling              | Local, Staging, Production       | Secret                    | Пряме з'єднання для migrations, якщо потрібне      |
| `TEST_DATABASE_URL`                    | Test infrastructure            | Prisma та integration tests | Test                             | Secret                    | Окрема test database/schema                        |
| `SUPABASE_URL`                         | Supabase platform              | `apps/api`                  | Local, Staging, Production       | Public metadata           | Server-side endpoint Supabase API                  |
| `SUPABASE_PUBLISHABLE_KEY`             | Supabase platform              | `apps/api`                  | Local, Staging, Production       | Public                    | Низькопривілейований application key               |
| `SUPABASE_SECRET_KEY`                  | Supabase platform              | Тільки `apps/api`           | Local, Staging, Production       | Secret                    | Привілейований server key; не передається браузеру |
| `NEXT_PUBLIC_API_URL`                  | Web deployment                 | `web-admin`, `web-client`   | Local, Staging, Production       | Public build-time         | Browser endpoint MealMind API                      |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase platform              | `web-admin`, `web-client`   | Local, Staging, Production       | Public build-time         | Browser endpoint Supabase                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase platform              | `web-admin`, `web-client`   | Local, Staging, Production       | Public build-time         | Низькопривілейований browser key                   |

`DIRECT_URL` і `TEST_DATABASE_URL` уже зарезервовані root-контрактом. Їх фактичне використання та автоматизоване створення test schema належать database foundation у PR-005.

## Валідація

- API перевіряє environment до відкриття HTTP port.
- Кожний web application перевіряє тільки три дозволені public variables на server rendering/build boundary.
- URL, port і CORS origins нормалізуються та перевіряються.
- Validation errors містять назви некоректних variables, але не їхні значення.
- Static quality gate `npm run verify` не потребує локальних secrets.
- Production build web-застосунків потребує public build-time configuration; CI використовує лише безпечні non-production values.

Environment contract покритий unit tests у кожному deployable application.

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

Database integration tests повинні використовувати тільки `TEST_DATABASE_URL`. У PR-005 буде додано:

- окрему test database або PostgreSQL schema;
- Prisma baseline migration;
- reference seed;
- deterministic test fixtures;
- clean-database migration/seed/smoke verification.

Integration tests не підключаються до development, staging або production database. Довідникові дані відтворюються контрольованим reference seed, а scenario data створюються fixtures/factories і очищаються між тестами.

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

| Platform boundary   | Repository scope                       | Build/start contract                                                         | Configuration source                                |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| Vercel web-client   | `apps/web-client` у root npm workspace | `npm ci`; `npm run build -w @mealmind/web-client`                            | Тільки `NEXT_PUBLIC_*` для відповідного environment |
| Vercel web-admin    | `apps/web-admin` у root npm workspace  | `npm ci`; `npm run build -w @mealmind/web-admin`                             | Тільки `NEXT_PUBLIC_*` для відповідного environment |
| Render API          | `apps/api` у root npm workspace        | `npm ci`; `npm run build -w @mealmind/api`; `npm run start -w @mealmind/api` | Server-only API, database і Supabase variables      |
| Supabase staging    | Окремий cloud project                  | Prisma migrations перед rollout; reference/staging seed за policy            | Окремі staging database, buckets і credentials      |
| Supabase production | Окремий cloud project                  | Контрольовані Prisma migrations перед rollout                                | Окремі production database, buckets і credentials   |

Фактичні Vercel project settings, Render service, DNS, staging acceptance і production rollout перевіряються під час release hardening. Project IDs, connection strings і credentials не додаються до repository.

## Security rules

1. `SUPABASE_SECRET_KEY` використовується тільки API і ніколи не передається в browser bundle.
2. Database URLs і server secrets не записуються у `.env.example`, документацію, tests або logs.
3. Local, test, staging і production використовують різні дані та credentials.
4. CI не отримує production database або Supabase secrets.
5. Старі або потенційно розкриті credentials ротуються до використання середовища.
6. Auth users, Storage objects і database rows розглядаються як окремі набори даних під час backup, очищення й deployment.
7. `supabase/.temp`, `supabase/.branches`, generated output і local env files не комітяться.
8. Remote database commands виконуються лише після явного вибору target environment; local development не потребує linked project.

## References

- [Supabase CLI local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase local configuration and secrets](https://supabase.com/docs/guides/local-development/managing-config)
- [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables)
