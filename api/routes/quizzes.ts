import { Router, Request, Response } from 'express';

export interface QuizQuestion {
  id: string;
  question: string;
  options: any[];
  correctAnswer?: number;
  explanation?: string;
  points?: number;
  generalExplanation?: string;
}

export interface QuizData {
  title: string;
  passingScore?: number;
  questions: QuizQuestion[];
}

const courses: any[] = [];

const router = Router();

// GET quiz for a specific course lesson
router.get('/lesson/:courseId/:lessonId', (req: Request, res: Response) => {
  const { courseId, lessonId } = req.params;
  const course = courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  let foundLesson;
  for (const m of course.modules) {
    const l = m.lessons.find(item => item.id === lessonId);
    if (l) {
      foundLesson = l;
      break;
    }
  }

  if (!foundLesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const quiz = foundLesson.quizData || foundLesson.quiz;
  if (!quiz) {
    return res.status(404).json({ error: 'No quiz attached to this lesson' });
  }

  res.json(quiz);
});

// POST save/update quiz for a lesson
router.post('/lesson/:courseId/:lessonId', (req: Request, res: Response) => {
  const { courseId, lessonId } = req.params;
  const quizData: QuizData = req.body;

  const course = courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  let updated = false;
  for (const m of course.modules) {
    for (const l of m.lessons) {
      if (l.id === lessonId) {
        l.type = 'quiz';
        l.quizData = quizData;
        updated = true;
        break;
      }
    }
  }

  if (!updated) {
    return res.status(404).json({ error: 'Lesson not found to attach quiz' });
  }

  res.json({ success: true, message: 'Quiz saved to lesson successfully', quizData });
});

// POST evaluate quiz submission
router.post('/submit', (req: Request, res: Response) => {
  const { quizId, answers, questions }: { quizId: string; answers: Record<string, string>; questions: QuizQuestion[] } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Questions payload required for grading' });
  }

  let earnedPoints = 0;
  let totalPoints = 0;
  const breakdown: any[] = [];

  questions.forEach(q => {
    const points = q.points || 10;
    totalPoints += points;
    const selectedOptionId = answers[q.id];
    const correctOption = q.options.find(o => o.isCorrect);

    const isCorrect = correctOption ? correctOption.id === selectedOptionId : false;
    if (isCorrect) {
      earnedPoints += points;
    }

    breakdown.push({
      questionId: q.id,
      question: q.question,
      selectedOptionId,
      correctOptionId: correctOption?.id,
      isCorrect,
      explanation: q.generalExplanation || correctOption?.explanation
    });
  });

  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = percentage >= 80;

  res.json({
    quizId,
    earnedPoints,
    totalPoints,
    percentage,
    passed,
    breakdown,
    submittedAt: new Date().toISOString()
  });
});

export default router;
