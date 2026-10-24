import React, { useState } from 'react';
import { X, Star, CheckCircle2, Clock, Users, ShieldCheck, Play, FileText, Award, BookOpen, ShoppingCart, Sparkles } from 'lucide-react';
import { Course } from '../../types';
import { useApp } from '../../context/AppContext';

interface CourseDetailModalProps {
  course: Course;
  onClose: () => void;
  onAddToCart: (course: Course) => void;
  onEnrollNow: (course: Course) => void;
  isEnrolled: boolean;
  onStartLearning: (course: Course) => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  onClose,
  onAddToCart,
  onEnrollNow,
  isEnrolled,
  onStartLearning,
}) => {
  const { formatPrice } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'syllabus' | 'instructor'>('overview');
  const isFree = !course.price || Number(course.price) === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header */}
        <div className="relative bg-teal-950 text-white p-8 sm:p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {course.bestSeller && (
                <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider">
                  Bestseller
                </span>
              )}
              {course.isPremium && (
                <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-black uppercase tracking-wider">
                  Premium
                </span>
              )}
              <span className="text-xs text-teal-300 font-medium">Updated {course.updatedAt}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{course.title}</h1>
            <p className="text-slate-300 text-sm sm:text-base">{course.subtitle}</p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-amber-400 mr-1" />
                {course.rating} <span className="text-slate-400 ml-1">({course.reviewCount.toLocaleString()} ratings)</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 text-teal-400 mr-1.5" />
                {course.learnersEnrolled.toLocaleString()} learners enrolled
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-teal-400 mr-1.5" />
                {course.duration} total length
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs & Pricing Box Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 p-6 sm:p-8 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* Tab navigation */}
            <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'overview' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('syllabus')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'syllabus' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Course Syllabus ({course.modules?.length || 0} Modules)
              </button>
              <button
                onClick={() => setActiveTab('instructor')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'instructor' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Instructor
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">About This Course</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{course.description}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">What you will learn</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(course.learningObjectives && course.learningObjectives.length > 0
                      ? course.learningObjectives
                      : course.whatYouWillLearn || []
                    ).map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {course.requirements && course.requirements.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Requirements</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {course.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'syllabus' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Course Curriculum ({course.modules?.length || 0} Sections)</h3>
                  <span className="text-xs font-bold text-slate-500">{course.duration}</span>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {course.modules?.map((mod, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                      <div className="bg-slate-100/90 dark:bg-slate-800/90 p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                            Section {idx + 1}: {mod.title}
                          </h4>
                          {mod.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{mod.description}</p>
                          )}
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg shrink-0 ml-2">
                          {mod.lessons.length} Lectures
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {mod.lessons.map((lesson, lIdx) => {
                          const hasVideo = !!lesson.videoUrl || !!lesson.videoPath || lesson.type === 'video' || (!lesson.type && !lesson.content);
                          return (
                            <div key={lIdx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className={`p-1.5 rounded-lg shrink-0 ${hasVideo ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'}`}>
                                  {hasVideo ? <Play className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                </div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">Lecture {lIdx + 1}: {lesson.title}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'instructor' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center space-x-4">
                  <img src={course.instructorAvatar} alt={course.instructor} className="w-16 h-16 rounded-full object-cover border-2 border-teal-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{course.instructor}</h3>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Lead Instructor & Senior Architect</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Passionate educator and industry leader with over 10 years of professional software engineering and training experience. Dedicated to making complex topics approachable and hands-on.
                </p>
              </div>
            )}

          </div>

          {/* Pricing Sidebar Card */}
          <div className="lg:col-span-4">
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sticky top-6 space-y-6 shadow-lg">
              
              <div className="relative h-44 rounded-xl overflow-hidden shadow-inner">
                <img 
                  src={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
                  alt={course.title} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                  }}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="flex items-baseline space-x-3">
                <span className={`text-3xl font-black ${isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  {isFree ? 'Free' : formatPrice(course.price)}
                </span>
                {course.originalPrice && course.originalPrice > course.price && (
                  <span className="text-sm text-slate-400 line-through">{formatPrice(course.originalPrice)}</span>
                )}
              </div>

              {isEnrolled ? (
                <button
                  onClick={() => onStartLearning(course)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 text-sm transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Learning Now</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => onEnrollNow(course)}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-md text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isFree ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>{isFree ? 'Enroll for Free' : 'Enroll Now'}</span>
                  </button>
                  {!isFree && (
                    <button
                      onClick={() => onAddToCart(course)}
                      className="w-full py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>30-Day Money-Back Guarantee</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Certificate of Completion</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Full Lifetime Access</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
