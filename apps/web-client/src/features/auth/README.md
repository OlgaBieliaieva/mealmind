# Автентифікація web-client

Клієнтський застосунок підтримує email/password registration, confirmation,
sign-in, sign-out і password recovery через Supabase Auth.

- Browser client виконує інтерактивні auth operations.
- Server client і `proxy.ts` зберігають та оновлюють PKCE session у cookies.
- Callback обмінює одноразовий code на session і викликає MealMind account
  bootstrap.
- Пароль ніколи не передається до MealMind API.
- `returnTo` приймає лише внутрішній шлях поточного застосунку.
- Email очікування confirmation зберігається у `sessionStorage`, а не в URL.

Google OAuth у цьому модулі не активовано, але provider-neutral callback
сумісний із майбутнім `signInWithOAuth()`.
