-- AlterTable
ALTER TABLE "family_member_account_invitations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nutrient_target_sets" ADD COLUMN     "maintenance_energy_kcal" DECIMAL(14,4),
ADD COLUMN     "resting_energy_kcal" DECIMAL(14,4);

-- RenameIndex
ALTER INDEX "family_member_account_invitations_family_id_status_expires_at_i" RENAME TO "family_member_account_invitations_family_id_status_expires__idx";
