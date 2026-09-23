# Cooking Mode — Web Client

## Призначення та маршрут

Cooking Mode — phone-first UI одного конкретного приготування. Стан належить
серверу й відновлюється після reload або повторного відкриття маршруту:

```text
/plan/cooking/:sessionId
```

Meal Plan відкриває цей маршрут через:

- «Готувати» — для вибраних вільних днів рецепта;
- «Продовжити приготування» — для active session;
- «Готувати решту» — коли інші дні того самого агрегованого рецепта ще вільні.

Одна session може охоплювати кілька днів. Наприклад, Пн–Ср і Пт–Нд одного
рецепта можуть бути двома незалежними sessions; completed allocations першої
не блокують другу групу днів.

## Композиція сторінки

Сторінка повторно використовує візуальну мову recipe details:

1. image hero з overlay-кнопкою повернення;
2. `CookingPot` замість favorite action;
3. білий details sheet із заголовком і коротким описом;
4. tabs «Огляд», «Інгредієнти», «Кроки», «Нутрієнти»;
5. fixed action block над bottom navigation.

Global floating `+` button на Cooking route відсутній. Нижній action block має
сіру кнопку ваги, зелену кнопку завершення і червону кнопку скасування. Він
враховує висоту bottom menu та safe area.

Cooking bottom sheets займають повну ширину сторінки, залишаються прикріпленими
до нижнього краю й мають заокруглення лише зверху.

## Огляд

Overview показує блоки в такому порядку:

- підготовка, приготування, складність;
- «Готуємо для плану» з датами, meal type і demand;
- планові макронутрієнти базового рецепта на 100 г;
- тип страви, кухня та dietary tags;
- повний довгий snapshot-опис;
- автора, його зовнішні посилання та джерела, якщо вони є.

Title, summary, description, time, difficulty та hero image походять із
CookingSession snapshot. Планові macros і supplementary metadata читаються з
поточного Food Details contract базового рецепта та не підміняють фактичну
nutrition CookingSession.

## Інгредієнти

- checkbox для untouched `PENDING → USED` без зміни planned amount;
- редактор фактичної ваги;
- omission;
- substitution через product search;
- додавання cooking-only ingredient;
- видалення лише `ADDED_DURING_COOKING` ingredient;
- прогрес resolved/total.

Recipe-derived ingredient залишається видимим після omission або substitution.
Окрема cancel-style дія «Не використовувати» не маскується під destructive
delete.

## Кроки

Крок можна завершити або пропустити. Прогрес показує resolved/total, а не
elapsed time. Recipe duration відображається як довідкова інформація; таймери
не реалізовані.

## Вага готової страви

Bottom sheet підтримує:

- direct actual weight;
- tare + gross із серверним обчисленням різниці;
- очищення раніше введеного measurement.

Actual yield необов’язковий і не блокує completion.

## Нутрієнти

Tab «Нутрієнти» показує actual CookingSession nutrition на 100 г:

- під час роботи — preview підтверджених actual ingredients;
- після completion — persisted final snapshot;
- `ACTUAL` basis за фактичною вагою;
- `PLANNED_ESTIMATE` за planned yield;
- повідомлення для `PARTIAL`, `UNVERIFIED` або unavailable значень.

Планові macros Overview і фактичні nutrients цього tab мають різне
призначення та не змішуються.

## Явне завершення та скасування

Останній checkbox лише оновлює `canComplete`; автоматичного completion немає.
Кнопка «Завершити» завжди відкриває confirmation dialog.

- без pending items надсилається `resolvePending: false`;
- з pending items окрема дія «Завершити автоматично» надсилає
  `resolvePending: true` після пояснення наслідків;
- «Скасувати приготування» потребує підтвердження та повертає дні до можливого
  нового start.

Completed/cancelled UI переходить у read-only стан.

## Стани Meal Plan

```text
○ Заплановано
◔ Готується · resolved/total кроків
✓ Приготовано          — recipe
✓ Придбано             — product
```

Cooking controls доступні лише recipe entries. Session-controlled prepared
checkbox заблокований від ручного скидання.

## Concurrency, persistence і Wake Lock

- кожна mutation передає `expectedRevision`;
- `409` спричиняє refetch і повідомлення, а не silent overwrite;
- session state не зберігається як client-only progress;
- unsaved dialog drafts належать клієнту;
- для visible `IN_PROGRESS` page запитується Screen Wake Lock;
- lock повторно запитується після повернення visibility і звільняється при
  leave/completion/cancellation;
- відсутність або відмова Wake Lock не блокує роботу.

## Accessibility і mobile

- tabs мають semantic roles і selected state;
- усі icon actions мають доступні назви;
- progress не передається лише кольором;
- dialogs використовують shared focus/cancel contract;
- touch targets і bottom sheets придатні для вузького екрана;
- React dialog keys унікальні, тому закриті sibling dialogs не конфліктують.

## Перевірки

```text
npm test -w @mealmind/web-client
npm run test:ui-quality -w @mealmind/web-client
npm run typecheck -w @mealmind/web-client
npm run lint -w @mealmind/web-client
npm run build -w @mealmind/web-client
```

Component tests покривають persisted projection, tabs, явне completion,
ingredient quick-use, унікальні modal keys, recipe-details composition,
семантичні action colors і recipe/product labels у Meal Plan.

## Відкладено

- history screen і «Приготувати знову»;
- persistent timers та notifications;
- збереження варіації як власного recipe;
- cookware selector;
- media процесу, voice mode і pantry integration.
