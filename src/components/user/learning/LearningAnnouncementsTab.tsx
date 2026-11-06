import React, { useState } from 'react';
import { Megaphone, Bell, Calendar, User, Pin, Search } from 'lucide-react';
import { Course } from '../../../types';

interface LearningAnnouncementsTabProps {
  course: Course;
}

export const LearningAnnouncementsTab: React.FC<LearningAnnouncementsTabProps> = ({ course }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const announcements = [
    {
      id: 'ann-1',
      isPinned: true,
      title: 'Welcome to the course & Updated Curriculum Resources',
      instructor: course.instructor || 'Lead Instructor',
      instructorAvatar: course.instructorAvatar || '',
      date: '1 week ago',
      content: `Welcome to ${course.title}! I am thrilled to have you here. All course resources, project starter repositories, and supplementary cheat sheets have been refreshed. Be sure to check the Resources dropdown under each lecture and feel free to ask questions in the Q&A tab whenever you hit a roadblock.`
    },
    {
      id: 'ann-2',
      isPinned: false,
      title: 'Q&A Office Hours & Live Community Discussion',
      instructor: course.instructor || 'Lead Instructor',
      instructorAvatar: course.instructorAvatar || '',
      date: '2 weeks ago',
      content: 'We hold regular community review sessions. If you have any specific architecture or code implementation questions, drop them in the Q&A section with timestamp references so other students can also learn from the discussion.'
    }
  ];

  const filtered = announcements.filter(a => 
    !searchQuery.trim() || 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-none">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#a435f0]" />
            <span>Instructor Announcements</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Important updates, new materials, and notices from {course.instructor || 'your instructor'}.
          </p>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-none text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#a435f0]"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map(item => (
          <div 
            key={item.id} 
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-none space-y-4 shadow-none"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold flex items-center justify-center shrink-0 text-sm border border-slate-300 dark:border-slate-700">
                  {item.instructorAvatar ? (
                    <img src={item.instructorAvatar} alt={item.instructor} className="w-full h-full object-cover" />
                  ) : (
                    <span>{item.instructor.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.instructor}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>posted an announcement</span>
                    <span>·</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </div>

              {item.isPinned && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-none">
                  <Pin className="w-3 h-3 fill-current" />
                  <span>Pinned</span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
