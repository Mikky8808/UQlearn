import { Router, Request, Response } from 'express';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  content: string;
  type?: 'video' | 'article' | 'quiz' | 'audio' | 'scorm';
  isPreview?: boolean;
  isCompleted?: boolean;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  instructor: string;
  instructorTitle: string;
  instructorAvatar: string;
  createdBy?: string;
  created_by?: string;
  category: string;
  level: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  learnersEnrolled: number;
  image: string;
  duration: string;
  modules: Module[];
  updatedAt: string;
  isPublished?: boolean;
  isApprovedByAdmin?: boolean;
  bestSeller?: boolean;
  isPremium?: boolean;
  learningOutcomes?: string[];
}

let courses: Course[] = [];
export function setCourses(newCourses: Course[]) {
  courses = newCourses;
}

const router = Router();

// GET all courses (with optional category, search, instructor, and createdBy filters)
router.get('/', (req: Request, res: Response) => {
  const { category, search, instructor, createdBy, created_by } = req.query;
  let filtered = [...courses];

  if (category && category !== 'All') {
    filtered = filtered.filter(c => c.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.subtitle.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }

  if (instructor) {
    filtered = filtered.filter(c => c.instructor.toLowerCase().includes((instructor as string).toLowerCase()));
  }

  const creatorFilter = createdBy || created_by;
  if (creatorFilter) {
    filtered = filtered.filter(c => c.createdBy === creatorFilter || c.created_by === creatorFilter);
  }

  res.json(filtered);
});

// GET single course by ID
router.get('/:id', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  res.json(course);
});

// POST create new course
router.post('/', (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    description,
    instructor,
    instructorTitle,
    instructorAvatar,
    createdBy,
    created_by,
    category,
    level,
    price,
    originalPrice,
    image,
    duration,
    modules,
    learningOutcomes,
    isPublished
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Course title is required' });
  }

  const creatorId = createdBy || created_by || 'usr_45e453fb57306121';

  const newCourse: Course = {
    id: req.body.id || `course-${Date.now()}`,
    title,
    subtitle: subtitle || 'Learn in-demand skills from industry experts.',
    description: description || 'Master modern concepts with hands-on practice.',
    instructor: instructor || 'Dr. Angela Vance',
    instructorTitle: instructorTitle || 'Principal Software Architect & Lead Instructor',
    instructorAvatar: instructorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    createdBy: creatorId,
    created_by: creatorId,
    category: category || 'Development',
    level: level || 'Intermediate',
    price: Number(price) || 89.99,
    originalPrice: Number(originalPrice) || 179.99,
    rating: Number(req.body.rating) || 5.0,
    reviewCount: Number(req.body.reviewCount) || 1,
    learnersEnrolled: 0,
    image: image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    duration: duration || '12.0 hours',
    bestSeller: Boolean(req.body.bestSeller),
    isPremium: Boolean(req.body.isPremium),
    isPublished: isPublished !== false,
    isApprovedByAdmin: req.body.isApprovedByAdmin !== undefined ? Boolean(req.body.isApprovedByAdmin) : false,
    updatedAt: new Date().toISOString().split('T')[0],
    learningOutcomes: learningOutcomes || [],
    modules: modules || []
  };

  courses.unshift(newCourse);
  res.status(201).json(newCourse);
});

// PUT update course
router.put('/:id', (req: Request, res: Response) => {
  const index = courses.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }

  courses[index] = {
    ...courses[index],
    ...req.body,
    updatedAt: new Date().toISOString().split('T')[0]
  };

  res.json(courses[index]);
});

// DELETE course
router.delete('/:id', (req: Request, res: Response) => {
  const filtered = courses.filter(c => c.id !== req.params.id);
  setCourses(filtered);
  res.json({ success: true, message: 'Course deleted successfully' });
});

// PATCH update course approval status by admin
router.patch('/:id/approval', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  const isApproved = Boolean(req.body.isApprovedByAdmin ?? req.body.approved ?? req.body.is_approved_by_admin);
  course.isApprovedByAdmin = isApproved;
  course.updatedAt = new Date().toISOString().split('T')[0];
  res.json({ success: true, course });
});

// POST add module to a course
router.post('/:id/modules', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const newModule: Module = {
    id: `mod-${Date.now()}`,
    title: req.body.title || `Module ${course.modules.length + 1}`,
    description: req.body.description || '',
    lessons: req.body.lessons || []
  };

  course.modules.push(newModule);
  res.status(201).json(newModule);
});

// PUT update full curriculum order (for drag-and-drop organizer)
router.put('/:id/curriculum', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (Array.isArray(req.body.modules)) {
    course.modules = req.body.modules;
    course.updatedAt = new Date().toISOString().split('T')[0];
    return res.json({ success: true, modules: course.modules });
  }

  res.status(400).json({ error: 'Invalid modules payload' });
});

export default router;
