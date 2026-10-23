# Instructor Course Builder Components - README

This document outlines the core components used in the Instructor Course Builder, responsible for creating and managing course curriculum.

## Core Components (`/src/components/instructor/courses/`)

### 1. `CurriculumOrganizer.tsx` (Primary Component)
This is the main component for managing the structure of your course. It allows you to:
- **Organize Sections (Modules)**: Create, reorder, and delete sections (e.g., "Section 1: Introduction").
- **Organize Lessons**: Add various content types (Video, Article, Audio, Quiz), reorder them within or across sections using drag-and-drop, and edit their details.
- **Responsive Layout**: Uses a vertical stack (`flex-col`) on smaller screens to ensure that section titles, lesson titles, and action controls (like the 'Edit' button and action menu) remain readable and do not overlap.

### 2. `CourseBuilder.tsx`
This is the parent container for the course creation workflow. It manages the state across different tabs (e.g., General Info, Curriculum, Settings) and integrates the `CurriculumOrganizer`.

### 3. `LessonEditor.tsx` & `ModuleEditor.tsx`
These components handle the detailed editing of individual items:
- **`ModuleEditor.tsx`**: Used for editing the metadata of a section (e.g., title, description).
- **`LessonEditor.tsx`**: Used for configuring the content of a specific lesson (e.g., uploading a video, writing an article, configuring a quiz).

### 4. `CourseContentBuilder.tsx`
Acts as a high-level wrapper or utility to facilitate the loading and saving of course content to the backend.

---

## Technical Details

- **Responsive Design**: The components utilize Tailwind CSS utility classes to adapt the UI for mobile and desktop screens. Specifically, `CurriculumOrganizer.tsx` employs `flex-wrap` and `w-full` strategies to ensure action buttons and input fields stack vertically on mobile to prevent layout overwriting.
- **Data Management**: All persistent data operations (add, reorder, update, delete) are centralized through the API utility functions found in `/src/lib/apiConfig.ts`.
- **Styling**: Adheres to the "sharp/square" design language (`rounded-none`) across all buttons and container elements.
