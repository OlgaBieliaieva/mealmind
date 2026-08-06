# Модуль application account

Модуль відокремлює Supabase identity від локального користувача MealMind.

`POST /api/v1/account/bootstrap` приймає тільки валідний bearer token. Окремий
identity-only middleware перевіряє token у Supabase, але не вимагає наявний
локальний `User`. Після цього application service:

1. вимагає підтверджений email;
2. знаходить або створює `User` за стабільним `externalSubject`;
3. покладається на database default `USER`;
4. не приймає role, email або subject із request body;
5. не відновлює soft-deleted account.

Повторний і паралельний bootstrap не створюють дублікати. Конфлікт, коли
verified email уже належить іншому subject, повертається як
`409 ACCOUNT_EMAIL_CONFLICT`.

Звичайний authentication pipeline не змінено: після bootstrap всі прикладні
маршрути й надалі вимагають активний локальний `User`.
