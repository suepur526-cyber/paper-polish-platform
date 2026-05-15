-- CreateTable
CREATE TABLE "PickupCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PaperTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pickupCodeId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "workingDocxPath" TEXT,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "reportPath" TEXT,
    "comparisonPath" TEXT,
    "exportDocxPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaperTask_pickupCodeId_fkey" FOREIGN KEY ("pickupCodeId") REFERENCES "PickupCode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParagraphRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "outlinePath" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "rewrittenText" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "skipReason" TEXT,
    "riskLevel" TEXT NOT NULL,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "numberingPrefix" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "validationJson" TEXT,
    CONSTRAINT "ParagraphRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PaperTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PickupCode_code_key" ON "PickupCode"("code");
