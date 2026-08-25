# Модуль рецептів

Модуль реалізує адміністративний lifecycle рецептів, окремий client read contract і детермінований розрахунок поживності.

## Поживність

Кожен інгредієнт перед збереженням нормалізується у грами:

- MASS unit: `gramWeight = quantity × factorToBaseUnit`;
- product portion: `gramWeight = quantity × portion.gramWeight / portion.amount`;
- manual mass: використовується явно переданий `gramWeight`.

VOLUME та COUNT не конвертуються напряму без product portion, оскільки універсальна густина або вага штуки відсутня. Опційні інгредієнти не входять до базового nutrition snapshot.

Для кожного нутрієнта:

```text
valueTotal = Σ(ingredient.gramWeight × product.valuePer100g / 100)
```

Значення snapshot округлюється до 8 десяткових знаків. `valuePerServing`
обчислюється з `valueTotal / baseServings`, а `valuePer100g` — з
`valueTotal × 100 / yieldWeightG`. Якщо адміністратор не задав вихідну вагу,
сервер зберігає суму `gramWeight` усіх інгредієнтів. Якщо нутрієнт відсутній хоча
б в одного обов’язкового продукту, його completeness дорівнює `PARTIAL`; інакше
— `COMPLETE`. Ця технічна ознака не показується кінцевому користувачу.

Recipe nutrients є snapshot із calculator version та SHA-256 fingerprint входів. Вони перераховуються при кожній заміні ingredients. Зміни product nutrients не змінюють уже збережений рецепт до наступного його редагування.

## Транзакції й порядок

Create зберігає рецепт, ingredients, steps, sources, cuisines, dietary tags,
external videos і nutrients атомарно. Update використовує patch semantics:
відсутня дочірня колекція не змінюється, а переданий масив повністю замінюється
в одній PostgreSQL-транзакції. Позиції ingredients і steps визначаються порядком
у request та зберігаються як `1..n` відповідно до baseline database constraints.

## Статуси й видимість

Активне зовнішнє відео отримує однакові `createdAt` і `verifiedAt`, щоб запис
відповідав timestamp constraint незалежно від різниці годинника API та PostgreSQL.

Дозволені переходи:

```text
DRAFT -> READY
READY -> DRAFT | PUBLISHED
PUBLISHED -> ARCHIVED
ARCHIVED -> DRAFT
```

Опублікувати можна лише `PUBLIC` recipe із принаймні одним ingredient, step і валідним `baseServings`. Family-owned recipes залишаються scope PR-012, тому self-contained PR-011 не створює `FAMILY` recipe без family authorization.

`GET /api/v1/recipes/:id` використовує окремий read contract і повертає лише `PUBLISHED + PUBLIC` recipes. Admin DTO та persistence-only metadata не потрапляють у client contract.

## Автори, джерела й media

Використовується єдина актуальна модель `Author`. Inline author creation проходить через адміністративний reference endpoint. `originalRecipeId` задає lineage похідного рецепта, а `RecipeSource` зберігає зовнішні джерела.

Зображення рецептів зберігаються у приватному bucket `recipe-media`. API видає лише короткоживий signed upload, після чого сервер повторно читає object, перевіряє фактичний MIME, розмір і dimensions, створює WebP thumbnail та лише тоді активує `RecipeMedia`. Перше активоване зображення автоматично стає основним; видалення спочатку переводить media у безпечний стан, видаляє objects і завершується архівацією запису.

Bucket описано у `supabase/config.toml`. Storage adapter додатково виконує
ідемпотентну перевірку перед першою reservation і створює приватний bucket через
service-role client, якщо локальний або розгорнутий Supabase stack ще не
застосував bucket configuration. Повторна перевірка після конфлікту підтримує
одночасний запуск кількох API instances.
