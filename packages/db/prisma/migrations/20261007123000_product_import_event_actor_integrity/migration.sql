ALTER TABLE "product_import_candidate_events"
  DROP CONSTRAINT "product_import_candidate_events_actor_user_id_fkey";

ALTER TABLE "product_import_candidate_events"
  ADD CONSTRAINT "product_import_candidate_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
