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
готовність до наступного етапу, але не публікацію. Створення `Product`, пакування,
нутрієнтів та source references буде окремою транзакційною операцією.
