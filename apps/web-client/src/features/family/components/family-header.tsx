import { Typography } from "@/shared/ui";

interface FamilyHeaderProps {
  readonly name: string;
  readonly isOwner: boolean;
}

export function FamilyHeader({ name, isOwner }: FamilyHeaderProps) {
  return (
    <header className="family-page__header">
      <Typography variant="eyebrow">Сімейний профіль</Typography>

      <Typography as="h1" variant="page-title" id="family-title">
        {name}
      </Typography>

      <Typography variant="page-description">
        {isOwner
          ? "Керуйте налаштуваннями сім’ї та профілями людей, для яких ви плануєте харчування."
          : "Переглядайте учасників сім’ї та спільний сімейний контекст."}
      </Typography>
    </header>
  );
}
