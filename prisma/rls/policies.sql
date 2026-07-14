-- Row-Level Security (RLS) Policies for QueueLess

-- =====================================================================
-- 1. STAFF TABLE POLICIES
-- =====================================================================
ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_tenant_policy ON "Staff";
CREATE POLICY staff_tenant_policy ON "Staff"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = auth.jwt() -> 'user_metadata' ->> 'businessId')
  );

-- =====================================================================
-- 2. QUEUE TABLE POLICIES
-- =====================================================================
ALTER TABLE "Queue" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS queue_tenant_policy ON "Queue";
CREATE POLICY queue_tenant_policy ON "Queue"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = auth.jwt() -> 'user_metadata' ->> 'businessId')
  );

DROP POLICY IF EXISTS queue_public_read_policy ON "Queue";
CREATE POLICY queue_public_read_policy ON "Queue"
  FOR SELECT
  TO anon, authenticated
  USING ("deletedAt" IS NULL);

-- =====================================================================
-- 3. QUEUEENTRY TABLE POLICIES
-- =====================================================================
ALTER TABLE "QueueEntry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS queue_entry_tenant_policy ON "QueueEntry";
CREATE POLICY queue_entry_tenant_policy ON "QueueEntry"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = auth.jwt() -> 'user_metadata' ->> 'businessId')
  );

DROP POLICY IF EXISTS queue_entry_public_policy ON "QueueEntry";
CREATE POLICY queue_entry_public_policy ON "QueueEntry"
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 4. NOTIFICATION TABLE POLICIES
-- =====================================================================
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_tenant_policy ON "Notification";
CREATE POLICY notification_tenant_policy ON "Notification"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    EXISTS (
      SELECT 1 FROM "QueueEntry" qe
      WHERE qe.id = "queueEntryId"
      AND qe."businessId" = auth.jwt() -> 'user_metadata' ->> 'businessId'
    )
  );

-- =====================================================================
-- 5. AUDITLOG TABLE POLICIES
-- =====================================================================
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_tenant_policy ON "AuditLog";
CREATE POLICY audit_log_tenant_policy ON "AuditLog"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN') OR
    ("businessId" = auth.jwt() -> 'user_metadata' ->> 'businessId')
  );
