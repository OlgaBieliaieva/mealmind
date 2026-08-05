# Postman для MealMind

Актуальна OpenAPI-специфікація генерується без запуску API та без доступу до бази даних:

```powershell
npm run api:openapi:export
```

Результат зберігається у
`postman/specs/MealMind API/MealMind API.openapi.json`. Файл потрібно
комітити разом зі змінами API, щоб маршрути, параметри та приклади запитів залишалися
синхронізованими з кодом.

Перевірити, що експорт не застарів:

```powershell
npm run api:openapi:check
```

Під час розробки можна залишити в окремому терміналі режим автоматичного експорту:

```powershell
npm run api:openapi:watch
```

Він повторно генерує файл після змін у модулі OpenAPI.
Новий HTTP-маршрут потрібно додати і до роутера, і до вихідного OpenAPI-документа.
Postman не аналізує Express-роутери автоматично.

## Локальна робота

1. Відкрити корінь репозиторію у Postman Desktop через **Files → Open folder**.
2. Перейти до Local View і відкрити
   `postman/specs/MealMind API/MealMind API.openapi.json`.
3. Створити з цієї специфікації колекцію MealMind API.
4. Після зміни API виконати `npm run api:openapi:export` або використовувати режим
   `npm run api:openapi:watch`.
5. У Postman оновити колекцію зі специфікації через **Update Collection**.

Postman сам створює `.postman/resources.yaml` після зв’язування локальної папки з
workspace. Цей файл містить прив’язку до конкретного Postman workspace, тому його не
потрібно створювати вручну.

Токени доступу та інші секрети не зберігаються у файлах репозиторію. Їх потрібно
задавати лише в локальних значеннях Postman Environment.
