CREATE TYPE "family_member_account_invitation_status" AS ENUM (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

CREATE TABLE "family_member_account_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "family_id" UUID NOT NULL,
  "person_profile_id" UUID NOT NULL,
  "invited_by_user_id" UUID NOT NULL,
  "recipient_email" VARCHAR(320) NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "status" "family_member_account_invitation_status" NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "sent_at" TIMESTAMPTZ(3),
  "accepted_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "family_member_account_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "family_member_account_invitations_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "family_member_account_invitations_person_profile_id_fkey"
    FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "family_member_account_invitations_invited_by_user_id_fkey"
    FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "family_member_account_invitations_token_hash_key"
  ON "family_member_account_invitations"("token_hash");

CREATE UNIQUE INDEX "family_member_account_invitations_one_pending_profile_key"
  ON "family_member_account_invitations"("person_profile_id")
  WHERE "status" = 'pending';

CREATE INDEX "family_member_account_invitations_family_id_status_expires_at_idx"
  ON "family_member_account_invitations"("family_id", "status", "expires_at");

CREATE INDEX "family_member_account_invitations_person_profile_id_status_idx"
  ON "family_member_account_invitations"("person_profile_id", "status");

CREATE INDEX "family_member_account_invitations_recipient_email_status_idx"
  ON "family_member_account_invitations"("recipient_email", "status");

CREATE INDEX "family_member_account_invitations_invited_by_user_id_idx"
  ON "family_member_account_invitations"("invited_by_user_id");
