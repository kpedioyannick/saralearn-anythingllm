-- CreateTable
CREATE TABLE "thread_objectives" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "threadId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "thread_objectives_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "workspace_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "thread_objectives_threadId_slug_key" ON "thread_objectives"("threadId", "slug");

-- CreateIndex
CREATE INDEX "thread_objectives_threadId_idx" ON "thread_objectives"("threadId");

-- AlterTable
ALTER TABLE "user_exercises" ADD COLUMN "threadObjectiveId" INTEGER;

-- CreateIndex
CREATE INDEX "user_exercises_threadObjectiveId_idx" ON "user_exercises"("threadObjectiveId");
