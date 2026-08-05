# Довідникові модулі

## Архітектурний шаблон

Усі довідники використовують однаковий ланцюжок оброблення:

1. Prisma repository читає або змінює дані й повертає лише контрактні поля.
2. Application service застосовує стабільне сортування, пагінацію та доменні перевірки.
3. Zod schema перевіряє параметри, query і тіло запиту окремо для кожного ресурсу.
4. Presenter вилучає службові поля persistence-рівня.
5. Controller формує HTTP-відповідь, а router належить безпосередньо модулю.

Паралельні застарілі маршрути `routes/v1/*` не використовуються.

## Доступні ресурси

- `allergens` — алергени;
- `authors` — автори рецептів;
- `brands` — бренди;
- `cuisines` — кухні;
- `dietary-tags` — дієтичні теги;
- `meal-types` — типи прийомів їжі;
- `measurement-units` — одиниці вимірювання;
- `nutrients` — нутрієнти;
- `product-categories` — категорії продуктів;
- `recipe-types` — типи рецептів.

## HTTP endpoints

Для всіх запитів потрібна автентифікація. Запити під `/admin` додатково вимагають
application role `ADMIN`.

```text
GET   /api/v1/reference/:resource
GET   /api/v1/admin/reference/:resource
POST  /api/v1/admin/reference/:resource
PATCH /api/v1/admin/reference/:resource/:id
```

Публічне для застосунків читання повертає лише активні значення. Адміністративне
читання підтримує `includeInactive=true`. Параметри `page` і `pageSize` є
однобазованими, максимальний розмір сторінки — 100. Пошук виконується за кодом і
локалізованими назвами, а для авторів — за `slug` і `displayName`.

Успішні клієнтські read-відповіді кешуються приватно протягом п’яти хвилин.
Адміністративні read і mutation endpoints повертають `Cache-Control: no-store`.

## Створення та редагування

`POST` створює нове значення. `PATCH` приймає лише змінювані поля й вимагає хоча
б одне поле. Фізичне видалення довідників не підтримується:

- довідники з `isActive` деактивуються через `{ "isActive": false }`;
- автори приймають те саме API-поле, яке всередині перетворюється на `archivedAt`;
- бренди архівуються через `{ "status": "ARCHIVED" }`.

Коди seeded-довідників задаються під час створення, але не змінюються через
`PATCH`. Це зберігає стабільність інтеграційних ключів і повторних seed-запусків.
Для автора дозволено змінювати `slug`, оскільки автор не є seeded-довідником.

### Обов’язкові поля POST

| Ресурс               | Обов’язкові поля                                                                   |
| -------------------- | ---------------------------------------------------------------------------------- |
| `allergens`          | `code`, `nameUa`, `nameEn`                                                         |
| `authors`            | `type`, `slug`, `displayName`                                                      |
| `brands`             | `name`                                                                             |
| `cuisines`           | `code`, `nameUa`, `nameEn`, `scope`, `sortOrder`                                   |
| `dietary-tags`       | `code`, `nameUa`, `nameEn`, `kind`, `sortOrder`                                    |
| `meal-types`         | `code`, `nameUa`, `nameEn`, `kind`, `sortOrder`                                    |
| `measurement-units`  | `code`, `symbol`, `nameUa`, `nameEn`, `dimension`, `factorToBaseUnit`, `sortOrder` |
| `nutrients`          | `code`, `nameUa`, `nameEn`, `group`, `unit`, `sortOrder`                           |
| `product-categories` | `code`, `nameUa`, `nameEn`, `kind`, `sortOrder`                                    |
| `recipe-types`       | `code`, `nameUa`, `nameEn`, `sortOrder`                                            |

Точні enum-значення, максимальні довжини й optional-поля визначені у
`transport/reference-write-schema.ts`. Приклади тіл запитів доступні через
`GET /api/openapi.json`.

## Категорії продуктів

Категорії повертаються повним деревом, тому звичайна пагінація до них не
застосовується. Пошук залишає у відповіді знайдені вузли разом з усіма предками.

Перед mutation service перевіряє, що батьківська категорія існує. Оновлення, яке
робить категорію власним предком або нащадком, відхиляється до запису в БД.
Repository додатково покладається на foreign key актуальної Prisma-схеми.

## Помилки

- `400 REQUEST_VALIDATION_FAILED` — невалідні поля або тіло запиту;
- `400 INVALID_REFERENCE_RELATION` — відсутній пов’язаний запис або цикл категорій;
- `401 AUTHENTICATION_REQUIRED` — відсутня або невалідна сесія;
- `403 ACCOUNT_ACCESS_DENIED` — немає ролі адміністратора;
- `404 REFERENCE_NOT_FOUND` — значення для PATCH не існує;
- `409 REFERENCE_CONFLICT` — порушено unique constraint коду, символу, slug або USDA ID.

## Сортування й безпека контракту

Списки сортуються за `sortOrder`, потім за українською назвою/відображуваним
іменем і UUID. Порядок не залежить від порядку записів, повернених PostgreSQL.

Presenter і repository не повертають `createdAt`, `updatedAt`, внутрішні user IDs,
службові часові мітки, notes або object paths. Mutations проходять authentication,
role check, Zod validation і Prisma constraint mapping.
