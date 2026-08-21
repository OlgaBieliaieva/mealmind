# Імпорт каталогу USDA

Каталог USDA завантажується окремим контрольованим процесом і не входить до
reference seed або Prisma migrations. Джерелом є локальний файл
`scripts/usda/data/output/final-products.json`, який не зберігається в Git.

## Передумови

1. Локальний Supabase/PostgreSQL запущений.
2. У кореневому `.env` задано `DIRECT_URL`.
3. Виконано `npm run db:migrate:deploy` і `npm run db:seed:reference`.
4. Згенеровано й перевірено `final-products.json`.
5. SHA-256, розмір і статистика файлу відповідають `usda-manifest.json`.

Manifest фіксує локальний snapshot USDA датою `2026-08-21`. Продукти
імпортуються як `GENERIC + ACTIVE + UNVERIFIED`.

## Команди

Перевірка файлу, reference UUID і майбутнього обсягу запису без мутації БД:

```text
npm run db:import:usda:dry-run
```

Пакетний ідемпотентний імпорт:

```text
npm run db:import:usda
```

Розмір пакета за замовчуванням — 50 продуктів. Для діагностики його можна
змінити:

```text
npm run db:import:usda -- --batch-size 50
```

Повторний запуск синхронізує USDA-owned поля, нутрієнти та порції за стабільною
ідентичністю `provider + dataset + FDC ID` і не створює дублікати.

Локальне видалення лише продуктів, пов’язаних із USDA source references:

```text
npm run db:cleanup:usda:local -- --confirm-delete-usda-catalog
```

Cleanup заборонено для remote host. Якщо USDA-продукти вже використовуються
іншими сутностями з `Restrict` relation, база відхилить видалення.

## Remote import

Remote import за замовчуванням заборонений. Для усвідомленого запуску потрібні
одночасно:

```text
USDA_IMPORT_ALLOW_REMOTE=true
USDA_IMPORT_CONFIRM_DATABASE=<точна назва цільової БД>
```

Importer не виводить credentials із `DIRECT_URL`. Перед remote запуском
обов’язкові dry-run, backup і перевірка manifest.

## Перевірки

```text
npm run db:test:usda-catalog:unit -w @mealmind/db
npm run db:test:usda-catalog
```

Integration test відтворює лише локальну ізольовану базу `mealmind_test`,
застосовує migrations і reference seed, двічі імпортує fixture та перевіряє
контрольоване очищення.
