# UQLearn Course Builder & Backend Architecture Guide

This document outlines the complete architectural blueprint, API endpoint contracts, MySQL database schema, and integration guidelines for the **UQLearn Course Builder**, instructor studio, and shared hosting PHP backend.

---

## 1. Core Architecture Overview

- **Frontend**: React 18+ (Vite, TypeScript, Tailwind CSS).
- **Backend**: Native PHP 8.x on cPanel / Shared Host (`https://uqlearn.org/api/v1/`).
- **Database**: MySQL / MariaDB (`InnoDB`, `utf8mb4`).
- **Centralized Client Config**: `src/lib/apiConfig.ts` with `API_BASE_URL = 'https://uqlearn.org/api/v1'`.

---

## 2. MySQL Database Tables (Schema)

The Course Builder and curriculum management rely on the following relational tables:

```
[courses] 
   ├── 1:N ── [course_categories] (or category string / FK)
   ├── 1:N ── [learning_outcomes] (course_id, outcome)
   ├── 1:N ── [modules] (course_id, title, sort_order)
   │             └── 1:N ── [lessons] (module_id, course_id, title, type, content, video_path, duration, sort_order)
   │                           └── 1:1 ── [quizzes] (lesson_id, title, passing_score)
   │                                         └── 1:N ── [quiz_questions] (quiz_id, question, type, explanation)
   │                                                       └── 1:N ── [quiz_options] (question_id, option_text, is_correct)
   ├── 1:N ── [price_adjustments] (course_id, suggested_price, status)
   ├── 1:N ── [purchases] (course_id, user_id, amount, status)
   └── 1:N ── [video_playback_progress] (user_id, course_id, lesson_id, seconds_watched, is_completed)
```

### Table Definitions

#### 1. `courses`
Stores primary course metadata, pricing, publication status, and author details.
- `id` (VARCHAR(255) PRIMARY KEY)
- `title` (VARCHAR(255) NOT NULL)
- `subtitle` (TEXT)
- `description` (LONGTEXT)
- `category` (VARCHAR(100) DEFAULT 'Development')
- `level` (ENUM('Beginner', 'Intermediate', 'Advanced', 'All Levels') DEFAULT 'Beginner')
- `price` (DECIMAL(10,2) DEFAULT 0.00)
- `currency` (VARCHAR(10) DEFAULT 'USD')
- `image` (TEXT) — Stored relative path (`/uploads/courses/...`) or external URL
- `duration` (VARCHAR(50))
- `language` (VARCHAR(50) DEFAULT 'English')
- `instructor` (VARCHAR(255))
- `created_by` (VARCHAR(255))
- `is_published` (TINYINT(1) DEFAULT 0)
- `is_approved_by_admin` (TINYINT(1) DEFAULT 1)
- `is_deleted` (TINYINT(1) DEFAULT 0)
- `deleted_at` (DATETIME NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

#### 2. `learning_outcomes`
Key learner takeaways / objectives for each course.
- `id` (INT AUTO_INCREMENT PRIMARY KEY)
- `course_id` (VARCHAR(255) NOT NULL, INDEX)
- `outcome` (TEXT NOT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

#### 3. `modules`
Curriculum chapters / sections.
- `id` (VARCHAR(255) PRIMARY KEY)
- `course_id` (VARCHAR(255) NOT NULL, INDEX)
- `title` (VARCHAR(255) NOT NULL)
- `description` (TEXT)
- `sort_order` (INT DEFAULT 0)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

#### 4. `lessons`
Individual lecture units (video, article/text, quiz, or attachment).
- `id` (VARCHAR(255) PRIMARY KEY)
- `module_id` (VARCHAR(255) NOT NULL, INDEX)
- `course_id` (VARCHAR(255) NOT NULL, INDEX)
- `title` (VARCHAR(255) NOT NULL)
- `type` (ENUM('video', 'article', 'quiz', 'assignment') DEFAULT 'video')
- `content` (LONGTEXT)
- `video_path` (TEXT) — Timestamped file path (e.g., `/uploads/lessons/[timestamp]_[hash].mp4`)
- `duration` (INT DEFAULT 0) — Duration in seconds or minutes
- `is_free_preview` (TINYINT(1) DEFAULT 0)
- `resources_json` (LONGTEXT) — Attached resource files & links JSON
- `sort_order` (INT DEFAULT 0)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

#### 5. `quizzes`
Assessment container linked to a lesson or module.
- `id` (VARCHAR(255) PRIMARY KEY)
- `lesson_id` (VARCHAR(255) NOT NULL, INDEX)
- `course_id` (VARCHAR(255) NOT NULL)
- `title` (VARCHAR(255) NOT NULL)
- `passing_score` (INT DEFAULT 80)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

#### 6. `quiz_questions`
Questions belonging to a quiz.
- `id` (VARCHAR(255) PRIMARY KEY)
- `quiz_id` (VARCHAR(255) NOT NULL, INDEX)
- `question` (TEXT NOT NULL)
- `type` (ENUM('multiple_choice', 'single_choice', 'true_false') DEFAULT 'single_choice')
- `explanation` (TEXT)
- `sort_order` (INT DEFAULT 0)

#### 7. `quiz_options`
Answer options for each question.
- `id` (VARCHAR(255) PRIMARY KEY)
- `question_id` (VARCHAR(255) NOT NULL, INDEX)
- `option_text` (TEXT NOT NULL)
- `is_correct` (TINYINT(1) DEFAULT 0)

---

## 3. PHP API Endpoints & Request Contracts

All API endpoints accept and return `application/json` (unless handling `multipart/form-data` uploads).

### A. Courses (`/api/v1/courses.php`)

| Method | Query / Action | Purpose |
| :--- | :--- | :--- |
| `GET` | `courses.php` | List all non-deleted courses (optional `?created_by=INSTRUCTOR_ID`) |
| `GET` | `courses.php?id=COURSE_ID` | Fetch complete single course with modules, lessons, and learning outcomes |
| `POST` | `courses.php` | Create or update full course metadata and learning outcomes |
| `POST` | `courses.php?action=delete` | Soft delete course (`is_deleted = 1`) |
| `POST` | `courses.php?action=restore` | Restore soft-deleted course (`is_deleted = 0`) |

#### Course Payload Example:
```json
{
  "id": "course-1738000000",
  "title": "Mastering Full-Stack PHP & React",
  "subtitle": "Complete guide to production web applications",
  "description": "<p>Deep dive into modern architectures...</p>",
  "category": "Development",
  "level": "Intermediate",
  "price": 49.99,
  "currency": "USD",
  "image": "/uploads/courses/1738000000_a1b2c3d4e5f6.jpg",
  "duration": "14 hours",
  "learningOutcomes": [
    "Build robust relational MySQL schemas",
    "Deploy zero-downtime PHP APIs",
    "Create rich interactive UI with React"
  ],
  "isPublished": true,
  "createdBy": "usr_instructor_01"
}
```

---

### B. Curriculum & Modules (`/api/v1/course-modules.php`)

| Method | Action (`?action=`) | Purpose | Payload Details |
| :--- | :--- | :--- | :--- |
| `GET` | `course-modules.php?course_id=ID` | Fetch structured tree of modules & lessons | Returns `{ modules: [...] }` |
| `POST` | `action=upsert_module` | Create or update module title and sort order | `{ id, course_id, title, sort_order }` |
| `POST` | `action=upsert_lesson` | Create or update lesson content & video path | `{ id, module_id, course_id, title, type, video_path, content, duration }` |
| `POST` | `action=delete_module` | Delete module and cascade delete lessons | `{ id }` or `{ module_id }` |
| `POST` | `action=delete_lesson` | Delete individual lesson | `{ id }` or `{ lesson_id }` |
| `POST` | `action=bulk_sync` | Bulk sync complete hierarchy from organizer | `{ course_id, modules: [...] }` |

---

### C. File & Video Uploads (`/api/v1/media-upload.php` / `upload.php`)

- **Method**: `POST` (Multipart form-data)
- **Supported File Types**:
  - Images: JPG, PNG, WEBP, GIF (Max 15MB) $\rightarrow$ `/uploads/courses/`
  - Videos: MP4, MOV, WEBM, MKV (Max 500MB) $\rightarrow$ `/uploads/lessons/`
  - Documents / Attachments: PDF, ZIP, DOCX $\rightarrow$ `/uploads/resources/`
- **File Naming Standard**: `[timestamp]_[32_random_hex_chars].[ext]`
- **Response Format**:
  ```json
  {
    "success": true,
    "path": "/uploads/courses/1738000000_8f93e4b1c702a9d8e5f1b2c3d4e5f607.jpg",
    "fileName": "cover_masterclass.jpg",
    "url": "https://uqlearn.org/uploads/courses/1738000000_8f93e4b1c702a9d8e5f1b2c3d4e5f607.jpg"
  }
  ```

---

### D. Supported Payout Countries (`/api/v1/payout-countries.php`)

Manages allowed banking destination countries for instructor payouts.

| Method | Action / Query | Purpose | Payload Details |
| :--- | :--- | :--- | :--- |
| `GET` | `payout-countries.php` | List all supported payout countries | Optional `?active_only=1` |
| `POST` | `action=create` | Add supported country (minimal: `name`, `isActive`) | `{ name, isActive }` |
| `POST` | `action=update` | Update country parameters | `{ id, name, isActive }` |
| `POST` | `action=toggle_active` | Toggle active status for instructor selection | `{ id, isActive }` |
| `POST` | `action=delete` | Delete payout country destination | `{ id }` |

#### `payout_countries` Table Definition:
- `id` (VARCHAR(100) PRIMARY KEY) — e.g. `pc-unitedstates-3a1b`
- `name` (VARCHAR(150) NOT NULL UNIQUE) — e.g. `United States`
- `code` (VARCHAR(10) NOT NULL) — 2-3 letter ISO country code
- `is_active` (TINYINT(1) DEFAULT 1) — Controls visibility in Instructor Studio
- `currency_code` (VARCHAR(10) DEFAULT 'USD')
- `currency_symbol` (VARCHAR(10) DEFAULT '$')
- `payout_methods` (TEXT) — JSON array of methods (e.g. `["Bank Transfer"]`)
- `min_payout` (DECIMAL(10,2) DEFAULT 50.00)
- `processing_time` (VARCHAR(100) DEFAULT '1-3 business days')
- `notes` (TEXT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

---

## 4. System Sync & Database Hub (`/api/v1/sync.php`)

- Inspect table structures, verify integrity, run automated schema migrations, and export standalone `.sql` snapshots.
- `GET /api/v1/sync.php?action=status` $\rightarrow$ Returns counts and status of all database tables.

---

## 5. UI Checklist for Course Builder & Payout Management

1. **Clean File Presentation**: Never display raw `/uploads/` paths in user-facing labels; always display clean file names (e.g. `cover_design.jpg`).
2. **Outcome Synchronization**: Ensure `learningOutcomes` arrays are synced on both `courses.php` and local forms on every save.
3. **Draft Auto-Saving**: Persist partial progress to local state while writing lessons or curriculum outlines.
4. **Relational Integrity**: Deleting a module must clean up child lessons and quizzes in MySQL.
5. **Instructor Payout Selection**: Instructors only see active countries configured by administrators. Minimum fields required are `Country Name` and `Is Active`.
6. **KYC & Withdrawal Guard**: Notice displayed to instructors: *"After you make your first sale (or affiliate sale), you will be required to complete your KYC and set your government details before you can withdraw your funds."*

