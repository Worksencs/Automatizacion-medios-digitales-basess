-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DETECTED', 'SCORING', 'SCORED', 'INVESTIGATING', 'EVIDENCE_INCOMPLETE', 'EVIDENCE_READY', 'GENERATING_VARIANTS', 'DRAFTS_READY', 'SYNCING_NOTION', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'NEEDS_REVISION', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('CONFIRMED', 'PARTIALLY_CONFIRMED', 'INCOMPLETE', 'DOUBTFUL', 'NOT_PUBLISHABLE');

-- CreateEnum
CREATE TYPE "VariantStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'EDIT', 'COMMENT', 'ASSIGN');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL', 'MEDIA', 'COMMUNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('ACCESSIBLE', 'BLOCKED', 'TIMEOUT', 'NOT_FOUND', 'ERROR');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotionSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'EXCEPTION');

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "roleId" UUID NOT NULL,
    "outletId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialProfile" (
    "id" UUID NOT NULL,
    "outletId" UUID NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialProfileVersion" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "focus" JSONB NOT NULL,
    "tone" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssFeed" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "trustLevel" INTEGER NOT NULL DEFAULT 60,
    "sourceType" "SourceType" NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RssFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedItem" (
    "id" UUID NOT NULL,
    "feedId" UUID NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "description" TEXT,
    "contentHash" TEXT NOT NULL,
    "trendId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "description" TEXT,
    "originUrl" TEXT,
    "sourceName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "observedReach" INTEGER,
    "suggestedOutletId" UUID,
    "userComment" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DETECTED',
    "dedupeKey" TEXT NOT NULL,
    "isFictional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendSource" (
    "id" UUID NOT NULL,
    "trendId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "consultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" "SourceType" NOT NULL,
    "excerpt" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "accessStatus" "AccessStatus" NOT NULL DEFAULT 'ACCESSIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendScore" (
    "id" UUID NOT NULL,
    "trendId" UUID NOT NULL,
    "total" INTEGER NOT NULL,
    "velocity" INTEGER NOT NULL,
    "recurrence" INTEGER NOT NULL,
    "sourceQuality" INTEGER NOT NULL,
    "guatemalaRelevance" INTEGER NOT NULL,
    "evidence" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigation" (
    "id" UUID NOT NULL,
    "trendId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "mainQuestion" TEXT NOT NULL,
    "unconfirmedClaims" JSONB NOT NULL,
    "relevantDates" JSONB NOT NULL,
    "people" JSONB NOT NULL,
    "organizations" JSONB NOT NULL,
    "places" JSONB NOT NULL,
    "figures" JSONB NOT NULL,
    "editorialRisks" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "opinion" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "claim" TEXT NOT NULL,
    "quote" TEXT,
    "confidence" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contradiction" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "sourceIds" JSONB NOT NULL,
    "severity" "RiskLevel" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contradiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVariant" (
    "id" UUID NOT NULL,
    "trendId" UUID NOT NULL,
    "workflowRunId" UUID NOT NULL,
    "outletId" UUID NOT NULL,
    "headline" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "socialCaption" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recommendedFormat" TEXT NOT NULL,
    "callToAction" TEXT NOT NULL,
    "sourceIds" JSONB NOT NULL,
    "factIds" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "warnings" JSONB NOT NULL,
    "reviewClaims" JSONB NOT NULL,
    "status" "VariantStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" UUID NOT NULL,
    "trendId" UUID NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DETECTED',
    "idempotencyKey" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" UUID NOT NULL,
    "workflowRunId" UUID NOT NULL,
    "fromStatus" "WorkflowStatus",
    "toStatus" "WorkflowStatus" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "userId" UUID,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" UUID NOT NULL,
    "workflowRunId" UUID NOT NULL,
    "contentVariantId" UUID,
    "userId" UUID NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "comment" TEXT,
    "contentBefore" JSONB,
    "contentAfter" JSONB,
    "riskAtDecision" "RiskLevel" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotionSync" (
    "id" UUID NOT NULL,
    "workflowRunId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "externalPageId" TEXT,
    "externalUrl" TEXT,
    "status" "NotionSyncStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotionSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" UUID NOT NULL,
    "integration" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "request" JSONB,
    "response" JSONB,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTrace" (
    "id" UUID NOT NULL,
    "workflowRunId" UUID NOT NULL,
    "agent" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "tools" JSONB NOT NULL,
    "parameters" JSONB,
    "result" JSONB,
    "durationMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(12,6),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "finalStatus" TEXT NOT NULL,
    "sourceIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_outletId_idx" ON "User"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_slug_key" ON "Outlet"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_name_key" ON "Outlet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialProfile_outletId_key" ON "EditorialProfile"("outletId");

-- CreateIndex
CREATE INDEX "EditorialProfileVersion_profileId_idx" ON "EditorialProfileVersion"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialProfileVersion_profileId_version_key" ON "EditorialProfileVersion"("profileId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RssFeed_url_key" ON "RssFeed"("url");

-- CreateIndex
CREATE INDEX "RssFeed_active_idx" ON "RssFeed"("active");

-- CreateIndex
CREATE INDEX "FeedItem_normalizedTitle_idx" ON "FeedItem"("normalizedTitle");

-- CreateIndex
CREATE INDEX "FeedItem_trendId_idx" ON "FeedItem"("trendId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedItem_feedId_guid_key" ON "FeedItem"("feedId", "guid");

-- CreateIndex
CREATE UNIQUE INDEX "FeedItem_contentHash_key" ON "FeedItem"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "Trend_dedupeKey_key" ON "Trend"("dedupeKey");

-- CreateIndex
CREATE INDEX "Trend_status_createdAt_idx" ON "Trend"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Trend_normalizedTitle_idx" ON "Trend"("normalizedTitle");

-- CreateIndex
CREATE INDEX "TrendSource_trendId_isPrimary_idx" ON "TrendSource"("trendId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "TrendSource_trendId_url_key" ON "TrendSource"("trendId", "url");

-- CreateIndex
CREATE INDEX "TrendScore_trendId_calculatedAt_idx" ON "TrendScore"("trendId", "calculatedAt");

-- CreateIndex
CREATE INDEX "Investigation_trendId_verdict_idx" ON "Investigation"("trendId", "verdict");

-- CreateIndex
CREATE UNIQUE INDEX "Investigation_trendId_version_key" ON "Investigation"("trendId", "version");

-- CreateIndex
CREATE INDEX "EvidenceItem_investigationId_idx" ON "EvidenceItem"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceItem_investigationId_sourceId_claim_key" ON "EvidenceItem"("investigationId", "sourceId", "claim");

-- CreateIndex
CREATE INDEX "Contradiction_investigationId_resolved_idx" ON "Contradiction"("investigationId", "resolved");

-- CreateIndex
CREATE INDEX "ContentVariant_trendId_status_idx" ON "ContentVariant"("trendId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVariant_workflowRunId_outletId_version_key" ON "ContentVariant"("workflowRunId", "outletId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRun_idempotencyKey_key" ON "WorkflowRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_nextAttemptAt_idx" ON "WorkflowRun"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_trendId_idx" ON "WorkflowRun"("trendId");

-- CreateIndex
CREATE INDEX "WorkflowEvent_workflowRunId_createdAt_idx" ON "WorkflowEvent"("workflowRunId", "createdAt");

-- CreateIndex
CREATE INDEX "Approval_workflowRunId_createdAt_idx" ON "Approval"("workflowRunId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotionSync_workflowRunId_key" ON "NotionSync"("workflowRunId");

-- CreateIndex
CREATE UNIQUE INDEX "NotionSync_idempotencyKey_key" ON "NotionSync"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_idempotencyKey_key" ON "IntegrationEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "IntegrationEvent_integration_createdAt_idx" ON "IntegrationEvent"("integration", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTrace_workflowRunId_createdAt_idx" ON "AgentTrace"("workflowRunId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Job_status_availableAt_idx" ON "Job"("status", "availableAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialProfile" ADD CONSTRAINT "EditorialProfile_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialProfileVersion" ADD CONSTRAINT "EditorialProfileVersion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EditorialProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "RssFeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trend" ADD CONSTRAINT "Trend_suggestedOutletId_fkey" FOREIGN KEY ("suggestedOutletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendSource" ADD CONSTRAINT "TrendSource_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendScore" ADD CONSTRAINT "TrendScore_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrendSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contradiction" ADD CONSTRAINT "Contradiction_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_contentVariantId_fkey" FOREIGN KEY ("contentVariantId") REFERENCES "ContentVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotionSync" ADD CONSTRAINT "NotionSync_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTrace" ADD CONSTRAINT "AgentTrace_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
