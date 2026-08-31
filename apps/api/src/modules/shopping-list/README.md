# Shopping List

Модуль реалізує family-scoped versioned snapshots покупок із одного
`MealPlan` за послідовний період 1–7 днів.

## Формування

- Команда є явною; звичайне читання не перераховує список.
- Новий або regenerated snapshot дозволений лише коли
  `periodStart >= familyToday`. Поточна дата визначається backend у
  `Family.timeZone`.
- Прямий Product із плану додається у сумарній вазі всіх participant portions.
- Recipe масштабується за формулою
  `plannedWeight / sum(ingredient.gramWeight)`. `yieldWeightG` у цій версії
  навмисно не використовується.
- Опціональні інгредієнти включаються; користувач може вилучити їх зі snapshot.
- Однакові Product агрегуються лише після приведення сумісних одиниць до
  базової одиниці їх dimension. Mass, volume і count не змішуються.
- Product групується за безпосередньою батьківською категорією, якщо вона є.

## Snapshot і lifecycle

`ShoppingList` зберігає fingerprint, generation warnings і version.
`ShoppingListItem` окремо зберігає derived та requested quantity, display
snapshot продукту й категорій. Зміна каталогу не змінює історичне відображення.

- List: `OPEN -> COMPLETED -> OPEN`, `OPEN|COMPLETED -> ARCHIVED`.
- Item: `PENDING <-> PURCHASED`, `PENDING <-> REMOVED`.
- Completed і archived списки read-only.
- Regeneration архівує поточну версію та створює нову без перенесення ручних
  edits, notes або purchased state.

## Доступ

Список є спільним ресурсом активної Family. `OWNER` і authenticated
`MEMBER` можуть читати та змінювати його. Family береться лише з перевіреної
identity; URL і body не визначають tenant scope. Shopping read model не
розкриває персональні порції чи нутрієнтні цілі членів родини.
