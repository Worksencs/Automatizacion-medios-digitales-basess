CREATE TYPE "VideoProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'READY', 'CANCELLED');
CREATE TYPE "VideoStage" AS ENUM ('BRIEF', 'FACT_CHECK', 'SCRIPT', 'VISUAL_PLAN', 'PRODUCTION', 'EDITING', 'EDITORIAL_REVIEW', 'DIRECTION_REVIEW', 'COMPLETE');
CREATE TYPE "VideoTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE');
CREATE TYPE "VideoEvidenceType" AS ENUM ('NOTE', 'LINK', 'CHECKLIST', 'FILE_REFERENCE', 'STATUS_CHANGE');

CREATE TABLE "VideoProject" (
  "id" UUID NOT NULL,
  "contentVariantId" UUID NOT NULL,
  "workflowRunId" UUID NOT NULL,
  "outletId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "status" "VideoProjectStatus" NOT NULL DEFAULT 'PLANNING',
  "currentStage" "VideoStage" NOT NULL DEFAULT 'BRIEF',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoParticipant" (
  "id" UUID NOT NULL,
  "videoProjectId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "responsibility" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoTask" (
  "id" UUID NOT NULL,
  "videoProjectId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "stage" "VideoStage" NOT NULL,
  "assignedRole" TEXT NOT NULL,
  "assigneeId" UUID,
  "status" "VideoTaskStatus" NOT NULL DEFAULT 'PENDING',
  "order" INTEGER NOT NULL,
  "deliverable" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoEvidence" (
  "id" UUID NOT NULL,
  "videoProjectId" UUID NOT NULL,
  "taskId" UUID,
  "authorId" UUID NOT NULL,
  "type" "VideoEvidenceType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "url" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoComment" (
  "id" UUID NOT NULL,
  "videoProjectId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoProject_contentVariantId_key" ON "VideoProject"("contentVariantId");
CREATE INDEX "VideoProject_status_updatedAt_idx" ON "VideoProject"("status", "updatedAt");
CREATE INDEX "VideoProject_workflowRunId_idx" ON "VideoProject"("workflowRunId");
CREATE INDEX "VideoProject_outletId_idx" ON "VideoProject"("outletId");
CREATE UNIQUE INDEX "VideoParticipant_videoProjectId_userId_key" ON "VideoParticipant"("videoProjectId", "userId");
CREATE INDEX "VideoParticipant_userId_idx" ON "VideoParticipant"("userId");
CREATE UNIQUE INDEX "VideoTask_videoProjectId_order_key" ON "VideoTask"("videoProjectId", "order");
CREATE INDEX "VideoTask_assigneeId_status_idx" ON "VideoTask"("assigneeId", "status");
CREATE INDEX "VideoEvidence_videoProjectId_createdAt_idx" ON "VideoEvidence"("videoProjectId", "createdAt");
CREATE INDEX "VideoEvidence_taskId_idx" ON "VideoEvidence"("taskId");
CREATE INDEX "VideoEvidence_authorId_idx" ON "VideoEvidence"("authorId");
CREATE INDEX "VideoComment_videoProjectId_createdAt_idx" ON "VideoComment"("videoProjectId", "createdAt");
CREATE INDEX "VideoComment_authorId_idx" ON "VideoComment"("authorId");

ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_contentVariantId_fkey" FOREIGN KEY ("contentVariantId") REFERENCES "ContentVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoParticipant" ADD CONSTRAINT "VideoParticipant_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoParticipant" ADD CONSTRAINT "VideoParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoTask" ADD CONSTRAINT "VideoTask_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoTask" ADD CONSTRAINT "VideoTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoEvidence" ADD CONSTRAINT "VideoEvidence_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoEvidence" ADD CONSTRAINT "VideoEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "VideoTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoEvidence" ADD CONSTRAINT "VideoEvidence_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
