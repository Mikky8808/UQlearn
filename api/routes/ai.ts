import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Lazy initialize Gemini client safely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// POST synthesize full course syllabus
router.post('/generate-syllabus', async (req: Request, res: Response) => {
  const { topic, category, level } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Graceful fallback if no GEMINI_API_KEY is configured in dev environment
    return res.json({
      title: `${topic} Masterclass 2026`,
      subtitle: `Master ${topic} with hands-on architecture patterns, code laboratories, and production deployment.`,
      description: `A comprehensive curriculum designed to take learners from core primitives to advanced enterprise systems in ${topic}.`,
      learningOutcomes: [
        `Architect resilient systems with ${topic}`,
        `Apply design patterns and error handling strategies`,
        `Deploy and scale production microservices`
      ],
      modules: [
        {
          id: `mod-${Date.now()}-1`,
          title: `Module 1: Foundations of ${topic}`,
          description: 'Environment scaffolding and core concepts.',
          lessons: [
            { id: `les-1`, title: '1.1 Architectural Overview & Setup', duration: '12:00', type: 'video' },
            { id: `les-2`, title: '1.2 Fundamental Primitives & Cheatsheet', duration: '15:00', type: 'article' }
          ]
        },
        {
          id: `mod-${Date.now()}-2`,
          title: `Module 2: Practical Implementation & Capstone`,
          description: 'Real-world coding and interactive assessment.',
          lessons: [
            { id: `les-3`, title: '2.1 Hands-on Laboratory Walkthrough', duration: '24:00', type: 'video' },
            { id: `les-4`, title: '2.2 Capstone Knowledge Check', duration: '15:00', type: 'quiz' }
          ]
        }
      ]
    });
  }

  try {
    const prompt = `You are a world-class course architect. Generate a structured JSON curriculum for a course on "${topic}". Category: "${category || 'Development'}", Level: "${level || 'Intermediate'}".
Output strictly valid JSON with this exact shape:
{
  "title": "Course Title",
  "subtitle": "Compelling one sentence subtitle",
  "description": "Comprehensive 2-sentence description",
  "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3", "Outcome 4"],
  "modules": [
    {
      "id": "mod-1",
      "title": "Module 1: Title",
      "description": "Brief description",
      "lessons": [
        { "id": "les-1", "title": "Lesson 1 Title", "duration": "12:00", "type": "video" },
        { "id": "les-2", "title": "Lesson 2 Title", "duration": "10:00", "type": "article" }
      ]
    },
    {
      "id": "mod-2",
      "title": "Module 2: Title",
      "description": "Brief description",
      "lessons": [
        { "id": "les-3", "title": "Lesson 3 Title", "duration": "20:00", "type": "video" },
        { "id": "les-4", "title": "Lesson 4 Assessment", "duration": "15:00", "type": "quiz" }
      ]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini quota/generation notice, returning fallback curriculum:', error.message);
    res.json({
      title: `${topic} Masterclass 2026`,
      subtitle: `Master ${topic} with hands-on architecture patterns, code laboratories, and production deployment.`,
      description: `A comprehensive curriculum designed to take learners from core primitives to advanced enterprise systems in ${topic}.`,
      learningOutcomes: [
        `Architect resilient systems with ${topic}`,
        `Apply design patterns and error handling strategies`,
        `Deploy and scale production microservices`
      ],
      modules: [
        {
          id: `mod-${Date.now()}-1`,
          title: `Module 1: Foundations of ${topic}`,
          description: 'Environment scaffolding and core concepts.',
          lessons: [
            { id: `les-1`, title: '1.1 Architectural Overview & Setup', duration: '12:00', type: 'video' },
            { id: `les-2`, title: '1.2 Fundamental Primitives & Cheatsheet', duration: '15:00', type: 'article' }
          ]
        },
        {
          id: `mod-${Date.now()}-2`,
          title: `Module 2: Practical Implementation & Capstone`,
          description: 'Real-world coding and interactive assessment.',
          lessons: [
            { id: `les-3`, title: '2.1 Hands-on Laboratory Walkthrough', duration: '24:00', type: 'video' },
            { id: `les-4`, title: '2.2 Capstone Knowledge Check', duration: '15:00', type: 'quiz' }
          ]
        }
      ]
    });
  }
});

// POST generate lecture notes for a lesson
router.post('/generate-lesson-notes', async (req: Request, res: Response) => {
  const { lessonTitle, courseTitle, type } = req.body;

  if (!lessonTitle) {
    return res.status(400).json({ error: 'Lesson title is required' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      markdown: `# ${lessonTitle}\n\n## Overview\nIn this lesson, you will master key principles and hands-on implementations for **${courseTitle || 'this course'}**.\n\n### Key Takeaways\n- Master core architectural trade-offs.\n- Implement production-ready TypeScript patterns.\n- Follow security and validation best practices.\n\n\`\`\`typescript\n// Example Code Companion\nexport function executeTask() {\n  console.log("Task executed successfully.");\n}\n\`\`\`\n\n> Pro-Tip: Always validate external inputs before state mutation.`
    });
  }

  try {
    const prompt = `Write a comprehensive, professional educational Markdown article for a course lesson titled "${lessonTitle}" within the course "${courseTitle || 'Software Engineering'}". Include learning objectives, code snippet if relevant, callout quotes, and key takeaways.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    res.json({ markdown: response.text || '' });
  } catch (error: any) {
    console.warn('Gemini lecture notes quota notice, returning fallback notes:', error.message);
    res.json({
      markdown: `# ${lessonTitle}\n\n## Overview\nIn this lesson, you will master key principles and hands-on implementations for **${courseTitle || 'this course'}**.\n\n### Key Takeaways\n- Master core architectural trade-offs.\n- Implement production-ready TypeScript patterns.\n- Follow security and validation best practices.\n\n\`\`\`typescript\n// Example Code Companion\nexport function executeTask() {\n  console.log("Task executed successfully.");\n}\n\`\`\`\n\n> Pro-Tip: Always validate external inputs before state mutation.`
    });
  }
});

// POST generate multiple choice questions
router.post('/generate-quiz-questions', async (req: Request, res: Response) => {
  const { topic, count = 3 } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      questions: [
        {
          id: `q-${Date.now()}-1`,
          question: `What is the primary architectural principle of ${topic || 'modern cloud systems'}?`,
          type: 'multiple-choice',
          points: 10,
          difficulty: 'Intermediate',
          options: [
            { id: 'o1', text: 'Decoupled services with explicit data contracts', isCorrect: true, explanation: 'Decoupled components allow independent scaling and fault tolerance.' },
            { id: 'o2', text: 'Monolithic single-point-of-failure deployment', isCorrect: false },
            { id: 'o3', text: 'Unauthenticated public database queries', isCorrect: false }
          ]
        }
      ]
    });
  }

  try {
    const prompt = `Generate ${count} challenging multiple choice questions for a quiz on "${topic}".
Output strictly valid JSON with this shape:
{
  "questions": [
    {
      "id": "q-1",
      "question": "Question text here",
      "type": "multiple-choice",
      "points": 10,
      "difficulty": "Intermediate",
      "options": [
        { "id": "o-1", "text": "Correct Option Text", "isCorrect": true, "explanation": "Why correct" },
        { "id": "o-2", "text": "Wrong Option Text", "isCorrect": false },
        { "id": "o-3", "text": "Wrong Option Text", "isCorrect": false },
        { "id": "o-4", "text": "Wrong Option Text", "isCorrect": false }
      ]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini quiz generator quota notice, returning fallback quiz:', error.message);
    res.json({
      questions: [
        {
          id: `q-${Date.now()}-1`,
          question: `What is the primary architectural principle of ${topic || 'modern cloud systems'}?`,
          type: 'multiple-choice',
          points: 10,
          difficulty: 'Intermediate',
          options: [
            { id: 'o1', text: 'Decoupled services with explicit data contracts', isCorrect: true, explanation: 'Decoupled components allow independent scaling and fault tolerance.' },
            { id: 'o2', text: 'Monolithic single-point-of-failure deployment', isCorrect: false },
            { id: 'o3', text: 'Unauthenticated public database queries', isCorrect: false }
          ]
        }
      ]
    });
  }
});

// POST AI Student Assistant explanation in course player
router.post(['/assistant-explain', '/assistant-explain.php'], async (req: Request, res: Response) => {
  const { prompt, courseTitle, lessonTitle } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      success: true,
      answer: `Here is a clear explanation regarding "${lessonTitle || 'this lesson'}":\n\n"${prompt}" is a core concept in ${courseTitle || 'this course'}. To understand it deeply, focus on modular separation, clean interfaces, and hands-on practice. Let me know if you would like a code example or a step-by-step breakdown!`
    });
  }

  try {
    const fullPrompt = `You are a knowledgeable, friendly, and expert AI teaching assistant for the course "${courseTitle || 'Online Course'}". The student is currently studying the lesson "${lessonTitle || 'Current Lesson'}". 
Answer the student's question clearly, pedagogically, and concisely with markdown formatting, code examples if relevant, and practical insights:

Student Question: ${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt
    });

    const answer = response.text || 'I am here to help you master this course material. Could you clarify your question?';
    res.json({ success: true, answer });
  } catch (error: any) {
    console.warn('Gemini AI assistant error, returning fallback response:', error.message);
    res.json({
      success: true,
      answer: `Regarding your question on "${lessonTitle || 'the lesson'}": ${prompt} involves understanding core primitives and applying them step by step. Feel free to ask specific follow-up questions!`
    });
  }
});

export default router;
