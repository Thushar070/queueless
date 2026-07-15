-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "QueueEntry_joinedAt_idx" ON "QueueEntry"("joinedAt");

-- CreateIndex
CREATE INDEX "QueueEntry_completedAt_idx" ON "QueueEntry"("completedAt");
