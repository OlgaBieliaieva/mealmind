# Доменні ERD

Ці діаграми показують основні предметні зв’язки реалізованої Prisma-схеми. Для читабельності scalar fields, audit relations і частина допоміжних зворотних relations не відображаються. Кардинальність і referential actions потрібно звіряти з `packages/db/prisma/schema.prisma`.

## Identity, Family and Personalization

```mermaid
erDiagram
    User ||--o| PersonProfile : "має профіль"
    User ||--o{ FamilyMembership : "входить до сімей"
    User ||--o{ Family : "створює"
    Family ||--o{ FamilyMembership : "надає доступ"
    Family ||--o{ FamilyMember : "містить учасників"
    PersonProfile ||--o{ FamilyMember : "представляє особу"
    User ||--o{ FamilyMemberAccountInvitation : "створює запрошення"
    Family ||--o{ FamilyMemberAccountInvitation : "обмежує запрошення"
    PersonProfile ||--o{ FamilyMemberAccountInvitation : "активується через"
    PersonProfile ||--o{ BodyMeasurement : "має вимірювання"
    PersonProfile ||--o{ PersonActivityPeriod : "має активність"
    PersonProfile ||--o{ PersonWeightGoal : "має цілі"
    BodyMeasurement o|--o{ PersonWeightGoal : "є baseline"
    PersonProfile ||--o{ NutrientTargetSet : "має набори цілей"
    BodyMeasurement o|--o{ NutrientTargetSet : "обґрунтовує"
    PersonActivityPeriod o|--o{ NutrientTargetSet : "обґрунтовує"
    PersonWeightGoal o|--o{ NutrientTargetSet : "обґрунтовує"
    NutrientTargetSet ||--o{ NutrientTarget : "містить"
    Nutrient ||--o{ NutrientTarget : "визначає показник"
    PersonProfile ||--o{ PersonMealTypePreference : "обирає типи прийомів"
    MealType ||--o{ PersonMealTypePreference : "класифікує"
    PersonProfile ||--o{ PersonDietaryRestriction : "має обмеження"
    DietaryTag ||--o{ PersonDietaryRestriction : "класифікує"
    PersonProfile ||--o{ PersonAllergy : "має алергії"
    Allergen ||--o{ PersonAllergy : "класифікує"
    PersonProfile ||--o{ PersonDislikedProduct : "не вподобає"
    Product ||--o{ PersonDislikedProduct : "стосується"
    PersonProfile ||--o{ PersonCuisinePreference : "вподобає"
    Cuisine ||--o{ PersonCuisinePreference : "стосується"
```

`FamilyMembership` описує доступ зареєстрованого `User`, а `FamilyMember` — участь `PersonProfile` у плануванні. Завдяки цьому залежний профіль може бути членом сім’ї без облікового запису. `FamilyMemberAccountInvitation` безпечно прив’язує нову verified identity до existing dependent profile, не створюючи нову людину або загальне multi-family invitation.

## Reference Data and Product Catalog

```mermaid
erDiagram
    ProductCategory o|--o{ ProductCategory : "має дочірні категорії"
    ProductCategory ||--o{ Product : "класифікує"
    Brand o|--o{ Product : "брендує"
    MeasurementUnit ||--o{ Product : "задає базову одиницю"
    Product o|--o{ Product : "має branded variants"
    Product ||--o{ ProductSourceReference : "має provenance"
    Product ||--o{ ProductNutrient : "має нутрієнти"
    Nutrient ||--o{ ProductNutrient : "визначає показник"
    ProductSourceReference o|--o{ ProductNutrient : "є джерелом"
    Product ||--o{ ProductPortion : "має порції"
    MeasurementUnit o|--o{ ProductPortion : "задає одиницю"
    Product ||--o{ ProductMedia : "має media"
    Product ||--o{ ProductDietaryTag : "має dietary tags"
    DietaryTag ||--o{ ProductDietaryTag : "класифікує"
    Product ||--o{ ProductAllergen : "має allergen evidence"
    Allergen ||--o{ ProductAllergen : "класифікує"
```

`ProductSourceReference` зберігає provenance імпортованого продукту. Значення нутрієнтів, порції та класифікації можуть посилатися на конкретне джерело, але canonical `Product` не залежить від структури зовнішнього набору.

## Recipes and Nutrition

```mermaid
erDiagram
    Family o|--o{ Recipe : "володіє приватними рецептами"
    User ||--o{ Recipe : "створює record"
    Recipe o|--o{ Recipe : "є основою derived recipe"
    RecipeType o|--o{ Recipe : "класифікує"
    Author o|--o| User : "може представляти"
    Author ||--o{ AuthorLink : "має посилання"
    Author o|--o{ Recipe : "є автором"
    Recipe ||--o{ RecipeIngredient : "містить"
    Product ||--o{ RecipeIngredient : "використовується"
    MeasurementUnit ||--o{ RecipeIngredient : "задає кількість"
    Recipe ||--o{ RecipeStep : "містить"
    Recipe ||--o{ RecipeSource : "має provenance"
    Recipe ||--o{ RecipeCuisine : "класифікується"
    Cuisine ||--o{ RecipeCuisine : "визначає кухню"
    Recipe ||--o{ RecipeDietaryTag : "класифікується"
    DietaryTag ||--o{ RecipeDietaryTag : "визначає ознаку"
    Recipe ||--o{ RecipeMedia : "має media"
    Author o|--o{ RecipeMedia : "атрибутує"
    Recipe ||--o{ RecipeNutrient : "має snapshot"
    Nutrient ||--o{ RecipeNutrient : "визначає показник"
```

`createdByUserId` відповідає за audit, тоді як `authorId` визначає публічне авторство. Автор може бути системою, експертом, блогером або зареєстрованим користувачем.

## Meal Planning

```mermaid
erDiagram
    Family ||--o{ MealPlan : "має плани"
    MealPlan ||--o{ MealEntry : "містить позиції"
    MealType ||--o{ MealEntry : "класифікує"
    Product o|--o{ MealEntry : "є вмістом"
    Recipe o|--o{ MealEntry : "є вмістом"
    MealEntry ||--o{ MealEntryParticipant : "має порції"
    FamilyMember ||--o{ MealEntryParticipant : "отримує порцію"
    MeasurementUnit ||--o{ MealEntryParticipant : "задає одиницю"
```

`MealEntry` посилається рівно на один content type: product або recipe. Персоналізовані кількості зберігаються окремо у `MealEntryParticipant`.

## Shopping List

```mermaid
erDiagram
    Family ||--o{ ShoppingList : "володіє"
    MealPlan ||--o{ ShoppingList : "є джерелом"
    ShoppingList ||--o{ ShoppingListItem : "містить"
    Product o|--o{ ShoppingListItem : "ідентифікує catalog item"
    ProductCategory o|--o{ ShoppingListItem : "групує"
    MeasurementUnit o|--o{ ShoppingListItem : "задає derived quantity"
    MeasurementUnit o|--o{ ShoppingListItem : "задає requested quantity"
    ShoppingListItem ||--o{ ShoppingListItemSource : "агрегує внески"
    MealEntry o|--o{ ShoppingListItemSource : "створює потребу"
    RecipeIngredient o|--o{ ShoppingListItemSource : "пояснює інгредієнт"
    Product ||--o{ ShoppingListItemSource : "визначає продукт"
```

Список є збереженим редагованим snapshot. `ShoppingListItemSource` забезпечує traceability від агрегованої позиції до планової порції або ручного внеску.

## Cooking Mode

```mermaid
erDiagram
    Family ||--o{ CookingSession : "володіє"
    MealEntry ||--o| CookingSession : "запускає"
    Recipe ||--o{ CookingSession : "є шаблоном"
    CookingSession ||--o{ CookingSessionIngredient : "фіксує ingredients"
    RecipeIngredient o|--o{ CookingSessionIngredient : "походить із"
    Product ||--o{ CookingSessionIngredient : "planned product"
    Product o|--o{ CookingSessionIngredient : "actual product"
    MeasurementUnit ||--o{ CookingSessionIngredient : "planned unit"
    MeasurementUnit o|--o{ CookingSessionIngredient : "actual unit"
    CookingSession ||--o{ CookingSessionStep : "фіксує steps"
    RecipeStep o|--o{ CookingSessionStep : "походить із"
    CookingSession ||--o{ CookingSessionNutrient : "має final snapshot"
    Nutrient ||--o{ CookingSessionNutrient : "визначає показник"
```

Cooking session не змінює базовий рецепт. Завершення можливе лише після явного опрацювання ingredient і step snapshots та створення фінального nutrient result.

## Consumption Diary

```mermaid
erDiagram
    Family ||--o{ ConsumptionEntry : "володіє"
    FamilyMember ||--o{ ConsumptionEntry : "споживає"
    User ||--o{ ConsumptionEntry : "записує"
    MealEntryParticipant o|--o| ConsumptionEntry : "є плановим джерелом"
    Product o|--o{ ConsumptionEntry : "є фактичним продуктом"
    Recipe o|--o{ ConsumptionEntry : "є фактичним рецептом"
    CookingSession o|--o{ ConsumptionEntry : "надає actual result"
    MeasurementUnit ||--o{ ConsumptionEntry : "задає actual quantity"
    ConsumptionEntry ||--o{ ConsumptionEntryNutrient : "має historical snapshot"
    Nutrient ||--o{ ConsumptionEntryNutrient : "визначає показник"
    MealEntryParticipant ||--o| MealConsumptionResolution : "отримує outcome"
    ConsumptionEntry o|--o| MealConsumptionResolution : "підтверджує факт"
    FamilyMember ||--o{ MealConsumptionResolution : "стосується"
    User ||--o{ MealConsumptionResolution : "вирішує"
```

Планова порція є кандидатом, а не фактом споживання. `MealConsumptionResolution` фіксує outcome, а `ConsumptionEntry` зберігає самостійний історичний факт та його nutrient snapshot.
