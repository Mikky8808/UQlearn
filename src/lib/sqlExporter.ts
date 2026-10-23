import { Course } from '../types';

/**
 * Generates ready-to-run MySQL INSERT statements matching the schema in /api/v1/schema.sql
 * and /api/v1/db.php for the jimg_web database.
 */
export function generateCourseSql(course: Partial<Course>): string {
  const escapeSql = (str: any) => {
    if (str === null || str === undefined) return "''";
    return "'" + String(str).replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
  };

  const courseId = course.id || `course-${Date.now()}`;
  const title = escapeSql(course.title || 'Untitled Course');
  const subtitle = escapeSql(course.subtitle || '');
  const description = escapeSql(course.description || '');
  const instructor = escapeSql(course.instructor || 'Dr. Angela Vance');
  const instructorTitle = escapeSql(course.instructorTitle || 'Senior Instructor');
  const instructorAvatar = escapeSql(course.instructorAvatar || '');
  const createdBy = escapeSql(course.createdBy || course.created_by || 'usr_45e453fb57306121');
  const category = escapeSql(course.category || 'Development');
  const level = escapeSql(course.level || 'Beginner');
  const price = Number(course.price) || 49.99;
  const originalPrice = Number(course.originalPrice) || 99.99;
  const rating = Number(course.rating) || 5.0;
  const reviewCount = Number(course.reviewCount) || 0;
  const learnersEnrolled = Number(course.learnersEnrolled) || 0;
  const image = escapeSql(course.image || '');
  const duration = escapeSql(course.duration || '10.0 hours');
  const isPublished = course.isPublished !== false ? 1 : 0;
  const isApprovedByAdmin = course.isApprovedByAdmin ? 1 : 0;
  const bestSeller = course.bestSeller ? 1 : 0;

  let sql = `-- ==========================================================================\n`;
  sql += `-- SQL INSERT SCRIPT FOR: ${course.title || 'Course'} (${courseId})\n`;
  sql += `-- Generated for MySQL Database: jimg_web (/api/v1/db.php)\n`;
  sql += `-- ==========================================================================\n\n`;

  sql += `START TRANSACTION;\n\n`;

  // Course Insert
  sql += `-- 1. Insert Course Record\n`;
  sql += `INSERT INTO \`courses\` (\n`;
  sql += `  \`id\`, \`title\`, \`subtitle\`, \`description\`, \`instructor\`,\n`;
  sql += `  \`instructor_title\`, \`instructor_avatar\`, \`created_by\`, \`category\`, \`level\`,\n`;
  sql += `  \`price\`, \`original_price\`, \`rating\`, \`review_count\`,\n`;
  sql += `  \`learners_enrolled\`, \`image\`, \`duration\`, \`is_published\`, \`is_approved_by_admin\`, \`best_seller\`\n`;
  sql += `) VALUES (\n`;
  sql += `  ${escapeSql(courseId)}, ${title}, ${subtitle}, ${description}, ${instructor},\n`;
  sql += `  ${instructorTitle}, ${instructorAvatar}, ${createdBy}, ${category}, ${level},\n`;
  sql += `  ${price}, ${originalPrice}, ${rating}, ${reviewCount},\n`;
  sql += `  ${learnersEnrolled}, ${image}, ${duration}, ${isPublished}, ${isApprovedByAdmin}, ${bestSeller}\n`;
  sql += `) ON DUPLICATE KEY UPDATE\n`;
  sql += `  \`title\` = VALUES(\`title\`),\n`;
  sql += `  \`subtitle\` = VALUES(\`subtitle\`),\n`;
  sql += `  \`description\` = VALUES(\`description\`),\n`;
  sql += `  \`created_by\` = VALUES(\`created_by\`),\n`;
  sql += `  \`price\` = VALUES(\`price\`);\n\n`;

  // Learning Outcomes
  if (course.learningOutcomes && course.learningOutcomes.length > 0) {
    sql += `-- 2. Insert Learning Outcomes\n`;
    course.learningOutcomes.forEach((outcome) => {
      sql += `INSERT INTO \`learning_outcomes\` (\`course_id\`, \`outcome\`) VALUES (${escapeSql(courseId)}, ${escapeSql(outcome)});\n`;
    });
    sql += `\n`;
  }

  // Modules and Lessons
  if (course.modules && course.modules.length > 0) {
    sql += `-- 3. Insert Modules and Lessons\n`;
    course.modules.forEach((mod, modIdx) => {
      const modId = mod.id || `mod-${Date.now()}-${modIdx}`;
      const modTitle = escapeSql(mod.title || `Module ${modIdx + 1}`);
      const modDesc = escapeSql(mod.description || '');

      sql += `INSERT INTO \`modules\` (\`id\`, \`course_id\`, \`title\`, \`description\`, \`order_index\`)\n`;
      sql += `VALUES (${escapeSql(modId)}, ${escapeSql(courseId)}, ${modTitle}, ${modDesc}, ${modIdx})\n`;
      sql += `ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`);\n`;

      if (mod.lessons && mod.lessons.length > 0) {
        mod.lessons.forEach((les, lesIdx) => {
          const lesId = les.id || `les-${Date.now()}-${lesIdx}`;
          const lesTitle = escapeSql(les.title || `Lesson ${lesIdx + 1}`);
          const lesDuration = escapeSql(les.duration || '10:00');
          const lesType = escapeSql(les.type || 'video');
          const lesVideo = escapeSql(les.videoUrl || '');
          const lesContent = escapeSql(les.content || '');
          const isPreview = les.isPreview ? 1 : 0;

          sql += `INSERT INTO \`lessons\` (\`id\`, \`module_id\`, \`title\`, \`duration\`, \`type\`, \`video_url\`, \`content\`, \`is_preview\`, \`order_index\`)\n`;
          sql += `VALUES (${escapeSql(lesId)}, ${escapeSql(modId)}, ${lesTitle}, ${lesDuration}, ${lesType}, ${lesVideo}, ${lesContent}, ${isPreview}, ${lesIdx})\n`;
          sql += `ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`);\n`;

          if (les.resources && les.resources.length > 0) {
            les.resources.forEach((res, resIdx) => {
              const resId = res.id || `res-${Date.now()}-${resIdx}`;
              const resName = escapeSql(res.name || 'Resource');
              const resType = escapeSql(res.type || 'file');
              const resUrl = escapeSql(res.url || '');
              const resSize = escapeSql(res.fileSize || '');
              sql += `INSERT INTO \`lesson_resources\` (\`id\`, \`lesson_id\`, \`name\`, \`type\`, \`url\`, \`file_size\`)\n`;
              sql += `VALUES (${escapeSql(resId)}, ${escapeSql(lesId)}, ${resName}, ${resType}, ${resUrl}, ${resSize})\n`;
              sql += `ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`url\` = VALUES(\`url\`);\n`;
            });
          }
        });
      }
      sql += `\n`;
    });
  }

  sql += `COMMIT;\n`;
  return sql;
}
