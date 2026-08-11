import type { ReferenceResource } from "@/shared/api/reference-data";

export interface ReferenceOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface ReferenceField {
  readonly name: string;
  readonly label: string;
  readonly kind: "text" | "textarea" | "number" | "decimal" | "checkbox" | "select" | "url";
  readonly required?: boolean;
  readonly nullable?: boolean;
  readonly createOnly?: boolean;
  readonly options?: readonly ReferenceOption[];
  readonly description?: string;
  readonly maxLength?: number;
}

export interface ReferenceConfig {
  readonly label: string;
  readonly itemLabel: string;
  readonly description: string;
  readonly fields: readonly ReferenceField[];
}

const active: ReferenceField = { name: "isActive", label: "Активне значення", kind: "checkbox" };
const code: ReferenceField = {
  name: "code",
  label: "Стабільний код",
  kind: "text",
  required: true,
  createOnly: true,
  description: "Латиниця у форматі lowercase_snake_case; після створення код незмінний.",
};
const nameUa: ReferenceField = {
  name: "nameUa",
  label: "Назва українською",
  kind: "text",
  required: true,
};
const nameEn: ReferenceField = {
  name: "nameEn",
  label: "Назва англійською",
  kind: "text",
  required: true,
};
const sortOrder: ReferenceField = {
  name: "sortOrder",
  label: "Порядок",
  kind: "number",
  required: true,
};
const option = (value: string, label: string): ReferenceOption => ({ value, label });

export const REFERENCE_CONFIGS: Readonly<Record<ReferenceResource, ReferenceConfig>> = {
  allergens: {
    label: "Алергени",
    itemLabel: "алерген",
    description: "Контрольовані алергени для складу продуктів і профілів безпеки.",
    fields: [code, nameUa, nameEn, active],
  },
  authors: {
    label: "Автори рецептів",
    itemLabel: "автора",
    description: "Автори рецептів та їхня професійна спеціалізація.",
    fields: [
      {
        name: "type",
        label: "Тип автора",
        kind: "select",
        required: true,
        options: [
          option("MEALMIND", "MealMind"),
          option("EXPERT", "Експерт"),
          option("BLOGGER", "Блогер"),
          option("USER", "Користувач"),
        ],
      },
      {
        name: "expertiseArea",
        label: "Сфера експертизи",
        kind: "select",
        nullable: true,
        options: [
          option("", "Не вказано"),
          option("CHEF", "Шеф-кухар"),
          option("PHYSICIAN", "Лікар"),
          option("DIETITIAN", "Дієтолог"),
          option("NUTRITIONIST", "Нутриціолог"),
          option("OTHER", "Інше"),
        ],
      },
      { name: "slug", label: "Slug", kind: "text", required: true },
      { name: "displayName", label: "Ім’я для відображення", kind: "text", required: true },
      { name: "bio", label: "Біографія", kind: "textarea", nullable: true, maxLength: 5000 },
      active,
    ],
  },
  brands: {
    label: "Бренди",
    itemLabel: "бренд",
    description: "Виробники branded-продуктів і статус їх перевірки.",
    fields: [
      { name: "name", label: "Основна назва", kind: "text", required: true },
      { name: "nameUa", label: "Назва українською", kind: "text", nullable: true },
      { name: "nameEn", label: "Назва англійською", kind: "text", nullable: true },
      { name: "countryCode", label: "Код країни ISO 3166-1 alpha-2", kind: "text", nullable: true },
      { name: "websiteUrl", label: "Вебсайт", kind: "url", nullable: true },
      {
        name: "status",
        label: "Статус",
        kind: "select",
        required: true,
        options: [
          option("DRAFT", "Чернетка"),
          option("ACTIVE", "Активний"),
          option("ARCHIVED", "Архівний"),
        ],
      },
      {
        name: "verificationStatus",
        label: "Перевірка",
        kind: "select",
        required: true,
        options: [
          option("UNVERIFIED", "Не перевірено"),
          option("VERIFIED", "Перевірено"),
          option("REJECTED", "Відхилено"),
        ],
      },
    ],
  },
  cuisines: {
    label: "Кухні",
    itemLabel: "кухню",
    description: "Кухні для класифікації рецептів і користувацьких вподобань.",
    fields: [
      code,
      nameUa,
      nameEn,
      {
        name: "scope",
        label: "Рівень",
        kind: "select",
        required: true,
        options: [
          option("NATIONAL", "Національна"),
          option("REGIONAL", "Регіональна"),
          option("TRANSNATIONAL", "Транснаціональна"),
          option("FUSION", "Ф’южн"),
        ],
      },
      {
        name: "isPreferenceSelectable",
        label: "Доступна у вподобаннях",
        kind: "checkbox",
      },
      active,
      sortOrder,
    ],
  },
  "dietary-tags": {
    label: "Дієтичні теги",
    itemLabel: "дієтичний тег",
    description: "Теги дієтичних патернів, обмежень та нутрієнтних профілів.",
    fields: [
      code,
      nameUa,
      nameEn,
      {
        name: "kind",
        label: "Тип",
        kind: "select",
        required: true,
        options: [
          option("DIET_PATTERN", "Дієтичний патерн"),
          option("FREE_FROM", "Без компонента"),
          option("NUTRITION_PROFILE", "Нутрієнтний профіль"),
        ],
      },
      {
        name: "isRestrictionSelectable",
        label: "Доступний як обмеження",
        kind: "checkbox",
      },
      active,
      sortOrder,
    ],
  },
  "meal-types": {
    label: "Типи прийомів їжі",
    itemLabel: "тип прийому їжі",
    description: "Типи прийомів їжі для планування меню.",
    fields: [
      code,
      nameUa,
      nameEn,
      {
        name: "kind",
        label: "Категорія",
        kind: "select",
        required: true,
        options: [
          option("MAIN_MEAL", "Основний прийом"),
          option("SNACK", "Перекус"),
          option("FLEXIBLE", "Гнучкий"),
        ],
      },
      active,
      sortOrder,
    ],
  },
  "measurement-units": {
    label: "Одиниці вимірювання",
    itemLabel: "одиницю вимірювання",
    description: "Одиниці та коефіцієнти нормалізації кількості.",
    fields: [
      code,
      { name: "symbol", label: "Символ", kind: "text", required: true },
      nameUa,
      nameEn,
      {
        name: "dimension",
        label: "Вимір",
        kind: "select",
        required: true,
        options: [option("MASS", "Маса"), option("VOLUME", "Об’єм"), option("COUNT", "Кількість")],
      },
      {
        name: "factorToBaseUnit",
        label: "Коефіцієнт до базової одиниці",
        kind: "decimal",
        required: true,
      },
      { name: "isBaseUnit", label: "Базова одиниця", kind: "checkbox" },
      active,
      sortOrder,
    ],
  },
  nutrients: {
    label: "Нутрієнти",
    itemLabel: "нутрієнт",
    description: "Нутрієнти та одиниці, які використовуються в розрахунках поживності.",
    fields: [
      code,
      nameUa,
      nameEn,
      {
        name: "group",
        label: "Група",
        kind: "select",
        required: true,
        options: [
          option("ENERGY", "Енергія"),
          option("MACRONUTRIENT", "Макронутрієнт"),
          option("FATTY_ACID", "Жирна кислота"),
          option("VITAMIN", "Вітамін"),
          option("MINERAL", "Мінерал"),
          option("OTHER", "Інше"),
        ],
      },
      {
        name: "unit",
        label: "Одиниця",
        kind: "select",
        required: true,
        options: [
          option("KCAL", "ккал"),
          option("G", "г"),
          option("MG", "мг"),
          option("MCG", "мкг"),
        ],
      },
      {
        name: "displayLevel",
        label: "Рівень показу",
        kind: "select",
        required: true,
        options: [option("BASIC", "Основний"), option("EXTENDED", "Розширений")],
      },
      { name: "isTargetable", label: "Доступний для цілей", kind: "checkbox" },
      sortOrder,
      { name: "usdaNutrientId", label: "USDA nutrient ID", kind: "number", nullable: true },
      {
        name: "usdaNutrientNumber",
        label: "USDA nutrient number",
        kind: "text",
        nullable: true,
      },
      active,
    ],
  },
  "product-categories": {
    label: "Категорії продуктів",
    itemLabel: "категорію",
    description: "Ієрархічний каталог категорій продуктів.",
    fields: [
      code,
      nameUa,
      nameEn,
      {
        name: "kind",
        label: "Тип",
        kind: "select",
        required: true,
        options: [
          option("GROUP", "Група"),
          option("INGREDIENT", "Інгредієнт"),
          option("PREPARED_FOOD", "Готова страва"),
          option("SOURCE_COLLECTION", "Колекція джерела"),
        ],
      },
      {
        name: "parentCategoryId",
        label: "Батьківська категорія",
        kind: "select",
        nullable: true,
      },
      { name: "isAssignable", label: "Можна призначати продуктам", kind: "checkbox" },
      active,
      sortOrder,
    ],
  },
  "recipe-types": {
    label: "Типи рецептів",
    itemLabel: "тип рецепта",
    description: "Контрольовані типи для класифікації рецептів.",
    fields: [code, nameUa, nameEn, active, sortOrder],
  },
};

export const REFERENCE_NAVIGATION = Object.entries(REFERENCE_CONFIGS).map(([resource, config]) => ({
  resource: resource as ReferenceResource,
  label: config.label,
}));
