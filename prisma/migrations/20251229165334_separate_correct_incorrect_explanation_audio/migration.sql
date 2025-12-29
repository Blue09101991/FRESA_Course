-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "correctExplanationAudioUrl" TEXT,
ADD COLUMN     "correctExplanationTimestampsUrl" TEXT,
ADD COLUMN     "incorrectExplanationAudioUrls" JSONB,
ADD COLUMN     "incorrectExplanationTimestampsUrls" JSONB;
