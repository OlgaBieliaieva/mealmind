import type { Prisma } from "../../../../src/generated/prisma/client.js";

type AllergenSeedData = Omit<Prisma.AllergenCreateManyInput, "id"> & {
  readonly id: string;
};

export const ALLERGENS = [
  {
    id: "ace25281-f3a2-473e-ac9a-00018979c2dc",
    code: "cereals_containing_gluten",
    nameUa: "Злаки, що містять глютен",
    nameEn: "Cereals containing gluten",
    isActive: true,
  },
  {
    id: "0eac422f-2faa-4b9e-b698-aa1a44f3c183",
    code: "crustaceans",
    nameUa: "Ракоподібні",
    nameEn: "Crustaceans",
    isActive: true,
  },
  {
    id: "f4669a99-9dbd-4d76-bb50-172a77c888c6",
    code: "eggs",
    nameUa: "Яйця",
    nameEn: "Eggs",
    isActive: true,
  },
  {
    id: "0588591d-233e-4aae-81dc-b718e242ce7a",
    code: "fish",
    nameUa: "Риба",
    nameEn: "Fish",
    isActive: true,
  },
  {
    id: "699ce744-3d68-452b-a38e-ab9e338708f2",
    code: "peanuts",
    nameUa: "Арахіс",
    nameEn: "Peanuts",
    isActive: true,
  },
  {
    id: "1b547727-f6ca-4a91-8b08-36614b3ae5b4",
    code: "soybeans",
    nameUa: "Соя",
    nameEn: "Soybeans",
    isActive: true,
  },
  {
    id: "70cd503d-b540-43c3-9a06-ae02414840e0",
    code: "milk",
    nameUa: "Молоко",
    nameEn: "Milk",
    isActive: true,
  },
  {
    id: "d2a29177-307b-460a-8b39-966c72fb4e99",
    code: "tree_nuts",
    nameUa: "Горіхи",
    nameEn: "Tree nuts",
    isActive: true,
  },
  {
    id: "709ea798-aadc-44a9-ba0a-e7e6318dd7cf",
    code: "celery",
    nameUa: "Селера",
    nameEn: "Celery",
    isActive: true,
  },
  {
    id: "8938ba0c-07dd-4c0f-b7d0-b92b7d486dc4",
    code: "mustard",
    nameUa: "Гірчиця",
    nameEn: "Mustard",
    isActive: true,
  },
  {
    id: "699e71b9-14dc-4acf-8d64-b3926e85149f",
    code: "sesame",
    nameUa: "Кунжут",
    nameEn: "Sesame",
    isActive: true,
  },
  {
    id: "629e2ac0-5956-4070-82fa-5417e9e14ae6",
    code: "sulfites",
    nameUa: "Двоокис сірки та сульфіти",
    nameEn: "Sulphur dioxide and sulphites",
    isActive: true,
  },
  {
    id: "70743ffc-29af-4313-a9fc-b91ca0f9bc79",
    code: "lupin",
    nameUa: "Люпин",
    nameEn: "Lupin",
    isActive: true,
  },
  {
    id: "805e5bab-24e5-4ad7-81b2-018a25846aaf",
    code: "molluscs",
    nameUa: "Молюски",
    nameEn: "Molluscs",
    isActive: true,
  },
] as const satisfies readonly AllergenSeedData[];
