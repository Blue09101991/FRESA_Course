-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" INTEGER NOT NULL,
    "explanation" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "quizType" TEXT NOT NULL DEFAULT 'chapter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizQuestion_chapterId_idx" ON "QuizQuestion"("chapterId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizType_idx" ON "QuizQuestion"("quizType");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
