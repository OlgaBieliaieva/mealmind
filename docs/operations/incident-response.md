# Обробка observability-інцидентів

## Призначення

Цей документ визначає мінімальний incident flow для production exceptions у
MealMind. Він не є повною on-call програмою і не замінює platform incident
procedures Vercel, Render, Supabase або Sentry.

## Джерела сигналу

Інцидент може бути виявлено через:

- Sentry new issue, regression або event spike alert;
- зовнішній uptime check;
- Render або Vercel deployment failure;
- `/health` або `/ready`;
- structured API logs;
- повідомлення користувача.

Один Sentry event не доводить outage. Так само відсутність Sentry event не
доводить доступність сервісу.

## Класифікація

| Рівень | Приклад                                                                               | Початкова дія                                                 |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| High   | недоступний критичний flow, масові `5xx`, порушення ізоляції або можливий витік даних | зупинити rollout, обмежити вплив, перевірити security/privacy |
| Medium | повторювана помилка окремого flow без втрати даних                                    | визначити affected release і підготувати fix або rollback     |
| Low    | одиничний exception без підтвердженого user impact                                    | triage, deduplication і планове виправлення                   |

Будь-яка підозра на передавання чутливих даних до Sentry обробляється як
privacy incident незалежно від кількості events.

## Triage flow

1. Визначити application, environment, release і час першої/останньої події.
2. Перевірити, чи issue нове, regression або наслідок відомого deployment.
3. Для API зіставити `request_id` зі structured logs.
4. Перевірити uptime, `/health`, `/ready` і стан зовнішніх залежностей.
5. Оцінити user impact і можливість пошкодження або витоку даних.
6. Не копіювати raw payload до issue, PR, chat або дипломної документації.
7. Обрати mitigation: rollback, вимкнення feature, виправлення конфігурації або
   code fix.
8. Після відновлення додати regression test, якщо дефект відтворюється
   автоматизовано.

## Privacy incident

Якщо event містить token, cookie, request body або персональні дані:

1. припинити подальше надсилання через конфігурацію або deployment;
2. не поширювати raw event;
3. визначити affected project, environment і часовий діапазон;
4. виправити application sanitizer;
5. посилити server-side scrubbing;
6. видалити affected events відповідно до доступних Sentry controls;
7. ротувати credentials, якщо секрет міг бути розкритий;
8. додати regression test із синтетичним payload;
9. задокументувати причину та preventive action без персональних значень.

## Release correlation

Під час triage фіксуються:

```text
application
environment
release
first_seen
last_seen
request_id
deployment URL або service revision
```

Release має дозволяти перейти до конкретного commit. Issue не закривається лише
тому, що новий deployment виконано: потрібно підтвердити припинення events або
успішний regression scenario.

## Resolution criteria

Issue можна вважати resolved, коли:

- причина визначена або є обґрунтований mitigation;
- affected flow перевірено у staging;
- production rollout або rollback завершено;
- alerts і health checks стабільні;
- privacy impact перевірено;
- regression test додано, де це практично;
- temporary debug path видалено;
- документацію оновлено, якщо змінився contract або runbook.

## Post-incident note

Для значущого інциденту коротко фіксуються:

- що сталося;
- який release був affected;
- як виявлено проблему;
- user impact;
- причина;
- mitigation і fix;
- які тести або safeguards додано.

Документ не містить access tokens, cookies, email, імена, профільні дані,
request bodies або повний raw stack trace.
