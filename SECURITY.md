# Security Policy

## Підтримувані версії

MealMind перебуває на етапі розроблення дипломного MVP і ще не має стабільного production release.

| Версія                                       | Security updates |
| -------------------------------------------- | ---------------- |
| Поточна `main` та активний release candidate | Підтримуються    |
| Старі development branches                   | Не підтримуються |

Після випуску `v1.0.0` ця таблиця має бути оновлена відповідно до фактично підтримуваних версій.

## Повідомлення про вразливість

Не створюйте публічний issue, discussion або pull request із деталями невиправленої вразливості.

Основний канал — GitHub Private Vulnerability Reporting:

1. Відкрийте вкладку `Security` репозиторію.
2. Перейдіть до `Advisories`.
3. Виберіть `Report a vulnerability`.
4. Створіть приватний звіт.

Пряме посилання після ввімкнення функції:

```text
https://github.com/OlgaBieliaieva/mealmind/security/advisories/new
```

Якщо приватний звіт недоступний, не розкривайте деталі публічно. Зв’яжіться з власницею репозиторію через погоджений приватний канал.

Перед прийманням PR-001 потрібно ввімкнути Private Vulnerability Reporting у GitHub Security settings.

## Вміст звіту

За можливості вкажіть:

- короткий опис вразливості;
- уражений route, module, dependency або environment;
- безпечні кроки відтворення;
- очікувану й фактичну поведінку;
- можливий вплив;
- запропоноване виправлення або mitigation.

Не додавайте реальні credentials, production database dumps або зайві персональні дані. Використовуйте синтетичні приклади й test accounts.

## Очікуваний процес

Цільові строки:

- підтвердження отримання — до 7 календарних днів;
- первинна оцінка — до 14 календарних днів;
- наступне оновлення — після визначення плану виправлення.

Строк виправлення залежить від складності та впливу проблеми.

Після перевірки звіту:

1. Визначається severity та affected scope.
2. Готується виправлення або mitigation.
3. Додаються regression tests, якщо це практично.
4. Credentials ротуються, якщо вони могли бути розкриті.
5. Публічне розкриття відбувається лише після доступності виправлення.

## Секрети

До Git заборонено додавати:

- `.env` та environment-specific env files;
- database credentials і connection strings;
- Supabase service-role keys;
- access, refresh і session tokens;
- Sentry, Vercel, Render або GitHub tokens;
- private keys, certificates і webhook secrets.

Якщо секрет потрапив до commit:

1. Негайно відкличте або ротуйте його у відповідного провайдера.
2. Не обмежуйтеся видаленням рядка в наступному commit.
3. Перевірте logs і доступний audit trail.
4. Повідомте власницю репозиторію приватно.
5. Визначте, чи потрібне очищення Git history.

Секрет вважається скомпрометованим із моменту потрапляння до commit або публічного log.

## Персональні та чутливі дані

До repository, issues, tests, screenshots, logs і Sentry не додаються реальні:

- імена та контактні дані користувачів;
- authentication identifiers;
- алергії та дієтичні обмеження;
- антропометричні параметри;
- харчові цілі;
- сімейні зв’язки та історія харчування.

Tests і документація використовують синтетичні fixtures.

MealMind не є медичним виробом, не встановлює діагнози й не замінює консультацію лікаря або кваліфікованого дієтолога.

## Основні security boundaries

Особливо важливими для MealMind є:

- перевірка authentication token;
- недовіра до caller-supplied `userId` і `familyId`;
- ізоляція даних різних сімей;
- server-side перевірка membership і roles;
- захист uploads і Supabase Storage;
- недопущення service-role key до browser bundle;
- контроль CORS, rate limits і security headers;
- redaction чутливих даних у logs та Sentry;
- безпечні database migrations;
- dependency, code і secret scanning.

Кожний pull request має заповнювати секцію `Security and privacy impact`. Для security-sensitive зміни потрібні негативні authorization tests і перевірка, що logs та error responses не містять чутливих даних.

## Пов’язані документи

- [Contributing Guide](./CONTRIBUTING.md)
- [Архітектура](./docs/architecture/README.md)
- [Межі MVP](./docs/product/mvp-scope.md)
