# Автентифікація web-admin

Адміністративний застосунок має власну Supabase cookie session і не підтримує
self-service registration.

Після email/password sign-in застосунок:

1. викликає idempotent account bootstrap;
2. читає `GET /api/v1/session`;
3. допускає до admin shell лише `applicationRole: ADMIN`;
4. показує окремий access-denied state для authenticated `USER`.

Proxy перевіряє Supabase identity та актуальну application role перед
відображенням захищених маршрутів. Password recovery працює у власному admin
origin, а паролі й recovery codes не передаються до MealMind API або logs.
