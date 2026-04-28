-- AlterTable
ALTER TABLE "user_exercises" ADD COLUMN "userId" INTEGER;

-- CreateIndex
CREATE INDEX "user_exercises_userId_idx" ON "user_exercises"("userId");
