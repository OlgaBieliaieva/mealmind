"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  archiveFamilyMember,
  createFamilyMember,
  listFamilyMembers,
  readFamily,
  updateFamily,
  updateFamilyMember,
  type FamilyMember,
} from "@/shared/api/family";
import { Button, Card, Modal, PageState, TextInput, Typography, Tooltip } from "@/shared/ui";
import { Archive, Pencil } from "lucide-react";

const familyKey = ["family", "current"] as const;
const membersKey = ["family", "members"] as const;
export function FamilyManagement() {
  const client = useQueryClient();
  const family = useQuery({ queryKey: familyKey, queryFn: readFamily });
  const members = useQuery({ queryKey: membersKey, queryFn: listFamilyMembers });
  const [familyName, setFamilyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [archiving, setArchiving] = useState<FamilyMember | null>(null);
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: membersKey });
  };
  const rename = useMutation({
    mutationFn: updateFamily,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: familyKey });
      setFamilyName("");
      toast.success("Назву сім’ї оновлено");
    },
    onError: () => toast.error("Не вдалося оновити сім’ю"),
  });
  const create = useMutation({
    mutationFn: createFamilyMember,
    onSuccess: async () => {
      await refresh();
      setFirstName("");
      setLastName("");
      toast.success("Учасника додано");
    },
    onError: () => toast.error("Не вдалося додати учасника"),
  });
  const update = useMutation({
    mutationFn: ({ id, first, last }: { id: string; first: string; last: string }) =>
      updateFamilyMember(id, { firstName: first, lastName: last || null }),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      toast.success("Профіль оновлено");
    },
    onError: () => toast.error("Не вдалося оновити профіль"),
  });
  const archive = useMutation({
    mutationFn: archiveFamilyMember,
    onSuccess: async () => {
      await refresh();
      setArchiving(null);
      toast.success("Учасника архівовано");
    },
    onError: () => toast.error("Не вдалося архівувати учасника"),
  });
  if (family.isPending || members.isPending)
    return (
      <PageState
        kind="loading"
        title="Завантажуємо сім’ю"
        description="Отримуємо актуальні налаштування та список учасників."
      />
    );
  if (family.isError || members.isError || family.data === undefined || members.data === undefined)
    return (
      <PageState
        kind="error"
        title="Не вдалося завантажити сім’ю"
        description="Оновіть сторінку або повторіть спробу пізніше."
      />
    );
  const isOwner = family.data.role === "OWNER";
  return (
    <section className="family-page" aria-labelledby="family-title">
      <header className="family-page__header">
        <Typography variant="eyebrow">Сімейний профіль</Typography>

        <Typography as="h1" variant="page-title" id="family-title">
          {family.data.name}
        </Typography>

        <Typography variant="page-description">
          Керуйте налаштуваннями сім’ї та профілями людей, для яких ви плануєте харчування.
        </Typography>
      </header>
      {isOwner ? (
        <Card>
          <form
            className="family-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (familyName.trim()) rename.mutate({ name: familyName.trim() });
            }}
          >
            <TextInput
              label="Нова назва сім’ї"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              maxLength={120}
              required
            />
            <Button type="submit" isLoading={rename.isPending}>
              Зберегти назву
            </Button>
          </form>
        </Card>
      ) : null}
      <section className="family-section" aria-labelledby="members-title">
        <Typography as="h2" variant="section-title" id="members-title">
          Учасники сім’ї
        </Typography>

        <ul className="family-members">
          {members.data.map((member) => (
            <li key={member.id}>
              <Card>
                <div className="family-member">
                  <div className="family-member__info">
                    <Typography as="div" variant="item-title">
                      {member.firstName} {member.lastName}
                    </Typography>

                    <Typography variant="caption">
                      {member.isAccountOwner
                        ? "Ваш обліковий профіль"
                        : "Профіль без окремого входу"}
                    </Typography>
                  </div>

                  {isOwner && !member.isAccountOwner ? (
                    <div className="family-member__actions">
                      <Tooltip content="Редагувати">
                        <Button
                          variant="secondary"
                          aria-label="Редагувати"
                          onClick={() => setEditing(member)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                      </Tooltip>

                      <Tooltip content="Архівувати">
                        <Button
                          variant="danger"
                          aria-label="Архівувати"
                          onClick={() => setArchiving(member)}
                        >
                          <Archive aria-hidden="true" />
                        </Button>
                      </Tooltip>
                    </div>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
      {isOwner ? (
        <Card>
          <form
            className="family-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();

              if (firstName.trim()) {
                create.mutate({
                  firstName: firstName.trim(),
                  ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
                });
              }
            }}
          >
            <div className="family-form__header">
              <Typography as="h2" variant="section-title">
                Додати учасника
              </Typography>

              <Typography variant="supporting">
                Створіть профіль для дитини або іншої людини без власного облікового запису в
                MealMind.
              </Typography>
            </div>

            <TextInput
              label="Ім’я"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              maxLength={100}
            />

            <TextInput
              label="Прізвище"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={100}
            />

            <Button type="submit" isLoading={create.isPending}>
              Додати учасника
            </Button>
          </form>
        </Card>
      ) : null}
      <Modal
        open={editing !== null}
        title="Редагувати учасника"
        onClose={() => setEditing(null)}
        footer={
          editing ? (
            <Button
              isLoading={update.isPending}
              onClick={() =>
                update.mutate({
                  id: editing.id,
                  first: editing.firstName,
                  last: editing.lastName ?? "",
                })
              }
            >
              Зберегти
            </Button>
          ) : undefined
        }
      >
        {editing ? (
          <div className="family-form">
            <TextInput
              label="Ім’я"
              value={editing.firstName}
              onChange={(event) => setEditing({ ...editing, firstName: event.target.value })}
              required
            />
            <TextInput
              label="Прізвище"
              value={editing.lastName ?? ""}
              onChange={(event) => setEditing({ ...editing, lastName: event.target.value })}
            />
          </div>
        ) : null}
      </Modal>
      <Modal
        open={archiving !== null}
        title="Архівувати учасника?"
        description="Профіль зникне з активного списку, але історичні записи харчування буде збережено."
        onClose={() => setArchiving(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setArchiving(null)}>
              Скасувати
            </Button>
            <Button
              variant="danger"
              isLoading={archive.isPending}
              onClick={() => archiving && archive.mutate(archiving.id)}
            >
              Архівувати
            </Button>
          </>
        }
      >
        <p>Ця дія не видаляє історичні дані фізично.</p>
      </Modal>
    </section>
  );
}
