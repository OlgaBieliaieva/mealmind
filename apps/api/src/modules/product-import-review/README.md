# Admin Review API імпорту продуктів

Модуль обслуговує staging-чергу `ProductImportCandidate` і не створює
канонічні `Product` або `ProductPackage`. Усі маршрути розташовані під
`/api/v1/admin/product-import/candidates` та вимагають роль `ADMIN`.

## Життєвий цикл

- `PENDING -> IN_REVIEW` — адміністратор починає перевірку;
- `IN_REVIEW -> APPROVED | REJECTED | DEFERRED` — фіксується рішення;
- `APPROVED | REJECTED | DEFERRED -> IN_REVIEW` — перевірку можна відкрити повторно;
- `PUBLISHED` не можна змінювати через review API.

Активний `IN_REVIEW` закріплений за одним адміністратором. Усі mutation-запити
передають `expectedUpdatedAt`, тому паралельні зміни завершуються `409`, а не
мовчки перезаписують review draft.

`sourceDraft`, `sourceSnapshots` і `fieldProvenance` є незмінними. Адміністратор
редагує лише `reviewDraft`; кожна зміна статусу або чернетки додає
`ProductImportCandidateEvent`. Для `REJECT` коментар є обов’язковим.

Detail endpoint також повертає збіги з чинним каталогом: точний пакет за GTIN
та обмежений список схожих брендованих продуктів. Рішення `APPROVE` означає
готовність до публікації, але саме по собі не створює канонічний продукт. Перед
схваленням у `reviewDraft.canonical` фіксуються канонічні назви, категорія,
бренд, базова одиниця та необов’язковий generic base product.

## Публікація

`POST /api/v1/admin/product-import/candidates/:id/publish` доступний лише для
`APPROVED` і використовує `expectedUpdatedAt`. Операція:

- створює новий `BRANDED Product` або додає пакування до обраного продукту;
- зберігає `ProductPackage`, product/package source references, склад,
  нормалізовані й raw значення строку придатності та температури;
- створює package portion, якщо джерело містить вагу в грамах;
- записує наявні label nutrients без копіювання успадкованих nutrients;
- завантажує HTTPS image лише з домену Zakaz, обмежує його до 1350×1350,
  створює thumbnail і прив’язує медіа до пакування;
- після успіху переводить кандидата в `PUBLISHED` і додає audit event.

DB-зміни виконуються однією транзакцією. Image objects готуються перед нею; при
помилці транзакції виконується компенсувальне видалення зі storage. Конфлікти
GTIN, source identity або revision повертають `409`, а неповні canonical дані —
`422`.
