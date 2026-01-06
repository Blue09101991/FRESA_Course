-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "optionAudioUrls" JSONB,
ADD COLUMN     "optionTimestampsUrls" JSONB,
ADD COLUMN     "questionAudioUrl" TEXT,
ADD COLUMN     "questionTimestampsUrl" TEXT;
