-- DropForeignKey
ALTER TABLE "LearningObjective" DROP CONSTRAINT IF EXISTS "LearningObjective_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "KeyTerm" DROP CONSTRAINT IF EXISTS "KeyTerm_chapterId_fkey";

-- DropTable
DROP TABLE IF EXISTS "LearningObjective";

-- DropTable
DROP TABLE IF EXISTS "KeyTerm";

