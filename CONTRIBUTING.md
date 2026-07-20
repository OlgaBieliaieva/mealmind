# Внесення змін до MealMind

MealMind розробляється як індивідуальний магістерський проєкт. Цей документ фіксує основний процес розроблення, щоб зміни залишалися послідовними та перевірюваними.

Умови використання матеріалів визначає файл [LICENSE](./LICENSE).

## Робочий процес

- `main` має залишатися у працездатному й відтворюваному стані.
- Кожна зміна виконується в окремій короткоживучій гілці.
- Зміни потрапляють до `main` через pull request.
- Один pull request повинен мати одну чітко визначену мету.
- Прямі push, force push і видалення `main` заборонені.
- Для merge використовується лише squash merge.

## Назви гілок

Формат:

```text
<type>/<short-kebab-case-description>
```

Основні префікси:

- `feat/` — нова функціональність;
- `fix/` — виправлення дефекту;
- `chore/` — repository, tooling або maintenance;
- `docs/` — документація;
- `refactor/` — зміна структури без зміни поведінки;
- `test/` — тести;
- `ci/` — CI/CD.

Приклади:

```text
chore/pr-001-repository-foundation
feat/product-admin-flow
fix/meal-plan-week-boundary
docs/shopping-list-rules
```

## Коміти

Проєкт використовує Conventional Commits:

```text
<type>(<scope>): <description>
```

Приклади:

```text
chore(repo): add repository metadata
feat(products): implement product creation
fix(meal-plan): preserve selected week after mutation
test(auth): cover cross-family access denial
docs(architecture): document shopping list boundaries
```

Основні типи: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`, `build` і `revert`.

Опис коміту має бути коротким і конкретним. Не використовуються нечіткі повідомлення на зразок `update`, `changes` або `fix stuff`.

Breaking change позначається знаком `!` і пояснюється в footer:

```text
feat(api)!: revise meal plan response contract

BREAKING CHANGE: meal entries are grouped by calendar date.
```

## Pull request

Перед відкриттям pull request потрібно:

1. Переглянути власний diff.
2. Видалити debug code, тимчасові файли та закоментовані альтернативи.
3. Запустити релевантні локальні перевірки.
4. Оновити документацію, якщо змінилася поведінка або архітектура.
5. Переконатися, що diff не містить секретів, персональних чи production-даних.

Pull request має описувати:

- `Scope` — що змінено;
- `Out of scope` — що свідомо не входить;
- `Test evidence` — виконані перевірки та їх результат;
- `Screenshots` — для UI-змін або `Not applicable`;
- `Database migrations` — вплив на схему або `Not applicable`;
- `Security and privacy impact` — виявлений вплив або `None identified`;
- `Documentation` — оновлені документи або пояснення, чому зміни не потрібні.

Заголовок PR має відповідати Conventional Commits, оскільки він використовується як заголовок squash commit.

## Перевірки якості

Після налаштування quality tooling стандартна команда:

```powershell
npm run verify
```

Вона має запускати щонайменше format check, lint без warnings, TypeScript typecheck, релевантні tests і production build.

Залежно від ризику зміни додатково запускаються integration, component, accessibility, E2E, migration або security tests.

## Зміни бази даних

Prisma є єдиним власником прикладної database schema та migrations.

Для зміни схеми потрібно:

1. Оновити Prisma schema.
2. Створити migration у визначеному workflow.
3. Переглянути generated SQL.
4. Перевірити migration на чистій PostgreSQL.
5. Оновити ERD і data dictionary, якщо вони вже існують.

Не можна редагувати migration, застосовану в shared середовищі, запускати destructive reset проти staging/production або додавати database dumps до Git.

Reference seed і development fixtures мають бути розділені. Seed повинен бути детермінованим та ідемпотентним.

## Дані та безпека

До Git не додаються:

- `.env` і credentials;
- production data;
- персональні або чутливі сімейні дані;
- datasets чи assets без підтвердженого походження та дозволу на використання;
- generated build output.

Зміни authentication, authorization, family access, uploads, logging, Sentry або обробки чутливих даних повинні мати негативний security test і короткий опис ризику в PR.

Деталі невиправленої вразливості не публікуються в issue або pull request. Для повідомлення використовується [Security Policy](./SECURITY.md).

## Документація

Документація оновлюється разом із кодом, якщо змінюються користувацька поведінка, API contract, domain rule, database schema, environment contract, architecture boundary або security procedure.

Запланована можливість не описується як реалізована. Відомі обмеження називаються прямо.

## Definition of Done

Зміна готова до merge, якщо:

- scope реалізовано, а acceptance scenarios підтверджені;
- релевантні перевірки пройдені без warnings;
- додано тести відповідно до ризику;
- migrations перевірені, якщо вони є;
- документацію оновлено;
- diff не містить секретів, production data або generated output;
- заголовок PR відповідає Conventional Commits;
- squash merge не залишить `main` у неробочому стані.

## Пов’язані документи

- [README](./README.md)
- [Security Policy](./SECURITY.md)
- [Архітектура](./docs/architecture/README.md)
- [Межі MVP](./docs/product/mvp-scope.md)
