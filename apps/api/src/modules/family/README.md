# Модуль користувацького профілю та сім’ї

Модуль реалізує onboarding, єдиний активний сімейний контекст MVP, власний профіль користувача та dependent-профілі без окремої identity.

## Потік onboarding

Після Supabase authentication викликається idempotent account bootstrap. GET /api/v1/session повертає локального користувача, ознаку onboardingCompleted, власний профіль і сімейний контекст. Якщо onboarding ще не завершено, web-client дозволяє доступ лише до /onboarding.

POST /api/v1/onboarding/complete атомарно:

- створює або доповнює PersonProfile поточного authenticated User;
- створює Family «Моя сім’я» з Europe/Kyiv і початком тижня в понеділок;
- створює ACTIVE FamilyMembership із роллю OWNER;
- додає власний профіль як FamilyMember;
- зберігає передані необов’язкові антропометричні параметри, активність і ціль;
- встановлює User.onboardingCompletedAt лише після успішного завершення транзакції.

Відповіді окремих кроків не зберігаються на сервері. Перерваний onboarding починається спочатку, а повторний final submit повертає той самий context без duplicate Family або Profile.

## Контроль доступу

Identity завжди береться з перевіреного Supabase JWT. Поточна Family визначається сервером через ACTIVE membership: нуль memberships означає незавершений onboarding, дві або більше — INVALID_FAMILY_CONTEXT. Caller-supplied userId, familyId і відповідні headers не використовуються як доказ доступу.

OWNER може змінювати сім’ю та керувати лише dependent-профілями, у яких PersonProfile.userId відсутній. Власний зареєстрований профіль редагується через /profile/me. Family ownership не надає доступу до приватних health-related даних іншого зареєстрованого користувача.

## Життєвий цикл і приватність

Видалення dependent-учасника є архівацією FamilyMember та PersonProfile. Історичні meal, cooking і consumption records не видаляються та зберігають referential integrity. Self-service export/deletion account і de-identification після законного запиту будуть окремим vertical slice.

Body measurements, activity і weight goals не повертаються у family list та не записуються до логів або error payloads. Вони не трактуються як медичний діагноз.
