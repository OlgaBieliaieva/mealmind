# MealMind Web Admin — аналітичний dashboard

## Призначення

Розділ `/analytics` показує адміністратору стан MealMind, історичну динаміку та
черги даних, які потребують уваги. Dashboard використовує реальний
`/api/v1/admin/analytics/*` contract і не дублює CRUD-таблиці.

## Маршрути

```text
/analytics             Загальний огляд
/analytics/users       Користувачі та сім’ї
/analytics/products    Продукти
/analytics/recipes     Рецепти
/analytics/references  Довідники
```

Кореневий маршрут web-admin перенаправляє на `/analytics`. Спільна навігація
позначає активний розділ через `aria-current`.

## Період

Overview, Users, Products і Recipes мають спільний filter:

- 7 і 30 днів;
- 3, 6 і 12 місяців;
- власний діапазон дат.

Період, granularity та `Europe/Kyiv` зберігаються в URL. До 31 дня
використовується `day`, до 180 — `week`, для довших діапазонів — `month`.
Некоректний власний діапазон не надсилається. References показує поточний стан і
не має period filter.

## Сторінки

### Загальний огляд

Поєднує current/all-time KPI з activity вибраного періоду:

- active і new users/families;
- products total та awaiting verification;
- recipes total та drafts;
- заплановані тижні, завершені приготування і підтверджені споживання.

Картки каталогу ведуть у відповідну analytics-сторінку або детермінований
відфільтрований CRUD-список.

### Користувачі

Показує active/deleted/archived totals, onboarding/profile completion, середню
кількість active users і profiles на сім’ю, comparison із попереднім періодом і
time-series створення. User-показники враховують лише роль `USER`, а
family-показники — лише сім’ї, створені користувачами з цією роллю. ADMIN-акаунти
та створені ними технічні сім’ї до продуктової статистики не входять;
`PersonProfile` залишається окремою метрикою людей.

### Продукти

Показує totals, created comparison, type/food state/status/verification/source
breakdowns, rankings категорій, брендів і favorites та time-series. Action KPI
ведуть у `/products` з відповідними query parameters.

На create/edit формі продукту адміністратор може змінити
`verificationStatus`: `UNVERIFIED`, `VERIFIED` або `REJECTED`. Новий продукт за
замовчуванням має `UNVERIFIED`.

### Рецепти

Показує totals, created comparison, status/visibility/difficulty breakdowns,
доменних авторів, походження запису, rankings і time-series.

«Створено користувачем» означає creator із поточною роллю `USER`.
«Система / імпорт» включає записи без creator та записи, створені `ADMIN`.
`authorId` залишається окремим поняттям і не підміняється creator classification.

### Довідники

Показує active/inactive inventory десяти resource types, status і verification
брендів, типи авторів та data-quality signals. Для підтримуваних випадків картки
ведуть у configuration-driven reference CRUD із URL-фільтрами.

## Drill-down contract

Analytics і CRUD lists використовують однакові enum values. Реалізовані URL
filters включають product status/type/verification/food state/source/category/
brand/created date та recipe status/visibility/difficulty/author type/creator
origin/recipe type/author/cuisine/dietary tag.

Приклади:

```text
/products?includeArchived=false&verificationStatus=UNVERIFIED
/products?sourceProvider=USDA
/recipes?includeArchived=false&status=DRAFT
/recipes?creatorOrigin=SYSTEM
/reference/brands?includeInactive=false&verificationStatus=UNVERIFIED
```

## Компоненти і стани

Feature використовує TanStack Query, Recharts і наявні `Button`, `Card`,
`PageState`, `SelectField`, `TextInput`. Кожна сторінка має loading, error із
повторним запитом та data state. Empty rankings і series не приховують точні KPI.
Критичні значення доступні текстом, а не лише через графік.

## Перевірки

```text
npm run typecheck -w @mealmind/web-admin
npm test -w @mealmind/web-admin
npm run lint -w @mealmind/web-admin
npm run test:ui-quality -w @mealmind/web-admin
npm run build -w @mealmind/web-admin
```

Component tests перевіряють API URL, totals, creator semantics, accessible
rendering і drill-down links.

## Поточні обмеження

- немає окремих сторінок Planning, Shopping, Cooking і Consumption;
- Users dashboard є інформаційним, без таблиць керування users/families;
- одна сторінка використовує один агрегований endpoint, тому error state має
  page/section-level семантику, а не незалежний стан кожної картки;
- server-side cache і realtime refresh не реалізовані.
