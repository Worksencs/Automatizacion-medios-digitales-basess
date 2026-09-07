CREATE TYPE "AgentRunStatus" AS ENUM ('IDLE', 'RUNNING', 'WAITING_ADMIN', 'COMPLETED', 'FAILED', 'PAUSED');

ALTER TABLE "VideoProject"
  ADD COLUMN "productType" TEXT,
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "audience" TEXT,
  ADD COLUMN "durationSeconds" INTEGER,
  ADD COLUMN "primaryPlatform" TEXT,
  ADD COLUMN "productionNotes" TEXT,
  ADD COLUMN "agentRunStatus" "AgentRunStatus" NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "adminApprovedById" UUID,
  ADD COLUMN "adminApprovedAt" TIMESTAMP(3);

ALTER TABLE "VideoTask"
  ADD COLUMN "agentKey" TEXT,
  ADD COLUMN "agentName" TEXT;

ALTER TABLE "VideoEvidence"
  ALTER COLUMN "authorId" DROP NOT NULL,
  ADD COLUMN "agentKey" TEXT,
  ADD COLUMN "agentName" TEXT;

CREATE TABLE "VideoAgentActivity" (
  "id" UUID NOT NULL,
  "videoProjectId" UUID NOT NULL,
  "taskId" UUID,
  "agentKey" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "agentRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "progress" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoAgentActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VideoProject_adminApprovedById_idx" ON "VideoProject"("adminApprovedById");
CREATE INDEX "VideoAgentActivity_videoProjectId_createdAt_idx" ON "VideoAgentActivity"("videoProjectId", "createdAt");
CREATE INDEX "VideoAgentActivity_taskId_idx" ON "VideoAgentActivity"("taskId");

ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_adminApprovedById_fkey" FOREIGN KEY ("adminApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoAgentActivity" ADD CONSTRAINT "VideoAgentActivity_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoAgentActivity" ADD CONSTRAINT "VideoAgentActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "VideoTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
