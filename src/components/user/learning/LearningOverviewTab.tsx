import React, { useState } from 'react';
import { 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw, 
  Award, 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  ShieldCheck, 
  Check,
  Sparkles
} from 'lucide-react';
import { Lesson, Course } from '../../../types';

interface LearningOverviewTabProps {
  currentLesson: Lesson;
  course: Course;
  lessonIndex: number;
}

export const LearningOverviewTab: React.FC<LearningOverviewTabProps> = ({
  currentLesson,
  course,
  lessonIndex
}) => {
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const resetQuiz = () => {
    setSelectedQuizAnswer(null);
    setQuizSubmitted(false);
  };

  const learningOutcomes = course.whatYouWillLearn || course.learningOutcomes || course.learningObjectives || [
    'Gain hands-on practical competence and best practices',
    'Understand production-grade architectural patterns and workflows',
    'Build and deploy portfolio-ready projects independently',
    'Master troubleshooting and performance optimization'
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Lecture Description & Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-4 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Lecture {lessonIndex + 1}
            </span>
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {currentLesson.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              {currentLesson.duration || '10:00'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {currentLesson?.content ? (
            /<[a-z][\s\S]*>/i.test(currentLesson.content) ? (
              <div 
                className="space-y-3 [&_h1]:text-xl [&_h1]:font-black [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-teal-600 dark:[&_h2]:text-teal-300 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-teal-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-slate-100 dark:[&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-teal-700 dark:[&_code]:text-teal-300 [&_pre]:bg-slate-100 dark:[&_pre]:bg-slate-800 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_a]:text-teal-600 dark:[&_a]:text-teal-400 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: currentLesson.content }} 
              />
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed">
                {currentLesson.content}
              </div>
            )
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              In this lecture, you will master step-by-step methodologies, inspect concrete examples, analyze clean implementation patterns, and deepen your command over key topics.
            </p>
          )}
        </div>
      </div>

      {/* Interactive Knowledge Check (Quiz) if attached */}
      {currentLesson?.quiz && (
        <div className="bg-white dark:bg-slate-900 border border-teal-500/40 rounded-2xl p-5 sm:p-7 space-y-4 shadow-sm relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Interactive Knowledge Check
              </h3>
            </div>
            {quizSubmitted && (
              <button
                type="button"
                onClick={resetQuiz}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry Question</span>
              </button>
            )}
          </div>

          <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 font-bold leading-snug">
            {currentLesson.quiz.question}
          </p>

          <div className="space-y-2.5">
            {currentLesson.quiz.options.map((option, idx) => {
              const isSelected = selectedQuizAnswer === idx;
              const isCorrect = idx === currentLesson.quiz?.correctAnswer;
              
              let optionClass = 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
              if (quizSubmitted) {
                if (isCorrect) {
                  optionClass = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20';
                } else if (isSelected && !isCorrect) {
                  optionClass = 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/20';
                }
              } else if (isSelected) {
                optionClass = 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-white ring-2 ring-teal-500/20';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!quizSubmitted) {
                      setSelectedQuizAnswer(idx);
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-3 cursor-pointer ${optionClass}`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                    isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {!quizSubmitted ? (
              <button
                type="button"
                onClick={() => setQuizSubmitted(true)}
                disabled={selectedQuizAnswer === null}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-teal-600/20"
              >
                Submit Answer
              </button>
            ) : (
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                selectedQuizAnswer === currentLesson.quiz.correctAnswer
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/40 text-rose-800 dark:text-rose-300'
              }`}>
                {selectedQuizAnswer === currentLesson.quiz.correctAnswer ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span>
                      Correct! {currentLesson.quiz.explanation || 'Great job understanding this core concept.'}
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                    <span>
                      Not quite. {currentLesson.quiz.explanation || 'Review the video segment or re-read the notes to verify.'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* What you'll learn in this course */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-4 transition-colors">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>Course Learning Outcomes</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {learningOutcomes.slice(0, 4).map((outcome, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{outcome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructor Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-4 transition-colors">
        <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          About The Instructor
        </h3>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-lg flex items-center justify-center shrink-0 overflow-hidden shadow-md">
            {course.instructorAvatar ? (
              <img 
                src={course.instructorAvatar} 
                alt={course.instructor} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <span>{course.instructor ? course.instructor.charAt(0) : 'I'}</span>
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {course.instructor || 'Expert Educator'}
            </h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
              {course.instructorTitle || 'Lead Instructor & Industry Practitioner'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 pt-1">
              {course.instructorDescription || 
               'Professional instructor with extensive real-world experience, guiding thousands of students to master in-demand technical and business skills.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
