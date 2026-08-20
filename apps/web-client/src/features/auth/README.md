# Автентифікація web-client

Клієнтський застосунок підтримує email/password registration, confirmation,
sign-in, sign-out і password recovery через Supabase Auth.

- Browser client виконує інтерактивні auth operations.
- Server client і `proxy.ts` зберігають та оновлюють PKCE session у cookies.
- Callback обмінює одноразовий code на session і негайно повертає redirect,
  щоб браузер зберіг cookies до наступних application-запитів. Ідемпотентний
  account bootstrap та onboarding policy після цього виконує `proxy.ts`.
- Повторний callback продовжує навігацію лише за наявності вже валідної сесії;
  без валідного code або session показується стабільний error state.
- Пароль ніколи не передається до MealMind API.
- `returnTo` приймає лише внутрішній шлях поточного застосунку.
- Email очікування confirmation зберігається у `sessionStorage`, а не в URL.

Google OAuth у цьому модулі не активовано, але provider-neutral callback
сумісний із майбутнім `signInWithOAuth()`.
