# Модель даних MealMind

## Призначення

Цей розділ описує реалізовану persistence foundation MealMind: межі предметних областей, призначення таблиць, ключові зв’язки, правила цілісності та відтворення бази даних.

Канонічними технічними джерелами є:

- `packages/db/prisma/schema.prisma` — моделі, enum, relations, indexes і referential actions;
- `packages/db/prisma/migrations/20260728135246_00_baseline/migration.sql` — фізична PostgreSQL-схема та правила, які неможливо повністю виразити у Prisma;
- `packages/db/prisma/seeds/reference` — детерміновані довідникові дані;
- `packages/db/prisma/tests` — clean-database migration smoke test і перевірка ідемпотентності reference seed.

Якщо документація розходиться зі схемою або reviewed migration, джерелом істини є код поточної гілки. Документація має бути оновлена в тому самому pull request.

## Реалізований стан

| Характеристика                      | Значення |
| ----------------------------------- | -------: |
| Прикладні Prisma-моделі             |       56 |
| Prisma enum                         |       71 |
| Public tables після clean migration |       57 |
| Прикладні baseline migrations       |        1 |
| Детерміновані reference rows        |      181 |

До 57 public tables входить службова таблиця Prisma `_prisma_migrations`; предметна модель складається з 56 прикладних таблиць.

Persistence foundation охоплює весь MVP data scope, але наявність таблиці не означає завершену реалізацію відповідного HTTP або UI-сценарію. API та інтерфейси додаються окремими vertical slices.

## Предметні області

| Область                              | Основні моделі                                                                                                   | Відповідальність                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Identity, Family and Personalization | `User`, `PersonProfile`, `Family`, `FamilyMembership`, `FamilyMember`, персональні вимірювання, цілі й обмеження | Identity projection, сімейний доступ, профілі зареєстрованих і залежних учасників |
| Reference Data                       | `Allergen`, `Nutrient`, `MeasurementUnit`, `DietaryTag`, `Cuisine`, `ProductCategory`, `RecipeType`, `MealType`  | Стабільні системні класифікатори                                                  |
| Product Catalog                      | `Product`, `Brand`, `ProductSourceReference`, nutrient, portion, media, tag та allergen records                  | Канонічний каталог продуктів і простежуваність джерел                             |
| Recipes and Nutrition                | `Recipe`, `Author`, `RecipeIngredient`, `RecipeStep`, source, media, classifications і nutrient snapshot         | Канонічний шаблон рецепта та його розрахована харчова цінність                    |
| Meal Planning                        | `MealPlan`, `MealEntry`, `MealEntryParticipant`                                                                  | Сімейний календар харчування і персоналізовані порції                             |
| Shopping List                        | `ShoppingList`, `ShoppingListItem`, `ShoppingListItemSource`                                                     | Збережений редагований snapshot закупівель із простежуваністю до плану            |
| Cooking Mode                         | `CookingSession`, ingredient/step snapshots і `CookingSessionNutrient`                                           | Фактичне виконання запланованого рецепта                                          |
| Consumption Diary                    | `ConsumptionEntry`, `ConsumptionEntryNutrient`, `MealConsumptionResolution`                                      | Історичний факт споживання і зіставлення з планом                                 |

Детальні зв’язки наведено в [доменних ERD](./erd.md), а призначення кожної моделі — у [словнику даних](./data-dictionary.md).

## Базові правила моделювання

### Ідентичність і naming

- прикладні сутності використовують UUID;
- Prisma models і fields записуються у `PascalCase` та `camelCase`;
- PostgreSQL tables, columns, enum types і mapped enum values використовують `snake_case`;
- стабільні довідники мають унікальний `code`, який не залежить від локалізованої назви;
- зовнішня identity Supabase зберігається як `User.externalSubject`; password hash у прикладній БД відсутній;
- `legacyId` не є частиною канонічної схеми.

### Час і календар

- audit timestamps зберігаються як `Timestamptz(3)`;
- календарні дати зберігаються як PostgreSQL `date`;
- сім’я володіє `timeZone` і `weekStartsOn`;
- факти споживання зберігають `localDate` та timezone snapshot, щоб історичне представлення не змінювалося після зміни налаштувань.

### Точні числові значення

- кількості, маса, нутрієнти, антропометрія та коефіцієнти зберігаються як `Decimal`;
- `Float` не використовується для значень, де накопичення похибки впливає на харчові розрахунки;
- одиниці вимірювання нормалізуються через `MeasurementUnit` і базові виміри mass, volume та count.

### Життєвий цикл

- каталоги використовують status, verification status та archive semantics;
- сім’ї та персональні профілі архівуються, коли історичні зв’язки мають зберігатися;
- `Cascade` застосовується до дочірніх records без самостійного життєвого циклу;
- `Restrict` захищає довідники, каталоги й історичні факти;
- `SetNull` використовується лише тоді, коли походження можна втратити без втрати самого факту;
- завершені snapshots не переписуються внаслідок подальших змін каталогу або плану.

## Рівні забезпечення цілісності

### Prisma schema

Prisma описує scalar types, nullability, primary і compound keys, unique constraints, indexes, relations, referential actions та mapped PostgreSQL naming.

### Reviewed baseline SQL

Baseline migration додатково містить:

- row-level `CHECK` constraints;
- partial unique indexes;
- правила XOR для посилань `product` або `recipe`;
- додатність кількостей і допустимість position/revision;
- узгодженість status і timestamps;
- PostgreSQL functions і constraint triggers для міжтабличних інваріантів.

Особливо суворо перевіряються family ownership, snapshots плану, Cooking Mode, Consumption Diary і Shopping List. Ці правила не можна переносити лише до frontend validation.

### Application layer

Application services додатково відповідають за authentication, authorization, допустимі переходи станів, calendar і timezone policy, deterministic fingerprints, calculation versioning і транзакційне виконання команд.

## Reference data

| Довідник        | Кількість |
| --------------- | --------: |
| Nutrient        |        36 |
| MeasurementUnit |         5 |
| DietaryTag      |        15 |
| Cuisine         |        22 |
| ProductCategory |        68 |
| RecipeType      |        14 |
| MealType        |         7 |
| Allergen        |        14 |
| **Разом**       |   **181** |

Reference seed використовує детерміновані UUID і stable codes, виконується транзакційно, оновлює лише фактичні відмінності, зупиняється при identity conflict, не видаляє records і не створює development fixtures.

Перший запуск на чистій БД створює 181 record. Другий запуск повертає `created=0`, `updated=0`, `unchanged=181` і не змінює `updatedAt`.

## Migrations і тестова база

Prisma володіє прикладною migration history. Supabase CLI надає локальний PostgreSQL, Auth і Storage, але не веде паралельну історію прикладної схеми.

Для database tests використовується окрема локальна база `mealmind_test`. Test helper дозволяє відтворювати лише цю database на local host і порту локального Supabase PostgreSQL. Development database `postgres`, staging і production не є допустимими test targets.

```bash
npm run db:validate
npm run db:test:migrations
npm run db:test:seed
npm run db:test
```

`db:test:migrations` відтворює чисту test database і застосовує baseline. `db:test:seed` повторно відтворює її, застосовує migration, запускає seed двічі та перевіряє counts, UUID/code uniqueness й незмінність timestamps.

## Дані та приватність

До чутливих даних належать email та зовнішній subject, дата народження, біологічна стать, вага, зріст, алергії, цілі, харчові обмеження, факти споживання і nutrient snapshots.

Application administrator не отримує автоматичного доступу до сімейних даних. Database constraints забезпечують structural isolation, але остаточна перевірка доступу залишається обов’язком API authorization layer. Reference seed не містить персональних, staging або production даних.

## Відомі межі

- Supabase Auth users та Storage objects не створюються Prisma migration;
- Row Level Security і Storage policies належать platform-specific integration;
- каталожні дані USDA імпортуються окремим контрольованим процесом, а не reference seed;
- development fixtures мають окремий lifecycle і не запускаються в production;
- ERD показує предметні зв’язки, але не замінює повну Prisma schema та reviewed SQL.
