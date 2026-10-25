-- Keep tenant-scoped authenticated access while removing public access to PII.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SuperAdmin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QueueEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhoneVerification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_tenant_policy ON "Staff";
CREATE POLICY staff_tenant_policy ON "Staff"
  FOR ALL TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = (SELECT auth.jwt()) -> 'app_metadata' ->> 'businessId')
  );

DROP POLICY IF EXISTS business_tenant_policy ON "Business";
CREATE POLICY business_tenant_policy ON "Business"
  FOR ALL TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("id" = (SELECT auth.jwt()) -> 'app_metadata' ->> 'businessId')
  );

DROP POLICY IF EXISTS queue_tenant_policy ON "Queue";
DROP POLICY IF EXISTS queue_public_read_policy ON "Queue";
CREATE POLICY queue_tenant_policy ON "Queue"
  FOR ALL TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = (SELECT auth.jwt()) -> 'app_metadata' ->> 'businessId')
  );

DROP POLICY IF EXISTS queue_entry_tenant_policy ON "QueueEntry";
DROP POLICY IF EXISTS queue_entry_public_policy ON "QueueEntry";
CREATE POLICY queue_entry_tenant_policy ON "QueueEntry"
  FOR ALL TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = (SELECT auth.jwt()) -> 'app_metadata' ->> 'businessId')
  );

DROP POLICY IF EXISTS notification_tenant_policy ON "Notification";
CREATE POLICY notification_tenant_policy ON "Notification"
  FOR ALL TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    EXISTS (
      SELECT 1 FROM "QueueEntry" qe
      WHERE qe."id" = "Notification"."queueEntryId"
        AND qe."businessId" = (SELECT auth.jwt()) -> 'app_metadata' ->> 'businessId'
    )
  );

DROP POLICY IF EXISTS audit_log_tenant_policy ON "AuditLog";
CREATE POLICY audit_log_tenant_policy ON "AuditLog"
  FOR ALL TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = (SELECT auth.jwt()) -> 'app_metadata' ->> 'businessId')
  );

DROP POLICY IF EXISTS section_tenant_policy ON "Section";
DROP POLICY IF EXISTS section_public_read_policy ON "Section";
CREATE POLICY section_tenant_policy ON "Section"
  FOR ALL TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = (SELECT auth.jwt()) -> 'app_metadata' ->> 'businessId')
  );
