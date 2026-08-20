# Словник даних

## Як читати документ

Словник описує семантичне призначення 56 прикладних моделей MealMind. Він не дублює всі scalar types, indexes і referential actions: їх точне визначення міститься у `packages/db/prisma/schema.prisma`.

Позначення:

- **власник** — aggregate або предметна область, що керує життєвим циклом record;
- **stable key** — значення, придатне для детермінованого lookup або seed;
- **snapshot** — історична копія стану, яка не повинна автоматично змінюватися разом із canonical source;
- **audit actor** — користувач, який виконав дію, але не обов’язково є бізнес-власником record.

## Спільні поля й типи

| Поле або тип        | Семантика                                                                |
| ------------------- | ------------------------------------------------------------------------ |
| `id: UUID`          | Технічна identity прикладної сутності                                    |
| `code`              | Стабільний унікальний ключ довідника, незалежний від локалізованої назви |
| `createdAt`         | Час створення record у UTC                                               |
| `updatedAt`         | Час останньої фактичної зміни                                            |
| `archivedAt`        | М’яке вилучення з активного каталогу або процесу зі збереженням історії  |
| `deletedAt`         | Деактивація identity projection без видалення пов’язаних audit records   |
| `localDate`         | Календарна дата в часовій зоні сім’ї                                     |
| `Decimal`           | Точна кількість, маса, коефіцієнт або nutrient value                     |
| `revision`          | Optimistic concurrency token                                             |
| `calculatorVersion` | Версія алгоритму, що створив nutrient snapshot                           |
| `completeness`      | Якість або повнота розрахованого snapshot                                |

## Identity, Family and Personalization

### User

Прикладна проєкція зареєстрованої identity.

| Аспект        | Опис                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| Ключі         | `id`, unique `externalSubject`, unique `email`                                                |
| Основні поля  | `applicationRole`, `onboardingCompletedAt`, `deletedAt`                                       |
| Інваріанти    | Password credentials не зберігаються; `externalSubject` посилається на Supabase Auth identity |
| Життєвий цикл | Identity деактивується через `deletedAt`; історичні audit links зберігаються                  |

`applicationRole` визначає системну роль, зокрема адміністратора застосунку. Сімейні права визначаються окремо через `FamilyMembership`.

### PersonProfile

Персональний профіль людини, для якої планується харчування.

| Аспект        | Опис                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Ключі         | `id`, optional unique `userId`                                                                      |
| Основні поля  | ім’я, optional дата народження, біологічна стать, avatar object path                                |
| Інваріанти    | Зареєстрована людина має optional one-to-one link із `User`; залежний профіль може не мати `userId` |
| Життєвий цикл | Архівується через `archivedAt`                                                                      |

### BodyMeasurement

Історичне вимірювання ваги та/або зросту.

| Аспект       | Опис                                                        |
| ------------ | ----------------------------------------------------------- |
| Власник      | `PersonProfile`                                             |
| Основні поля | `weightKg`, `heightCm`, `measuredAt`, `source`              |
| Інваріанти   | Щонайменше один показник має бути заданий; значення додатні |
| Використання | Baseline для цілі ваги та розрахунку nutrient targets       |

### PersonActivityPeriod

Історичний період рівня фізичної активності.

| Аспект       | Опис                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| Власник      | `PersonProfile`                                                                       |
| Основні поля | `activityLevel`, `effectiveFrom`, `effectiveTo`, `source`                             |
| Інваріанти   | Кінець пізніший за початок; application layer не допускає суперечливі активні періоди |

### PersonWeightGoal

Optional ціль підтримання, зниження або збільшення ваги.

| Аспект       | Опис                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| Власник      | `PersonProfile`                                                                       |
| Основні поля | `type`, `status`, optional target weight/rate/date, `startsAt`, `endedAt`             |
| Походження   | Optional `baselineMeasurementId`, `source`                                            |
| Інваріанти   | Ціль не є обов’язковою для MVP; напрям задається `type`, а rate зберігається додатним |

### NutrientTargetSet

Версійований набір персональних nutrient targets з періодом дії.

| Аспект       | Опис                                                                 |
| ------------ | -------------------------------------------------------------------- |
| Власник      | `PersonProfile`                                                      |
| Основні поля | `source`, `effectiveFrom`, `effectiveTo`, `calculationPolicyVersion` |
| Походження   | Optional measurement, activity period і weight goal                  |
| Інваріанти   | Історичний набір не переписується після зміни вихідних даних         |

### NutrientTarget

Межі або цільове значення конкретного нутрієнта в межах `NutrientTargetSet`.

| Аспект       | Опис                                                                  |
| ------------ | --------------------------------------------------------------------- |
| Ключ         | Unique `(targetSetId, nutrientId)`                                    |
| Основні поля | `minimumValue`, `targetValue`, `maximumValue`, `source`               |
| Інваріанти   | Має бути задана щонайменше одна межа; значення мають логічний порядок |

### PersonMealTypePreference

Вибраний профілем тип прийому їжі, який використовується для персоналізації плану.

| Аспект     | Опис                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| Ключ       | Unique `(personProfileId, mealTypeId)`                                                 |
| Зв’язки    | `PersonProfile` → `MealType`                                                           |
| Інваріанти | Доступні лише active `MealType`; повна заміна набору є ідемпотентною profile operation |

### PersonDietaryRestriction

Зв’язок профілю з користувацьки вибраною дієтичною ознакою.

| Аспект     | Опис                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| Ключ       | Unique `(personProfileId, dietaryTagId)`                                   |
| Інваріанти | Для ручного вибору доступні лише `DietaryTag.isRestrictionSelectable=true` |

Це налаштування фільтрації, а не медичний діагноз і не заміна `PersonAllergy`.

### PersonAllergy

Зафіксована харчова алергія або регуляторно значуща непереносимість профілю.

| Аспект       | Опис                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| Ключ         | Unique `(personProfileId, allergenId)`                                                   |
| Основні поля | `severity`, `source`, `archivedAt`                                                       |
| Інваріанти   | Алерген береться з контрольованого довідника; запис не є автоматичним медичним висновком |

### PersonDislikedProduct

Явно небажаний продукт для профілю.

| Аспект    | Опис                                                                   |
| --------- | ---------------------------------------------------------------------- |
| Ключ      | Unique `(personProfileId, productId)`                                  |
| Видалення | Product захищений `Restrict`, щоб не втрачати персональні налаштування |

### PersonCuisinePreference

Уподобання профілю щодо кухні.

| Аспект     | Опис                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| Ключ       | Unique `(personProfileId, cuisineId)`                                  |
| Інваріанти | Для ручного вибору доступні лише `Cuisine.isPreferenceSelectable=true` |

### Family

Aggregate root домогосподарства.

| Аспект           | Опис                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| Ключі            | `id`, `createdByUserId`                                                                |
| Основні поля     | `name`, `timeZone`, `weekStartsOn`, `archivedAt`                                       |
| Відповідальність | Контекст ownership для планів, рецептів, списків, cooking sessions і consumption facts |

### FamilyMembership

Authorization-зв’язок зареєстрованого користувача із сім’єю.

| Аспект       | Опис                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| Ключ         | Unique `(familyId, userId)`                                                     |
| Основні поля | `role`, `status`, `joinedAt`, `endedAt`                                         |
| Інваріанти   | `OWNER` і `MEMBER` є сімейними ролями; вони не замінюють `User.applicationRole` |

### FamilyMember

Планувальний учасник сім’ї, пов’язаний із `PersonProfile`.

| Аспект       | Опис                                                                  |
| ------------ | --------------------------------------------------------------------- |
| Ключ         | Unique `(familyId, personProfileId)`                                  |
| Основні поля | `joinedAt`, `archivedAt`                                              |
| Інваріанти   | Дозволяє залежному профілю брати участь у плані без облікового запису |

### FamilyMemberAccountInvitation

Одноразове запрошення для активації власного облікового запису existing dependent-профілю.

| Аспект        | Опис                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| Ownership     | `Family`, target `PersonProfile`, `invitedByUserId`                                           |
| Основні поля  | normalized `recipientEmail`, unique SHA-256 `tokenHash`, `status`, expiration і timestamps    |
| Інваріанти    | Одне `PENDING` invitation на profile; raw secret не зберігається; claim завжди створює MEMBER |
| Життєвий цикл | `PENDING → ACCEPTED`, `REVOKED` або `EXPIRED`; resend перевипускає secret                     |

## Reference Data

### Allergen

Контрольований регуляторний перелік харчових алергенів і непереносимостей.

| Ключ        | Значення            |
| ----------- | ------------------- |
| Stable key  | Unique `code`       |
| Локалізація | `nameUa`, `nameEn`  |
| Seed scope  | 14 активних записів |

### Nutrient

Канонічний whitelist нутрієнтів MealMind.

| Аспект       | Опис                                                     |
| ------------ | -------------------------------------------------------- |
| Stable key   | Unique `code`                                            |
| Класифікація | `group`, `unit`, `displayLevel`, `isTargetable`          |
| USDA mapping | Optional unique `usdaNutrientId` та `usdaNutrientNumber` |
| Seed scope   | 36 активних записів                                      |

USDA є джерелом значень продуктів, але не визначає presentation або персональні target semantics MealMind.

### MeasurementUnit

Одиниця mass, volume або count із коефіцієнтом до базової одиниці.

| Аспект       | Опис                                          |
| ------------ | --------------------------------------------- |
| Stable keys  | Unique `code`, unique `symbol`                |
| Основні поля | `dimension`, `factorToBaseUnit`, `isBaseUnit` |
| Seed scope   | `g`, `kg`, `ml`, `l`, `pcs`                   |

### DietaryTag

Дієтична або нутрієнтна класифікаційна ознака.

| Аспект     | Опис                                                                              |
| ---------- | --------------------------------------------------------------------------------- |
| Stable key | Unique `code`                                                                     |
| Типи       | Diet pattern, free-from, nutrition profile                                        |
| Selection  | `isRestrictionSelectable` відокремлює профільну настройку від каталожного фільтра |
| Seed scope | 15 записів                                                                        |

### Cuisine

Класифікація кухні рецепта та користувацьких уподобань.

| Аспект     | Опис                                         |
| ---------- | -------------------------------------------- |
| Stable key | Unique `code`                                |
| Scope      | National, regional, transnational або fusion |
| Selection  | `isPreferenceSelectable`                     |
| Seed scope | 22 записи                                    |

### ProductCategory

Ієрархічна категорія продукту.

| Аспект       | Опис                                |
| ------------ | ----------------------------------- |
| Stable key   | Unique `code`                       |
| Ієрархія     | Optional `parentCategoryId`         |
| Основні поля | `kind`, `isAssignable`, `sortOrder` |
| Seed scope   | 68 records у parent-first order     |

Group nodes не призначаються продукту напряму; assignable nodes використовуються каталогом і Shopping List.

### RecipeType

Стабільний тип рецепта.

| Stable key | Unique `code`                               |
| ---------- | ------------------------------------------- |
| Seed scope | 14 records; historical `medical` неактивний |

### MealType

Тип прийому їжі та його позиція у денному представленні.

| Аспект       | Опис                            |
| ------------ | ------------------------------- |
| Stable key   | Unique `code`                   |
| Основні поля | `kind`, `sortOrder`, `isActive` |
| Seed scope   | 7 records                       |

## Product Catalog

### Product

Канонічний catalog item для generic або branded food.

| Аспект        | Опис                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Ключі         | UUID, optional unique normalized `gtin`                                                            |
| Класифікація  | category, optional brand, food state, default measurement unit                                     |
| Варіанти      | Optional `baseProductId` пов’язує branded product із generic base                                  |
| Життєвий цикл | `status`, `verificationStatus`, `archivedAt`                                                       |
| Інваріанти    | Generic і branded поля узгоджуються; catalog records не видаляються при наявності історичних links |

### Brand

Нормалізований бренд для branded products.

| Аспект        | Опис                                                |
| ------------- | --------------------------------------------------- |
| Основні поля  | `name`, optional локалізації, country code, website |
| Життєвий цикл | `status`, `verificationStatus`, `archivedAt`        |

### ProductSourceReference

Provenance продукту із зовнішнього dataset.

| Аспект       | Опис                                          |
| ------------ | --------------------------------------------- |
| Ключ         | Unique `(provider, dataset, externalId)`      |
| Основні поля | source release, publication date, `isPrimary` |
| MVP import   | USDA Foundation Foods та SR Legacy            |

### ProductNutrient

Значення нутрієнта продукту, нормалізоване на 100 g.

| Аспект       | Опис                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| Ключ         | Unique `(productId, nutrientId)`                                         |
| Основні поля | `valuePer100g`, `valueType`, optional source reference і source metadata |
| Інваріанти   | Значення невід’ємне; source reference має належати тому самому product   |

### ProductPortion

Конвертація порції продукту у mass.

| Аспект          | Опис                                                     |
| --------------- | -------------------------------------------------------- |
| Основні поля    | amount, measurement unit, gram weight, kind, weight type |
| Простежуваність | Optional source reference                                |
| Інваріанти      | Кількості та gram weight додатні                         |

### ProductMedia

Metadata медіа продукту у Supabase Storage або зовнішньому джерелі.

| Аспект        | Опис                                                            |
| ------------- | --------------------------------------------------------------- |
| Основні поля  | kind, status, storage object path, media metadata та sort order |
| Audit         | Optional uploader                                               |
| Життєвий цикл | Storage object і database metadata керуються узгоджено          |

### ProductDietaryTag

Evidence-backed класифікація продукту дієтичною ознакою.

| Аспект          | Опис                                                 |
| --------------- | ---------------------------------------------------- |
| Ключ            | Unique `(productId, dietaryTagId)`                   |
| Основні поля    | status, method, assigned/verified actors, timestamps |
| Простежуваність | Optional source reference                            |

### ProductAllergen

Evidence-backed allergen declaration продукту.

| Аспект       | Опис                                                  |
| ------------ | ----------------------------------------------------- |
| Ключ         | Unique `(productId, allergenId)`                      |
| Основні поля | declaration, status, method, assigned/verified actors |
| Інваріанти   | Відсутність record не доводить безпечність продукту   |

### ProductFavorite

Вибраний сім’єю продукт.

| Аспект | Опис                                                            |
| ------ | --------------------------------------------------------------- |
| Ключ   | Unique `(familyId, productId)`                                  |
| Audit  | `createdByUserId` має бути активним учасником відповідної сім’ї |

## Recipes and Nutrition

### Recipe

Канонічний або сімейний шаблон рецепта.

| Аспект             | Опис                                                             |
| ------------------ | ---------------------------------------------------------------- |
| Ownership          | Optional `familyId`; public/system recipes не залежать від сім’ї |
| Audit та авторство | `createdByUserId` і optional `authorId` мають різну семантику    |
| Класифікація       | recipe type, status, visibility, difficulty                      |
| Кількості          | base servings і base output weight                               |
| Derivation         | Optional `originalRecipeId` для copy-on-write recipe             |

### Author

Керований профіль автора рецептів або медіа.

| Аспект            | Опис                                                    |
| ----------------- | ------------------------------------------------------- |
| Типи              | System, user, expert, blogger                           |
| Optional identity | One-to-one `userId` для зареєстрованого автора          |
| Expertise         | Optional area і verification metadata                   |
| Ownership         | External authors створюються адміністративним сценарієм |

### AuthorLink

Впорядковане зовнішнє посилання профілю автора.

| Ключ    | Unique `(authorId, type, url)`                       |
| ------- | ---------------------------------------------------- |
| Безпека | URL проходить allowlist і безпечний rendering policy |

### RecipeIngredient

Впорядкований інгредієнт рецепта.

| Аспект       | Опис                                                                 |
| ------------ | -------------------------------------------------------------------- |
| Ключі        | Unique `(recipeId, position)`                                        |
| Основні поля | product, quantity, unit, normalized grams, optional flag             |
| Інваріанти   | Кількості додатні; normalized quantity узгоджена з conversion method |

### RecipeStep

Впорядкований крок приготування.

| Ключ         | Unique `(recipeId, position)`       |
| ------------ | ----------------------------------- |
| Основні поля | instruction, optional timer seconds |

### RecipeSource

Provenance рецепта.

| Основні поля | kind, title, URL, optional publication date  |
| ------------ | -------------------------------------------- |
| Інваріанти   | External URL нормалізується та перевіряється |

### RecipeCuisine

Many-to-many класифікація рецепта за кухнею.

| Ключ         | Compound primary key `(recipeId, cuisineId)` |
| ------------ | -------------------------------------------- |
| Основні поля | `isPrimary`                                  |

### RecipeDietaryTag

Версійована validation record дієтичної ознаки рецепта.

| Ключ         | Compound primary key `(recipeId, dietaryTagId)`        |
| ------------ | ------------------------------------------------------ |
| Основні поля | validation method, validator, validatedAt, fingerprint |

Fingerprint робить класифікацію простежуваною до конкретного складу рецепта.

### RecipeMedia

Image або external video рецепта.

| Аспект       | Опис                                                            |
| ------------ | --------------------------------------------------------------- |
| Основні поля | kind, status, storage path або external URL, platform, position |
| Авторство    | Optional `authorId`; audit actor зберігається окремо            |

### RecipeNutrient

Розрахований nutrient snapshot рецепта.

| Аспект          | Опис                                                                |
| --------------- | ------------------------------------------------------------------- |
| Ключ            | Unique `(recipeId, nutrientId)`                                     |
| Основні поля    | `valueTotal`, calculation method, completeness та coverage counters |
| Простежуваність | calculator version, calculatedAt, ingredient fingerprint            |

### RecipeFavorite

Вибраний сім’єю рецепт.

| Ключ  | Unique `(familyId, recipeId)`          |
| ----- | -------------------------------------- |
| Audit | Creator має належати відповідній сім’ї |

## Meal Planning

### MealPlan

Сімейний тижневий план.

| Аспект       | Опис                                             |
| ------------ | ------------------------------------------------ |
| Ключ         | Unique `(familyId, weekStart)`                   |
| Основні поля | week start, snapshot `weekStartsOn` і timestamps |
| Інваріанти   | Week start відповідає calendar policy сім’ї      |

### MealEntry

Позиція плану на конкретну дату й тип прийому їжі.

| Аспект       | Опис                                     |
| ------------ | ---------------------------------------- |
| Вміст        | Рівно один із `productId` або `recipeId` |
| Основні поля | date, meal type і position               |
| Ownership    | Через `MealPlan.familyId`                |

### MealEntryParticipant

Персоналізована порція позиції плану.

| Аспект       | Опис                                            |
| ------------ | ----------------------------------------------- |
| Ключ         | Unique `(mealEntryId, familyMemberId)`          |
| Основні поля | quantity, measurement unit, normalized grams    |
| Інваріанти   | Учасник належить сім’ї плану; кількості додатні |

## Shopping List

### ShoppingList

Aggregate root збереженого snapshot покупок для періоду плану.

| Аспект        | Опис                                  |
| ------------- | ------------------------------------- |
| Ownership     | `familyId`, `mealPlanId`              |
| Versioning    | version, revision, source fingerprint |
| Період        | start/end date у межах одного plan    |
| Життєвий цикл | Open, completed, archived             |

Список не створюється для повністю минулого періоду. Regeneration створює нову version замість переписування archived snapshot.

### ShoppingListItem

Редагована catalog або manual позиція списку.

| Аспект         | Опис                                       |
| -------------- | ------------------------------------------ |
| Походження     | Catalog або manual                         |
| Кількості      | Derived і user-requested quantity/unit     |
| Purchase state | status, `purchasedAt`, `removedAt` і notes |
| Групування     | Product category або окрема manual group   |

Фактична кількість, ціна та торгова мережа не входять до поточної persistence foundation і можуть бути додані окремим vertical slice після уточнення вимог.

### ShoppingListItemSource

Внесок конкретної планової порції або ручної дії в агреговану позицію.

| Аспект          | Опис                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| Ключ            | Детермінована source identity у межах item                                          |
| Простежуваність | Meal entry snapshot, optional canonical MealEntry/RecipeIngredient, product і units |
| Інваріанти      | Source context узгоджується із сім’єю, планом та item                               |

## Cooking Mode

### CookingSession

Факт виконання recipe-based позиції плану.

| Аспект       | Опис                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Ownership    | Family та MealEntry                                                                               |
| Основні поля | status, revision, planned/actual yield, started/completed actors і timestamps                     |
| Інваріанти   | Recipe та family відповідають MealEntry; завершення потребує resolved snapshots і nutrient result |

### CookingSessionIngredient

Snapshot інгредієнта конкретного cooking session.

| Аспект        | Опис                                                                           |
| ------------- | ------------------------------------------------------------------------------ |
| Planned state | Recipe ingredient, product, quantity, unit і grams                             |
| Actual state  | Used, omitted або substituted product/quantity                                 |
| Audit         | Resolver і resolvedAt                                                          |
| Інваріанти    | `PENDING`, `USED`, `OMITTED`, `SUBSTITUTED` мають різні допустимі набори полів |

### CookingSessionStep

Snapshot кроку конкретного cooking session.

| Аспект       | Опис                                         |
| ------------ | -------------------------------------------- |
| Ключ         | Unique `(cookingSessionId, position)`        |
| Основні поля | instruction/timer snapshot, status, resolver |
| Інваріанти   | Завершений session не має pending steps      |

### CookingSessionNutrient

Фінальний nutrient snapshot приготовленої страви.

| Аспект       | Опис                                                  |
| ------------ | ----------------------------------------------------- |
| Ключ         | Compound primary key `(cookingSessionId, nutrientId)` |
| Основні поля | total value, method, completeness, calculator version |
| Використання | Пріоритетне джерело для факту споживання цієї страви  |

## Consumption Diary

### ConsumptionEntry

Історичний факт фактичного споживання.

| Аспект        | Опис                                                                |
| ------------- | ------------------------------------------------------------------- |
| Ownership     | Family та FamilyMember                                              |
| Походження    | Planned participant або manual catalog entry                        |
| Вміст         | Рівно один із product або recipe; optional completed CookingSession |
| Кількості     | Actual і optional planned snapshot                                  |
| Час           | `consumedAt`, `localDate`, `timeZone`                               |
| Життєвий цикл | Confirmed або voided, revision та audit actor                       |

### ConsumptionEntryNutrient

Історичний nutrient snapshot факту споживання.

| Аспект       | Опис                                                          |
| ------------ | ------------------------------------------------------------- |
| Ключ         | Compound primary key `(consumptionEntryId, nutrientId)`       |
| Основні поля | value, method, completeness, calculator version, calculatedAt |

Snapshot не перераховується автоматично після зміни продукту, рецепта або алгоритму.

### MealConsumptionResolution

Результат зіставлення планової порції з фактом.

| Аспект     | Опис                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------- |
| Ключі      | Unique `mealEntryParticipantId`, optional unique `consumptionEntryId`                       |
| Outcome    | Confirmed, changed або skipped                                                              |
| Audit      | Resolver, resolvedAt, notes                                                                 |
| Інваріанти | Family member, plan participant і optional consumption entry належать одному family context |

## Referential actions

| Дія        | Використання                                                                            |
| ---------- | --------------------------------------------------------------------------------------- |
| `Cascade`  | Дочірні snapshots, join records і залежні налаштування без самостійного життєвого циклу |
| `Restrict` | Довідники, catalog entities, audit actors, plan/cooking/consumption facts               |
| `SetNull`  | Optional provenance або identity link, втрата якого не знищує сам record                |

Видалення через cascade не повинно використовуватися як спосіб редагування історії. Для значущих aggregate roots застосовуються status, archive або void semantics.
