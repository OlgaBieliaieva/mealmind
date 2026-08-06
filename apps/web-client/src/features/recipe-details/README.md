# Деталі рецепта

Маршрут `/recipes/:id` відтворює опрацьовану в прототипі композицію recipe details: hero, overview, ingredients, steps і nutrients. Дані отримуються лише з окремого `GET /api/v1/recipes/:id`, який не залежить від admin form DTO та повертає тільки опубліковані публічні рецепти.

Tabs мають семантику `tablist/tab/tabpanel`; зовнішні source/video links відкриваються з `rel="noreferrer"`. Nutrition section явно показує partial completeness.
