# Модуль продуктів і медіа

Модуль володіє адміністративним lifecycle generic/branded продуктів, nutrients, portions і фото.
Назовні він повертає domain contracts без Prisma-моделей і службових storage credentials.

## Інваріанти продукту

- generic product обов’язково має category і default measurement unit та не має brand, GTIN або base product;
- branded product обов’язково має brand; GTIN і generic base optional;
- branded product без base повинен явно мати category і default measurement unit;
- якщо вибрано ACTIVE generic base, його category, unit, food state, edible portion і portions можуть бути використані як контрольований snapshot;
- nutrient values із пакування зберігаються як LABEL і перекривають base за nutrientId, а відсутні значення base копіюються як ESTIMATED;
- створені адміністратором продукти мають primary source MEALMIND_ADMIN / ADMIN_CATALOG; MEALMIND_USER / USER_CATALOG зарезервовано для майбутнього user-generated catalog;
- тип і base product після створення не змінюються;
- update змінює nutrients/portions лише коли поле явно присутнє; порожній масив означає свідоме очищення;
- дозволені переходи status: `DRAFT → ACTIVE|ARCHIVED`, `ACTIVE → ARCHIVED`, `ARCHIVED → DRAFT`.

Актуальна Prisma-схема не містить product-level cooking/retention factor. У продукті зберігаються
`ediblePortionPercent`, portions і values per 100 g. Cooking yield належить recipe/cooking-session
моделям і не кодується в `notes`.

## Lifecycle фото

1. API перевіряє MIME/розмір, створює безпечний object path і `PENDING` media record.
2. Клієнт завантажує JPEG/PNG/WebP до 5 MiB через Supabase `uploadToSignedUrl` із
   короткоживучим token і server-generated path у private bucket `product-media`.
3. Completion синхронно читає object, звіряє фактичний формат і розмір, обчислює SHA-256,
   визначає dimensions та створює WebP thumbnail до 480 px.
4. Лише після успіху media переходить у `ACTIVE`. При помилці original/thumbnail видаляються,
   а record переходить у `FAILED`.
5. Delete спочатку переводить record у `FAILED`, потім видаляє storage objects і лише після
   успіху архівує record. Якщо storage недоступне, retention cleanup безпечно повторить видалення.

Cleanup не використовує fire-and-forget tasks:

```text
npm run media:cleanup -w @mealmind/api -- --dry-run --retention-hours=24
npm run media:cleanup -w @mealmind/api -- --retention-hours=24
```

Dry-run повертає metrics без змін. Cleanup охоплює лише `PENDING`/`FAILED` records, старші за retention window.
