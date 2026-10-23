import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

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
  modules: any[];
  updatedAt: string;
  isPublished?: boolean;
  bestSeller?: boolean;
  learningOutcomes?: string[];
}

let courses: Course[] = [];
export function setCourses(newCourses: Course[]) {
  courses = newCourses;
}

const execAsync = util.promisify(exec);
const v1Router = Router();

// Helper: Recursively read dist directory
function getDistFilesRecursive(dir: string, baseDir: string = dir): Array<{
  path: string;
  size: number;
  lastModified: string;
  isBinary: boolean;
  extension: string;
  content?: string;
}> {
  let results: Array<any> = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const relDir = path.relative(baseDir, filePath).replace(/\\/g, '/');
      if (relDir === 'assets/aistudio' || relDir === 'uploads') continue;
      results = results.concat(getDistFilesRecursive(filePath, baseDir));
    } else {
      const relPath = path.relative(baseDir, filePath).replace(/\\/g, '/');
      if (relPath === 'server.cjs' || relPath === 'server.cjs.map' || relPath === 'deploy.php') continue;
      const ext = path.extname(file).toLowerCase();
      const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.pdf'];
      const isBinary = binaryExtensions.includes(ext);

      let content = '';
      try {
        if (isBinary) {
          content = fs.readFileSync(filePath).toString('base64');
        } else {
          content = fs.readFileSync(filePath, 'utf-8');
        }
      } catch (e) {}

      results.push({
        path: relPath,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        isBinary,
        extension: ext.replace('.', ''),
        content
      });
    }
  }
  return results;
}

// Health check endpoint for API v1
v1Router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    version: 'v1',
    timestamp: new Date().toISOString(),
    databaseConfig: {
      host: 'localhost',
      database: 'uqlearno_lms',
      connectionScript: '/api/v1/db.php'
    }
  });
});

// POST /api/v1/login - Authentication Endpoint matching /api/v1/login.php
v1Router.post('/login', (req: Request, res: Response) => {
  const { email, password, authProvider = 'email', firebaseUid } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(422).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }

  // Google SSO Flow
  if (authProvider === 'google') {
    if (!firebaseUid) {
      return res.status(422).json({
        success: false,
        message: 'Firebase UID is required for Google sign-in.'
      });
    }

    const nameParts = email.split('@')[0].split('.');
    const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'User';
    const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';
    const fullName = `${firstName} ${lastName}`.trim();

    return res.json({
      success: true,
      message: 'Google login successful!',
      token: `token_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      user: {
        id: firebaseUid || `usr_${Date.now()}`,
        role: 'instructor',
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        email: email.toLowerCase(),
        countryCode: '+254',
        phoneNumber: '',
        preferredLanguage: 'English',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        authProvider: 'google',
        isVerified: true
      }
    });
  }

  // Email / Password Flow
  if (!password) {
    return res.status(422).json({
      success: false,
      message: 'Please enter your password.'
    });
  }

  const nameParts = email.split('@')[0].split('.');
  const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Michael';
  const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'Onare';
  const fullName = `${firstName} ${lastName}`.trim();

  return res.json({
    success: true,
    message: 'Login successful! Welcome back.',
    token: `token_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    user: {
      id: `usr_${Date.now()}`,
      role: 'instructor',
      name: fullName,
      firstName: firstName,
      lastName: lastName,
      email: email.toLowerCase(),
      countryCode: '+254',
      phoneNumber: '',
      preferredLanguage: 'English',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      authProvider: 'email',
      isVerified: true
    }
  });
});

// POST /api/v1/register - User Registration Endpoint matching /api/v1/register.php
v1Router.post('/register', (req: Request, res: Response) => {
  const {
    role = 'learner',
    firstName,
    lastName,
    email,
    password,
    countryCode = '+254',
    phoneNumber,
    preferredLanguage = 'en',
    authProvider = 'email',
    firebaseUid,
    avatar,
    agreedTerms = 1
  } = req.body;

  if (!firstName || !lastName) {
    return res.status(422).json({
      success: false,
      message: 'First name and last name are required.'
    });
  }

  if (!email || !email.includes('@')) {
    return res.status(422).json({
      success: false,
      message: 'A valid email address is required.'
    });
  }

  if (authProvider === 'email') {
    if (!password || password.length < 8) {
      return res.status(422).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }
  }

  if (!agreedTerms) {
    return res.status(422).json({
      success: false,
      message: 'You must agree to the Terms of Service and Privacy Policy.'
    });
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const fullName = `${firstName} ${lastName}`.trim();
  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&size=128`;

  return res.status(201).json({
    success: true,
    message: 'Account created successfully! A verification code has been sent to your email.',
    token,
    user: {
      id: userId,
      role,
      name: fullName,
      firstName,
      lastName,
      email: email.toLowerCase(),
      countryCode,
      phoneNumber: phoneNumber || null,
      preferredLanguage,
      avatarUrl,
      authProvider,
      isEmailVerified: false,
      createdAt: new Date().toISOString()
    }
  });
});

// POST /api/v1/verify-email - Email OTP Verification matching /api/v1/verify-email.php
v1Router.post('/verify-email', (req: Request, res: Response) => {
  const { action, email, otp } = req.body;

  if (!action || !['verify', 'resend'].includes(action)) {
    return res.status(422).json({
      success: false,
      message: "Valid action is required: 'verify' or 'resend'."
    });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(422).json({
      success: false,
      message: 'A valid email address is required.'
    });
  }

  if (action === 'verify') {
    if (!otp || otp.length !== 6) {
      return res.status(422).json({
        success: false,
        message: 'A valid 6-digit OTP is required.'
      });
    }

    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    return res.json({
      success: true,
      message: 'Email verified successfully! Welcome to AQLEARN.',
      token,
      user: {
        id: `usr_${Date.now()}`,
        role: 'student',
        firstName: 'User',
        lastName: 'Learner',
        email: email.toLowerCase(),
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random&size=128`,
        isEmailVerified: true
      }
    });
  }

  if (action === 'resend') {
    return res.json({
      success: true,
      message: 'Verification code sent successfully. Please check your email.',
      expiresIn: 3600
    });
  }
});

// GET all courses (supports include_deleted and deleted_only)
v1Router.get(['/courses', '/courses.php'], (req: Request, res: Response) => {
  const includeDeleted = req.query.include_deleted === '1' || req.query.include_deleted === 'true' || req.query.status === 'all';
  const deletedOnly = req.query.deleted_only === '1' || req.query.deleted_only === 'true' || ['trash', 'deleted', 'trashed'].includes(req.query.status as string);
  const createdBy = req.query.created_by || req.query.createdBy;

  let filtered = [...courses];
  if (deletedOnly) {
    filtered = filtered.filter(c => (c as any).isDeleted === true || (c as any).is_deleted === 1);
  } else if (!includeDeleted) {
    filtered = filtered.filter(c => !(c as any).isDeleted && !(c as any).is_deleted);
  }

  if (createdBy) {
    filtered = filtered.filter(c => (c as any).createdBy === createdBy || (c as any).created_by === createdBy);
  }

  res.json({ success: true, data: filtered });
});

// DELETE /api/v1/courses (or /api/v1/courses.php)
v1Router.delete(['/courses', '/courses.php'], (req: Request, res: Response) => {
  const courseId = (req.query.id as string) || (req.query.course_id as string) || req.body.id || req.body.course_id;
  const permanent = req.query.permanent === '1' || req.query.permanent === 'true' || req.body.permanent === true;

  if (!courseId) {
    return res.status(400).json({ success: false, message: 'Course ID is required for deletion.' });
  }

  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex === -1) {
    return res.status(404).json({ success: false, message: `Course ${courseId} not found.` });
  }

  if (permanent) {
    courses.splice(courseIndex, 1);
    return res.json({
      success: true,
      message: 'Course permanently deleted from database.',
      courseId,
      action: 'permanent_delete'
    });
  } else {
    // Soft delete
    const updated = {
      ...courses[courseIndex],
      isDeleted: true,
      is_deleted: 1,
      deletedAt: new Date().toISOString()
    };
    courses[courseIndex] = updated as any;
    return res.json({
      success: true,
      message: 'Course soft-deleted successfully.',
      courseId,
      action: 'soft_delete',
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });
  }
});

// Dedicated Soft-Delete & Restore Endpoint: /api/v1/delete-course and /api/v1/delete-course.php
const handleDeleteCourse = (req: Request, res: Response) => {
  const courseId = (req.query.id as string) || (req.query.course_id as string) || req.body.id || req.body.course_id;
  const action = (req.query.action as string || req.body.action || 'soft_delete').toLowerCase();
  const permanent = req.query.permanent === '1' || req.query.permanent === 'true' || req.body.permanent === true || ['permanent_delete', 'hard_delete', 'destroy'].includes(action);

  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: "Course ID is required. Pass 'id' or 'course_id' in URL query or JSON body.",
      usage: {
        soft_delete: "POST /api/v1/delete-course with {\"id\": \"course-123\"} or DELETE /api/v1/courses?id=course-123",
        restore: "POST /api/v1/delete-course with {\"id\": \"course-123\", \"action\": \"restore\"}",
        permanent_delete: "POST /api/v1/delete-course with {\"id\": \"course-123\", \"permanent\": true}"
      }
    });
  }

  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex === -1) {
    return res.status(404).json({
      success: false,
      message: `Course with ID '${courseId}' was not found.`,
      courseId
    });
  }

  const course = courses[courseIndex];

  // Action: RESTORE
  if (action === 'restore' || action === 'undelete') {
    const updated = {
      ...course,
      isDeleted: false,
      is_deleted: 0,
      deletedAt: null
    };
    courses[courseIndex] = updated as any;
    return res.json({
      success: true,
      message: `Course '${course.title}' was successfully restored from trash.`,
      courseId,
      title: course.title,
      action: 'restore',
      isDeleted: false,
      deletedAt: null,
      timestamp: new Date().toISOString()
    });
  }

  // Action: PERMANENT DELETE
  if (permanent) {
    const title = course.title;
    courses.splice(courseIndex, 1);
    return res.json({
      success: true,
      message: `Course '${title}' permanently removed from database.`,
      courseId,
      title,
      action: 'permanent_delete',
      timestamp: new Date().toISOString()
    });
  }

  // Action: SOFT DELETE (DEFAULT)
  const updated = {
    ...course,
    isDeleted: true,
    is_deleted: 1,
    deletedAt: new Date().toISOString()
  };
  courses[courseIndex] = updated as any;
  return res.json({
    success: true,
    message: `Course '${course.title}' was soft-deleted successfully.`,
    courseId,
    title: course.title,
    action: 'soft_delete',
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    recoveryHint: "To restore this course, call /api/v1/delete-course with action='restore'."
  });
};

v1Router.post(['/delete-course', '/delete-course.php'], handleDeleteCourse);
v1Router.delete(['/delete-course', '/delete-course.php'], handleDeleteCourse);
v1Router.get(['/delete-course', '/delete-course.php'], handleDeleteCourse);

// POST create course in SQL format or memory
v1Router.post(['/courses', '/courses.php'], (req: Request, res: Response) => {
  const action = req.body.action || req.query.action;

  // Check if action is soft_delete or restore
  if (action === 'soft_delete' || action === 'delete') {
    return handleDeleteCourse(req, res);
  }
  if (action === 'restore') {
    req.body.action = 'restore';
    return handleDeleteCourse(req, res);
  }

  const creatorId = req.body.createdBy || req.body.created_by || 'usr_45e453fb57306121';
  const newCourse: Course = {
    id: req.body.id || `course-${Date.now()}`,
    title: req.body.title || 'Untitled Course',
    subtitle: req.body.subtitle || '',
    description: req.body.description || '',
    instructor: req.body.instructor || 'Dr. Angela Vance',
    instructorTitle: req.body.instructorTitle || 'Senior Instructor',
    instructorAvatar: req.body.instructorAvatar || '',
    createdBy: creatorId,
    created_by: creatorId,
    category: req.body.category || 'Development',
    level: req.body.level || 'Beginner',
    price: Number(req.body.price) || 49.99,
    originalPrice: Number(req.body.originalPrice) || 99.99,
    rating: 5.0,
    reviewCount: 0,
    learnersEnrolled: 0,
    image: req.body.image || '',
    duration: req.body.duration || '10.0 hours',
    isPublished: req.body.isPublished !== false,
    bestSeller: false,
    updatedAt: new Date().toISOString().split('T')[0],
    learningOutcomes: req.body.learningOutcomes || [],
    modules: req.body.modules || []
  };

  courses.unshift(newCourse);
  res.status(201).json({ success: true, message: 'Course created in v1 store', data: newCourse });
});

// POST export course as pure SQL INSERT query
v1Router.post('/export-sql', (req: Request, res: Response) => {
  const course = req.body;
  if (!course || !course.title) {
    return res.status(400).json({ error: 'Course data is required' });
  }

  const escapeSql = (str: any) => "'" + String(str || '').replace(/'/g, "''") + "'";
  const courseId = course.id || `course-${Date.now()}`;

  let sql = `-- MySQL INSERT SCRIPT FOR: ${course.title} (${courseId})\n`;
  sql += `-- Database: uqlearno_lms\n\n`;
  sql += `START TRANSACTION;\n`;
  sql += `INSERT INTO \`courses\` (\`id\`, \`title\`, \`subtitle\`, \`description\`, \`category\`, \`level\`, \`price\`, \`duration\`)\n`;
  sql += `VALUES (${escapeSql(courseId)}, ${escapeSql(course.title)}, ${escapeSql(course.subtitle)}, ${escapeSql(course.description)}, ${escapeSql(course.category)}, ${escapeSql(course.level)}, ${Number(course.price) || 49.99}, ${escapeSql(course.duration)});\n`;
  sql += `COMMIT;\n`;

  res.json({ success: true, sqlQuery: sql });
});

// In-memory course categories store for local API v1
let courseCategories: any[] = [
  { id: 'cat-1', name: 'Development', slug: 'development', description: 'Software engineering, web apps, backend APIs & cloud architecture', icon: '💻', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400', orderIndex: 0, order_index: 0, isActive: true, is_active: 1, isFeatured: true, is_featured: 1 },
  { id: 'cat-2', name: 'Data Science', slug: 'data-science', description: 'Machine learning, AI agents, Python data analysis & deep neural networks', icon: '📊', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400', orderIndex: 1, order_index: 1, isActive: true, is_active: 1, isFeatured: true, is_featured: 1 },
  { id: 'cat-3', name: 'Design', slug: 'design', description: 'UI/UX systems, product design, Figma workflows & responsive design', icon: '🎨', color: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400', orderIndex: 2, order_index: 2, isActive: true, is_active: 1, isFeatured: true, is_featured: 1 },
  { id: 'cat-4', name: 'Business', slug: 'business', description: 'Product management, SaaS startups, enterprise strategy & finance', icon: '📈', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400', orderIndex: 3, order_index: 3, isActive: true, is_active: 1, isFeatured: true, is_featured: 1 },
  { id: 'cat-5', name: 'Marketing', slug: 'marketing', description: 'Growth hacking, SEO optimization, social campaigns & paid acquisition', icon: '🚀', color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400', orderIndex: 4, order_index: 4, isActive: true, is_active: 1, isFeatured: false, is_featured: 0 },
  { id: 'cat-6', name: 'Personal Growth', slug: 'personal-growth', description: 'Leadership mastery, productivity habits, communication & public speaking', icon: '🌟', color: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400', orderIndex: 5, order_index: 5, isActive: true, is_active: 1, isFeatured: false, is_featured: 0 },
];

// GET /api/v1/course-categories and /api/v1/course-categories.php
v1Router.get(['/course-categories', '/course-categories.php'], (req: Request, res: Response) => {
  const id = req.query.id as string;
  const slug = req.query.slug as string;
  const includeInactive = req.query.include_inactive === '1' || req.query.include_inactive === 'true';
  const featuredOnly = req.query.featured_only === '1' || req.query.featured_only === 'true';

  if (id || slug) {
    const found = courseCategories.find(c => (id && c.id === id) || (slug && c.slug === slug));
    if (!found) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const catCourses = courses.filter(cr => cr.category === found.name && !(cr as any).isDeleted);
    return res.json({
      success: true,
      data: {
        ...found,
        courseCount: catCourses.length,
        courses: catCourses
      }
    });
  }

  let result = [...courseCategories];
  if (!includeInactive) {
    result = result.filter(c => c.isActive !== false && c.is_active !== 0);
  }
  if (featuredOnly) {
    result = result.filter(c => Boolean(c.isFeatured || c.is_featured));
  }

  const enriched = result.map(cat => ({
    ...cat,
    courseCount: courses.filter(c => c.category === cat.name && !(c as any).isDeleted).length
  })).sort((a, b) => (a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0));

  res.json({
    success: true,
    total: enriched.length,
    data: enriched
  });
});

// POST /api/v1/course-categories and /api/v1/course-categories.php
v1Router.post(['/course-categories', '/course-categories.php'], (req: Request, res: Response) => {
  const action = req.body.action || req.query.action;

  // Batch sync action
  if (action === 'batch_sync' || action === 'sync' || Array.isArray(req.body.categories)) {
    const list = req.body.categories || req.body.payload || [];
    if (Array.isArray(list) && list.length > 0) {
      courseCategories = list.map((c, idx) => ({
        id: c.id || `cat-${idx + 1}`,
        name: c.name,
        slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: c.description || '',
        icon: c.icon || '📚',
        color: c.color || 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
        orderIndex: c.orderIndex ?? c.order_index ?? idx,
        order_index: c.orderIndex ?? c.order_index ?? idx,
        isActive: c.isActive !== false && c.is_active !== 0,
        is_active: c.isActive !== false && c.is_active !== 0 ? 1 : 0,
        isFeatured: Boolean(c.isFeatured || c.is_featured),
        is_featured: Boolean(c.isFeatured || c.is_featured) ? 1 : 0,
      }));
      return res.json({
        success: true,
        message: `Synchronized ${courseCategories.length} categories`,
        syncedCount: courseCategories.length
      });
    }
  }

  // Reorder action
  if (action === 'reorder') {
    const orders = req.body.orders || req.body.categories || [];
    orders.forEach((item: any, idx: number) => {
      const cat = courseCategories.find(c => c.id === item.id || c.name === item.name);
      if (cat) {
        cat.orderIndex = item.orderIndex ?? item.order_index ?? idx;
        cat.order_index = cat.orderIndex;
      }
    });
    return res.json({ success: true, message: 'Categories reordered successfully' });
  }

  // Toggle status action
  if (action === 'toggle_status') {
    const catId = req.body.id || req.query.id;
    const cat = courseCategories.find(c => c.id === catId);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    cat.isActive = !cat.isActive;
    cat.is_active = cat.isActive ? 1 : 0;
    return res.json({ success: true, message: 'Category status toggled', data: cat });
  }

  // Single category create / update
  const { name, slug, description, icon, color, orderIndex, isActive, isFeatured, id, oldName } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: "Category 'name' is required." });
  }

  const categoryId = id || `cat-${Date.now()}`;
  const categorySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const existingIdx = courseCategories.findIndex(c => c.id === categoryId || c.name === name);

  const categoryObj = {
    id: categoryId,
    name,
    slug: categorySlug,
    description: description || '',
    icon: icon || '📚',
    color: color || 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
    orderIndex: orderIndex ?? (existingIdx >= 0 ? courseCategories[existingIdx].orderIndex : courseCategories.length),
    order_index: orderIndex ?? (existingIdx >= 0 ? courseCategories[existingIdx].order_index : courseCategories.length),
    isActive: isActive !== false,
    is_active: isActive !== false ? 1 : 0,
    isFeatured: Boolean(isFeatured),
    is_featured: isFeatured ? 1 : 0,
  };

  if (existingIdx >= 0) {
    courseCategories[existingIdx] = categoryObj;
  } else {
    courseCategories.push(categoryObj);
  }

  // If name changed, update courses
  if (oldName && oldName !== name) {
    courses.forEach(c => {
      if (c.category === oldName) c.category = name;
    });
  }

  return res.json({
    success: true,
    message: `Category '${name}' saved successfully.`,
    data: categoryObj
  });
});

// DELETE /api/v1/course-categories and /api/v1/course-categories.php
v1Router.delete(['/course-categories', '/course-categories.php'], (req: Request, res: Response) => {
  const id = (req.query.id as string) || req.body.id;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Category ID is required.' });
  }

  const idx = courseCategories.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Category not found.' });
  }

  const deleted = courseCategories.splice(idx, 1)[0];
  return res.json({
    success: true,
    message: `Category '${deleted.name}' deleted successfully.`,
    deletedId: id
  });
});

// GET /api/v1/sync - Database Sync Hub matching /api/v1/sync.php
v1Router.get('/sync', (req: Request, res: Response) => {
  const action = (req.query.action as string) || 'status';
  const table = (req.query.table as string) || 'courses';

  const sampleColumns: Record<string, Array<{ field: string; type: string; null: string; key: string; default: any }>> = {
    courses: [
      { field: 'id', type: 'varchar(64)', null: 'NO', key: 'PRI', default: null },
      { field: 'title', type: 'varchar(255)', null: 'NO', key: '', default: null },
      { field: 'subtitle', type: 'text', null: 'YES', key: '', default: null },
      { field: 'description', type: 'longtext', null: 'YES', key: '', default: null },
      { field: 'instructor', type: 'varchar(150)', null: 'NO', key: '', default: 'Dr. Angela Vance' },
      { field: 'instructor_title', type: 'varchar(150)', null: 'YES', key: '', default: 'Senior Instructor' },
      { field: 'instructor_avatar', type: 'text', null: 'YES', key: '', default: null },
      { field: 'created_by', type: 'varchar(64)', null: 'YES', key: 'MUL', default: null },
      { field: 'category', type: 'varchar(100)', null: 'NO', key: '', default: 'Development' },
      { field: 'level', type: "enum('Beginner','Intermediate','Advanced','All Levels')", null: 'YES', key: '', default: 'Beginner' },
      { field: 'price', type: 'decimal(10,2)', null: 'NO', key: '', default: '49.99' },
      { field: 'original_price', type: 'decimal(10,2)', null: 'YES', key: '', default: '99.99' },
      { field: 'rating', type: 'decimal(3,2)', null: 'YES', key: '', default: '5.00' },
      { field: 'review_count', type: 'int(11)', null: 'YES', key: '', default: '0' },
      { field: 'learners_enrolled', type: 'int(11)', null: 'YES', key: '', default: '0' },
      { field: 'image', type: 'text', null: 'YES', key: '', default: null },
      { field: 'duration', type: 'varchar(50)', null: 'YES', key: '', default: '10.0 hours' },
      { field: 'is_published', type: 'tinyint(1)', null: 'YES', key: '', default: '1' },
      { field: 'best_seller', type: 'tinyint(1)', null: 'YES', key: '', default: '0' },
      { field: 'created_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' },
      { field: 'updated_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' }
    ],
    users: [
      { field: 'id', type: 'varchar(64)', null: 'NO', key: 'PRI', default: null },
      { field: 'role', type: "enum('learner','instructor','admin')", null: 'NO', key: 'MUL', default: 'learner' },
      { field: 'first_name', type: 'varchar(100)', null: 'NO', key: '', default: null },
      { field: 'last_name', type: 'varchar(100)', null: 'NO', key: '', default: null },
      { field: 'email', type: 'varchar(191)', null: 'NO', key: 'UNI', default: null },
      { field: 'password_hash', type: 'varchar(255)', null: 'YES', key: '', default: null },
      { field: 'country_code', type: 'varchar(10)', null: 'YES', key: '', default: '+254' },
      { field: 'phone_number', type: 'varchar(30)', null: 'YES', key: '', default: null },
      { field: 'preferred_language', type: 'varchar(20)', null: 'YES', key: '', default: 'en' },
      { field: 'avatar_url', type: 'text', null: 'YES', key: '', default: null },
      { field: 'auth_provider', type: "enum('email','google','apple')", null: 'NO', key: '', default: 'email' },
      { field: 'firebase_uid', type: 'varchar(128)', null: 'YES', key: '', default: null },
      { field: 'agreed_terms', type: 'tinyint(1)', null: 'NO', key: '', default: '1' },
      { field: 'agreed_marketing', type: 'tinyint(1)', null: 'NO', key: '', default: '0' },
      { field: 'is_email_verified', type: 'tinyint(1)', null: 'NO', key: '', default: '0' },
      { field: 'last_login_at', type: 'timestamp', null: 'YES', key: '', default: null },
      { field: 'created_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' },
      { field: 'updated_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' }
    ],
    modules: [
      { field: 'id', type: 'varchar(64)', null: 'NO', key: 'PRI', default: null },
      { field: 'course_id', type: 'varchar(64)', null: 'NO', key: 'MUL', default: null },
      { field: 'title', type: 'varchar(255)', null: 'NO', key: '', default: null },
      { field: 'description', type: 'text', null: 'YES', key: '', default: null },
      { field: 'order_index', type: 'int(11)', null: 'YES', key: '', default: '0' },
      { field: 'created_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' }
    ],
    lessons: [
      { field: 'id', type: 'varchar(64)', null: 'NO', key: 'PRI', default: null },
      { field: 'module_id', type: 'varchar(64)', null: 'NO', key: 'MUL', default: null },
      { field: 'title', type: 'varchar(255)', null: 'NO', key: '', default: null },
      { field: 'duration', type: 'varchar(50)', null: 'YES', key: '', default: '10:00' },
      { field: 'type', type: "enum('video','article','quiz','audio','scorm')", null: 'YES', key: '', default: 'video' },
      { field: 'video_url', type: 'varchar(255)', null: 'YES', key: '', default: '' },
      { field: 'content', type: 'longtext', null: 'YES', key: '', default: null },
      { field: 'is_preview', type: 'tinyint(1)', null: 'YES', key: '', default: '0' },
      { field: 'order_index', type: 'int(11)', null: 'YES', key: '', default: '0' },
      { field: 'created_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' }
    ],
    email_verifications: [
      { field: 'id', type: 'varchar(64)', null: 'NO', key: 'PRI', default: null },
      { field: 'email', type: 'varchar(191)', null: 'NO', key: 'MUL', default: null },
      { field: 'otp_code', type: 'varchar(10)', null: 'NO', key: '', default: null },
      { field: 'is_used', type: 'tinyint(1)', null: 'YES', key: '', default: '0' },
      { field: 'expires_at', type: 'datetime', null: 'NO', key: 'MUL', default: null },
      { field: 'created_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' }
    ],
    purchases: [
      { field: 'id', type: 'varchar(64)', null: 'NO', key: 'PRI', default: null },
      { field: 'course_id', type: 'varchar(64)', null: 'NO', key: '', default: null },
      { field: 'course_title', type: 'varchar(255)', null: 'NO', key: '', default: null },
      { field: 'amount', type: 'decimal(10,2)', null: 'NO', key: '', default: null },
      { field: 'payment_method', type: 'varchar(100)', null: 'YES', key: '', default: 'Credit Card' },
      { field: 'date', type: 'date', null: 'NO', key: '', default: null },
      { field: 'status', type: "enum('success','pending','refunded')", null: 'YES', key: '', default: 'success' },
      { field: 'created_at', type: 'timestamp', null: 'YES', key: '', default: 'CURRENT_TIMESTAMP' }
    ]
  };

  if (action === 'status' || action === 'inspect_schema') {
    return res.json({
      success: true,
      database: 'uqlearno_lms',
      serverTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      tables: {
        users: { exists: true, rowCount: 4, columnCount: 18, columns: sampleColumns.users },
        email_verifications: { exists: true, rowCount: 5, columnCount: 6, columns: sampleColumns.email_verifications },
        courses: { exists: true, rowCount: courses.length, columnCount: 21, columns: sampleColumns.courses },
        modules: { exists: true, rowCount: courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0), columnCount: 6, columns: sampleColumns.modules },
        lessons: { exists: true, rowCount: courses.reduce((acc, c) => acc + (c.modules?.reduce((lAcc, m) => lAcc + (m.lessons?.length || 0), 0) || 0), 0), columnCount: 10, columns: sampleColumns.lessons },
        learning_outcomes: { exists: true, rowCount: courses.reduce((acc, c) => acc + (c.learningOutcomes?.length || 0), 0), columnCount: 3, columns: [] },
        quizzes: { exists: true, rowCount: 5, columnCount: 8, columns: [] },
        quiz_questions: { exists: true, rowCount: 12, columnCount: 8, columns: [] },
        quiz_options: { exists: true, rowCount: 36, columnCount: 6, columns: [] },
        purchases: { exists: true, rowCount: 2, columnCount: 8, columns: sampleColumns.purchases }
      },
      columnsAutoAltered: [
        { table: 'courses', column: 'created_by', definition: 'VARCHAR(64) DEFAULT NULL', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN created_by VARCHAR(64) DEFAULT NULL' },
        { table: 'courses', column: 'instructor_avatar', definition: 'TEXT DEFAULT NULL', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN instructor_avatar TEXT DEFAULT NULL' },
        { table: 'users', column: 'firebase_uid', definition: 'VARCHAR(128) DEFAULT NULL', status: 'verified', sql: 'ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) DEFAULT NULL' }
      ],
      message: 'Database sync & schema migration hub is active and verified.'
    });
  }

  if (action === 'read_table') {
    let rows: any[] = [];
    if (table === 'courses') rows = courses;
    else if (table === 'modules') rows = courses.flatMap(c => (c.modules || []).map(m => ({ ...m, course_id: c.id })));
    else if (table === 'lessons') rows = courses.flatMap(c => (c.modules || []).flatMap(m => (m.lessons || []).map(l => ({ ...l, module_id: m.id }))));
    else if (table === 'users') {
      rows = [
        { id: 'usr_admin_01', role: 'admin', first_name: 'Angela', last_name: 'Vance', email: 'michaelomare045@gmail.com', is_email_verified: 1, created_at: '2026-01-10 10:00:00' },
        { id: 'usr_inst_02', role: 'instructor', first_name: 'Michael', last_name: 'Onare', email: 'omaremichael8808@gmail.com', is_email_verified: 1, created_at: '2026-02-01 12:30:00' },
        { id: 'usr_stud_03', role: 'learner', first_name: 'Alex', last_name: 'Rivera', email: 'alex.rivera@example.com', is_email_verified: 1, created_at: '2026-02-15 08:20:00' }
      ];
    } else if (table === 'purchases') {
      rows = [
        { id: 'pur_101', course_id: 'c-1', course_title: 'Complete Web Development Bootcamp', amount: '49.99', payment_method: 'Credit Card', date: '2026-02-14', status: 'success' },
        { id: 'pur_102', course_id: 'c-2', course_title: 'Full-Stack React & Node.js Mastery', amount: '59.99', payment_method: 'PayPal', date: '2026-02-18', status: 'success' }
      ];
    } else if (table === 'email_verifications') {
      rows = [
        { id: 'ev_01', email: 'michaelomare045@gmail.com', otp_code: '482910', is_used: 1, expires_at: '2026-08-21 12:00:00' },
        { id: 'ev_02', email: 'omaremichael8808@gmail.com', otp_code: '901234', is_used: 1, expires_at: '2026-08-21 14:30:00' }
      ];
    }

    return res.json({
      success: true,
      table,
      count: rows.length,
      columns: sampleColumns[table] || [],
      data: rows
    });
  }

  if (action === 'auto_migrate' || action === 'alter_schema') {
    return res.json({
      success: true,
      message: 'All table schemas are up-to-date and verified. Columns alter inspection completed.',
      alteredColumns: [
        { table: 'courses', column: 'created_by', definition: 'VARCHAR(64) DEFAULT NULL', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN created_by VARCHAR(64) DEFAULT NULL' },
        { table: 'courses', column: 'best_seller', definition: 'TINYINT(1) DEFAULT 0', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN best_seller TINYINT(1) DEFAULT 0' },
        { table: 'users', column: 'auth_provider', definition: "ENUM('email','google','apple') DEFAULT 'email'", status: 'verified', sql: "ALTER TABLE users ADD COLUMN auth_provider ENUM('email','google','apple') DEFAULT 'email'" }
      ],
      tableColumnsCount: {
        courses: 21,
        users: 18,
        modules: 6,
        lessons: 10,
        email_verifications: 6,
        purchases: 8
      },
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'export_all') {
    return res.json({
      success: true,
      database: 'uqlearno_lms',
      exportedAt: new Date().toISOString(),
      data: {
        users: [
          {
            id: 'usr_45e453fb57306121',
            role: 'instructor',
            first_name: 'Michael',
            last_name: 'Onare',
            email: 'omaremichael8808@gmail.com',
            auth_provider: 'google',
            is_email_verified: 0,
            avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocJRgSNbTZUXmEoCUSiR65z76Nmaqk5AoSbciF_Dq5xN8TRbhg=s96-c'
          },
          {
            id: 'usr_8cbf395490eab3d3',
            role: 'learner',
            first_name: 'Michael kenyanya',
            last_name: 'Omare',
            email: 'michaelomare045@gmail.com',
            auth_provider: 'email',
            is_email_verified: 1,
            country_code: '+1',
            phone_number: '745362617'
          }
        ],
        courses
      }
    });
  }

  if (action === 'generate_sql') {
    let sql = `-- ========================================================\n`;
    sql += `-- DATABASE SYNC DUMP: uqlearno_lms\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n`;
    sql += `-- Host: localhost (uqlearn.org)\n`;
    sql += `-- ========================================================\n\n`;
    sql += `START TRANSACTION;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;
    courses.forEach(c => {
      sql += `INSERT INTO \`courses\` (\`id\`, \`title\`, \`price\`, \`category\`, \`is_published\`) VALUES ('${c.id}', '${c.title.replace(/'/g, "''")}', ${c.price || 49.99}, '${c.category || 'General'}', 1) ON DUPLICATE KEY UPDATE \`updated_at\` = NOW();\n`;
    });
    sql += `\nSET FOREIGN_KEY_CHECKS = 1;\nCOMMIT;\n`;
    return res.json({ success: true, sqlScript: sql, database: 'uqlearno_lms' });
  }

  res.json({ success: true, message: 'Sync action processed' });
});

// POST /api/v1/sync - Sync data batch and Column Operations
v1Router.post('/sync', (req: Request, res: Response) => {
  const { action = 'sync_upsert', payload, table, column, type, nullable, defaultValue, afterColumn } = req.body;

  if (action === 'add_column') {
    const tbl = table || 'courses';
    const col = column || 'custom_field';
    const colType = type || 'VARCHAR(255)';
    const sql = `ALTER TABLE \`${tbl}\` ADD COLUMN \`${col}\` ${colType} ${nullable !== false ? 'NULL' : 'NOT NULL'}${defaultValue ? ` DEFAULT '${defaultValue}'` : ''}${afterColumn ? ` AFTER \`${afterColumn}\`` : ''}`;

    return res.json({
      success: true,
      message: `Column \`${col}\` successfully added to \`${tbl}\` via ALTER TABLE.`,
      table: tbl,
      column: col,
      sql
    });
  }

  if (action === 'auto_migrate') {
    return res.json({
      success: true,
      message: 'Schema checked and verified. All required columns are present or altered in MySQL.',
      alteredColumns: [
        { table: 'courses', column: 'created_by', definition: 'VARCHAR(64) DEFAULT NULL', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN created_by VARCHAR(64) DEFAULT NULL' },
        { table: 'courses', column: 'best_seller', definition: 'TINYINT(1) DEFAULT 0', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN best_seller TINYINT(1) DEFAULT 0' }
      ],
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'sync_upsert' && payload) {
    if (payload.courses && Array.isArray(payload.courses)) {
      setCourses(payload.courses);
    }
    return res.json({
      success: true,
      message: 'Database and schema synchronized successfully! Tables verified and missing columns auto-altered.',
      synced: {
        courses: payload.courses?.length || 0,
        modules: payload.modules?.length || 0,
        lessons: payload.lessons?.length || 0,
        users: payload.users?.length || 0
      },
      columnsAutoAltered: [
        { table: 'courses', column: 'created_by', definition: 'VARCHAR(64) DEFAULT NULL', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN created_by VARCHAR(64) DEFAULT NULL' },
        { table: 'courses', column: 'instructor_title', definition: 'VARCHAR(150) DEFAULT Senior Instructor', status: 'verified', sql: 'ALTER TABLE courses ADD COLUMN instructor_title VARCHAR(150) DEFAULT \'Senior Instructor\'' },
        { table: 'users', column: 'firebase_uid', definition: 'VARCHAR(128) DEFAULT NULL', status: 'verified', sql: 'ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) DEFAULT NULL' }
      ],
      timestamp: new Date().toISOString()
    });
  }

  res.json({ success: true, message: 'Sync batch processed' });
});

// GET /api/v1/debug_htaccess.php - Emulate PHP debug script locally in Express
v1Router.get('/debug_htaccess.php', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  
  const rootHtPath = path.join(process.cwd(), '.htaccess');
  const apiHtPath = path.join(process.cwd(), 'api', 'v1', '.htaccess');
  
  let output = '';
  
  output += "--- Root Directory .htaccess (" + rootHtPath + ") ---\n";
  if (fs.existsSync(rootHtPath)) {
    output += fs.readFileSync(rootHtPath, 'utf8');
  } else {
    output += "File not found.";
  }
  
  output += "\n\n--- API v1 Directory .htaccess (" + apiHtPath + ") ---\n";
  if (fs.existsSync(apiHtPath)) {
    output += fs.readFileSync(apiHtPath, 'utf8');
  } else {
    output += "File not found.";
  }
  
  res.send(output);
});

// GET /api/v1/importer.php & /api/v1/importer - Mock limits response for local development
v1Router.get(['/importer.php', '/importer'], (req: Request, res: Response) => {
  res.json({
    success: true,
    limits: {
      upload_max_filesize: "500M",
      post_max_size: "500M",
      memory_limit: "512M",
      max_execution_time: "300"
    }
  });
});

// In-memory mock asset storage for local UI testability
let localFolders: any[] = [];
let localAssets: any[] = [];

// GET /api/v1/assets.php & /api/v1/assets
v1Router.get(['/assets.php', '/assets'], (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      folders: localFolders,
      assets: localAssets
    }
  });
});

// POST /api/v1/assets.php & /api/v1/assets
v1Router.post(['/assets.php', '/assets'], (req: Request, res: Response) => {
  const action = req.body.action || req.query.action;
  const userId = req.body.user_id || req.query.user_id || 'admin';
  
  if (action === 'create_folder') {
    const name = req.body.name || 'New Folder';
    const parentId = req.body.parent_id || null;
    const newFolder = {
      id: localFolders.length + 1,
      user_id: userId,
      name: name,
      parent_id: parentId,
      created_at: new Date().toISOString()
    };
    localFolders.push(newFolder);
    return res.json({ success: true, id: newFolder.id, message: "Folder created successfully" });
  }
  
  if (action === 'rename_folder') {
    const folderId = parseInt(req.body.folder_id || req.body.folderId);
    const name = req.body.name || '';
    const folder = localFolders.find(f => f.id === folderId);
    if (folder) {
      folder.name = name;
      return res.json({ success: true, message: "Folder renamed successfully" });
    }
    return res.status(404).json({ success: false, message: "Folder not found" });
  }

  if (action === 'move_asset') {
    const assetId = parseInt(req.body.asset_id || req.body.assetId);
    const folderId = req.body.folder_id ? parseInt(req.body.folder_id) : null;
    const asset = localAssets.find(a => a.id === assetId);
    if (asset) {
      asset.folder_id = folderId;
      return res.json({ success: true, message: "Asset moved successfully" });
    }
    return res.status(404).json({ success: false, message: "Asset not found" });
  }

  res.status(400).json({ success: false, message: "Unknown action" });
});

// DELETE /api/v1/assets.php & /api/v1/assets
v1Router.delete(['/assets.php', '/assets'], (req: Request, res: Response) => {
  const action = req.query.action || req.body.action;
  const id = parseInt((req.query.id as string) || req.body.id);
  
  if (action === 'delete_folder') {
    // move assets to root
    localAssets.forEach(a => {
      if (a.folder_id === id) {
        a.folder_id = null;
      }
    });
    localFolders = localFolders.filter(f => f.id !== id);
    return res.json({ success: true, message: "Folder deleted successfully" });
  }

  res.status(400).json({ success: false, message: "Unknown action" });
});

// GET /api/v1/remote-sync/local-files - Read all local /api/v1/ and /api/v2/ files from workspace disk
v1Router.get('/remote-sync/local-files', (req: Request, res: Response) => {
  try {
    const apiDir = path.join(process.cwd(), 'api');
    const files: Array<{
      name: string;
      size: number;
      extension: string;
      lastModified: string;
      content: string;
      lines: number;
      type: 'php' | 'sql' | 'typescript' | 'other';
    }> = [];

    // Gather v1 files
    const apiV1Dir = path.join(apiDir, 'v1');
    if (fs.existsSync(apiV1Dir)) {
      const v1Entries = fs.readdirSync(apiV1Dir);
      for (const file of v1Entries) {
        const filePath = path.join(apiV1Dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const ext = path.extname(file).replace('.', '').toLowerCase();
          let fileType: 'php' | 'sql' | 'typescript' | 'other' = 'other';
          if (ext === 'php') fileType = 'php';
          else if (ext === 'sql') fileType = 'sql';
          else if (ext === 'ts') fileType = 'typescript';

          files.push({
            name: `v1/${file}`,
            size: stat.size,
            extension: ext,
            lastModified: stat.mtime.toISOString(),
            content,
            lines: content.split('\n').length,
            type: fileType
          });
        }
      }
    }

    // Gather v2 files
    const apiV2Dir = path.join(apiDir, 'v2');
    if (fs.existsSync(apiV2Dir)) {
      const v2Entries = fs.readdirSync(apiV2Dir);
      for (const file of v2Entries) {
        const filePath = path.join(apiV2Dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const ext = path.extname(file).replace('.', '').toLowerCase();
          let fileType: 'php' | 'sql' | 'typescript' | 'other' = 'other';
          if (ext === 'php') fileType = 'php';
          else if (ext === 'sql') fileType = 'sql';
          else if (ext === 'ts') fileType = 'typescript';

          files.push({
            name: `v2/${file}`,
            size: stat.size,
            extension: ext,
            lastModified: stat.mtime.toISOString(),
            content,
            lines: content.split('\n').length,
            type: fileType
          });
        }
      }
    }

    // Sort files logically
    files.sort((a, b) => {
      const priorityOrder = [
        'v1/deploy.php', 'v1/course-categories.php', 'v1/courses.php', 'v1/db.php', 'v1/schema.sql', 'v1/sync.php', 'v1/login.php', 'v1/register.php', 'v1/verify-email.php',
        'v2/reviewers.php', 'v2/reviewer-assignments.php', 'v2/assign-reviewer.php'
      ];
      const aIdx = priorityOrder.indexOf(a.name);
      const bIdx = priorityOrder.indexOf(b.name);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      directory: 'api',
      totalFiles: files.length,
      files,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to read local files: ' + error.message });
  }
});

// GET /api/v1/remote-sync/remote-status - Check live status of uqlearn.org
v1Router.get('/remote-sync/remote-status', async (req: Request, res: Response) => {
  const targetUrl = (req.query.url as string) || 'https://uqlearn.org/deploy.php';
  const deployKey = (req.query.key as string) || 'cubiclink_sync_secret_2026';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'X-Deploy-Key': deployKey
      }
    });
    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Not JSON (e.g. Cloudflare HTML challenge or 404 page)
    }

    if (response.ok && data && (data.success || data.worker || data.status === 'ready')) {
      return res.json({
        success: true,
        reachable: true,
        httpStatus: response.status,
        remoteData: data
      });
    } else {
      return res.json({
        success: false,
        reachable: response.status < 500,
        httpStatus: response.status,
        message: data?.message || (text.includes('One moment, please') ? 'Cloudflare challenge page returned to server proxy (use browser-direct ping/deploy).' : `Remote server responded with HTTP ${response.status}`),
        bodySnippet: text.substring(0, 300)
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      reachable: false,
      message: err.name === 'AbortError' ? 'Remote connection timed out after 8s' : err.message
    });
  }
});

// POST /api/v1/remote-sync/get-api-payload - Prepare local PHP/SQL files for direct browser deployment
v1Router.post('/remote-sync/get-api-payload', (req: Request, res: Response) => {
  const selectedFileNames: string[] | undefined = req.body?.fileNames;
  try {
    const apiDir = path.join(process.cwd(), 'api');
    const filesToUpload: Record<string, string> = {};

    const apiV1Dir = path.join(apiDir, 'v1');
    if (fs.existsSync(apiV1Dir)) {
      const v1Entries = fs.readdirSync(apiV1Dir);
      for (const file of v1Entries) {
        const relName = `v1/${file}`;
        if (selectedFileNames && !selectedFileNames.includes(relName)) continue;
        const ext = path.extname(file).toLowerCase();
        if (['.php', '.sql', '.json', '.htaccess', ''].includes(ext) || file === '.htaccess') {
          const filePath = path.join(apiV1Dir, file);
          if (fs.statSync(filePath).isFile()) {
            filesToUpload[relName] = fs.readFileSync(filePath, 'utf-8');
          }
        }
      }
    }

    const apiV2Dir = path.join(apiDir, 'v2');
    if (fs.existsSync(apiV2Dir)) {
      const v2Entries = fs.readdirSync(apiV2Dir);
      for (const file of v2Entries) {
        const relName = `v2/${file}`;
        if (selectedFileNames && !selectedFileNames.includes(relName)) continue;
        const ext = path.extname(file).toLowerCase();
        if (['.php', '.sql', '.json', '.htaccess', ''].includes(ext) || file === '.htaccess') {
          const filePath = path.join(apiV2Dir, file);
          if (fs.statSync(filePath).isFile()) {
            filesToUpload[relName] = fs.readFileSync(filePath, 'utf-8');
          }
        }
      }
    }

    return res.json({
      success: true,
      totalFiles: Object.keys(filesToUpload).length,
      files: filesToUpload
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/remote-sync/get-dist-payload - Prepare all dist files in a single payload for direct browser deployment
v1Router.post('/remote-sync/get-dist-payload', (req: Request, res: Response) => {
  const selectedPaths: string[] | undefined = req.body?.filePaths;
  try {
    const distDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      return res.status(400).json({ success: false, message: 'No dist directory found. Run build first.' });
    }

    const allDistFiles = getDistFilesRecursive(distDir);
    const eligibleFiles = allDistFiles.filter(f => !selectedPaths || selectedPaths.includes(f.path));

    const textFiles: Record<string, string> = {};
    const base64Files: Record<string, string> = {};
    let totalBytes = 0;

    for (const file of eligibleFiles) {
      const fileSize = file.size || 0;
      if (file.isBinary) {
        if (file.content) base64Files[file.path] = file.content;
      } else {
        if (file.content) textFiles[file.path] = file.content;
      }
      totalBytes += fileSize;
    }

    return res.json({
      success: true,
      totalFiles: eligibleFiles.length,
      totalBytes,
      files: textFiles,
      textFiles,
      base64Files
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/remote-sync/push - Push all local /api/v1/ and /api/v2/ files directly to uqlearn.org
v1Router.post('/remote-sync/push', async (req: Request, res: Response) => {
  const targetUrl = req.body.remoteUrl || 'https://uqlearn.org/api/v1/deploy.php';
  const deployKey = req.body.deployKey || 'cubiclink_sync_secret_2026';
  const selectedFileNames: string[] | undefined = req.body.fileNames;

  try {
    const apiDir = path.join(process.cwd(), 'api');
    const filesToUpload: Record<string, string> = {};

    // Helper: collect files recursively
    const collectFilesRecursive = (dir: string, basePrefix: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relPath = `${basePrefix}/${entry}`;
        if (fs.statSync(fullPath).isDirectory()) {
          collectFilesRecursive(fullPath, relPath);
        } else {
          if (selectedFileNames && !selectedFileNames.includes(relPath)) {
            continue;
          }
          const ext = path.extname(entry).toLowerCase();
          if (['.php', '.sql', '.json', '.htaccess', ''].includes(ext) || entry === '.htaccess') {
            filesToUpload[relPath] = fs.readFileSync(fullPath, 'utf-8');
          }
        }
      }
    };

    // Gather v1 files
    collectFilesRecursive(path.join(apiDir, 'v1'), 'v1');

    // Gather v2 files
    collectFilesRecursive(path.join(apiDir, 'v2'), 'v2');

    if (Object.keys(filesToUpload).length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible PHP or SQL files found to upload.' });
    }

    // Attempt direct remote deployment request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const remoteRes = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Deploy-Key': deployKey
      },
      body: JSON.stringify({
        files: filesToUpload,
        deploy_key: deployKey
      })
    });
    clearTimeout(timeoutId);

    if (remoteRes.ok) {
      const result = await remoteRes.json();
      return res.json({
        success: true,
        message: `Successfully synchronized ${Object.keys(filesToUpload).length} files to uqlearn.org!`,
        uploadedFiles: Object.keys(filesToUpload),
        remoteResponse: result
      });
    } else {
      const errText = await remoteRes.text();
      return res.status(remoteRes.status).json({
        success: false,
        message: `Remote server rejected deployment (HTTP ${remoteRes.status}). Ensure deploy.php exists on uqlearn.org.`,
        details: errText.substring(0, 500)
      });
    }
  } catch (error: any) {
    // If remote connection fails (e.g. DNS / firewall or deploy.php not yet uploaded manually)
    return res.status(500).json({
      success: false,
      message: 'Failed to push files to remote host: ' + error.message,
      hint: 'If this is the first deployment, make sure to upload deploy.php to https://uqlearn.org/api/v1/deploy.php first.'
    });
  }
});

// POST /api/v1/build - Trigger Vite production build
v1Router.post('/build', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync('npm run build', {
      timeout: 120000, // 2 minutes timeout
      maxBuffer: 1024 * 1024 * 10
    });

    const distDir = path.join(process.cwd(), 'dist');
    const distFiles = getDistFilesRecursive(distDir);
    const durationMs = Date.now() - startTime;
    const totalBytes = distFiles.reduce((acc, f) => acc + f.size, 0);

    return res.json({
      success: true,
      message: `Production build completed in ${(durationMs / 1000).toFixed(2)}s!`,
      durationMs,
      totalFiles: distFiles.length,
      totalBytes,
      totalKb: Math.round(totalBytes / 1024),
      stdout: stdout || 'Build completed successfully.',
      stderr: stderr || '',
      filesSummary: distFiles.map(f => ({
        path: f.path,
        size: f.size,
        extension: f.extension,
        isBinary: f.isBinary
      }))
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      message: `Build failed: ${error.message}`,
      durationMs,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message
    });
  }
});

// GET /api/v1/dist-files - Get list of built dist files
v1Router.get('/dist-files', (req: Request, res: Response) => {
  try {
    const distDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      return res.json({
        success: true,
        hasBuilt: false,
        totalFiles: 0,
        totalBytes: 0,
        files: [],
        message: 'No dist directory found. Run a production build first.'
      });
    }

    const distFiles = getDistFilesRecursive(distDir);
    const totalBytes = distFiles.reduce((acc, f) => acc + f.size, 0);

    return res.json({
      success: true,
      hasBuilt: true,
      totalFiles: distFiles.length,
      totalBytes,
      totalKb: Math.round(totalBytes / 1024),
      files: distFiles
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to inspect dist directory: ' + error.message
    });
  }
});

// POST /api/v1/remote-sync/deploy-dist - Deploy built dist files to uqlearn.org/deploy.php in resilient batches
v1Router.post('/remote-sync/deploy-dist', async (req: Request, res: Response) => {
  const targetUrl = req.body?.remoteUrl || 'https://uqlearn.org/deploy.php';
  const deployKey = req.body?.deployKey || 'cubiclink_sync_secret_2026';
  const selectedPaths: string[] | undefined = req.body?.filePaths;
  const cleanAssets = req.body?.cleanAssets ?? true;

  try {
    const distDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      try {
        await execAsync('npm run build', { timeout: 120000, maxBuffer: 1024 * 1024 * 10 });
      } catch (buildErr: any) {
        return res.status(400).json({
          success: false,
          message: 'No dist directory found and automated build failed: ' + (buildErr.message || 'Build error'),
          hint: 'Please click "Build Dist Production Bundle" in the Sync tab first.'
        });
      }
    }

    // Step 1: Pre-flight probe to verify deploy.php exists and is reachable
    try {
      const probeController = new AbortController();
      const probeTimeout = setTimeout(() => probeController.abort(), 10000);
      const probeRes = await fetch(targetUrl, {
        method: 'GET',
        signal: probeController.signal,
        headers: { 'X-Deploy-Key': deployKey }
      });
      clearTimeout(probeTimeout);

      if (!probeRes.ok) {
        return res.status(502).json({
          success: false,
          message: `Remote deploy worker at ${targetUrl} returned HTTP ${probeRes.status}.`,
          hint: `Please verify that deploy.php is uploaded to your cPanel web root at /home/uqlearno/public_html/deploy.php and has 0644 permissions.`
        });
      }

      const probeContentType = probeRes.headers.get('content-type') || '';
      const textSample = await probeRes.text();
      if (!probeContentType.includes('application/json') && !textSample.trim().startsWith('{')) {
        return res.status(502).json({
          success: false,
          message: `Remote URL ${targetUrl} returned HTML/text instead of deploy worker JSON.`,
          hint: `This usually means deploy.php does not exist in /public_html/ yet, causing Apache to serve the 404/SPA index.html. Please upload deploy.php to your web root.`,
          details: textSample.substring(0, 300)
        });
      }
    } catch (probeErr: any) {
      return res.status(502).json({
        success: false,
        message: `Could not connect to ${targetUrl}: ${probeErr.message}`,
        hint: `Ensure uqlearn.org is reachable, and that deploy.php is uploaded to /home/uqlearno/public_html/deploy.php.`
      });
    }

    // Step 2: Collect eligible dist files and sort so assets upload first and index.html/.htaccess upload last
    const allDistFiles = getDistFilesRecursive(distDir);
    const eligibleFiles = allDistFiles
      .filter(f => !selectedPaths || selectedPaths.includes(f.path))
      .sort((a, b) => {
        const aIsEntry = a.path === 'index.html' || a.path === '.htaccess' ? 1 : 0;
        const bIsEntry = b.path === 'index.html' || b.path === '.htaccess' ? 1 : 0;
        if (aIsEntry !== bIsEntry) return aIsEntry - bIsEntry;
        return a.size - b.size;
      });

    if (eligibleFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files selected for dist deployment.'
      });
    }

    // Step 3: Transmit in resilient batches (~1.2 MB per batch) with automatic retry to prevent shared host timeouts
    const MAX_BATCH_BYTES = 1200 * 1024;
    const batches: Array<typeof eligibleFiles> = [];
    let currentBatch: typeof eligibleFiles = [];
    let currentBatchBytes = 0;

    for (const file of eligibleFiles) {
      if (currentBatch.length > 0 && currentBatchBytes + file.size > MAX_BATCH_BYTES) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchBytes = 0;
      }
      currentBatch.push(file);
      currentBatchBytes += file.size;
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    let totalDeployedCount = 0;
    const allUpdatedFiles: any[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const textFiles: Record<string, string> = {};
      const base64Files: Record<string, string> = {};

      for (const file of batch) {
        if (file.isBinary) {
          if (file.content) base64Files[file.path] = file.content;
        } else {
          if (file.content) textFiles[file.path] = file.content;
        }
      }

      const payloadBody = JSON.stringify({
        files: textFiles,
        textFiles: textFiles,
        base64_files: base64Files,
        deploy_key: deployKey,
        clean_assets: i === 0 ? cleanAssets : false
      });

      let remoteRes: any = null;
      let lastFetchErr: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);
        try {
          remoteRes = await fetch(targetUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'X-Deploy-Key': deployKey
            },
            body: payloadBody
          });
          clearTimeout(timeoutId);
          lastFetchErr = null;
          break;
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          lastFetchErr = fetchErr;
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1500 * attempt));
          }
        }
      }

      if (lastFetchErr || !remoteRes) {
        return res.status(502).json({
          success: false,
          message: `Network failure sending batch ${i + 1}/${batches.length} to ${targetUrl}: ${lastFetchErr?.message || 'Aborted'}`,
          hint: `Check network connection or remote server timeout limits.`
        });
      }

      const responseText = await remoteRes.text();
      if (!remoteRes.ok) {
        return res.status(remoteRes.status || 502).json({
          success: false,
          message: `Deployment failed (HTTP ${remoteRes.status}) on batch ${i + 1}/${batches.length} while uploading to ${targetUrl}.`,
          details: responseText.substring(0, 500),
          hint: `Check server error logs or verify PHP post_max_size on your shared host.`
        });
      }

      try {
        const parsed = JSON.parse(responseText);
        totalDeployedCount += parsed.deployed_count || batch.length;
        if (Array.isArray(parsed.updated_files)) {
          allUpdatedFiles.push(...parsed.updated_files);
        }
      } catch {
        return res.status(502).json({
          success: false,
          message: `Remote worker returned non-JSON response on batch ${i + 1}/${batches.length} from ${targetUrl}.`,
          details: responseText.substring(0, 400)
        });
      }
    }

    return res.json({
      success: true,
      message: `Successfully deployed ${eligibleFiles.length} dist files in ${batches.length} batch(es) to ${targetUrl}!`,
      deployedCount: totalDeployedCount,
      remoteResponse: {
        success: true,
        deployed_count: totalDeployedCount,
        updated_files: allUpdatedFiles
      }
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      message: `Failed to deploy dist files: ${error.message}`,
      hint: `Ensure deploy.php exists at ${targetUrl} and is accessible.`
    });
  }
});

// GET /api/v1/recommendations and /api/v1/recommendations.php
v1Router.get(['/recommendations', '/recommendations.php'], (req: Request, res: Response) => {
  try {
    const categoriesParam = (req.query.categories as string) || '';
    const userCategories = categoriesParam ? categoriesParam.split(',').map(c => c.trim()) : [];
    
    const recs = courses
      .filter(c => c.isPublished)
      .map(c => {
        let score = 50;
        const reasons = ['Popular in catalog', 'High learner satisfaction'];
        if (userCategories.length > 0 && userCategories.includes(c.category)) {
          score += 40;
          reasons.unshift(`Matches your interest in ${c.category}`);
        }
        if (c.rating >= 4.8) {
          score += 15;
        }
        return {
          course: c,
          score,
          match_reasons: reasons,
          ai_confidence: Math.min(98, Math.max(78, 70 + Math.floor(c.rating * 5)))
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    res.json({
      success: true,
      user_enrolled_categories: userCategories,
      recommendations: recs
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// In-memory store for price adjustments in node dev environment
let priceAdjustmentsStore: any[] = [
  {
    id: 'notif-price-1',
    courseId: 'c-deep-learning-masterclass',
    courseTitle: 'Deep Learning & Computer Vision Masterclass 2026',
    courseThumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600&auto=format&fit=crop&q=80',
    instructorName: 'Dr. Angela Vance',
    instructorEmail: 'angela.vance@uqlearn.org',
    category: 'Data Science',
    type: 'price_adjustment',
    title: 'Price Adjustment Notice: Deep Learning & Computer Vision',
    message: 'Hello Dr. Vance,\n\nOur platform curriculum moderation team conducted a pricing audit of "Deep Learning & Computer Vision Masterclass 2026".\n\nThe current price ($179.99) exceeds competitive platform benchmarks ($64.99 - $89.99) for this category and length.\n\nWe recommend adjusting the price to approximately $84.99 to optimize learner enrollment conversion and qualify for platform showcase placement.',
    currentPrice: 179.99,
    suggestedPrice: 84.99,
    flagReason: 'Price exceeds category benchmark median by +112% (Benchmark: $64.99 - $89.99)',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'notif-price-2',
    courseId: 'c-enterprise-microservices',
    courseTitle: 'Enterprise Microservices Architecture with Go & gRPC',
    courseThumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    instructorName: 'Marcus Sterling',
    instructorEmail: 'marcus.sterling@uqlearn.org',
    category: 'Development',
    type: 'price_adjustment',
    title: 'Price Adjustment Notice: Enterprise Microservices Architecture',
    message: 'Hello Marcus,\n\nMarketplace telemetry identified a high checkout drop-off rate (78%) for this course. While curriculum feedback is exceptional, the $149.99 listing price is significantly above marketplace conversion thresholds.\n\nWe advise setting the price to $69.99 to increase purchase completion rates.',
    currentPrice: 149.99,
    suggestedPrice: 69.99,
    flagReason: 'Checkout cart abandonment rate 78% • Listed above category ceiling',
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'notif-price-3',
    courseId: 'c-figma-masterclass',
    courseTitle: 'Figma UI/UX Design Masterclass & Design Systems',
    courseThumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80',
    instructorName: 'Sophia Chen',
    instructorEmail: 'sophia.chen@uqlearn.org',
    category: 'Design',
    type: 'price_adjustment',
    title: 'Price Adjustment Notice: Figma UI/UX Design Masterclass',
    message: 'Recommended adjusting listing price from $119.99 to $59.99 to align with trending UX design masterclasses.',
    currentPrice: 59.99,
    suggestedPrice: 59.99,
    flagReason: 'Price alignment with design bootcamp marketplace benchmarks',
    status: 'accepted',
    resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  }
];

// GET /api/v1/price-adjustments (and .php)
v1Router.get(['/price-adjustments', '/price-adjustments.php'], (req: Request, res: Response) => {
  const { status, course_id, id } = req.query;
  if (id) {
    const item = priceAdjustmentsStore.find(p => p.id === id);
    if (!item) return res.status(404).json({ success: false, message: 'Notice not found' });
    return res.json({ success: true, data: item });
  }

  let filtered = [...priceAdjustmentsStore];
  if (status && status !== 'all') {
    filtered = filtered.filter(p => p.status === status);
  }
  if (course_id) {
    filtered = filtered.filter(p => p.courseId === course_id || p.course_id === course_id);
  }
  res.json({ success: true, data: filtered, count: filtered.length });
});

// POST /api/v1/price-adjustments (and .php)
v1Router.post(['/price-adjustments', '/price-adjustments.php'], (req: Request, res: Response) => {
  const newNotice = {
    id: req.body.id || `notif-price-${Date.now()}`,
    courseId: req.body.courseId || req.body.course_id,
    courseTitle: req.body.courseTitle || req.body.course_title || 'Untitled Course',
    courseThumbnail: req.body.courseThumbnail || req.body.course_thumbnail || '',
    instructorName: req.body.instructorName || req.body.instructor_name || 'Instructor',
    instructorEmail: req.body.instructorEmail || req.body.instructor_email || '',
    category: req.body.category || 'Development',
    type: req.body.type || 'price_adjustment',
    title: req.body.title || `Price Adjustment Notice: ${req.body.courseTitle || 'Course'}`,
    message: req.body.message || '',
    currentPrice: Number(req.body.currentPrice || req.body.current_price || 0),
    suggestedPrice: Number(req.body.suggestedPrice || req.body.suggested_price || 0),
    flagReason: req.body.flagReason || req.body.flag_reason || '',
    status: req.body.status || 'pending',
    read: Boolean(req.body.read || req.body.is_read),
    createdAt: new Date().toISOString()
  };

  const existingIdx = priceAdjustmentsStore.findIndex(p => p.id === newNotice.id);
  if (existingIdx >= 0) {
    priceAdjustmentsStore[existingIdx] = { ...priceAdjustmentsStore[existingIdx], ...newNotice };
  } else {
    priceAdjustmentsStore.unshift(newNotice);
  }

  res.status(201).json({ success: true, message: 'Price adjustment notice recorded', data: newNotice });
});

// PUT / PATCH /api/v1/price-adjustments (and .php)
v1Router.all(['/price-adjustments/:id', '/price-adjustments.php'], (req: Request, res: Response, next) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'DELETE') return next();

  const id = req.params.id || (req.query.id as string) || req.body.id;
  if (!id) return res.status(400).json({ success: false, message: 'Notice ID required' });

  const idx = priceAdjustmentsStore.findIndex(p => p.id === id);

  if (req.method === 'DELETE') {
    if (idx >= 0) priceAdjustmentsStore.splice(idx, 1);
    return res.json({ success: true, message: 'Notice deleted successfully' });
  }

  const action = req.body.action || req.query.action;
  if (idx >= 0) {
    if (action === 'accept') {
      const suggestedPrice = priceAdjustmentsStore[idx].suggestedPrice;
      const courseId = priceAdjustmentsStore[idx].courseId;
      priceAdjustmentsStore[idx].status = 'accepted';
      priceAdjustmentsStore[idx].resolvedAt = new Date().toISOString();
      priceAdjustmentsStore[idx].currentPrice = suggestedPrice;
      // Also update in courses store
      const cIdx = courses.findIndex(c => c.id === courseId);
      if (cIdx >= 0 && suggestedPrice) {
        courses[cIdx].price = suggestedPrice;
      }
    } else if (action === 'decline') {
      priceAdjustmentsStore[idx].status = 'declined';
      priceAdjustmentsStore[idx].resolvedAt = new Date().toISOString();
    } else if (action === 'dismiss') {
      priceAdjustmentsStore[idx].status = 'dismissed';
      priceAdjustmentsStore[idx].resolvedAt = new Date().toISOString();
    } else if (action === 'resend') {
      priceAdjustmentsStore[idx].status = 'pending';
      priceAdjustmentsStore[idx].reminderSentAt = new Date().toISOString();
      priceAdjustmentsStore[idx].read = false;
    } else {
      priceAdjustmentsStore[idx] = { ...priceAdjustmentsStore[idx], ...req.body };
    }
    return res.json({ success: true, data: priceAdjustmentsStore[idx] });
  }

  res.status(404).json({ success: false, message: 'Notice not found in store' });
});

// In-memory store for users
let usersStore: any[] = [
  { id: 'u-1', role: 'admin', name: 'Wamuu Rajab', email: 'wamuurajab@gmail.com', status: 'Active', joined: 'Mar 2025' },
  { id: 'u-2', role: 'admin', name: 'System Administrator', email: 'admin@uqlearn.org', status: 'Active', joined: 'Jan 2025' },
  { id: 'u-3', role: 'instructor', name: 'Angela Vance', email: 'angela.vance@mit.edu', status: 'Active', joined: 'Feb 2025' },
  { id: 'u-4', role: 'instructor', name: 'Sarah Chen', email: 'sarah.chen@designlab.io', status: 'Active', joined: 'Feb 2025' },
  { id: 'u-5', role: 'learner', name: 'Alex Rivera', email: 'alex.rivera@learner.uqlearn.com', status: 'Active', joined: 'Mar 2025' },
  { id: 'u-6', role: 'learner', name: 'David Kim', email: 'david.k@stanford.alumni.edu', status: 'Active', joined: 'Mar 2025' }
];

// GET /api/v1/users (and .php)
v1Router.get(['/users', '/users.php'], (req: Request, res: Response) => {
  const { role, id } = req.query;
  if (id) {
    const item = usersStore.find(u => u.id === id);
    if (!item) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: item });
  }

  let filtered = [...usersStore];
  if (role && role !== 'All') {
    filtered = filtered.filter(u => u.role === role);
  }
  res.json({ success: true, data: filtered, count: filtered.length });
});

// PUT / PATCH / DELETE /api/v1/users
v1Router.all(['/users/:id', '/users.php'], (req: Request, res: Response, next) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'DELETE') return next();

  const id = req.params.id || (req.query.id as string) || req.body.id;
  if (!id) return res.status(400).json({ success: false, message: 'User ID required' });

  const idx = usersStore.findIndex(u => u.id === id);

  if (req.method === 'DELETE') {
    if (idx >= 0) usersStore.splice(idx, 1);
    return res.json({ success: true, message: 'User deleted successfully' });
  }

  if (idx >= 0) {
    usersStore[idx] = { ...usersStore[idx], ...req.body };
    return res.json({ success: true, message: 'User updated successfully', data: usersStore[idx] });
  }

  res.status(404).json({ success: false, message: 'User not found in store' });
});

let localVisitorHits = 24891;
let localVisitorUniques = 12451;
let localTodayHits = 142;
let localTodayUniques = 84;

// POST & GET /api/v1/visitor-count and .php
v1Router.all(['/visitor-count', '/visitor-count.php'], (req: Request, res: Response) => {
  const action = req.query?.action;
  
  if (req.method === 'POST') {
    const isNewSession = req.body?.isNewSession === true;
    localVisitorHits += 1;
    localTodayHits += 1;
    if (isNewSession) {
      localVisitorUniques += 1;
      localTodayUniques += 1;
    }
  }

  if (action === 'get_logs') {
    // Generate simulated visitor logs for testing
    const mockIps = [
      '197.232.142.84', '102.168.1.45', '41.204.185.12', '196.201.219.14', 
      '105.163.2.190', '197.136.28.5', '41.89.20.145', '154.76.12.99', 
      '197.220.16.8', '196.12.33.104', '8.8.8.8', '66.249.66.15',
      '102.219.200.12', '197.156.90.34', '41.72.110.55'
    ];
    const mockUas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
    ];

    const logs = Array.from({ length: 45 }).map((_, i) => {
      const date = new Date();
      date.setMinutes(date.getMinutes() - i * 14);
      return {
        id: 1000 - i,
        ip: mockIps[i % mockIps.length],
        userAgent: mockUas[i % mockUas.length],
        visitedAt: date.toISOString().replace('T', ' ').substring(0, 19),
        visitDate: date.toISOString().split('T')[0]
      };
    });

    const topIps = mockIps.map((ip, idx) => ({
      ip,
      count: 420 - idx * 25,
      lastSeen: new Date().toISOString().replace('T', ' ').substring(0, 19)
    })).sort((a, b) => b.count - a.count);

    const dailyHistory = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        hits: Math.round(180 + Math.random() * 120),
        uniques: Math.round(90 + Math.random() * 50)
      };
    }).reverse();

    return res.json({
      success: true,
      data: {
        todayHits: localTodayHits,
        todayUniques: localTodayUniques,
        totalHits: localVisitorHits,
        totalUniques: localVisitorUniques,
        logs,
        dailyHistory,
        topIps
      }
    });
  }

  res.json({
    success: true,
    data: {
      todayHits: localTodayHits,
      todayUniques: localTodayUniques,
      totalHits: localVisitorHits,
      totalUniques: localVisitorUniques,
      date: new Date().toISOString().split('T')[0]
    }
  });
});

// ==========================================
// PAYOUT COUNTRIES ENDPOINTS (/payout-countries & /payout-countries.php)
// ==========================================
let localPayoutCountries: Array<{
  id: string;
  name: string;
  code?: string;
  currencyCode?: string;
  currencySymbol?: string;
  payoutMethods?: string[];
  minPayout?: number;
  processingTime?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}> = [
  {
    id: 'pc-ke',
    name: 'Kenya',
    code: 'KE',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    payoutMethods: ['Direct Bank Transfer', 'M-Pesa Business Settlement'],
    minPayout: 1000,
    processingTime: '1-2 business days',
    isActive: true,
    notes: 'Direct clearing via Central Bank of Kenya (CBK) EFT/RTGS and Safaricom M-Pesa.',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  }
];

const handlePayoutCountriesGet = (req: Request, res: Response) => {
  const activeOnly = req.query.active_only === '1' || req.query.active_only === 'true';
  const list = activeOnly 
    ? localPayoutCountries.filter(c => c.isActive !== false) 
    : [...localPayoutCountries];
  
  list.sort((a, b) => a.name.localeCompare(b.name));
  
  res.json({
    success: true,
    count: list.length,
    data: list
  });
};

const handlePayoutCountriesPost = (req: Request, res: Response) => {
  const body = req.body || {};
  const action = req.query.action || body.action || '';

  if (action === 'delete' || req.method === 'DELETE') {
    const id = req.query.id || body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Country ID is required for deletion' });
    }
    localPayoutCountries = localPayoutCountries.filter(c => c.id !== id);
    return res.json({ success: true, message: 'Payout country removed successfully' });
  }

  if (action === 'toggle_active') {
    const id = body.id;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const country = localPayoutCountries.find(c => c.id === id);
    if (country) {
      country.isActive = isActive;
      return res.json({ success: true, message: 'Status updated', isActive });
    }
    return res.status(404).json({ success: false, message: 'Country not found' });
  }

  // Create or Update
  const name = (body.name || '').trim();
  if (!name) {
    return res.status(400).json({ success: false, message: 'Country name is required' });
  }

  let code = (body.code || '').trim().toUpperCase();
  if (!code) {
    const clean = name.replace(/[^A-Za-z]/g, '');
    code = (clean.slice(0, 3) || 'CTY').toUpperCase();
  }

  const currencyCode = (body.currencyCode || body.currency_code || 'USD').trim().toUpperCase();
  const currencySymbol = (body.currencySymbol || body.currency_symbol || '$').trim();
  const minPayout = Number(body.minPayout || body.min_payout || 50.00);
  const processingTime = (body.processingTime || body.processing_time || '1-3 business days').trim();
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
  const notes = (body.notes || '').trim();
  
  let payoutMethods = body.payoutMethods || body.payout_methods || [];
  if (typeof payoutMethods === 'string') {
    payoutMethods = payoutMethods.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(payoutMethods) || payoutMethods.length === 0) {
    payoutMethods = ['Bank Transfer'];
  }

  const id = body.id || `pc-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
  const existingIdx = localPayoutCountries.findIndex(c => c.id === id || c.name.toLowerCase() === name.toLowerCase());

  const updatedCountry = {
    id,
    name,
    code,
    currencyCode,
    currencySymbol,
    payoutMethods,
    minPayout,
    processingTime,
    isActive,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    localPayoutCountries[existingIdx] = { ...localPayoutCountries[existingIdx], ...updatedCountry };
  } else {
    localPayoutCountries.push(updatedCountry);
  }

  res.json({
    success: true,
    message: 'Payout country saved successfully',
    data: updatedCountry
  });
};

v1Router.get('/payout-countries', handlePayoutCountriesGet);
v1Router.get('/payout-countries.php', handlePayoutCountriesGet);
v1Router.post('/payout-countries', handlePayoutCountriesPost);
v1Router.post('/payout-countries.php', handlePayoutCountriesPost);
v1Router.delete('/payout-countries', handlePayoutCountriesPost);
v1Router.delete('/payout-countries.php', handlePayoutCountriesPost);

// ==========================================
// SUPPORTED PAYOUT BANKS
// ==========================================
const KENYA_SUPPORTED_BANKS_DEFAULT = [
  'KCB Bank Kenya',
  'Equity Bank Kenya',
  'Co-operative Bank of Kenya',
  'NCBA Bank Kenya',
  'Absa Bank Kenya',
  'Standard Chartered Bank Kenya',
  'Stanbic Bank Kenya',
  'Diamond Trust Bank (DTB)',
  'I&M Bank Kenya',
  'Family Bank',
  'Prime Bank Kenya',
  'SBM Bank Kenya',
  'Kingdom Bank Kenya',
  'Gulf African Bank',
  'Premier Bank Kenya',
  'Credit Bank Kenya',
  'Sidian Bank',
  'Guardian Bank',
  'Bank of Africa Kenya (BOA)',
  'Consolidated Bank of Kenya',
  'Development Bank of Kenya',
  'Victoria Commercial Bank',
  'Habib Bank AG Zurich',
  'Middle East Bank Kenya',
  'UBA Kenya Bank (United Bank for Africa)',
  'Postbank (Kenya Post Office Savings Bank)',
  'Faulu Microfinance Bank',
  'Kenya Women Microfinance Bank (KWFT)',
  'Caritas Microfinance Bank',
  'DIB Bank Kenya (Dubai Islamic Bank)',
  'Mayfair CIB Bank',
  'M-Pesa (Safaricom Business Settlement)'
];

let localPayoutBanks: Array<{
  id: string;
  countryId: string;
  countryName?: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}> = KENYA_SUPPORTED_BANKS_DEFAULT.map((name, idx) => ({
  id: `pb-ke-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
  countryId: 'pc-ke',
  countryName: 'Kenya',
  name,
  isActive: true,
  createdAt: new Date(Date.now() - (KENYA_SUPPORTED_BANKS_DEFAULT.length - idx) * 60000).toISOString(),
  updatedAt: new Date().toISOString()
}));

const handlePayoutBanksGet = (req: Request, res: Response) => {
  let countryId = ((req.query.country_id || req.query.countryId || '') as string).trim();
  if (countryId === 'undefined' || countryId === 'null') {
    countryId = '';
  }
  let countryName = ((req.query.country_name || req.query.countryName || '') as string).trim();
  if (countryName === 'undefined' || countryName === 'null') {
    countryName = '';
  }
  const activeOnly = req.query.active_only === '1' || req.query.active_only === 'true';

  let list = [...localPayoutBanks];

  if (countryId) {
    const cleanId = countryId.toLowerCase();
    list = list.filter(b => b.countryId.toLowerCase() === cleanId || b.countryName?.toLowerCase() === cleanId);
  } else if (countryName) {
    const cleanName = countryName.toLowerCase();
    list = list.filter(b => b.countryName?.toLowerCase() === cleanName || b.countryId.toLowerCase() === cleanName);
  }

  if (activeOnly) {
    list = list.filter(b => b.isActive !== false);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    success: true,
    count: list.length,
    data: list
  });
};

const handlePayoutBanksPost = (req: Request, res: Response) => {
  const body = req.body || {};
  const action = (req.query.action || body.action || '') as string;
  const method = req.method.toUpperCase();

  if (action === 'delete' || method === 'DELETE') {
    const id = (req.query.id || body.id) as string;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Bank ID is required for deletion' });
    }
    localPayoutBanks = localPayoutBanks.filter(b => b.id !== id);
    return res.json({ success: true, message: 'Bank deleted successfully', id });
  }

  if (action === 'toggle_active' || (method === 'PATCH' && (body.active !== undefined || body.isActive !== undefined || req.query.active !== undefined))) {
    const id = (body.id || req.query.id) as string;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Bank ID is required' });
    }
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : (body.active !== undefined ? Boolean(body.active) : true);
    const bank = localPayoutBanks.find(b => b.id === id);
    if (bank) {
      bank.isActive = isActive;
      bank.updatedAt = new Date().toISOString();
      return res.json({ success: true, message: 'Status updated successfully', id, isActive });
    }
    return res.status(404).json({ success: false, message: 'Bank not found' });
  }

  // Handle seed kenya
  if (action === 'seed_kenya') {
    return res.json({
      success: true,
      message: 'Kenya banks seeded successfully',
      count: localPayoutBanks.filter(b => b.countryId === 'pc-ke').length
    });
  }

  // Create or update
  const id = ((body.id || req.query.id) as string || '').trim();
  const name = ((body.name || '') as string).trim();
  const countryId = ((body.countryId || body.country_id || req.query.countryId || req.query.country_id) as string || '').trim();
  const countryName = ((body.countryName || body.country_name || req.query.countryName || req.query.country_name) as string || '').trim();
  const code = ((body.code || '') as string).trim();
  const hasActive = body.isActive !== undefined || body.active !== undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : (body.active !== undefined ? Boolean(body.active) : true);

  const existingIdx = id ? localPayoutBanks.findIndex(b => b.id === id) : -1;

  if (existingIdx >= 0) {
    const existing = localPayoutBanks[existingIdx];
    const updatedRecord = {
      ...existing,
      name: name || existing.name,
      code: code !== undefined ? code : existing.code,
      countryId: countryId || existing.countryId,
      countryName: countryName || existing.countryName,
      isActive: hasActive ? isActive : existing.isActive,
      updatedAt: new Date().toISOString()
    };
    localPayoutBanks[existingIdx] = updatedRecord;
    return res.json({
      success: true,
      message: 'Bank updated successfully',
      data: updatedRecord
    });
  }

  if (!name) {
    return res.status(400).json({ success: false, message: 'Bank name is required' });
  }

  const finalCountryId = countryId || (countryName.toLowerCase() === 'kenya' ? 'pc-ke' : '');
  if (!finalCountryId) {
    return res.status(400).json({ success: false, message: 'Country ID is required' });
  }

  const newId = id || `pb-${finalCountryId.replace('pc-', '')}-${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)}-${Date.now().toString().slice(-4)}`;
  const newBankRecord = {
    id: newId,
    countryId: finalCountryId,
    countryName: countryName || (finalCountryId === 'pc-ke' ? 'Kenya' : ''),
    name,
    code: code || '',
    isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  localPayoutBanks.push(newBankRecord);

  res.json({
    success: true,
    message: 'Bank saved successfully',
    data: newBankRecord
  });
};

v1Router.get('/payout-banks', handlePayoutBanksGet);
v1Router.get('/payout-banks.php', handlePayoutBanksGet);
v1Router.post('/payout-banks', handlePayoutBanksPost);
v1Router.post('/payout-banks.php', handlePayoutBanksPost);
v1Router.put('/payout-banks', handlePayoutBanksPost);
v1Router.put('/payout-banks.php', handlePayoutBanksPost);
v1Router.patch('/payout-banks', handlePayoutBanksPost);
v1Router.patch('/payout-banks.php', handlePayoutBanksPost);
v1Router.delete('/payout-banks', handlePayoutBanksPost);
v1Router.delete('/payout-banks.php', handlePayoutBanksPost);

// Local User Videos Store & Endpoints
interface UserVideoRecord {
  id: string;
  user_id: string;
  user_email?: string;
  filename: string;
  url: string;
  file_path: string;
  folder: string;
  folder_id?: string;
  source: string;
  file_size: number;
  title?: string;
  created_at: string;
}

interface VideoFolderRecord {
  id: string;
  user_id: string;
  course_id?: string | null;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

const localVideoFolders: VideoFolderRecord[] = [];

const localUserVideos: UserVideoRecord[] = [
  {
    id: 'vid_sample_1',
    user_id: 'instructor_user',
    filename: 'Sample_Lecture_HD.mp4',
    url: '/uploads/film-edit-studio/sample_lecture_hd.mp4',
    file_path: '/uploads/film-edit-studio/sample_lecture_hd.mp4',
    folder: 'film-edit-studio',
    source: 'film_and_edit',
    file_size: 68157440,
    title: 'Sample Lecture Footage (HD 1080p)',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

const handleUserVideosGet = (req: Request, res: Response) => {
  const userId = (req.query.user_id || req.query.userId || req.headers['x-user-id'] || '') as string;
  const folder = (req.query.folder || '') as string;
  const folderId = (req.query.folder_id || req.query.folderId || '') as string;
  const limit = parseInt((req.query.limit || '100') as string, 10);

  let filtered = [...localUserVideos];
  if (userId && userId !== 'instructor_user' && userId !== 'anonymous' && userId !== 'me') {
    filtered = filtered.filter(v => 
      (v.user_id && v.user_id.toLowerCase() === userId.toLowerCase()) || 
      (v.user_email && v.user_email.toLowerCase() === userId.toLowerCase())
    );
  } else if (userId === 'instructor_user' || userId === 'anonymous') {
    filtered = filtered.filter(v => !v.user_id || v.user_id === 'instructor_user' || v.user_id === 'anonymous' || v.user_id === userId);
  }
  if (folderId) {
    filtered = filtered.filter(v => v.folder_id === folderId);
  } else if (folder) {
    filtered = filtered.filter(v => v.folder.toLowerCase() === folder.toLowerCase());
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const formatted = filtered.slice(0, limit).map(v => ({
    id: v.id,
    user_id: v.user_id,
    uploadedBy: v.user_id,
    filename: v.filename,
    name: v.filename,
    url: v.url,
    file_path: v.file_path,
    folder: v.folder,
    folder_id: v.folder_id || null,
    source: v.source,
    file_size: v.file_size,
    title: v.title || v.filename,
    created_at: v.created_at
  }));

  return res.json({
    success: true,
    count: formatted.length,
    videos: formatted
  });
};

const handleUserVideosPost = (req: Request, res: Response) => {
  const body = req.body || {};

  // Quick action move
  if (body.action === 'move') {
    const videoId = (body.videoId || body.id || '') as string;
    const targetFolder = (body.folder || 'film-edit-studio') as string;
    const targetFolderId = (body.folder_id || body.folderId || null) as string | null;

    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Missing video ID.' });
    }

    const vIdx = localUserVideos.findIndex(v => v.id === videoId);
    if (vIdx >= 0) {
      localUserVideos[vIdx].folder = targetFolder;
      localUserVideos[vIdx].folder_id = targetFolderId || undefined;
    }

    return res.json({
      success: true,
      message: 'Video moved successfully.',
      videoId,
      folder: targetFolder,
      folder_id: targetFolderId
    });
  }

  const userId = (body.user_id || body.userId || req.headers['x-user-id'] || 'instructor_user') as string;
  const filename = (body.filename || body.name || `video_${Date.now()}.mp4`) as string;
  const url = (body.url || body.file_path || '') as string;
  const filePath = (body.file_path || url) as string;
  const folder = (body.folder || 'film-edit-studio') as string;
  const folderId = (body.folder_id || body.folderId || undefined) as string | undefined;
  const source = (body.source || 'film_and_edit') as string;
  const fileSize = parseInt((body.file_size || body.size || '0') as string, 10);
  const title = (body.title || filename) as string;
  const id = (body.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`) as string;
  const createdAt = new Date().toISOString();

  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing video URL or file_path parameter.' });
  }

  const record: UserVideoRecord = {
    id,
    user_id: userId,
    filename,
    url,
    file_path: filePath,
    folder,
    folder_id: folderId,
    source,
    file_size: fileSize,
    title,
    created_at: createdAt
  };

  const existingIdx = localUserVideos.findIndex(v => v.id === id);
  if (existingIdx >= 0) {
    localUserVideos[existingIdx] = record;
  } else {
    localUserVideos.unshift(record);
  }

  return res.json({
    success: true,
    message: 'Video record saved successfully.',
    video: record
  });
};

const handleUserVideosDelete = (req: Request, res: Response) => {
  const id = (req.query.id || req.body?.id || '') as string;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing video ID.' });
  }
  const idx = localUserVideos.findIndex(v => v.id === id);
  if (idx >= 0) {
    localUserVideos.splice(idx, 1);
  }
  return res.json({ success: true, message: 'Video record deleted.' });
};

// Video Folders Handlers
const handleVideoFoldersGet = (req: Request, res: Response) => {
  const userId = (req.query.user_id || req.query.userId || '') as string;
  const courseId = (req.query.course_id || req.query.courseId || '') as string;

  let folders = [...localVideoFolders];
  if (userId) {
    folders = folders.filter(f => f.user_id === userId || f.user_id === 'instructor_user' || f.user_id === 'global');
  }
  if (courseId) {
    folders = folders.filter(f => !f.course_id || f.course_id === courseId);
  }

  const formatted = folders.map(f => {
    const videoCount = localUserVideos.filter(v => v.folder_id === f.id || v.folder === f.name).length;
    return {
      id: f.id,
      userId: f.user_id,
      courseId: f.course_id,
      name: f.name,
      color: f.color,
      videoCount,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    };
  });

  return res.json({
    success: true,
    count: formatted.length,
    folders: formatted
  });
};

const handleVideoFoldersPost = (req: Request, res: Response) => {
  const body = req.body || {};
  const action = (body.action || 'create') as string;

  if (action === 'move_video') {
    const videoId = (body.videoId || body.video_id || '') as string;
    const targetFolder = (body.folder || body.targetFolder || '') as string;
    const targetFolderId = (body.folderId || body.targetFolderId || null) as string | null;

    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Missing videoId.' });
    }

    const vIdx = localUserVideos.findIndex(v => v.id === videoId);
    if (vIdx >= 0) {
      localUserVideos[vIdx].folder = targetFolder;
      localUserVideos[vIdx].folder_id = targetFolderId || undefined;
    }

    return res.json({
      success: true,
      message: 'Video moved successfully.',
      videoId,
      folder: targetFolder,
      folderId: targetFolderId
    });
  }

  if (action === 'rename') {
    const folderId = (body.id || body.folderId || '') as string;
    const newName = ((body.name || body.newName || '') as string).trim();

    if (!folderId || !newName) {
      return res.status(400).json({ success: false, message: 'Folder ID and new name are required.' });
    }

    const fIdx = localVideoFolders.findIndex(f => f.id === folderId);
    if (fIdx >= 0) {
      localVideoFolders[fIdx].name = newName;
      localVideoFolders[fIdx].updated_at = new Date().toISOString();
      // Update videos that pointed to old name
      localUserVideos.forEach(v => {
        if (v.folder_id === folderId) {
          v.folder = newName;
        }
      });
    }

    return res.json({
      success: true,
      message: 'Folder renamed successfully.',
      folder: { id: folderId, name: newName }
    });
  }

  // Create folder
  const name = ((body.name || '') as string).trim();
  if (!name) {
    return res.status(400).json({ success: false, message: 'Folder name is required.' });
  }

  const userId = (body.userId || body.user_id || 'instructor_user') as string;
  const courseId = (body.courseId || body.course_id || null) as string | null;
  const color = (body.color || 'indigo') as string;
  const id = (body.id || `vfolder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`) as string;
  const now = new Date().toISOString();

  const newFolder: VideoFolderRecord = {
    id,
    user_id: userId,
    course_id: courseId,
    name,
    color,
    created_at: now,
    updated_at: now
  };

  localVideoFolders.push(newFolder);

  return res.json({
    success: true,
    message: 'Folder created successfully.',
    folder: {
      ...newFolder,
      videoCount: 0
    }
  });
};

const handleVideoFoldersDelete = (req: Request, res: Response) => {
  const folderId = (req.query.id || req.query.folderId || req.body?.id || req.body?.folderId || '') as string;
  if (!folderId) {
    return res.status(400).json({ success: false, message: 'Folder ID is required for deletion.' });
  }

  const idx = localVideoFolders.findIndex(f => f.id === folderId);
  if (idx >= 0) {
    localVideoFolders.splice(idx, 1);
  }

  // Reset videos that were in this folder
  localUserVideos.forEach(v => {
    if (v.folder_id === folderId) {
      v.folder = 'film-edit-studio';
      delete v.folder_id;
    }
  });

  return res.json({
    success: true,
    message: 'Folder deleted successfully. Linked videos moved to root.'
  });
};

v1Router.get('/user-videos', handleUserVideosGet);
v1Router.get('/user-videos.php', handleUserVideosGet);
v1Router.post('/user-videos', handleUserVideosPost);
v1Router.post('/user-videos.php', handleUserVideosPost);
v1Router.delete('/user-videos', handleUserVideosDelete);
v1Router.delete('/user-videos.php', handleUserVideosDelete);

v1Router.get('/video-folders', handleVideoFoldersGet);
v1Router.get('/video-folders.php', handleVideoFoldersGet);
v1Router.post('/video-folders', handleVideoFoldersPost);
v1Router.post('/video-folders.php', handleVideoFoldersPost);
v1Router.delete('/video-folders', handleVideoFoldersDelete);
v1Router.delete('/video-folders.php', handleVideoFoldersDelete);

// Sponsored Ads In-Memory State & Endpoints
interface SponsoredAdRecord {
  id: number | string;
  course_id: string;
  instructor_id: string;
  instructor_name?: string;
  instructor_email?: string;
  course_title?: string;
  course_thumbnail?: string;
  course_price?: number;
  plan_id?: string;
  plan_name?: string;
  duration_days?: number;
  amount_paid?: number;
  currency?: string;
  payment_method?: string;
  payment_status?: string;
  status: string;
  start_date: string;
  end_date: string;
  impressions_count: number;
  clicks_count: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SPONSORED_PLANS = [
  {
    id: 'starter_7d',
    name: 'Starter Boost (7 Days)',
    description: 'Promote your course across high-traffic section carousels and top catalog feeds for 1 week.',
    duration_days: 7,
    price: 9.99,
    badge_tag: 'Starter',
    features: ['Top of category placement', 'Google-style Sponsored Badge', 'Real-time impression & click analytics', '7 Days Duration'],
    is_active: 1
  },
  {
    id: 'growth_14d',
    name: 'Growth Spotlight (14 Days)',
    description: 'Elevated prominence across search queries, landing page carousels, and related course panels.',
    duration_days: 14,
    price: 18.99,
    badge_tag: 'Popular',
    features: ['Homepage carousel featured badge', 'Search result priority rank', 'Full 2-week active promotion', 'Priority Support'],
    is_active: 1
  },
  {
    id: 'pro_30d',
    name: 'Authority Dominance (30 Days)',
    description: 'Maximum marketplace reach, persistent ad exposure, and top-tier promotional badge for 1 month.',
    duration_days: 30,
    price: 34.99,
    badge_tag: 'Best Value',
    features: ['Permanent #1 Category slot', 'All landing page carousels', '30-Day continuous boost', 'Dedicated account review'],
    is_active: 1
  }
];

let localSponsoredAds: SponsoredAdRecord[] = [];

const handleSponsoredAds = (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Id, Accept, Origin');

  const action = (req.query.action || req.body?.action || 'active') as string;

  if (action === 'plans') {
    return res.json({ success: true, count: DEFAULT_SPONSORED_PLANS.length, plans: DEFAULT_SPONSORED_PLANS });
  }

  if (action === 'active') {
    const active = localSponsoredAds.filter(ad => ad.status === 'active');
    return res.json({ success: true, count: active.length, sponsored: active });
  }

  if (action === 'all') {
    return res.json({ success: true, count: localSponsoredAds.length, sponsored_ads: localSponsoredAds });
  }

  if (action === 'instructor') {
    const instructorId = (req.query.instructor_id || req.body?.instructor_id || '') as string;
    const instructorAds = localSponsoredAds.filter(ad => !instructorId || ad.instructor_id === instructorId);
    return res.json({ success: true, count: instructorAds.length, sponsored_ads: instructorAds });
  }

  if (action === 'apply') {
    const body = req.body || {};
    const newAd: SponsoredAdRecord = {
      id: Date.now(),
      course_id: body.courseId || body.course_id || '',
      instructor_id: body.instructorId || body.instructor_id || 'inst-1',
      instructor_name: body.instructorName || body.instructor_name || 'Instructor',
      instructor_email: body.instructorEmail || body.instructor_email || '',
      course_title: body.courseTitle || body.course_title || '',
      course_thumbnail: body.courseThumbnail || body.course_thumbnail || '',
      course_price: Number(body.coursePrice || body.course_price || 0),
      plan_id: body.planId || body.plan_id || 'starter_7d',
      plan_name: body.planName || body.plan_name || 'Starter Boost (7 Days)',
      duration_days: Number(body.durationDays || body.duration_days || 7),
      amount_paid: Number(body.amountPaid || body.amount_paid || 9.99),
      currency: body.currency || 'USD',
      payment_method: body.paymentMethod || body.payment_method || 'wallet',
      payment_status: 'completed',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + (Number(body.durationDays || 7) * 86400000)).toISOString(),
      impressions_count: 0,
      clicks_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localSponsoredAds.unshift(newAd);
    return res.json({ success: true, message: 'Sponsored ad active and approved successfully.', data: newAd });
  }

  if (action === 'update_status') {
    const body = req.body || {};
    const id = body.id;
    const status = body.status;
    const target = localSponsoredAds.find(ad => String(ad.id) === String(id));
    if (target) {
      target.status = status || target.status;
      if (body.admin_notes) target.admin_notes = body.admin_notes;
      target.updated_at = new Date().toISOString();
      return res.json({ success: true, message: 'Sponsored ad status updated.', data: target });
    }
    return res.json({ success: true, message: 'Updated.' });
  }

  if (action === 'delete') {
    const body = req.body || {};
    const id = body.id || req.query.id;
    localSponsoredAds = localSponsoredAds.filter(ad => String(ad.id) !== String(id));
    return res.json({ success: true, message: 'Sponsored ad deleted.' });
  }

  if (action === 'record_impression') {
    const courseId = req.body?.course_id || req.query.course_id;
    const target = localSponsoredAds.find(ad => ad.course_id === courseId);
    if (target) target.impressions_count += 1;
    return res.json({ success: true, recorded: true });
  }

  if (action === 'record_click') {
    const courseId = req.body?.course_id || req.query.course_id;
    const target = localSponsoredAds.find(ad => ad.course_id === courseId);
    if (target) target.clicks_count += 1;
    return res.json({ success: true, recorded: true });
  }

  return res.json({ success: true, sponsored: localSponsoredAds.filter(ad => ad.status === 'active') });
};

v1Router.get('/sponsored_ads.php', handleSponsoredAds);
v1Router.post('/sponsored_ads.php', handleSponsoredAds);
v1Router.get('/sponsored-ads', handleSponsoredAds);
v1Router.post('/sponsored-ads', handleSponsoredAds);
v1Router.get('/sponsored_ads', handleSponsoredAds);
v1Router.post('/sponsored_ads', handleSponsoredAds);

// ==========================================
// SUBSCRIPTIONS & ENROLLMENTS ENDPOINT
// ==========================================
interface SubscriptionRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_id: string;
  course_title: string;
  course_price: number;
  payment_method: string;
  transaction_code: string;
  status: 'pending' | 'active' | 'rejected';
  enrolled_at: string;
  activated_at?: string | null;
  activated_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

let localSubscriptionsStore: SubscriptionRecord[] = [
  {
    id: 'sub_6a9dcb898bed3',
    student_id: 'usr_1143d720d1a31906',
    student_name: 'Michael Onare',
    student_email: 'omaremichael8808@gmail.com',
    course_id: 'course-1788215329900',
    course_title: 'Project Management Professional (PMP) Prep',
    course_price: 38.00,
    payment_method: 'payhero_stk',
    transaction_code: 'UI6M25XZZO',
    status: 'active',
    enrolled_at: '2026-09-06 23:22:33',
    activated_at: '2026-09-06 23:22:48'
  },
  {
    id: 'sub_6aae4930a801b',
    student_id: 'usr_f801a5714e86deb8',
    student_name: 'mike kenyanya',
    student_email: 'michaelomare045@gmail.com',
    course_id: 'course-1788473456498',
    course_title: 'Canva Mastery',
    course_price: 26.00,
    payment_method: 'payhero_stk',
    transaction_code: 'UIJM27F880',
    status: 'active',
    enrolled_at: '2026-09-19 11:34:56',
    activated_at: '2026-09-19 11:35:11'
  }
];

const handleSubscriptionsApi = (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Id, Accept, Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};
  const body = req.body || {};
  const action = body.action || query.action || '';

  // GET or GET-like action
  if (req.method === 'GET' || action === 'get_subscriptions') {
    const studentId = (query.student_id || query.studentId || query.user_id || query.userId || body.student_id || body.studentId || '') as string;
    const studentEmail = (query.student_email || query.studentEmail || query.email || body.student_email || body.studentEmail || '') as string;
    const status = (query.status || body.status || '') as string;
    const courseId = (query.course_id || query.courseId || body.course_id || body.courseId || '') as string;
    const id = (query.id || body.id || '') as string;

    let filtered = [...localSubscriptionsStore];

    if (id) {
      filtered = filtered.filter(s => s.id === id);
    }

    if (studentId) {
      filtered = filtered.filter(s => 
        s.student_id === studentId || 
        (studentEmail && s.student_email.toLowerCase() === studentEmail.toLowerCase())
      );
    } else if (studentEmail) {
      filtered = filtered.filter(s => s.student_email.toLowerCase() === studentEmail.toLowerCase());
    }

    if (courseId) {
      filtered = filtered.filter(s => s.course_id === courseId);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(s => s.status === status);
    }

    const normalized = filtered.map(s => ({
      id: s.id,
      studentId: s.student_id,
      student_id: s.student_id,
      studentName: s.student_name,
      student_name: s.student_name,
      studentEmail: s.student_email,
      student_email: s.student_email,
      courseId: s.course_id,
      course_id: s.course_id,
      courseTitle: s.course_title,
      course_title: s.course_title,
      coursePrice: s.course_price,
      course_price: s.course_price,
      paymentMethod: s.payment_method,
      payment_method: s.payment_method,
      transactionCode: s.transaction_code,
      transaction_code: s.transaction_code,
      status: s.status,
      enrolledAt: s.enrolled_at ? new Date(s.enrolled_at).toISOString() : new Date().toISOString(),
      enrolled_at: s.enrolled_at || new Date().toISOString(),
      activatedAt: s.activated_at ? new Date(s.activated_at).toISOString() : null,
      activated_at: s.activated_at || null,
      activatedBy: s.activated_by || null,
      notes: s.notes || null
    }));

    return res.json({
      success: true,
      count: normalized.length,
      data: normalized
    });
  }

  // POST Actions
  if (req.method === 'POST') {
    if (action === 'activate_subscription' || action === 'activate') {
      const subId = body.subscriptionId || body.id;
      const txCode = body.verifiedTransactionCode || body.transaction_code || body.transactionCode;
      const activatedBy = body.activatedByAdmin || body.activated_by || 'System';

      const target = localSubscriptionsStore.find(s => s.id === subId);
      if (target) {
        target.status = 'active';
        target.activated_at = new Date().toISOString();
        target.activated_by = activatedBy;
        if (txCode) target.transaction_code = txCode;
        return res.json({ success: true, message: 'Subscription activated.', data: target });
      }
      return res.status(404).json({ success: false, message: 'Subscription record not found.' });
    }

    if (action === 'reject_subscription' || action === 'reject') {
      const subId = body.subscriptionId || body.id;
      const target = localSubscriptionsStore.find(s => s.id === subId);
      if (target) {
        target.status = 'rejected';
        target.notes = body.notes || 'Rejected';
        return res.json({ success: true, message: 'Subscription rejected.' });
      }
      return res.status(404).json({ success: false, message: 'Subscription record not found.' });
    }

    // Default: Create / Upsert Subscription
    const subId = body.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSub: SubscriptionRecord = {
      id: subId,
      student_id: body.studentId || body.student_id || 'usr_unknown',
      student_name: body.studentName || body.student_name || 'Student',
      student_email: (body.studentEmail || body.student_email || '').toLowerCase(),
      course_id: body.courseId || body.course_id || 'course_unknown',
      course_title: body.courseTitle || body.course_title || 'Untitled Course',
      course_price: Number(body.coursePrice || body.course_price || 0),
      payment_method: body.paymentMethod || body.payment_method || 'payhero_stk',
      transaction_code: body.transactionCode || body.transaction_code || '',
      status: body.status || 'pending',
      enrolled_at: body.enrolledAt || body.enrolled_at || new Date().toISOString(),
      activated_at: body.status === 'active' ? new Date().toISOString() : null,
      notes: body.notes || null
    };

    const existingIdx = localSubscriptionsStore.findIndex(s => s.id === subId);
    if (existingIdx >= 0) {
      localSubscriptionsStore[existingIdx] = { ...localSubscriptionsStore[existingIdx], ...newSub };
    } else {
      localSubscriptionsStore.unshift(newSub);
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription record created successfully.',
      data: newSub
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
};

v1Router.get('/subscriptions.php', handleSubscriptionsApi);
v1Router.post('/subscriptions.php', handleSubscriptionsApi);
v1Router.get('/subscriptions', handleSubscriptionsApi);
v1Router.post('/subscriptions', handleSubscriptionsApi);

// ---------------------------------------------------------------------------
// Promotion Tiers & Ad Packages Management API
// ---------------------------------------------------------------------------
let localPromotionTiers = [
  {
    id: 'sponsored',
    badgeType: 'sponsored',
    name: 'Sponsored Placement',
    badgeLabel: 'Sponsored',
    description: 'Ranks your course at the top of category listings and search results with an official Sponsored label.',
    features: [
      '5x more student impressions',
      'Guaranteed top search ranking',
      'Targeted audience category match'
    ],
    dailyRateUsd: 3.5,
    ctaText: 'Boost as Sponsored',
    isActive: true,
    accentColor: 'indigo',
    sortOrder: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bestseller',
    badgeType: 'bestseller',
    name: 'Best Seller Ribbon',
    badgeLabel: 'Best Seller',
    description: 'Earns the coveted gold Best Seller ribbon badge across all cards and detail pages to maximize student trust.',
    features: [
      '3.8x higher student conversion rate',
      'Social proof & high-trust ribbon',
      'Featured in "Popular & Bestsellers"'
    ],
    dailyRateUsd: 5.0,
    ctaText: 'Get Best Seller',
    isActive: true,
    accentColor: 'amber',
    sortOrder: 2,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'premium',
    badgeType: 'premium',
    name: 'Premium Spotlight',
    badgeLabel: 'Premium',
    description: "The ultimate prestige tier. Features your course in the Homepage Hero Carousel and Editor's Picks.",
    features: [
      'Homepage carousel banner display',
      'VIP learner newsletter spotlight',
      'Verified Premium badge & styling'
    ],
    dailyRateUsd: 7.5,
    ctaText: 'Get Premium',
    isActive: true,
    accentColor: 'purple',
    sortOrder: 3,
    updatedAt: new Date().toISOString()
  }
];

const handlePromotionTiersApi = (req: Request, res: Response) => {
  if (req.method === 'GET') {
    const all = req.query.all === 'true';
    const result = all ? localPromotionTiers : localPromotionTiers.filter(t => t.isActive);
    return res.json({
      success: true,
      count: result.length,
      tiers: result
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const action = body.action || 'save_tiers';

    if (action === 'reset_defaults') {
      localPromotionTiers = [
        {
          id: 'sponsored',
          badgeType: 'sponsored',
          name: 'Sponsored Placement',
          badgeLabel: 'Sponsored',
          description: 'Ranks your course at the top of category listings and search results with an official Sponsored label.',
          features: [
            '5x more student impressions',
            'Guaranteed top search ranking',
            'Targeted audience category match'
          ],
          dailyRateUsd: 3.5,
          ctaText: 'Boost as Sponsored',
          isActive: true,
          accentColor: 'indigo',
          sortOrder: 1,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'bestseller',
          badgeType: 'bestseller',
          name: 'Best Seller Ribbon',
          badgeLabel: 'Best Seller',
          description: 'Earns the coveted gold Best Seller ribbon badge across all cards and detail pages to maximize student trust.',
          features: [
            '3.8x higher student conversion rate',
            'Social proof & high-trust ribbon',
            'Featured in "Popular & Bestsellers"'
          ],
          dailyRateUsd: 5.0,
          ctaText: 'Get Best Seller',
          isActive: true,
          accentColor: 'amber',
          sortOrder: 2,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'premium',
          badgeType: 'premium',
          name: 'Premium Spotlight',
          badgeLabel: 'Premium',
          description: "The ultimate prestige tier. Features your course in the Homepage Hero Carousel and Editor's Picks.",
          features: [
            'Homepage carousel banner display',
            'VIP learner newsletter spotlight',
            'Verified Premium badge & styling'
          ],
          dailyRateUsd: 7.5,
          ctaText: 'Get Premium',
          isActive: true,
          accentColor: 'purple',
          sortOrder: 3,
          updatedAt: new Date().toISOString()
        }
      ];
      return res.json({ success: true, message: 'Reset to default tiers successfully.', tiers: localPromotionTiers });
    }

    if (action === 'save_tier' && body.tier) {
      const t = body.tier;
      const idx = localPromotionTiers.findIndex(item => item.id === t.id);
      if (idx >= 0) {
        localPromotionTiers[idx] = { ...localPromotionTiers[idx], ...t, updatedAt: new Date().toISOString() };
      } else {
        localPromotionTiers.push({ ...t, updatedAt: new Date().toISOString() });
      }
      return res.json({ success: true, message: `Tier '${t.name}' saved successfully.`, tiers: localPromotionTiers });
    }

    if (action === 'save_tiers' && Array.isArray(body.tiers)) {
      localPromotionTiers = body.tiers.map((t: any) => ({
        ...t,
        updatedAt: new Date().toISOString()
      }));
      return res.json({ success: true, message: 'All promotion tiers saved successfully.', tiers: localPromotionTiers });
    }

    return res.status(400).json({ success: false, message: 'Invalid action or parameters.' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
};

// ---------------------------------------------------------------------------
// Learning Reminders API
// ---------------------------------------------------------------------------
let localReminders: Array<{ title: string, day: string, time: string }> = [
  { title: 'Learn React Basics', day: 'Monday', time: '07:00 PM' },
  { title: 'Advanced Hooks', day: 'Wednesday', time: '07:00 PM' },
  { title: 'Project Review', day: 'Saturday', time: '10:00 AM' }
];

const handleRemindersApi = (req: Request, res: Response) => {
  if (req.method === 'GET') {
    return res.json({ success: true, reminders: localReminders });
  }

  if (req.method === 'POST') {
    const { title, day, time } = req.body;
    if (!title || !day || !time) {
      return res.status(400).json({ success: false, message: 'Invalid data.' });
    }
    localReminders.push({ title, day, time });
    return res.json({ success: true, message: 'Reminder added.' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
};

v1Router.get('/reminders.php', handleRemindersApi);
v1Router.post('/reminders.php', handleRemindersApi);
v1Router.get('/reminders', handleRemindersApi);
v1Router.post('/reminders', handleRemindersApi);

// TikTok Pixel Integration API
interface TiktokIntegrationRecord {
  pixelId: string;
  accessToken?: string;
  status: string;
}
let tiktokIntegrations: Record<string, TiktokIntegrationRecord> = {};

const handleTiktokPixelApi = (req: Request, res: Response) => {
  if (req.method === 'GET') {
    const userId = (req.query.userId as string) || (req.query.user_id as string) || '';
    const record = tiktokIntegrations[userId] || { pixelId: '', accessToken: '', status: 'inactive' };
    return res.json({ success: true, pixelId: record.pixelId, accessToken: record.accessToken || '', status: record.pixelId ? 'active' : 'inactive' });
  }

  if (req.method === 'POST') {
    const { userId, pixelId, accessToken } = req.body;
    if (!userId || !pixelId) {
      return res.status(400).json({ success: false, message: 'User ID and Pixel ID are required.' });
    }
    tiktokIntegrations[userId] = {
      pixelId,
      accessToken: accessToken || '',
      status: 'active'
    };
    return res.json({ success: true, message: 'TikTok Pixel ID and Events API Access Token saved successfully!', pixelId, accessToken });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
};

v1Router.get(['/tiktok-pixel.php', '/tiktok-pixel', '/instructor/integrations.php', '/instructor/integrations'], handleTiktokPixelApi);
v1Router.post(['/tiktok-pixel.php', '/tiktok-pixel', '/instructor/integrations.php', '/instructor/integrations'], handleTiktokPixelApi);

export default v1Router;
