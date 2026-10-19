# Zakaz catalog pipeline

Локальні відповіді Zakaz зберігаються у `data/` і не потрапляють до Git.

## Перевірка raw JSON

Із кореня репозиторію:

```bash
npm run catalog:zakaz -- --help
npm run catalog:zakaz -- validate-raw
npm run catalog:zakaz:validate:raw
```

Команда перевіряє:

- структуру `stores.json`, `categories.json` та product-page responses;
- реєстрацію store і category, вказаних у файловому шляху;
- відповідність `results[].category_id` leaf category;
- неперервну нумерацію сторінок і повноту за `count` при page size 30;
- дублікати SKU в межах категорії та ідентичний вміст різних сторінок.

Зміна `count_available` між сторінками є warning, а не помилкою: наявність
товарів може змінитися під час ручного завантаження.

Додаткові параметри:

```bash
npm run catalog:zakaz:validate:raw -- --locale en
npm run catalog:zakaz:validate:raw -- --json
npm run catalog:zakaz:validate:raw -- --root scripts/zakaz/data/raw --page-size 30
```

`src/index.ts` є єдиним основним entrypoint pipeline. Наступні етапи імпорту
додаються як окремі команди цього runner.

## Завантаження українського snapshot

Downloader використовує перелік stores і leaf-category directories із уже
перевіреної EN локалі, але самостійно визначає актуальну pagination кожної
української категорії. Сторінки EN та UK не зіставляються між собою.

```bash
npm run catalog:zakaz:download:uk
```

Запити надсилаються лише до `https://stores-api.zakaz.ua` із заголовком
`Accept-Language: uk-UA`. За замовчуванням одночасно завантажуються дві
категорії, для тимчасових помилок і `429` виконується до трьох retry.

Результат записується до ignored директорії `data/raw/uk`. Downloader не
перезаписує наявний snapshot. Після перерваного запуску його можна продовжити:

```bash
npm run catalog:zakaz:download:uk -- --resume
```

Стан, checksums і помилки категорій зберігаються у
`data/raw/uk/download-manifest.json`. Після завершення downloader запускає
чинний raw validator для UK snapshot. `stores.json` копіюється зі source locale
як registry стабільних store IDs, а локалізована taxonomy і product responses
отримуються безпосередньо з Zakaz API.

## Глобальне EN/UK matching

Після завантаження UK snapshot потрібно незалежно агрегувати локаль і
зіставити її з EN artifact:

```bash
npm run catalog:zakaz -- aggregate --locale uk
npm run catalog:zakaz:match:en-uk
```

Matching використовує лише стабільний ключ `sourceStoreId + sourceSku`, тому
не залежить від номера сторінки, категорії або порядку результатів. Обидві
локалізовані версії зберігаються окремо разом із fingerprints і provenance.

Статуси результату:

- `MATCHED` — ідентичність підтверджено;
- `MATCH_REVIEW_REQUIRED` — SKU збігся, але EAN або package-поля різняться;
- `SOURCE_ONLY` — запис є лише в EN snapshot;
- `LOCALIZED_ONLY` — запис є лише в UK snapshot.

Різниця в локалізованих текстах, назві бренду, availability або price не є
identity conflict. Результат створюється локально у
`data/work/products-en-uk-matched.json` і не потрапляє до Git.

## Формування import candidate artifacts

Після classification і matching:

```bash
npm run catalog:zakaz:build:candidates
```

Builder перевіряє, що classified і matched artifacts створені з одного EN
snapshot, формує canonical draft із field-level provenance та розподіляє
записи на три взаємовиключні групи:

- `zakaz-candidates.json` — безпечні автоматичні candidates;
- `zakaz-review-required.json` — локалізаційні, identity та data conflicts;
- `zakaz-rejected.json` — записи, відхилені classification policy.

Додатково створюються `zakaz-manifest.json` із checksums, policy і coverage та
`zakaz-validation-report.json`. Duplicate normalized GTIN не залишається серед
автоматичних candidates: уся група переводиться до manual review.

Усі файли створюються в ignored директорії `data/output` і не публікуються до
БД автоматично.

## Завантаження candidates до review queue

Перед записом потрібно виконати read-only перевірку manifest, checksums,
структури всіх трьох artifacts та унікальності source identities:

```bash
npm run db:import:zakaz:candidates:dry-run
```

Для локального завантаження після застосування Prisma migrations:

```bash
npm run db:import:zakaz:candidates
```

Один checksum manifest відповідає одному `ProductImportBatch`. Повторний запуск
з тим самим manifest не дублює candidates або audit events. Імпортуються всі
три disposition: `CANDIDATE` і `REVIEW_REQUIRED` отримують статус `PENDING`, а
pipeline-rejected записи — статус `REJECTED`. Кожен запис отримує системну
append-only подію `IMPORTED`.

Importer підтримує стандартні `.json` і наявні локальні `.jsonl` імена, але
перевіряє вміст за SHA-256 із manifest. На цьому етапі він не створює `Product`,
`ProductPackage`, бренди, категорії або медіафайли.

Remote import заблокований за замовчуванням. Для staging необхідно одночасно
встановити:

```text
ZAKAZ_IMPORT_ALLOW_REMOTE=true
ZAKAZ_IMPORT_CONFIRM_DATABASE=<точна назва цільової БД>
```

Альтернативний manifest і розмір транзакційного batch можна передати через
`--manifest <path>` та `--batch-size <1..500>`.

## Агрегація product observations

Після успішної raw validation:

```bash
npm run catalog:zakaz -- aggregate --locale en
```

Команда групує записи за `storeId + SKU`, зберігає всі `sourceCategoryIds`,
посилання на raw observations і список полів, значення яких відрізняються між
категоріями. Category-context поля (`category_id`, `parent_category_id`, `hits`)
не переносяться до агрегованого `productData`, а різні CDN-шарди одного Zakaz
image asset не вважаються конфліктом. Результат створюється локально у
`data/work/products-en-aggregated.json` і не потрапляє до Git.

## Класифікація GTIN, package та eligibility

```bash
npm run catalog:zakaz -- classify --locale en
```

Команда нормалізує валідні GTIN до 14 цифр, класифікує fixed/variable package,
додає стабільні reason codes та формує рішення `ELIGIBLE`, `REVIEW_REQUIRED`
або `REJECTED`. Availability зберігається як snapshot, але не впливає на
eligibility. Локальний результат:
`data/work/products-en-classified.json`.

За наявності структурних помилок команда завершується з exit code `1`.
