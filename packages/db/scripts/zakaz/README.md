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

За наявності структурних помилок команда завершується з exit code `1`.
