# Адміністративне керування рецептами

Розділ `/recipes` містить пошук і фільтри, create/edit form, inline створення автора, nutrition preview та lifecycle actions. Dynamic ingredients і steps реалізовані як впорядковані fieldsets із доступними labels, field-level errors і live announcements.

Форма вводить ingredient mass у грамах. API додатково підтримує MASS units і product portions, але складні conversion controls не дублюються у поточному UI. Порожня дочірня колекція означає явну заміну; усі секції надсилаються разом для атомарного збереження.
