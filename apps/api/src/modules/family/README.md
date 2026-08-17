# Модуль користувацького профілю та сім’ї

Модуль реалізує onboarding, єдиний активний сімейний контекст MVP, власний профіль користувача, dependent-профілі та їх безпечну активацію як окремих облікових записів.

## Потік onboarding

Після Supabase authentication викликається idempotent account bootstrap. `GET /api/v1/session` повертає локального користувача, ознаку `onboardingCompleted`, власний профіль і сімейний контекст. Якщо onboarding ще не завершено, web-client дозволяє доступ лише до `/onboarding`.

`POST /api/v1/onboarding/complete` атомарно:

- створює або доповнює `PersonProfile` поточного authenticated User;
- створює Family «Моя сім’я» з `Europe/Kyiv` і початком тижня в понеділок;
- створює `ACTIVE FamilyMembership` із роллю `OWNER`;
- додає власний профіль як `FamilyMember`;
- зберігає передані необов’язкові антропометричні параметри, активність і ціль;
- встановлює `User.onboardingCompletedAt` лише після успішного завершення транзакції.

Відповіді окремих кроків не зберігаються на сервері. Перерваний onboarding починається спочатку, а повторний final submit повертає той самий context без duplicate Family або Profile.

Антропометричні та nutrition-related поля залишаються необов’язковими. Відсутність дати народження, biological sex, зросту, ваги, рівня активності або weight goal не блокує завершення мінімального onboarding.

## Автоматичні nutrition targets під час onboarding

> **Статус:** реалізовано в `NutrientTargetSet` / `NutrientTarget` vertical slice. Для кожного `PersonProfile` існує не більше одного current nutrition snapshot. Під час onboarding він може бути створений як `CALCULATED`; після будь-якої ручної зміни створюється нова versioned `MANUAL`-версія, а попередній snapshot закривається через `effectiveTo`.

MealMind може автоматично сформувати початковий `NutrientTargetSet` під час завершення onboarding, якщо користувач добровільно надав повний набір даних, необхідний для автоматичних nutrition calculations.

### Загальний eligibility gate для автоматичних nutrient targets

Для MVP усі автоматично сформовані nutrient targets використовують спільне правило доступності.

Автоматичний розрахунок виконується лише якщо під час onboarding одночасно надано:

```text
birthDate
+
biologicalSex = MALE | FEMALE
+
height
+
weight
+
activityLevel
```

і користувачеві на дату розрахунку **18 років або більше**.

Це правило є application policy MealMind. Окремий nutrient може з наукової точки зору потребувати меншої кількості вхідних даних — наприклад, protein target може бути визначений лише з маси тіла, — але в MVP MealMind не формує частковий автоматичний `NutrientTargetSet`. Натомість система або має повний eligibility context і розраховує весь погоджений набір targets, або не створює автоматичні nutrient targets під час onboarding.

Таким чином:

```text
повний eligibility context
        ↓
energy calculations
        +
protein target
        +
carbohydrate target
        +
fat target
        +
saturated fat maximum
        +
trans fat maximum
        +
dietary fiber target
        +
інші погоджені nutrient targets
        ↓
NutrientTargetSet

неповний eligibility context
        ↓
onboarding завершується успішно
        ↓
automatic NutrientTargetSet не створюється
```

Відсутність будь-якого з required calculation inputs:

- не є validation error;
- не робить `PersonProfile` невалідним;
- не блокує onboarding;
- не вимагає від користувача заповнення необов’язкових даних.

Це дозволяє зберегти optional nature персоналізації, але уникнути ситуації, коли MealMind створює частково розрахований nutrition snapshot із різними eligibility rules для окремих nutrients.

Для MVP це також є свідомим **product-consent rule**: якщо користувач не надав повний набір персоналізаційних даних, MealMind не припускає, що користувач очікує автоматично сформованих рекомендацій лише на підставі частини профілю. Навіть якщо для окремого micronutrient науково достатньо `age + biologicalSex`, система не створює такий target ізольовано.

Натомість UI повинен ненав’язливо повідомити, що персональні nutrition targets зараз не сформовані, і запропонувати користувачу або:

- доповнити профіль, щоб MealMind міг сформувати повний автоматичний набір рекомендацій;
- встановити власні nutrient targets вручну, якщо користувач уже має бажані орієнтири.

Рекомендований explanatory copy:

> **Персональні цільові показники ще не розраховані.** Доповніть дані профілю, щоб MealMind міг сформувати орієнтовні рекомендації, або встановіть власні цілі для потрібних нутрієнтів.

Відсутність automatic targets не повинна відображатися як помилка, warning про «неповний профіль» або вимога обов’язково надати антропометричні дані.

### Energy calculation model

Для MVP приймається двоетапна модель:

```text
Mifflin–St Jeor
        ↓
estimated REE
        ↓
Physical Activity Level (PAL)
        ↓
estimated maintenance energy
```

Таким чином:

1. Mifflin–St Jeor використовується для оцінки resting energy expenditure;
2. PAL використовується для переходу від resting expenditure до приблизних загальних добових енерговитрат.

Це є **MVP calculation model MealMind**, а не остаточна довгострокова модель енергетичних розрахунків.

У майбутній версії передбачається перехід на сучасніші prediction equations із **Dietary Reference Intakes for Energy, 2023**, опубліковані National Academies of Sciences, Engineering, and Medicine.

### Eligibility details для energy calculation

Автоматичні розрахунки в MVP виконуються лише для профілів користувачів віком **18 років або старше**.

Вік визначається з `PersonProfile.birthDate` на дату розрахунку.

Межа `18+` є продуктовим правилом MealMind для MVP. Оригінальне дослідження Mifflin–St Jeor було виконане на дорослих.

Для автоматичного розрахунку `biologicalSex` повинен мати значення:

```text
MALE
FEMALE
```

Значення:

```text
UNSPECIFIED
```

не використовується для вибору однієї з двох sex-specific формул, тому автоматична оцінка REE у такому випадку не виконується.

Відсутність достатніх даних або невідповідність віковому правилу:

- не є validation error;
- не робить `PersonProfile` невалідним;
- не блокує onboarding;
- не вимагає від користувача заповнення необов’язкових даних.

У такому випадку відповідна автоматична оцінка просто вважається недоступною.

## Resting Energy Expenditure

Якщо під час onboarding надано всі такі параметри:

- `birthDate`, з якої можна визначити вік ≥ 18 років;
- `biologicalSex = MALE | FEMALE`;
- актуальний зріст у сантиметрах;
- актуальна вага у кілограмах,

MealMind автоматично оцінює **Resting Energy Expenditure (REE)** за рівнянням Mifflin–St Jeor.

Для `MALE`:

```text
REE = 10 × weightKg + 6.25 × heightCm − 5 × ageYears + 5
```

Для `FEMALE`:

```text
REE = 10 × weightKg + 6.25 × heightCm − 5 × ageYears − 161
```

де:

- `weightKg` — актуальна вага у кілограмах;
- `heightCm` — актуальний зріст у сантиметрах;
- `ageYears` — повний вік користувача в роках на дату розрахунку;
- результат — приблизна кількість кілокалорій на добу.

Рівняння походить із роботи:

M. D. Mifflin, S. T. St Jeor, L. A. Hill, B. J. Scott, S. A. Daugherty, Y. O. Koh.
_A new predictive equation for resting energy expenditure in healthy individuals_.
The American Journal of Clinical Nutrition. 1990;51(2):241–247.
DOI: `10.1093/ajcn/51.2.241`.

REE є **оцінкою енергії, яку організм приблизно витрачає у стані спокою**.

У UI значення повинно відображатися саме як оцінка, а не як точне вимірювання чи медична рекомендація.

Рекомендований explanatory copy:

> **Енерговитрати у спокої:** приблизно `X ккал/день`. Це оцінка кількості енергії, яку організм витрачає у стані спокою. Фактичні енерговитрати можуть відрізнятися.

## Maintenance Energy Requirement

Якщо разом із даними, достатніми для REE, під час onboarding також надано `activityLevel`, MealMind автоматично оцінює **maintenance energy requirement** — приблизну добову енергетичну потребу для підтримання поточного енергетичного балансу без поправки на weight goal.

Для MVP використовується методика **Physical Activity Level (PAL)**.

### Physical Activity Level

PAL — показник, що характеризує співвідношення загальних добових енерговитрат людини до її базальних енерговитрат.

У методології FAO/WHO/UNU:

```text
PAL = TEE / BMR
```

де:

- `PAL` — Physical Activity Level;
- `TEE` — Total Energy Expenditure за 24 години;
- `BMR` — Basal Metabolic Rate за 24 години.

FAO/WHO/UNU використовує PAL як основу для класифікації способу життя дорослої людини за рівнем звичної фізичної активності.

Для дорослих наведені такі діапазони:

| Категорія FAO/WHO/UNU                   |       PAL |
| --------------------------------------- | --------: |
| Sedentary or light activity lifestyle   | 1.40–1.69 |
| Active or moderately active lifestyle   | 1.70–1.99 |
| Vigorous or vigorously active lifestyle | 2.00–2.40 |

Значення PAL понад приблизно `2.40` складно підтримувати протягом тривалого часу.

Джерело:

FAO/WHO/UNU.
_Human Energy Requirements. Report of a Joint FAO/WHO/UNU Expert Consultation_.
FAO Food and Nutrition Technical Report Series 1. Rome, 2004.

У класичній PAL methodology загальні добові енерговитрати концептуально визначаються як:

```text
TEE ≈ BMR × PAL
```

У MealMind для MVP використовується практична application model:

```text
maintenanceEnergy = estimatedREE × activityFactor
```

Тобто значення REE, отримане за Mifflin–St Jeor, використовується як доступна application approximation resting expenditure, а `activityFactor` — як PAL-based коефіцієнт звичної активності.

Це важливо розглядати як **оцінювальну MVP-модель**, а не як пряме відтворення лабораторного визначення PAL.

### MealMind ActivityLevel → PAL mapping

Модель MealMind уже має п’ять UX-рівнів:

```text
SEDENTARY
LIGHT
MODERATE
ACTIVE
VERY_ACTIVE
```

FAO/WHO/UNU використовує три ширші PAL-категорії.

Тому для MVP MealMind визначає власний application mapping усередині науково обґрунтованого PAL continuum:

| `ActivityLevel` | `activityFactor` | Інтерпретація                             |
| --------------- | ---------------: | ----------------------------------------- |
| `SEDENTARY`     |         **1.40** | переважно сидячий спосіб життя            |
| `LIGHT`         |         **1.55** | легка повсякденна активність              |
| `MODERATE`      |         **1.70** | помірно активний спосіб життя             |
| `ACTIVE`        |         **1.90** | активний спосіб життя                     |
| `VERY_ACTIVE`   |         **2.20** | дуже високий рівень регулярної активності |

Application constant:

```ts
const ACTIVITY_FACTORS = {
  SEDENTARY: 1.4,
  LIGHT: 1.55,
  MODERATE: 1.7,
  ACTIVE: 1.9,
  VERY_ACTIVE: 2.2,
} as const;
```

Ці п’ять конкретних значень **не є п’ятьма коефіцієнтами, безпосередньо визначеними FAO/WHO/UNU**.

Вони є MealMind application mapping, побудованим усередині PAL ranges:

```text
FAO sedentary/light
1.40 ───────────────────── 1.69
 ↑                          ↑
SEDENTARY                  LIGHT


FAO active/moderately active
1.70 ───────────────────── 1.99
 ↑                          ↑
MODERATE                   ACTIVE


FAO vigorous
2.00 ───────────────────── 2.40
             ↑
        VERY_ACTIVE
```

Такий mapping дозволяє:

- зберегти існуючий `ActivityLevel` enum;
- не використовувати популярний, але слабше обґрунтований набір `1.2 / 1.375 / 1.55 / 1.725 / 1.9`;
- прив’язати application coefficients до PAL ranges;
- надалі замінити calculation strategy без необхідності змінювати семантику `PersonActivityPeriod`.

### Інтерпретація рівнів активності у UI

`ActivityLevel` не повинен відображатися користувачу лише як назва на кшталт «низька», «середня» або «висока активність».

Неправильна self-classification може суттєво впливати на результат maintenance-energy calculation.

Тому onboarding і profile management повинні містити коротке пояснення кожного рівня.

Для MVP рекомендований такий UX copy.

#### `SEDENTARY` — Переважно сидячий спосіб життя

> Більшу частину дня ви сидите: наприклад, працюєте за комп’ютером або навчаєтесь. Пересуваєтесь переважно транспортом і не маєте регулярної значної фізичної активності.

Приклади:

- офісна або дистанційна робота;
- мало ходьби протягом дня;
- відсутність регулярних тренувань.

PAL mapping:

```text
1.40
```

#### `LIGHT` — Легка активність

> У вашому повсякденному житті є регулярна легка активність: ходьба, домашні справи або легкі тренування, але більша частина дня не пов’язана з інтенсивним фізичним навантаженням.

Приклади:

- регулярна ходьба;
- активні домашні справи;
- легкі тренування кілька разів на тиждень;
- робота без значного фізичного навантаження.

PAL mapping:

```text
1.55
```

#### `MODERATE` — Помірна активність

> Ви регулярно рухаєтесь протягом дня або маєте систематичні тренування. Фізична активність є звичною частиною вашого способу життя.

Приклади:

- регулярні тренування середньої інтенсивності;
- значна кількість ходьби;
- робота, що передбачає регулярний рух;
- поєднання активного повсякденного життя і тренувань.

PAL mapping:

```text
1.70
```

#### `ACTIVE` — Висока активність

> Ваш спосіб життя передбачає значну регулярну фізичну активність: інтенсивні тренування, фізично активну роботу або їх поєднання.

Приклади:

- часті інтенсивні тренування;
- фізично активна робота;
- значна рухова активність протягом більшої частини дня.

PAL mapping:

```text
1.90
```

#### `VERY_ACTIVE` — Дуже висока активність

> Ви маєте дуже високий рівень регулярного фізичного навантаження, наприклад інтенсивні тренування у поєднанні з фізично активним способом життя.

Приклади:

- високий тренувальний обсяг;
- дуже фізично вимоглива робота;
- поєднання важкої фізичної роботи та регулярних тренувань.

PAL mapping:

```text
2.20
```

### UX requirements для вибору activity level

На фронтенді рекомендується:

1. показувати всі п’ять рівнів як окремі selectable cards або radio options;
2. відображати user-friendly назву замість enum;
3. під назвою показувати короткий опис типового способу життя;
4. додати expandable help або tooltip з прикладами;
5. не показувати PAL coefficient (`1.40`, `1.55` тощо) як основний критерій вибору;
6. явно просити користувача оцінювати **звичайний довготривалий спосіб життя**, а не активність одного конкретного дня;
7. дозволяти пропустити поле під час onboarding;
8. дозволяти змінити activity level пізніше у власному профілі.

Рекомендований introductory copy:

> **Який рівень активності найкраще описує ваш звичайний спосіб життя?**
>
> Враховуйте не лише тренування, а й те, скільки ви зазвичай ходите, рухаєтесь протягом дня та наскільки фізично активною є ваша робота.

Рекомендований helper text:

> Оберіть варіант, який найкраще описує ваш типовий тиждень, а не найактивніший або найменш активний день.

На цьому етапі MealMind не повинен просити користувача самостійно визначати PAL або вводити numeric activity factor.

### Maintenance calculation

Після визначення activity factor:

```text
maintenanceEnergy = REE × activityFactor
```

Наприклад:

```text
REE = 1 400 kcal/day
ActivityLevel = MODERATE
activityFactor = 1.70

maintenanceEnergy = 1 400 × 1.70
                  = 2 380 kcal/day
```

Maintenance estimate розраховується лише якщо REE доступний.

Наявність `activityLevel` без валідного набору:

```text
birthDate
+
biologicalSex
+
height
+
weight
```

не є достатньою підставою для автоматичного енергетичного розрахунку.

У UI maintenance energy повинна подаватися як приблизна оцінка.

Рекомендований explanatory copy:

> **Орієнтовна енергія для підтримання ваги:** приблизно `X ккал/день`. Значення розраховане з урахуванням ваших базових параметрів і вказаного рівня активності та є орієнтовним.

## Автоматичний protein target

Якщо виконано загальний eligibility gate для автоматичних nutrient targets, MealMind разом з energy estimates формує добовий target для nutrient `protein`.

### Наукова основа

У чинних Dietary Reference Intakes для дорослих RDA для білка становить:

```text
0.8 g protein / kg body weight / day
```

Це значення зберігається в MealMind documentation як **DRI reference value**, але не використовується як основний рекомендований protein target MVP.

Для MealMind MVP як практичний рекомендований діапазон використовується актуальна ціль із **Dietary Guidelines for Americans, 2025–2030**:

```text
1.2–1.6 g protein / kg body weight / day
```

Guidelines зазначають, що protein serving goals становлять `1.2–1.6 g/kg/day` із коригуванням відповідно до індивідуальних caloric requirements.

MealMind не трактує цей діапазон як заміну DRI RDA. У provenance мають бути розділені:

```text
DRI RDA reference:
0.8 g/kg/day

MealMind MVP recommended range:
1.2–1.6 g/kg/day
```

### Розрахунок

Для поточної маси тіла:

```text
proteinMinG = weightKg × 1.2
proteinMaxG = weightKg × 1.6
```

Наприклад, для користувача вагою `70 kg`:

```text
proteinMinG = 70 × 1.2 = 84 g/day
proteinMaxG = 70 × 1.6 = 112 g/day
```

Отже MealMind повинен представляти protein recommendation як **діапазон**, а не як одну універсальну точку:

```text
protein:
  min = 84 g/day
  max = 112 g/day
```

Якщо майбутня persistence model вимагає центрального `targetValue`, його не слід автоматично прирівнювати до наукової норми без окремого business rule. Наприклад, midpoint `1.4 g/kg/day` може бути використаний лише як MealMind application value і повинен бути явно задокументований як такий.

### Activity level і protein target

У MVP `ActivityLevel` використовується як частина загального eligibility gate і для energy calculation через PAL, але **не використовується для створення окремої формули protein multiplier**.

MealMind не встановлює правила на кшталт:

```text
SEDENTARY   → 1.2 g/kg
LIGHT       → 1.3 g/kg
MODERATE    → 1.4 g/kg
ACTIVE      → 1.5 g/kg
VERY_ACTIVE → 1.6 g/kg
```

як науково доведену таблицю.

Такий mapping може бути досліджений окремо в майбутньому. Поточний `ActivityLevel` описує загальний спосіб життя та PAL category, але не містить достатньої інформації про тип тренування, тренувальний обсяг, спортивну спеціалізацію або мету тренувань для sports-specific protein prescription.

Тому для MVP весь eligible adult population отримує один базовий recommended range:

```text
1.2–1.6 g/kg/day
```

### Вік і protein target

MealMind не знижує protein target зі збільшенням віку.

Для MVP eligibility залишається:

```text
age >= 18
```

а recommended range:

```text
1.2–1.6 g/kg/day
```

використовується для всіх eligible adult profiles.

Age-specific або activity-specific protein strategies можуть бути додані пізніше як окремі versioned calculation rules після формального вибору наукових джерел.

### Відношення до weight goal

`PersonWeightGoal` поки не змінює автоматичний protein range.

Для:

```text
MAINTAIN
LOSE
GAIN
```

у MVP зберігається базовий діапазон:

```text
1.2–1.6 g/kg/day
```

Окремі правила для збереження lean mass під час energy deficit, спортивного muscle gain або інших спеціалізованих сценаріїв не входять до базового onboarding calculation.

Це особливо важливо тому, що `GAIN` у MealMind означає загальну ціль збільшення маси тіла і не є синонімом `MUSCLE_GAIN`.

### UI presentation

Protein target повинен відображатися як орієнтовний рекомендований діапазон.

Рекомендований explanatory copy:

> **Орієнтовна норма білка:** `X–Y г/день`. Діапазон розраховано на основі вашої поточної маси тіла. Це загальна рекомендація для здорового дорослого і вона не замінює індивідуальну рекомендацію лікаря або дієтолога.

У UI не слід називати нижню межу `1.2 g/kg` «мінімально необхідною фізіологічною нормою», оскільки формальна DRI RDA для дорослих залишається `0.8 g/kg/day`.

## Автоматичний carbohydrate target

Якщо виконано загальний eligibility gate для автоматичних nutrient targets і доступна розрахована maintenance energy, MealMind формує добовий target для nutrient `carbohydrate`.

На відміну від protein target, carbohydrate target у MVP визначається **як діапазон у відсотках від добової енергії**, а не як фіксована кількість грамів на кілограм маси тіла.

### Наукова основа — Acceptable Macronutrient Distribution Range

Для дорослих Dietary Reference Intakes визначають **Acceptable Macronutrient Distribution Range (AMDR)** для carbohydrate:

```text
45–65% of total energy
```

National Academies у звіті _Rethinking the Acceptable Macronutrient Distribution Range for the 21st Century: A Letter Report_ (2024) відтворює чинний adult AMDR:

| Macronutrient |        Adult AMDR |
| ------------- | ----------------: |
| Carbohydrate  | **45–65% energy** |
| Fat           |     20–35% energy |
| Protein       |     10–35% energy |

Для MealMind MVP carbohydrate target therefore визначається як:

```text
carbohydrateEnergyMinPercent = 45
carbohydrateEnergyMaxPercent = 65
```

Це **recommended macronutrient distribution range**, а не твердження, що кожен користувач повинен отримувати одну конкретну частку carbohydrate.

MealMind не використовує midpoint `55%` як автоматичну «оптимальну» ціль без окремого business rule.

### Відношення до carbohydrate RDA

Dietary Reference Intakes також містять окремий carbohydrate RDA для дорослих:

```text
130 g/day
```

У MealMind це значення може зберігатися в documentation/provenance як **DRI reference value**, але для автоматичного personalized carbohydrate target MVP воно **не використовується як основна формула**.

Тобто MealMind розділяє два поняття:

```text
DRI carbohydrate RDA:
130 g/day
        ↓
reference value

MealMind MVP carbohydrate target:
45–65% of calculated daily energy
        ↓
personalized range
```

Це узгоджується з обраним підходом: macronutrient target залежить від персональної energy requirement, а не задається однаковою кількістю грамів для всіх eligible users.

### Розрахунок від energy target

Базовою величиною для carbohydrate calculation є energy value, відносно якої формується поточний nutrition snapshot.

На етапі onboarding, поки окремі правила energy adjustment для `LOSE` / `GAIN` не визначені, такою величиною є:

```text
maintenanceEnergy
```

Тому:

```text
carbohydrateEnergyMinKcal = maintenanceEnergy × 0.45
carbohydrateEnergyMaxKcal = maintenanceEnergy × 0.65
```

Оскільки `1 g carbohydrate` забезпечує приблизно `4 kcal`, presentation range у грамах може бути derived value:

```text
carbohydrateMinG = carbohydrateEnergyMinKcal / 4
carbohydrateMaxG = carbohydrateEnergyMaxKcal / 4
```

або еквівалентно:

```text
carbohydrateMinG = maintenanceEnergy × 0.45 / 4
carbohydrateMaxG = maintenanceEnergy × 0.65 / 4
```

### Приклад

Для:

```text
maintenanceEnergy = 2 000 kcal/day
```

energy range для carbohydrate:

```text
minimum:
2 000 × 0.45 = 900 kcal/day

maximum:
2 000 × 0.65 = 1 300 kcal/day
```

У грамах:

```text
minimum:
900 / 4 = 225 g/day

maximum:
1 300 / 4 = 325 g/day
```

Отже:

```text
carbohydrate:
  minPercentEnergy = 45
  maxPercentEnergy = 65

derived:
  min = 225 g/day
  max = 325 g/day
```

Для domain/persistence semantics основним правилом залишається **`45–65% energy`**. Значення у грамах є похідним від energy target конкретного `NutrientTargetSet`.

### Залежність від energy calculation

Carbohydrate target не повинен розраховуватися незалежно від energy target.

Calculation dependency:

```text
eligible profile
      ↓
REE
      ↓
maintenance energy
      ↓
45–65% energy from carbohydrate
      ↓
derived carbohydrate g/day range
```

Тому навіть попри існування DRI RDA `130 g/day`, MealMind не створює personalized carbohydrate target лише на підставі віку користувача.

Для MVP діє загальний eligibility gate:

```text
birthDate
+
MALE/FEMALE
+
height
+
weight
+
activityLevel
+
age >= 18
```

### Відношення до protein target

Protein і carbohydrate використовують різні calculation bases.

Protein:

```text
weightKg
    ×
1.2–1.6 g/kg/day
```

Carbohydrate:

```text
maintenanceEnergy
    ×
45–65% energy
```

Тому carbohydrate не розраховується як «залишок калорій» після protein.

Так само MealMind не повинен примусово поєднувати:

```text
protein = 1.2–1.6 g/kg
+
carbohydrate = 45–65% energy
+
fat = future AMDR
```

шляхом незалежного вибору максимальних або мінімальних меж кожного діапазону.

AMDR є діапазонами допустимого розподілу енергії. Конкретний macro composition усередині цих діапазонів потребує окремої strategy, якщо MealMind у майбутньому захоче сформувати одну точкову macro prescription.

На поточному етапі `NutrientTargetSet` може зберігати рекомендовані ranges без вибору єдиної комбінації percentages.

### Відношення до weight goal

Поки правила energy deficit/surplus для:

```text
LOSE
GAIN
```

не визначені, carbohydrate range під час onboarding розраховується від `maintenanceEnergy`.

Після появи окремого goal-adjusted `ENERGY NutrientTarget` calculation base повинна змінитися концептуально:

```text
maintenanceEnergy
        ↓
PersonWeightGoal adjustment
        ↓
energyTarget
        ↓
carbohydrate = 45–65% of energyTarget
```

Тобто AMDR percentage не обов’язково змінюється через weight goal; змінюється energy base, від якої розраховується gram-equivalent range.

Спеціальні low-carbohydrate, ketogenic, therapeutic або disease-specific dietary strategies **не входять до автоматичного onboarding calculation MVP** і не повинні генеруватися лише на основі `PersonWeightGoal`.

### UI presentation

У профілі carbohydrate target доцільно показувати насамперед як частку добової енергії, а grams — як персоналізований derived range.

Рекомендований presentation:

> **Вуглеводи:** `45–65%` добової енергії — приблизно `X–Y г/день` за вашої поточної розрахованої потреби в енергії.

Helper text:

> Діапазон показує рекомендовану частку енергії з вуглеводів. Орієнтовна кількість у грамах автоматично змінюється разом із вашою розрахованою добовою потребою в енергії.

У UI не слід подавати:

```text
130 g/day
```

як персональний target користувача, оскільки в MealMind це DRI reference value, а personalized MVP target базується на AMDR.

## Автоматичний fat target

Якщо виконано загальний eligibility gate для автоматичних nutrient targets і доступна розрахована maintenance energy, MealMind формує добовий target для nutrient `total_fat`.

Так само як carbohydrate, fat target у MVP визначається **як діапазон у відсотках від добової енергії**, а не як фіксована кількість грамів або грамів на кілограм маси тіла.

### Наукова основа — Acceptable Macronutrient Distribution Range

Для дорослих Dietary Reference Intakes визначають **Acceptable Macronutrient Distribution Range (AMDR)** для total fat:

```text
20–35% of total energy
```

National Academies у звіті _Rethinking the Acceptable Macronutrient Distribution Range for the 21st Century: A Letter Report_ (2024) відтворює чинний adult AMDR:

| Macronutrient |        Adult AMDR |
| ------------- | ----------------: |
| Carbohydrate  |     45–65% energy |
| Fat           | **20–35% energy** |
| Protein       |     10–35% energy |

Для MealMind MVP fat target визначається як:

```text
fatEnergyMinPercent = 20
fatEnergyMaxPercent = 35
```

Це **recommended macronutrient distribution range**, а не твердження, що існує одна універсальна «оптимальна» частка fat для кожного користувача.

MealMind не використовує midpoint `27.5%` як автоматичний target без окремого business rule.

### Розрахунок від energy target

Базовою величиною для fat calculation є energy value, відносно якої формується поточний nutrition snapshot.

На етапі onboarding, поки окремі правила energy adjustment для `LOSE` / `GAIN` не визначені, такою величиною є:

```text
maintenanceEnergy
```

Тому:

```text
fatEnergyMinKcal = maintenanceEnergy × 0.20
fatEnergyMaxKcal = maintenanceEnergy × 0.35
```

Оскільки `1 g fat` забезпечує приблизно `9 kcal`, presentation range у грамах може бути derived value:

```text
fatMinG = fatEnergyMinKcal / 9
fatMaxG = fatEnergyMaxKcal / 9
```

або еквівалентно:

```text
fatMinG = maintenanceEnergy × 0.20 / 9
fatMaxG = maintenanceEnergy × 0.35 / 9
```

### Приклад

Для:

```text
maintenanceEnergy = 2 000 kcal/day
```

energy range для fat:

```text
minimum:
2 000 × 0.20 = 400 kcal/day

maximum:
2 000 × 0.35 = 700 kcal/day
```

У грамах:

```text
minimum:
400 / 9 ≈ 44.4 g/day

maximum:
700 / 9 ≈ 77.8 g/day
```

Отже:

```text
total_fat:
  minPercentEnergy = 20
  maxPercentEnergy = 35

derived:
  min ≈ 44.4 g/day
  max ≈ 77.8 g/day
```

Для domain/persistence semantics основним правилом залишається **`20–35% energy`**. Значення у грамах є похідним від energy target конкретного `NutrientTargetSet`.

### Залежність від energy calculation

Fat target не повинен розраховуватися незалежно від energy target.

Calculation dependency:

```text
eligible profile
      ↓
REE
      ↓
maintenance energy
      ↓
20–35% energy from fat
      ↓
derived fat g/day range
```

Для MVP діє загальний eligibility gate:

```text
birthDate
+
MALE/FEMALE
+
height
+
weight
+
activityLevel
+
age >= 18
```

### Відношення до carbohydrate і protein targets

Protein, carbohydrate і fat використовують різні calculation bases.

Protein:

```text
weightKg
    ×
1.2–1.6 g/kg/day
```

Carbohydrate:

```text
energyTarget
    ×
45–65% energy
```

Fat:

```text
energyTarget
    ×
20–35% energy
```

MealMind не повинен автоматично комбінувати незалежно обрані крайні значення цих діапазонів у єдиний macro prescription.

Наприклад, одночасний вибір:

```text
carbohydrate = 65% energy
fat = 35% energy
protein = additional energy
```

математично перевищить 100% добової енергії.

Тому AMDR ranges у `NutrientTargetSet` слід трактувати як **допустимі individual ranges**, а не як готову єдину комбінацію macronutrient percentages.

Якщо MealMind у майбутньому формуватиме одну конкретну macro distribution, для цього потрібна окрема calculation strategy, яка:

- вибирає узгоджені values усередині AMDR;
- гарантує, що energy percentages сумарно утворюють коректний energy budget;
- враховує protein target, заданий у `g/kg/day`;
- за потреби враховує `PersonWeightGoal` та інші nutrition constraints.

На поточному етапі такої point-prescription strategy немає.

### Відношення до saturated fat і trans fat

`total_fat` описує загальний рекомендований діапазон енергії з жирів, тоді як `saturated_fat` і `trans_fat` мають окрему **maximum / upper-bound semantics**.

Для MVP MealMind використовує WHO 2023 guideline:

```text
total_fat:
20–35% energy

saturated_fat:
< 10% energy

trans_fat:
< 1% energy
```

Тобто saturated/trans fat не є додатковими частками поверх `total_fat`. Вони є підмножинами fat intake і повинні вкладатися в загальний fat budget.

MealMind не повинен трактувати maximum як рекомендовану кількість, яку потрібно «добрати». Для обох nutrients нижче споживання в межах повноцінного раціону є допустимим; для industrially produced trans fat WHO рекомендує уникнення.

### Відношення до weight goal

Поки правила energy deficit/surplus для:

```text
LOSE
GAIN
```

не визначені, fat range під час onboarding розраховується від `maintenanceEnergy`.

Після появи goal-adjusted `ENERGY NutrientTarget` calculation base змінюється:

```text
maintenanceEnergy
        ↓
PersonWeightGoal adjustment
        ↓
energyTarget
        ↓
fat = 20–35% of energyTarget
```

AMDR percentage при цьому не обов’язково змінюється через weight goal; змінюється energy base, від якої розраховується gram-equivalent range.

Therapeutic high-fat, ketogenic, very-low-fat або disease-specific strategies **не входять до автоматичного onboarding calculation MVP**.

### UI presentation

У профілі fat target доцільно показувати насамперед як частку добової енергії, а grams — як персоналізований derived range.

Рекомендований presentation:

> **Жири:** `20–35%` добової енергії — приблизно `X–Y г/день` за вашої поточної розрахованої потреби в енергії.

Helper text:

> Діапазон показує рекомендовану частку енергії з жирів. Орієнтовна кількість у грамах автоматично змінюється разом із вашою розрахованою добовою потребою в енергії.

У UI варто використовувати назву **«Жири»** або **«Загальні жири»**, щоб не змішувати `total_fat` із насиченими або трансжирами, для яких будуть окремі правила.

## Автоматичний saturated fat maximum

Якщо виконано загальний eligibility gate для автоматичних nutrient targets і доступна розрахована maintenance energy, MealMind формує upper-bound target для nutrient `saturated_fat`.

На відміну від `total_fat`, saturated fat не має AMDR range, який MealMind повинен намагатися заповнити. Для MVP використовується **maximum semantics**:

```text
saturated fat < 10% of total energy
```

### Наукова основа — WHO 2023 guideline

World Health Organization у guideline _Saturated fatty acid and trans-fatty acid intake for adults and children_ (2023) рекомендує для людей віком від 2 років обмежувати saturated fatty acids до:

```text
≤ 10% of total energy intake
```

WHO також наголошує, що dietary fat quality має значення: saturated fatty acids доцільно замінювати переважно unsaturated fatty acids, особливо polyunsaturated fatty acids, або carbohydrate з продуктів, що природно містять dietary fiber.

Для MealMind MVP це правило представляється як **upper bound**, а не як target range:

```text
saturatedFatMaxPercentEnergy = 10
```

У користувацькому UI доцільно формулювати його як:

```text
менше 10% добової енергії
```

щоб не створювати враження, ніби `10%` є бажаною точковою ціллю.

### Розрахунок від energy target

Базовою величиною є та сама energy calculation base, відносно якої формується nutrition snapshot.

Під час onboarding:

```text
energyTarget = maintenanceEnergy
```

Тому maximum energy amount:

```text
saturatedFatMaxKcal = maintenanceEnergy × 0.10
```

Оскільки `1 g fat` забезпечує приблизно `9 kcal`, gram-equivalent upper bound:

```text
saturatedFatMaxG = saturatedFatMaxKcal / 9
```

або:

```text
saturatedFatMaxG = maintenanceEnergy × 0.10 / 9
```

Application constant:

```ts
const SATURATED_FAT_MAX_ENERGY_PERCENT = 10;
```

Calculation:

```ts
const saturatedFatMaxGrams = (energyKcal * (SATURATED_FAT_MAX_ENERGY_PERCENT / 100)) / 9;
```

### Приклад

Для:

```text
maintenanceEnergy = 2 000 kcal/day
```

maximum:

```text
2 000 × 0.10 = 200 kcal/day
200 / 9 ≈ 22.2 g/day
```

Отже:

```text
saturated_fat:
  maxPercentEnergy = 10

derived:
  max ≈ 22.2 g/day
```

Це означає **верхню межу**, а не рекомендацію споживати `22.2 g/day`.

### Залежність від total fat

`saturated_fat` є частиною `total_fat`, тому ці targets не повинні складатися як незалежні energy allocations.

Для прикладу з `2 000 kcal/day`:

```text
total_fat:
20–35% energy
≈ 44.4–77.8 g/day

saturated_fat:
< 10% energy
< 22.2 g/day
```

Saturated fat входить у загальну кількість fat.

Правильна семантика:

```text
saturated_fat ⊂ total_fat
```

а не:

```text
total_fat + saturated_fat
```

Тому при оцінюванні meal plan MealMind повинен порівнювати:

- загальну кількість fat із `total_fat` range;
- saturated fat окремо з його maximum;
- не додавати saturated fat повторно до total fat.

### Відношення до weight goal

До появи goal-adjusted energy target maximum розраховується від:

```text
maintenanceEnergy
```

Після появи energy adjustment:

```text
maintenanceEnergy
        ↓
PersonWeightGoal adjustment
        ↓
energyTarget
        ↓
saturated fat < 10% energyTarget
```

Сам percentage upper bound не змінюється через `MAINTAIN`, `LOSE` або `GAIN`; змінюється абсолютний gram-equivalent maximum.

### Persistence semantics

Для `saturated_fat` потрібна **maximum semantics**.

Концептуально:

```text
nutrientCode = saturated_fat
targetType = MAXIMUM
maxPercentEnergy = 10
energyBaseKcal
derivedMaxG
```

Не слід моделювати цей nutrient як:

```text
min = 0
max = X
```

лише для повторного використання range semantics, якщо domain model може явно підтримати `MAXIMUM`.

Calculation provenance повинна дозволяти відновити:

```text
guideline = WHO_SFA_TFA_2023
calculationBasis = PERCENT_OF_ENERGY_MAXIMUM
maxPercentEnergy = 10
energyBaseKcal
derivedMaxG
calculationMethodVersion
calculatedAt
```

### UI presentation

Рекомендований presentation:

> **Насичені жири:** менше `10%` добової енергії — до приблизно `X г/день` за вашої поточної розрахованої потреби в енергії.

Helper text:

> Це верхня межа, а не кількість, яку потрібно обов’язково спожити. Насичені жири входять до загальної кількості жирів.

Для точнішої семантики UI може використовувати label:

```text
Максимум
```

замість:

```text
Ціль
```

для цього nutrient.

## Автоматичний trans fat maximum

Якщо виконано загальний eligibility gate для автоматичних nutrient targets і доступна розрахована maintenance energy, MealMind формує upper-bound target для nutrient `trans_fat`.

Для MVP використовується WHO 2023 guideline:

```text
trans fat < 1% of total energy
```

Це правило стосується загального trans-fatty acid intake, включно з industrially produced та trans fat із ruminant sources.

### Наукова основа — WHO 2023 guideline

WHO рекомендує обмежувати trans-fatty acids до:

```text
≤ 1% of total energy intake
```

Для healthy-diet communication WHO додатково підкреслює, що **industrially produced trans fats are not part of a healthy diet and should be avoided**.

Тому MealMind повинен розрізняти дві семантики:

```text
quantitative population guideline:
trans fat < 1% energy

food-quality guidance:
industrially produced trans fat → avoid
```

Для automatic nutrient target MVP використовується перше правило, оскільки воно може бути обчислене з nutrition data:

```text
transFatMaxPercentEnergy = 1
```

MealMind не встановлює positive minimum або recommended target для trans fat.

### Розрахунок від energy target

Під час onboarding:

```text
energyTarget = maintenanceEnergy
```

Maximum energy amount:

```text
transFatMaxKcal = maintenanceEnergy × 0.01
```

Gram-equivalent upper bound:

```text
transFatMaxG = transFatMaxKcal / 9
```

або:

```text
transFatMaxG = maintenanceEnergy × 0.01 / 9
```

Application constant:

```ts
const TRANS_FAT_MAX_ENERGY_PERCENT = 1;
```

Calculation:

```ts
const transFatMaxGrams = (energyKcal * (TRANS_FAT_MAX_ENERGY_PERCENT / 100)) / 9;
```

### Приклад

Для:

```text
maintenanceEnergy = 2 000 kcal/day
```

maximum:

```text
2 000 × 0.01 = 20 kcal/day
20 / 9 ≈ 2.2 g/day
```

Отже:

```text
trans_fat:
  maxPercentEnergy = 1

derived:
  max ≈ 2.2 g/day
```

WHO також наводить еквівалент: для diet `2 000 kcal/day` це менше приблизно `2.2 g/day`.

Це **верхня межа**, а не target, до якого потрібно наближатися.

### Чому MealMind не використовує target = 0 g

Для industrially produced trans fat public-health recommendation полягає в уникненні, однак food composition data не завжди дозволяють надійно відрізнити:

```text
industrially produced trans fat
```

від:

```text
naturally occurring ruminant trans fat
```

якщо джерело даних містить лише загальний nutrient `trans_fat`.

Тому для generic nutrient target MealMind не повинен без додаткової provenance інформації перетворювати WHO guidance на:

```text
trans_fat target = 0 g/day
```

Базове machine-computable rule:

```text
maximum < 1% energy
```

а окреме UI/help правило може повідомляти, що industrially produced trans fats бажано уникати.

Якщо в майбутньому product data model надійно розрізнятиме industrial і ruminant TFA, для industrial TFA може бути введена окрема food-quality constraint.

### Залежність від total fat

`trans_fat`, як і saturated fat, є частиною `total_fat`.

Правильна семантика:

```text
trans_fat ⊂ total_fat
```

Тому:

```text
total_fat:
20–35% energy

trans_fat:
< 1% energy
```

не є двома незалежними allocations.

При оцінюванні фактичного intake trans fat уже входить у `total_fat` і не додається до нього повторно.

### Відношення до weight goal

До реалізації goal-adjusted energy:

```text
transFatMaxG =
maintenanceEnergy × 0.01 / 9
```

Після реалізації:

```text
transFatMaxG =
energyTarget × 0.01 / 9
```

`PersonWeightGoal` змінює energy base, але не саме правило `<1% energy`.

### Persistence semantics

Для `trans_fat` потрібна maximum semantics:

```text
nutrientCode = trans_fat
targetType = MAXIMUM
maxPercentEnergy = 1
energyBaseKcal
derivedMaxG
```

Calculation provenance:

```text
guideline = WHO_SFA_TFA_2023
calculationBasis = PERCENT_OF_ENERGY_MAXIMUM
maxPercentEnergy = 1
energyBaseKcal
derivedMaxG
calculationMethodVersion
calculatedAt
```

Як і для saturated fat, конкретні persistence fields визначаються nutrition-targets vertical slice.

### UI presentation

Рекомендований presentation:

> **Трансжири:** менше `1%` добової енергії — до приблизно `X г/день` за вашої поточної розрахованої потреби в енергії.

Helper text:

> Це верхня межа, а не рекомендована кількість споживання. Промислово вироблених трансжирів варто уникати.

Для progress UI небажано показувати trans fat як nutrient із progress-to-goal, де `100%` виглядає як успішне досягнення цілі.

Краще використовувати limit-oriented presentation:

```text
спожито X г
із максимально рекомендованих Y г
```

або warning state при наближенні/перевищенні upper bound.

## Автоматичний dietary fiber target

Якщо виконано загальний eligibility gate для автоматичних nutrient targets і доступна розрахована maintenance energy, MealMind формує добовий target для nutrient `dietary_fiber`.

На відміну від carbohydrate і total fat, dietary fiber не задається як AMDR percentage. Для MVP використовується **energy-density approach**, що лежить в основі Dietary Reference Intakes для fiber:

```text
14 g dietary fiber / 1 000 kcal
```

### Наукова основа — Dietary Reference Intakes

Institute of Medicine / National Academies встановили Adequate Intake (AI) для total fiber на основі співвідношення:

```text
14 g / 1 000 kcal
```

Це співвідношення було використане для формування віково- та статево-специфічних AI values для fiber. Наприклад, DRI tables наводять для дорослих різні абсолютні значення `g/day`, оскільки вони походять від різної типової energy intake.

Для MealMind MVP доцільно використовувати саме базове energy-density rule:

```text
fiberGramsPer1000Kcal = 14
```

а не hard-coded sex/age table як основний personalized calculation.

Офіційні джерела National Academies:

- _Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids_ (2005): `https://nap.nationalacademies.org/catalog/10490/`
- _Dietary Reference Intakes: The Essential Guide to Nutrient Requirements_ (2006), розділ **Fiber**: `https://nap.nationalacademies.org/read/11537/chapter/13`
- National Academies DRI collection: `https://nap.nationalacademies.org/collection/57/dietary-reference-intakes`

### Розрахунок від energy target

Базовою величиною для fiber calculation є та сама energy calculation base, відносно якої формується поточний nutrition snapshot.

На етапі onboarding, поки окремі правила energy adjustment для `LOSE` / `GAIN` не визначені:

```text
energyTarget = maintenanceEnergy
```

Тому:

```text
dietaryFiberG = maintenanceEnergy × 14 / 1000
```

У майбутній реалізації після появи goal-adjusted energy target:

```text
dietaryFiberG = energyTarget × 14 / 1000
```

Application constant:

```ts
const DIETARY_FIBER_G_PER_1000_KCAL = 14;
```

Calculation:

```ts
const dietaryFiberGrams = (energyKcal * DIETARY_FIBER_G_PER_1000_KCAL) / 1000;
```

### Приклад

Для:

```text
maintenanceEnergy = 2 200 kcal/day
```

розрахунок:

```text
dietaryFiberG =
14 × 2.2
= 30.8 g/day
```

Отже:

```text
dietary_fiber:
  target ≈ 30.8 g/day
```

На відміну від carbohydrate та fat, тут MealMind отримує **одне energy-derived target value**, а не percentage range.

### Чому MealMind використовує energy-derived value

DRI також публікують абсолютні AI values для fiber за age/sex groups. Наприклад, для частини adult groups вони становлять приблизно `21–38 g/day`.

MealMind не повинен трактувати ці табличні values як незалежні від energy requirement персональні формули.

Для MVP обирається:

```text
calculated energy requirement
        ×
14 g / 1 000 kcal
        ↓
personalized dietary fiber target
```

Цей підхід:

- безпосередньо зберігає DRI energy-density basis;
- природно масштабує target разом із персональною energy requirement;
- узгоджується з уже обраною energy-based моделлю carbohydrate і fat;
- не потребує окремої hard-coded age/sex lookup table для fiber;
- дозволяє автоматично перерахувати target після зміни energy calculation strategy.

Водночас у provenance слід явно зазначити, що `14 g/1000 kcal` походить із DRI fiber framework, а конкретне personalized `g/day` є **MealMind derived value** від розрахованої energy base.

### Залежність від energy calculation

Dietary fiber target не розраховується незалежно від energy target.

Calculation dependency:

```text
eligible profile
      ↓
REE
      ↓
maintenance energy
      ↓
14 g fiber / 1 000 kcal
      ↓
dietary fiber g/day
```

Для MVP діє той самий загальний eligibility gate:

```text
birthDate
+
MALE/FEMALE
+
height
+
weight
+
activityLevel
+
age >= 18
```

Хоча DRI fiber recommendations самі по собі не потребують усіх цих inputs, MealMind не створює partial automatic `NutrientTargetSet`.

### Відношення до carbohydrate target

Dietary fiber є carbohydrate-related nutrient, але не повинен бути включений у MealMind як проста фіксована частка carbohydrate target.

Розрахунки залишаються незалежними:

```text
carbohydrate:
45–65% of energy

dietary_fiber:
14 g / 1 000 kcal
```

Тобто MealMind не використовує правило на кшталт:

```text
fiber = X% of carbohydrate grams
```

і не виводить fiber target із `130 g/day` carbohydrate RDA.

Обидва targets залежать від energy context, але мають різне наукове походження та різну domain semantics.

### Відношення до weight goal

Поки правила energy deficit/surplus для:

```text
LOSE
GAIN
```

не визначені, dietary fiber target під час onboarding розраховується від:

```text
maintenanceEnergy
```

Після появи goal-adjusted `ENERGY NutrientTarget`:

```text
maintenanceEnergy
        ↓
PersonWeightGoal adjustment
        ↓
energyTarget
        ↓
dietary fiber = 14 g / 1 000 kcal
```

Таким чином `PersonWeightGoal` не змінює сам коефіцієнт:

```text
14 g / 1 000 kcal
```

але може змінити абсолютний `g/day` target через зміну energy calculation base.

### Persistence semantics

Для `dietary_fiber` основним personalized target є:

```text
targetValueG
```

розрахований за правилом:

```text
14 g / 1 000 kcal
```

На відміну від AMDR-based carbohydrate/fat targets, для fiber не потрібні:

```text
minPercentEnergy
maxPercentEnergy
```

Calculation provenance повинна дозволяти відновити щонайменше:

```text
nutrientCode = dietary_fiber
calculationBasis = ENERGY_DENSITY
fiberGramsPer1000Kcal = 14
energyBaseKcal
calculatedTargetG
calculationMethodVersion
calculatedAt
```

Конкретні назви persistence fields визначаються окремим nutrition-targets vertical slice; наведена структура описує семантику, а не готову Prisma schema.

### UI presentation

У профілі dietary fiber доцільно показувати як орієнтовну кількість грамів на день.

Рекомендований presentation:

> **Клітковина:** приблизно `X г/день` за вашої поточної розрахованої потреби в енергії.

Helper text:

> Орієнтир розраховано за співвідношенням 14 г клітковини на кожні 1 000 ккал добової енергії. Значення автоматично змінюється разом із вашою розрахованою потребою в енергії.

У UI не потрібно показувати користувачу сам коефіцієнт `14 g/1000 kcal` як основне target value, але він може бути доступний у поясненні методики.

Так само не слід подавати derived value як медично необхідний мінімум для конкретної людини. Це персоналізований орієнтир MealMind, побудований на DRI Adequate Intake framework для healthy population.

## Автоматичні micronutrient targets

Якщо виконано загальний eligibility gate для автоматичних nutrient targets, MealMind включає до початкового `NutrientTargetSet` також погоджений набір evidence-based micronutrient targets:

```text
sodium
potassium
calcium
iron
magnesium
omega_3_ala
```

Ці nutrients мають офіційні Dietary Reference Intake values або інші формалізовані DRI semantics, придатні для MVP.

Важливо: для окремих із них наукові reference values можна визначити з меншої кількості profile inputs. Проте MealMind **не обходить спільний eligibility gate**. Micronutrient targets автоматично створюються лише як частина повного automatic `NutrientTargetSet`.

Таким чином:

```text
повний eligibility context
        ↓
automatic NutrientTargetSet
        ↓
energy/macronutrient targets
        +
agreed micronutrient targets
```

а не:

```text
частковий profile
        ↓
окремі demographic micronutrient targets
```

### Sodium — CDRR-oriented maximum

Для sodium National Academies у DRI 2019 встановлюють для дорослих `19+`:

```text
Adequate Intake (AI):
1 500 mg/day

Chronic Disease Risk Reduction Intake (CDRR):
reduce intake if above 2 300 mg/day
```

Для MealMind `1 500 mg/day` не використовується як progress target, який користувач повинен обов’язково «добрати». Для MVP автоматичний sodium target має **limit-oriented semantics**, побудовану на CDRR:

```text
nutrientCode = sodium
targetType = MAXIMUM
maxValue = 2300
unit = mg/day
basis = CDRR
```

Це application representation правила:

```text
if sodium intake > 2300 mg/day
→ reduction is recommended
```

і не означає, що `2 300 mg/day` є точковою бажаною кількістю споживання.

У provenance доцільно зберігати також sodium AI `1 500 mg/day` як reference value, але не змішувати його з CDRR-oriented maximum.

Рекомендований UI:

> **Натрій:** бажано не перевищувати `2 300 мг/день`.

Helper text:

> Це орієнтир для верхньої межі споживання, а не кількість натрію, яку потрібно обов’язково набрати за день.

### Potassium — Adequate Intake

Для potassium National Academies DRI 2019 встановлюють adult Adequate Intake:

```text
MALE 19+:
3 400 mg/day

FEMALE 19+:
2 600 mg/day
```

Для eligible adult profile:

```text
if biologicalSex = MALE:
  potassiumTargetMg = 3400

if biologicalSex = FEMALE:
  potassiumTargetMg = 2600
```

Domain semantics:

```text
nutrientCode = potassium
targetType = TARGET
source = REFERENCE_BASED
basis = AI
```

AI не слід називати RDA. Adequate Intake використовується тоді, коли доказів недостатньо для встановлення EAR/RDA.

Рекомендований UI:

> **Калій:** орієнтовно `X мг/день`.

Helper text:

> Значення базується на Adequate Intake для здорових дорослих відповідної статі.

### Calcium — Recommended Dietary Allowance

Для calcium використовуються чинні adult RDA:

```text
19–50:
MALE   1000 mg/day
FEMALE 1000 mg/day

51–70:
MALE   1000 mg/day
FEMALE 1200 mg/day

71+:
MALE   1200 mg/day
FEMALE 1200 mg/day
```

Calculation rule:

```text
age 19–50:
  calciumTargetMg = 1000

age 51–70:
  MALE   -> 1000
  FEMALE -> 1200

age >= 71:
  calciumTargetMg = 1200
```

MealMind MVP eligibility починається з `18+`. Для користувача, якому **рівно 18 років**, adult `19+` calcium table ще не застосовується. Оскільки автоматичний `NutrientTargetSet` не повинен бути частковим, implementation повинна або мати окремо затверджене правило для age 18, або не формувати цей повний set до 19 років. Перед реалізацією calculation engine це boundary rule слід зафіксувати тестом і не маскувати adult `19+` RDA під значення для 18-річних.

Domain semantics:

```text
nutrientCode = calcium
targetType = TARGET
source = REFERENCE_BASED
basis = RDA
```

### Iron — Recommended Dietary Allowance

Для iron чинні RDA для nonpregnant adults:

```text
19–50:
MALE   8 mg/day
FEMALE 18 mg/day

51+:
MALE   8 mg/day
FEMALE 8 mg/day
```

Calculation rule:

```text
age 19–50:
  MALE   -> 8
  FEMALE -> 18

age >= 51:
  MALE   -> 8
  FEMALE -> 8
```

Domain semantics:

```text
nutrientCode = iron
targetType = TARGET
source = REFERENCE_BASED
basis = RDA
```

NIH ODS також зазначає, що iron RDA для vegetarians є `1.8 ×` RDA для людей, які споживають м’ясо, через нижчу bioavailability nonheme iron.

У MVP MealMind **не застосовує автоматичний multiplier `1.8`** лише через наявність dietary restriction `vegetarian` або `vegan`.

Причини:

- dietary restriction не обов’язково точно описує фактичний довготривалий dietary pattern;
- потрібна окрема узгоджена semantics для vegetarian/vegan calculation;
- таке правило повинно бути versioned окремо від базового adult RDA lookup.

Тому MVP використовує базову age/sex RDA table. Vegetarian-specific adjustment залишається майбутнім calculation rule.

Як і для calcium, adult table починається з `19 років`; boundary для age `18` має бути явно визначена перед implementation повного automatic set.

### Magnesium — Recommended Dietary Allowance

Для magnesium чинні adult RDA:

```text
19–30:
MALE   400 mg/day
FEMALE 310 mg/day

31+:
MALE   420 mg/day
FEMALE 320 mg/day
```

Calculation rule:

```text
age 19–30:
  MALE   -> 400
  FEMALE -> 310

age >= 31:
  MALE   -> 420
  FEMALE -> 320
```

Domain semantics:

```text
nutrientCode = magnesium
targetType = TARGET
source = REFERENCE_BASED
basis = RDA
```

Важливо не переносити `350 mg/day` supplemental magnesium UL на загальний dietary magnesium target. UL для magnesium у DRI стосується magnesium із dietary supplements і medications, а не magnesium, який природно міститься у food and beverages.

Для age `18` діє той самий implementation caveat, що для calcium та iron: adult `19+` table не повинна застосовуватися мовчки.

### Omega-3 ALA — Adequate Intake

Для `omega_3_ala` використовуються adult Adequate Intake values:

```text
MALE 19+:
1.6 g/day

FEMALE 19+:
1.1 g/day
```

Calculation rule:

```text
if biologicalSex = MALE:
  omega3AlaTargetG = 1.6

if biologicalSex = FEMALE:
  omega3AlaTargetG = 1.1
```

Domain semantics:

```text
nutrientCode = omega_3_ala
targetType = TARGET
source = REFERENCE_BASED
basis = AI
```

ALA є essential omega-3 fatty acid. Організм може перетворювати частину ALA на EPA, а потім DHA, але conversion є обмеженим.

Для віку `18` таблиця NIH ODS уже наводить ті самі ALA values для `14–18`, що й для adults:

```text
MALE 14–18   1.6 g/day
FEMALE 14–18 1.1 g/day
```

тому для `omega_3_ala` окремої проблеми на межі `18/19` немає.

### EPA і DHA — tracked / user-targetable, але без automatic DRI target

MealMind розрізняє три окремі omega-3 nutrients:

```text
omega_3_ala
omega_3_epa
omega_3_dha
```

ALA:

```text
essential fatty acid
+
official AI
+
automatic target in eligible NutrientTargetSet
```

EPA та DHA:

```text
long-chain omega-3 fatty acids
+
no individual DRI intake recommendation
+
no automatic MealMind target
```

Тому:

```text
omega_3_ala:
automaticTarget = YES
userDefinedTarget = OPTIONAL

omega_3_epa:
automaticTarget = NONE
tracking = ENABLED
userDefinedTarget = OPTIONAL

omega_3_dha:
automaticTarget = NONE
tracking = ENABLED
userDefinedTarget = OPTIONAL
```

`isTargetable = true` у nutrient catalog не означає, що MealMind зобов’язаний автоматично створити target. Воно означає, що nutrient може бути представлений у `NutrientTarget`, зокрема як `USER_DEFINED`.

MealMind не повинен автоматично виводити EPA/DHA target із ALA AI або трактувати conversion ALA → EPA → DHA як достатню основу для такого target.

### Узгоджений automatic target set для MVP

Після додавання micronutrients повний automatic onboarding set для eligible profile концептуально включає:

```text
energy / energy estimates

protein
carbohydrate
total_fat
saturated_fat
trans_fat
dietary_fiber

sodium
potassium
calcium
iron
magnesium
omega_3_ala
```

Nutrients без automatic target:

```text
total_sugars
cholesterol
omega_3_epa
omega_3_dha
інші targetable nutrients без окремого погодженого rule
```

для них діє:

```text
tracking = ENABLED
automaticTarget = NONE
userDefinedTarget = OPTIONAL
```

### Спільний UX для reference-based micronutrients

UI повинен відрізняти:

```text
TARGET / adequacy-oriented
potassium
calcium
iron
magnesium
omega_3_ala

MAXIMUM / limit-oriented
sodium
```

Для `TARGET` nutrients progress може показувати наближення до орієнтира.

Для `MAXIMUM` nutrient не слід використовувати UX, у якому досягнення `100%` виглядає як мета. Sodium повинен відображатися як limit-oriented metric.

Усі reference-based values мають супроводжуватися поясненням, що це загальні орієнтири для здорових дорослих, а не медична prescription для конкретного захворювання.

## `total_sugars` — tracked nutrient без автоматичного target

MealMind **не створює автоматичний nutrient target для `total_sugars`** під час onboarding.

`total_sugars` включає як naturally occurring sugars у продуктах, зокрема у фруктах і молочних продуктах, так і added sugars. Тому загальну кількість цукрів не слід трактувати як nutrient, для якого універсально діє правило «чим менше, тим краще».

FDA прямо зазначає, що для **Total Sugars не встановлено Daily Value**, оскільки не визначено рекомендацію щодо загальної кількості total sugars, яку слід споживати протягом дня.

Це відрізняє `total_sugars` від `added_sugars`, для яких існують окремі population-level recommendations.

### Business rule

Для MealMind MVP:

```text
nutrientCode = total_sugars

automatic target:
NONE

tracking:
ENABLED

user-defined target:
OPTIONAL
```

Тобто MealMind:

- може підраховувати фактичне споживання `total_sugars`;
- може показувати його в nutrition summary;
- не створює для нього автоматичний `MINIMUM`, `TARGET`, `RANGE` або evidence-based `MAXIMUM`;
- не оцінює нижче споживання `total_sugars` як автоматично краще;
- дозволяє користувачу за бажанням встановити власний ліміт.

### User-defined maximum

Повнолітній користувач може встановити персональну ціль, наприклад:

```text
nutrientCode = total_sugars
targetType = MAXIMUM
source = USER_DEFINED
maxValue = 60
unit = g/day
```

Таке значення є **особистою ціллю користувача**, а не MealMind recommendation.

UI повинен явно відрізняти її від evidence-based targets.

Рекомендований presentation:

> **Ваша ціль для загальних цукрів:** не більше `X г/день`.

Helper text:

> Для загальних цукрів не встановлено універсальної рекомендованої добової верхньої межі. Показник включає також природні цукри з фруктів, молочних продуктів та інших продуктів. Ви можете встановити власний ліміт для контролю раціону.

Не слід використовувати формулювання:

```text
Рекомендована норма total sugars
```

або:

```text
Безпечний максимум total sugars
```

для `USER_DEFINED` value.

### Майбутнє розрізнення added sugars

Якщо food-data model MealMind надійно підтримуватиме окремий nutrient `added_sugars`, для нього може бути введено окреме evidence-based maximum rule.

Це не повинно автоматично переноситися на `total_sugars`, оскільки:

```text
total_sugars
=
naturally occurring sugars
+
added sugars
```

і ці поняття мають різну guideline semantics.

## `cholesterol` — tracked nutrient без автоматичного target

MealMind також **не створює автоматичний nutrient target для dietary `cholesterol`** під час onboarding.

Для healthy adult population не слід перетворювати історичні fixed cholesterol limits на персональний evidence-based maximum без окремого актуального guideline rule.

Зв'язок між dietary cholesterol, serum cholesterol і cardiovascular outcomes є складнішим, ніж проста модель:

```text
менше dietary cholesterol
=
пропорційно кращий health outcome
```

Вплив конкретного продукту та раціону залежить від загального dietary pattern, зокрема від джерел їжі, saturated fat, інших жирних кислот та індивідуального metabolic context.

Тому MealMind не трактує dietary cholesterol як nutrient, для якого поточний набір антропометричних даних:

```text
birthDate
+
biologicalSex
+
height
+
weight
+
activityLevel
```

дозволяє науково обґрунтовано розрахувати персональний добовий maximum.

### Business rule

Для MealMind MVP:

```text
nutrientCode = cholesterol

automatic target:
NONE

tracking:
ENABLED

user-defined target:
OPTIONAL
```

MealMind:

- відстежує фактичне dietary cholesterol intake, якщо дані доступні;
- може показувати його у nutrition summary;
- не створює automatic onboarding target;
- не створює персональний maximum лише з антропометричних даних;
- не використовує історичний fixed value як автоматичну персональну норму;
- дозволяє користувачу встановити власний limit.

### User-defined maximum

Приклад:

```text
nutrientCode = cholesterol
targetType = MAXIMUM
source = USER_DEFINED
maxValue = 300
unit = mg/day
```

Значення `300 mg/day` у цьому прикладі **не є MealMind recommendation**. Воно лише демонструє persistence semantics для значення, яке користувач вирішив встановити самостійно.

UI:

> **Ваша ціль для холестерину:** не більше `X мг/день`.

Helper text:

> MealMind не встановлює універсальну персональну норму харчового холестерину за вашими антропометричними даними. За бажанням ви можете встановити власний ліміт.

MealMind не повинен використовувати `USER_DEFINED` cholesterol maximum для формулювань на кшталт:

```text
медично рекомендована межа
```

або:

```text
безпечний максимум
```

### Медичні та індивідуальні recommendations

Для окремих користувачів cholesterol-related dietary recommendations можуть залежати від cardiovascular risk, лабораторних показників, діагнозів, медикаментів та рекомендацій healthcare professional.

Такі дані не входять до поточного onboarding eligibility context MealMind.

Тому disease-specific або clinician-directed cholesterol targets не повинні автоматично генеруватися базовим nutrition calculation engine.

У майбутньому вони можуть бути представлені окремим provenance type, наприклад:

```text
CLINICIAN_DEFINED
```

якщо MealMind отримає відповідний product scope.

### Загальна domain semantics для таких nutrients

`total_sugars` і `cholesterol` формують окрему категорію nutrients:

```text
TRACKED
+
NO_AUTOMATIC_TARGET
+
OPTIONAL_USER_DEFINED_TARGET
```

Це принципово відрізняється від:

```text
CALCULATED / REFERENCE-BASED
energy
protein
carbohydrate
total_fat
dietary_fiber

REFERENCE-BASED / ADEQUACY-ORIENTED
potassium
calcium
iron
magnesium
omega_3_ala

MAXIMUM / EVIDENCE-BASED
saturated_fat
trans_fat
sodium
```

У поточній persistence model provenance кодується на двох рівнях:

```text
NutrientTargetSet.source:
CALCULATED | MANUAL | MIXED | IMPORTED

NutrientTarget.source:
CALCULATED | MANUAL
```

Усі automatic values цього MVP — як formula-derived, так і DRI/AI/RDA/CDRR lookup values — зберігаються як `CALCULATED`, а конкретна методика та basis належать versioned policy `calculationPolicyVersion = mealmind-onboarding-nutrition-v1`. Користувацькі значення зберігаються як `MANUAL`.

Якщо в майбутньому буде потрібне machine-readable розрізнення `REFERENCE_BASED`, `CLINICIAN_DEFINED` тощо на рівні окремого target, це потребуватиме окремого schema evolution. `MANUAL` target ніколи не повинен відображатися в UI як automatic MealMind recommendation.

## Майбутній перехід на Dietary Reference Intakes for Energy 2023

PAL-based `REE × activityFactor` є свідомо обраною моделлю для MVP.

Вона має переваги на поточному етапі:

- проста для реалізації та тестування;
- прозора для користувача;
- дозволяє окремо показувати REE;
- добре відповідає поточній доменній моделі `PersonActivityPeriod`;
- дозволяє відокремити resting expenditure від activity adjustment;
- calculation strategy може бути замінена без зміни основного profile domain.

Водночас це **не планується як остаточна довгострокова модель MealMind**.

Після MVP передбачається перехід на методологію:

**National Academies of Sciences, Engineering, and Medicine. Dietary Reference Intakes for Energy. 2023.**

DRI 2023 використовує сучасні prediction equations для Estimated Energy Requirement / Total Energy Expenditure.

Для дорослих equations враховують:

```text
age
+
sex
+
height
+
weight
+
physical activity category
```

і використовують окремі regression equations для категорій:

```text
Inactive
Low active
Active
Very active
```

На відміну від MVP-моделі MealMind:

```text
REE
  ×
single PAL factor
  ↓
maintenance energy
```

DRI 2023 дозволяє оцінювати energy requirement безпосередньо через activity-specific prediction equation:

```text
age
+
sex
+
height
+
weight
+
activity category
        ↓
EER / TEE prediction
```

Для weight-stable adults Estimated Energy Requirement відповідає прогнозованому Total Energy Expenditure.

Тому довгостроковий roadmap передбачає:

```text
MVP
Mifflin–St Jeor + PAL
        ↓
validation / product feedback
        ↓
future calculation strategy
DRI for Energy 2023
```

Перехід на DRI 2023 повинен реалізовуватися як зміна versioned calculation strategy, а не як зміна значення історично створених nutrition snapshots.

Історичні `NutrientTargetSet` повинні зберігати інформацію про calculation method/version, за якою вони були сформовані.

## Матриця доступності розрахунків під час onboarding

Для MVP автоматичний `NutrientTargetSet` створюється тільки після проходження **повного спільного eligibility gate**. MealMind не створює окремі demographic micronutrient targets для користувача, який вирішив не надавати повний personalization context.

| Дані onboarding                                                            | Energy / macros / fiber                      | Sodium                          | Potassium                                                                  | Calcium                                         | Iron                                            | Magnesium                                       | Omega-3 ALA              | Total sugars / Cholesterol / EPA / DHA        | Automatic NutrientTargetSet                                           |
| -------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------ | --------------------------------------------- | --------------------------------------------------------------------- |
| Неповний набір `birthDate / MALE/FEMALE / height / weight / activityLevel` | не формуються як target set                  | не створюється                  | не створюється                                                             | не створюється                                  | не створюється                                  | не створюється                                  | не створюється           | tracking + optional `USER_DEFINED`            | не створюється                                                        |
| Повний набір, але вік < 18                                                 | не створюються                               | не створюється                  | не створюється                                                             | не створюється                                  | не створюється                                  | не створюється                                  | не створюється           | без automatic target                          | не створюється                                                        |
| `biologicalSex = UNSPECIFIED`                                              | не створюються                               | не створюється                  | не створюється                                                             | не створюється                                  | не створюється                                  | не створюється                                  | не створюється           | без automatic target                          | не створюється                                                        |
| Повний eligibility context, age ≥ 19                                       | створюються за погодженими rules             | CDRR-oriented max `2300 mg/day` | AI `3400/2600 mg/day`                                                      | age/sex RDA                                     | age/sex RDA                                     | age/sex RDA                                     | AI `1.6/1.1 g/day`       | без automatic target; optional `USER_DEFINED` | створюється                                                           |
| Повний eligibility context, age = 18                                       | energy/macronutrient rules технічно доступні | adult sodium rule доступне      | окреме age-18 value існує в DRI table, але full-set policy має бути єдиною | adult `19+` table не застосовується автоматично | adult `19+` table не застосовується автоматично | adult `19+` table не застосовується автоматично | `1.6/1.1 g/day` доступне | без automatic target                          | **boundary rule має бути остаточно зафіксоване перед implementation** |

### Boundary `18` vs `19+`

Початковий MealMind eligibility gate був визначений як:

```text
age >= 18
```

Однак частина adult DRI tables для micronutrients починається з `19 years`, тоді як `18` належить до life-stage group `14–18`.

Тому перед реалізацією nutrition-targets engine не можна просто застосувати `19+` calcium/iron/magnesium values до 18-річного користувача.

Є два коректні implementation paths:

```text
A.
зберегти eligibility age >= 18
+
додати офіційні 14–18 DRI values для required micronutrients
+
використовувати їх лише для age = 18
```

або:

```text
B.
для повного automatic NutrientTargetSet
підняти eligibility boundary до age >= 19
```

Для реалізованого slice обрано варіант **A**: зберігається eligibility `age >= 18`, а для користувача віком рівно 18 років застосовуються офіційні values групи `14–18`:

```text
potassium:
MALE   3000 mg/day
FEMALE 2300 mg/day

calcium:
1300 mg/day

iron:
MALE   11 mg/day
FEMALE 15 mg/day

magnesium:
MALE   410 mg/day
FEMALE 360 mg/day

omega_3_ala:
MALE   1.6 g/day
FEMALE 1.1 g/day

sodium CDRR-oriented maximum:
2300 mg/day
```

Починаючи з `19` років застосовуються adult tables, описані вище. Це правило зафіксоване calculation constants та PostgreSQL integration tests.

Для користувача, який не проходить eligibility gate, UI не повинен намагатися компенсувати це частковими automatic recommendations.

Рекомендований state:

> **Персональні цільові показники ще не розраховані.** Доповніть дані профілю, щоб отримати орієнтовні рекомендації MealMind, або встановіть власні цілі для потрібних нутрієнтів.

## Відношення до weight goal та nutrient targets

REE і maintenance energy є базовими енергетичними оцінками та не повинні автоматично трактуватися як остаточна nutrition prescription.

`PersonWeightGoal`:

```text
MAINTAIN
LOSE
GAIN
```

разом із target weight, target rate або target date є окремим input для наступного етапу розрахунку.

Правила дефіциту або профіциту енергії для `LOSE` / `GAIN` мають бути визначені окремо перед створенням фінального `ENERGY NutrientTarget`.

Таким чином майбутня calculation pipeline концептуально матиме вигляд:

```text
PersonProfile
     +
BodyMeasurement
     +
PersonActivityPeriod
     ↓
baseline energy estimation
     ↓
PersonWeightGoal
     ↓
goal adjustment
     ↓
energy target
     ↓
macronutrient / nutrient rules
     ↓
NutrientTargetSet
     ↓
NutrientTarget[]
```

Protein target уже визначено окремим business rule як `1.2–1.6 g/kg/day` для eligible adult profiles.

Carbohydrate target визначено як AMDR-based range `45–65%` від актуальної energy calculation base. Під час onboarding до появи goal-adjusted energy target цією базою є `maintenanceEnergy`; gram values є derived representation через `4 kcal/g`.

Fat target визначено за тією самою AMDR-based моделлю як `20–35%` від актуальної energy calculation base; gram values є derived representation через `9 kcal/g`.

Saturated fat має окрему maximum semantics: `<10%` від актуальної energy calculation base. Gram-equivalent maximum є derived representation через `9 kcal/g` і не є кількістю, яку користувач повинен прагнути спожити.

Trans fat має окрему maximum semantics: `<1%` від актуальної energy calculation base. Gram-equivalent maximum також є derived representation через `9 kcal/g`; industrially produced trans fats у healthy-diet guidance WHO рекомендовано уникати.

Dietary fiber target визначено як energy-derived value `14 g/1000 kcal` від актуальної energy calculation base. Під час onboarding цією базою є `maintenanceEnergy`; після появи goal-adjusted energy target fiber автоматично перераховується від нового `energyTarget`.

`total_sugars` не отримує automatic target: MealMind лише відстежує фактичне споживання та дозволяє optional `USER_DEFINED` maximum. Причина — total sugars включають як природні, так і added sugars, а універсального Daily Value / рекомендованого total intake для цього aggregate nutrient не встановлено.

`cholesterol` також не отримує automatic onboarding target. MealMind відстежує dietary cholesterol і дозволяє optional `USER_DEFINED` maximum, але не перетворює історичні fixed limits або неоднозначні population-level associations на персональну норму, розраховану з антропометричних даних.

Для eligible profiles до automatic set також входять `sodium`, `potassium`, `calcium`, `iron`, `magnesium` та `omega_3_ala`. Sodium має CDRR-oriented maximum semantics; potassium та ALA використовують AI; calcium, iron і magnesium — age/sex-specific RDA.

`omega_3_epa` та `omega_3_dha` залишаються tracked/user-targetable nutrients без automatic DRI target.

Інші nutrient targets мають бути визначені наступними окремими бізнес-правилами.

Майбутній `NutrientTargetSet` повинен представляти розрахований і версіонований nutrition snapshot, а `NutrientTarget` — окремі цільові значення нутрієнтів усередині цього набору.

Calculation provenance повинна дозволяти визначити щонайменше:

- якою calculation strategy створено набір;
- яку версію алгоритму використано;
- коли виконано розрахунок;
- які profile inputs були актуальними для відповідного snapshot.

Остаточна persistence/recalculation policy для цих моделей визначається в окремому vertical slice.

## Контроль доступу

Identity завжди береться з перевіреного Supabase JWT. Поточна Family визначається сервером через `ACTIVE membership`: нуль memberships означає незавершений onboarding, дві або більше — `INVALID_FAMILY_CONTEXT`. Caller-supplied `userId`, `familyId` і відповідні headers не використовуються як доказ доступу.

OWNER може змінювати налаштування сім’ї та базові дані `PersonProfile` усіх активних учасників своєї Family, зокрема registered MEMBER. Власний зареєстрований профіль редагується через `/profile/me`.

Family ownership не надає права змінювати email, `externalSubject`, `applicationRole`, пароль, providers або інші account/security властивості іншого User.

MEMBER не може змінювати профілі інших учасників.

## Активація акаунта dependent-учасника

OWNER створює invitation лише для active dependent `FamilyMember`, чий `PersonProfile.userId` дорівнює `null`.

Email нормалізується, роль не приймається від клієнта, а existing MealMind account повертає `EXISTING_ACCOUNT_NOT_SUPPORTED`.

Одночасно може існувати лише одне `PENDING` invitation для profile.

Invitation secret генерується криптографічно стійким генератором; у PostgreSQL зберігається лише SHA-256 hash.

Лист Resend не містить даних профілю чи сім’ї та веде на налаштований `INVITATION_APP_ORIGIN`.

Web-client переносить secret з URL у `HttpOnly`, `SameSite=Lax` cookie і виконує inspect/claim через same-origin route, тому JavaScript клієнта token не читає.

Claim вимагає:

- verified Supabase JWT;
- створеного account bootstrap локального User;
- збіг підтвердженої email-адреси.

Операція у serializable transaction:

- зберігає existing `PersonProfile`;
- зберігає existing `FamilyMember`;
- створює `ACTIVE MEMBER` membership;
- встановлює `onboardingCompletedAt`;
- переводить invitation у `ACCEPTED`.

Personal Family та новий profile не створюються.

Повторний claim того самого User є idempotent; expired/revoked/foreign invitation відхиляються стабільним error contract.

У dev-режимі використовується `MealMind <onboarding@resend.dev>`.

До верифікації власного домену Resend дозволяє надсилання лише на адресу власника Resend account; для automated delivery tests слід використовувати офіційні test addresses.

## Життєвий цикл і приватність

Видалення dependent-учасника є архівацією `FamilyMember` та `PersonProfile`.

Історичні meal, cooking і consumption records не видаляються та зберігають referential integrity.

Self-service export/deletion account і de-identification після законного запиту будуть окремим vertical slice.

Body measurements, activity і weight goals не повертаються у family list та не записуються до логів або error payloads.

Вони не трактуються як медичний діагноз.

Автоматично розраховані:

- REE;
- maintenance energy;
- protein, carbohydrate, total fat, saturated fat, trans fat і dietary fiber targets;
- sodium, potassium, calcium, iron, magnesium і omega-3 ALA targets;
- майбутні nutrient targets

також повинні трактуватися як персоналізовані оцінки, а не як діагноз або заміна професійної медичної чи дієтологічної консультації.

У логах не повинні з’являтися:

- вхідні body metrics;
- розрахований REE;
- maintenance energy;
- персональні nutrient targets.

## Розширений власний профіль

`GET /api/v1/profile/me` повертає окремий `OwnProfileView`, а не компактний family roster DTO.

До read model входять:

- базові `PersonProfile` data;
- вибрані типи прийомів їжі;
- cuisine preferences;
- disliked products;
- dietary restrictions;
- active allergies;
- latest body measurement;
- current activity period;
- current active weight goal.

Historical body measurements, activity periods та weight goals не повертаються повністю через базовий `/profile/me`.

Для майбутнього history UI вони мають отримати окремі resource endpoints.

Після реалізації nutrition-targets slice власний profile UI також може відображати:

- estimated REE;
- estimated maintenance energy;
- recommended protein range;
- recommended carbohydrate range у `% energy` та derived `g/day`;
- recommended total fat range у `% energy` та derived `g/day`;
- saturated fat maximum у `% energy` та derived `g/day`;
- trans fat maximum у `% energy` та derived `g/day`;
- recommended dietary fiber target у `g/day`;
- sodium maximum;
- potassium AI-based target;
- calcium, iron і magnesium RDA-based targets;
- omega-3 ALA AI-based target;
- фактичне споживання `total_sugars`, `cholesterol`, `omega_3_epa` і `omega_3_dha` без automatic target;
- optional user-defined targets/limits для nutrients без automatic rule, якщо користувач їх встановив;
- актуальні nutrition targets;
- calculation method/version;
- дату останнього розрахунку.

Усі автоматично розраховані значення повинні мати чітке маркування як приблизні.

Реалізований API/read-model contract:

- `GET /api/v1/profile/me` повертає `nutritionTargets.current`;
- для одного `PersonProfile` одночасно може існувати **не більше одного** відкритого `NutrientTargetSet` (`effectiveTo = null`);
- onboarding automatic set має `source = CALCULATED` і `calculationPolicyVersion = mealmind-onboarding-nutrition-v1`;
- якщо eligibility gate не виконаний, current set може бути відсутній;
- користувач може створити власний `MANUAL` set незалежно від anthropometric eligibility;
- `PUT /api/v1/profile/me/nutrient-targets` передає **повний бажаний current snapshot**;
- якщо користувач змінює хоча б один target у поточному `CALCULATED` snapshot, попередній set закривається через `effectiveTo`, а новий повний snapshot створюється з `source = MANUAL`;
- targets, чиї значення були скопійовані без змін, зберігають свій individual `NutrientTarget.source = CALCULATED`; змінені або нові targets отримують `source = MANUAL`;
- якщо current set уже `MANUAL`, наступна зміна так само створює нову MANUAL-версію, не виконуючи in-place update;
- `items: []` закриває current snapshot і залишає профіль без поточного `NutrientTargetSet`;
- повторний `PUT` із повністю ідентичним snapshot є idempotent і не створює зайву historical version;
- `NutrientTargetSet.restingEnergyKcal`, `maintenanceEnergyKcal`, `calculationPolicyVersion` та links до calculation context зберігаються при manual versioning, якщо новий snapshot походить від попереднього calculated snapshot;
- повернення до автоматичних рекомендацій у майбутньому повинно виконуватися окремою recalculation operation, яка створює **новий** `CALCULATED` snapshot із поточних profile inputs, а не «воскресає» старий historical set.

Email, authentication providers, password та інші account/security properties не входять до `OwnProfileView` і залишаються account domain.

Family roster так само не розширюється health-related даними.

## Lifecycle `PersonProfile` → `NutrientTargetSet` → `NutrientTarget`

```text
PersonProfile
    ↓ 1:N history
NutrientTargetSet
    ↓ 1:N
NutrientTarget
    ↓ N:1
Nutrient
```

`PersonProfile` є власником nutrition history.

`NutrientTargetSet` є immutable/versioned snapshot набору цілей. Historical sets мають `effectiveTo != null`; current set має `effectiveTo = null`. Database constraint `nutrient_target_sets_one_current` є доменним invariant і гарантує максимум один current snapshot на profile.

`NutrientTarget` описує значення для одного `Nutrient` усередині snapshot через `minimumValue`, `targetValue` та/або `maximumValue`.

Set-level `source` і target-level `source` мають різну семантику:

```text
NutrientTargetSet.source = CALCULATED
→ snapshot повністю створений calculation engine

NutrientTargetSet.source = MANUAL
→ snapshot був сформований або змінений користувачем

NutrientTarget.source = CALCULATED
→ конкретне значення успадковане без зміни з calculation engine

NutrientTarget.source = MANUAL
→ конкретне значення введене/змінене користувачем
```

Тому після часткового редагування automatic set можливий коректний стан:

```text
NutrientTargetSet.source = MANUAL

protein.source = CALCULATED
carbohydrate.source = CALCULATED
sodium.source = MANUAL
dietary_fiber.source = CALCULATED
```

Це дозволяє одночасно мати один зрозумілий current snapshot і не втрачати provenance окремих значень.

## Наукові джерела для nutrition calculation model

### Mifflin–St Jeor

Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.

_A new predictive equation for resting energy expenditure in healthy individuals._

The American Journal of Clinical Nutrition.
1990;51(2):241–247.

DOI:

```text
10.1093/ajcn/51.2.241
```

Використовується в MVP для оцінки resting energy expenditure.

### FAO/WHO/UNU — Physical Activity Level

FAO/WHO/UNU.

_Human Energy Requirements. Report of a Joint FAO/WHO/UNU Expert Consultation._

FAO Food and Nutrition Technical Report Series 1.
Rome, 2004.

Для дорослих документ визначає PAL як співвідношення total energy expenditure до basal metabolic rate та використовує діапазони:

```text
Sedentary / light       1.40–1.69
Active / moderate       1.70–1.99
Vigorous                2.00–2.40
```

Використовується як наукова основа для MVP `ActivityLevel → activityFactor` mapping.

### Protein — Dietary Reference Intakes

National Academies / Institute of Medicine Dietary Reference Intakes визначають RDA protein для дорослих на рівні:

```text
0.8 g/kg/day
```

Це значення використовується як reference adequacy value і зберігається окремо від MealMind recommended range.

### Protein — Dietary Guidelines for Americans 2025–2030

_Dietary Guidelines for Americans, 2025–2030._

Для protein serving goals документ наводить:

```text
1.2–1.6 g/kg body weight/day
```

із можливістю коригування відповідно до індивідуальних caloric requirements.

У MealMind цей діапазон використовується як **MVP recommended protein range** для eligible healthy adult profiles:

```text
proteinMinG = weightKg × 1.2
proteinMaxG = weightKg × 1.6
```

DRI RDA `0.8 g/kg/day` при цьому не замінюється і документується окремо як reference value.

### Carbohydrate — Acceptable Macronutrient Distribution Range

National Academies of Sciences, Engineering, and Medicine.

_Rethinking the Acceptable Macronutrient Distribution Range for the 21st Century: A Letter Report._

Washington, DC: The National Academies Press. 2024.

DOI:

```text
10.17226/27957
```

Звіт відтворює чинний AMDR для carbohydrate у дорослих:

```text
45–65% of total energy
```

У MealMind це значення використовується як **MVP personalized carbohydrate range**:

```text
carbohydrateEnergyMinPercent = 45
carbohydrateEnergyMaxPercent = 65
```

Gram-equivalent range розраховується від актуальної energy calculation base:

```text
carbohydrateMinG = energyTarget × 0.45 / 4
carbohydrateMaxG = energyTarget × 0.65 / 4
```

Під час onboarding до реалізації goal adjustment:

```text
energyTarget = maintenanceEnergy
```

### Carbohydrate — Dietary Reference Intake reference value

Dietary Reference Intakes визначають carbohydrate RDA для дорослих:

```text
130 g/day
```

У MealMind це значення документується як **reference value**, але не використовується як personalized automatic carbohydrate target.

Основним calculation rule MVP залишається:

```text
45–65% of calculated daily energy
```

### Fat — Acceptable Macronutrient Distribution Range

National Academies of Sciences, Engineering, and Medicine.

_Rethinking the Acceptable Macronutrient Distribution Range for the 21st Century: A Letter Report._

Washington, DC: The National Academies Press. 2024.

DOI:

```text
10.17226/27957
```

Звіт відтворює чинний AMDR для total fat у дорослих:

```text
20–35% of total energy
```

У MealMind це значення використовується як **MVP personalized total-fat range**:

```text
fatEnergyMinPercent = 20
fatEnergyMaxPercent = 35
```

Gram-equivalent range розраховується від актуальної energy calculation base:

```text
fatMinG = energyTarget × 0.20 / 9
fatMaxG = energyTarget × 0.35 / 9
```

Під час onboarding до реалізації goal adjustment:

```text
energyTarget = maintenanceEnergy
```

`total_fat` не замінює окремі майбутні maximum rules для `saturated_fat` та `trans_fat`.

### Saturated Fat and Trans Fat — WHO guideline 2023

World Health Organization.

_Saturated fatty acid and trans-fatty acid intake for adults and children: WHO guideline._

Geneva: World Health Organization. 2023.

ISBN:

```text
978-92-4-007363-0
```

Офіційна сторінка WHO:

```text
https://www.who.int/publications/i/item/9789240073630
```

WHO встановлює такі quantitative upper bounds:

```text
saturated fatty acids:
≤ 10% of total energy intake

trans-fatty acids:
≤ 1% of total energy intake
```

WHO також рекомендує, щоб dietary fat переважно надходив із unsaturated fatty acids, а industrially produced trans fats не були частиною healthy diet і уникалися.

У MealMind ці значення використовуються як **MVP maximum rules**, а не як target ranges:

```text
saturatedFatMaxPercentEnergy = 10
transFatMaxPercentEnergy = 1
```

Gram-equivalent upper bounds:

```text
saturatedFatMaxG = energyTarget × 0.10 / 9
transFatMaxG = energyTarget × 0.01 / 9
```

Під час onboarding:

```text
energyTarget = maintenanceEnergy
```

Для `2 000 kcal/day`:

```text
saturated fat:
< 200 kcal/day
< 22.2 g/day

trans fat:
< 20 kcal/day
< 2.2 g/day
```

Офіційний WHO healthy-diet fact sheet додатково формулює ті самі limits та наголошує на уникненні industrially produced trans fats:

```text
https://www.who.int/news-room/fact-sheets/detail/healthy-diet
```

WHO trans-fat fact sheet:

```text
https://www.who.int/news-room/fact-sheets/detail/trans-fat/
```

Важлива domain semantics:

```text
total_fat = recommended range

saturated_fat = maximum / upper bound

trans_fat = maximum / upper bound
```

Saturated fat і trans fat є складовими total fat, тому не повинні додаватися до `total_fat` як окремі energy allocations.

### Dietary Fiber — Dietary Reference Intakes

Institute of Medicine. Food and Nutrition Board.

_Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids._

Washington, DC: The National Academies Press. 2005.

DOI:

```text
10.17226/10490
```

Офіційна сторінка National Academies Press:

```text
https://nap.nationalacademies.org/catalog/10490/
```

DRI framework для dietary fiber використовує energy-density basis:

```text
14 g dietary fiber / 1 000 kcal
```

На цій основі сформовані Adequate Intake values для різних life-stage groups.

У MealMind це правило використовується як **MVP personalized dietary fiber calculation basis**:

```text
fiberGramsPer1000Kcal = 14
```

і:

```text
dietaryFiberG = energyTarget × 14 / 1000
```

Під час onboarding до реалізації goal adjustment:

```text
energyTarget = maintenanceEnergy
```

Таким чином абсолютне значення `g/day` є derived value від персональної energy calculation base.

Додаткове офіційне джерело:

Institute of Medicine.

_Dietary Reference Intakes: The Essential Guide to Nutrient Requirements._

Washington, DC: The National Academies Press. 2006.

DOI:

```text
10.17226/11537
```

Розділ **Fiber** узагальнює DRI для fiber та age/sex-specific Adequate Intake values.

Офіційна сторінка:

```text
https://nap.nationalacademies.org/catalog/11537/
```

National Academies DRI collection:

```text
https://nap.nationalacademies.org/collection/57/dietary-reference-intakes
```

### Total Sugars — FDA

U.S. Food and Drug Administration.

_Added Sugars on the Nutrition Facts Label._

FDA пояснює, що `Total Sugars` включає:

- naturally occurring sugars, зокрема sugars у milk та fruit;
- added sugars, якщо вони присутні у продукті.

Для `Total Sugars` FDA не встановлює Daily Value, оскільки не визначено recommendation щодо загальної кількості total sugars, яку слід споживати протягом дня.

Це є підставою для MealMind business rule:

```text
total_sugars:
automaticTarget = NONE
tracking = ENABLED
userDefinedTarget = OPTIONAL
```

Важливо не переносити recommendation для `added_sugars` безпосередньо на `total_sugars`.

Офіційне джерело FDA:

```text
https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label
```

### Dietary Cholesterol — evidence interpretation

Dietary cholesterol залишається nutrition metric, який може бути корисно відстежувати, але MealMind не використовує його як automatic personalized onboarding target.

Відсутність автоматичного target **не означає**, що необмежене споживання dietary cholesterol гарантовано не має ризику. Вона означає, що MealMind не має достатньої підстави перетворити поточний набір anthropometric/activity inputs на універсальну персональну cholesterol prescription.

У domain model це фіксується як:

```text
cholesterol:
automaticTarget = NONE
tracking = ENABLED
userDefinedTarget = OPTIONAL
```

Якщо користувач має індивідуальну рекомендацію лікаря або дієтолога, він може використовувати її як власний limit; MealMind не повинен маркувати таке значення як автоматично розраховану норму.

Для DRI framework загалом важливо також не трактувати відсутність UL як доказ повної відсутності ризику: National Academies зазначають, що відсутність UL може відображати недостатність доказів, а не доведену безпечність необмеженого intake.

Це підтримує консервативну MealMind semantics:

```text
no evidence-based automatic target
≠
unlimited intake is proven safe
```

### Sodium and Potassium — Dietary Reference Intakes 2019

National Academies of Sciences, Engineering, and Medicine.

_Dietary Reference Intakes for Sodium and Potassium._

Washington, DC: The National Academies Press. 2019.

DOI:

```text
10.17226/25353
```

Офіційна сторінка:

```text
https://nap.nationalacademies.org/catalog/25353/dietary-reference-intakes-for-sodium-and-potassium
```

Для sodium у healthy adults `19+`:

```text
AI = 1500 mg/day

CDRR:
reduce intake if above 2300 mg/day
```

У MealMind AI зберігається як reference value, а machine-actionable automatic rule має limit-oriented semantics:

```text
sodium maximum = 2300 mg/day
basis = CDRR
```

Для potassium adult AI:

```text
MALE 19+   = 3400 mg/day
FEMALE 19+ = 2600 mg/day
```

У MealMind:

```text
potassium:
targetType = TARGET
basis = AI
```

Відсутність potassium UL не означає доведену безпечність необмеженого supplemental intake; DRI report окремо застерігає щодо high supplemental potassium для певних risk groups.

### Calcium — Dietary Reference Intakes / NIH ODS

National Academies / Food and Nutrition Board adult calcium RDA, узагальнені NIH Office of Dietary Supplements:

```text
19–50:
1000 mg/day

51–70:
MALE   1000 mg/day
FEMALE 1200 mg/day

71+:
1200 mg/day
```

Офіційне NIH ODS джерело:

```text
https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/
```

Базовий DRI report:

Institute of Medicine.

_Dietary Reference Intakes for Calcium and Vitamin D._

Washington, DC: The National Academies Press. 2011.

У MealMind calcium використовується як age/sex-specific `REFERENCE_BASED` target із `basis = RDA`.

### Iron — Dietary Reference Intakes / NIH ODS

NIH Office of Dietary Supplements наводить чинні RDA для nonpregnant adults:

```text
19–50:
MALE   8 mg/day
FEMALE 18 mg/day

51+:
MALE   8 mg/day
FEMALE 8 mg/day
```

Офіційне джерело:

```text
https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/
```

ODS також зазначає, що RDA для vegetarians є `1.8 ×` базових values через нижчу bioavailability nonheme iron.

MealMind MVP не застосовує цей multiplier автоматично. Vegetarian/vegan adjustment потребує окремого versioned business rule.

### Magnesium — Dietary Reference Intakes / NIH ODS

NIH Office of Dietary Supplements наводить adult RDA:

```text
19–30:
MALE   400 mg/day
FEMALE 310 mg/day

31+:
MALE   420 mg/day
FEMALE 320 mg/day
```

Офіційне джерело:

```text
https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/
```

У MealMind magnesium використовується як age/sex-specific `REFERENCE_BASED` target із `basis = RDA`.

Окремий supplemental magnesium UL не використовується як food-intake target, оскільки він стосується magnesium із supplements/medications, а не природного magnesium з food and beverages.

### Omega-3 ALA, EPA and DHA — NIH ODS / Dietary Reference Intakes

NIH Office of Dietary Supplements узагальнює чинні DRI для omega-3 fatty acids.

Офіційне джерело:

```text
https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/
```

ALA є essential fatty acid, для якої встановлено Adequate Intake:

```text
MALE 14+:
1.6 g/day

FEMALE 14+:
1.1 g/day
```

Для MealMind eligible profiles:

```text
omega_3_ala:
automaticTarget = YES
basis = AI
```

EPA і DHA є long-chain omega-3 fatty acids. Організм може конвертувати ALA в EPA, а потім DHA, але conversion є обмеженим.

Food and Nutrition Board не встановив окремих DRI intake recommendations для EPA або DHA.

Тому:

```text
omega_3_epa:
automaticTarget = NONE

omega_3_dha:
automaticTarget = NONE
```

але обидва nutrients можуть залишатися `isTargetable = true`, щоб підтримувати `USER_DEFINED` targets.

### Dietary Reference Intakes for Energy — 2023

National Academies of Sciences, Engineering, and Medicine.

_Dietary Reference Intakes for Energy._

Washington, DC: The National Academies Press. 2023.

DOI:

```text
10.17226/26818
```

Документ містить сучасні prediction equations для Total Energy Expenditure та Estimated Energy Requirement з урахуванням:

- age;
- sex;
- height;
- weight;
- physical activity category;
- відповідних life-stage conditions.

DRI 2023 визначено як **цільову методологію для майбутньої заміни MVP PAL-based calculation strategy** після завершення та валідації базового nutrition-targets functionality.
