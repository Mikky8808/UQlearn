import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  CheckCircle2, 
  Save
} from 'lucide-react';

interface LearnerAccountTabProps {
  currentUser: any;
}

export const LearnerAccountTab: React.FC<LearnerAccountTabProps> = ({ currentUser }) => {
  const [name, setName] = useState(currentUser?.name || 'Student Member');
  const [headline, setHeadline] = useState('Full-Stack Software Engineering Apprentice');
  const [bio, setBio] = useState('Passionate web developer learning modern TypeScript, React 19, distributed cloud infrastructure, and Generative AI application engineering.');
  const [country, setCountry] = useState('United States');
  const [github, setGithub] = useState('https://github.com/developer');
  const [linkedin, setLinkedin] = useState('https://linkedin.com/in/developer');
  
  // Notification switches
  const [notifyUpdates, setNotifyUpdates] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);
  
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Profile Settings Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Public Learner Profile</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize how your name, credentials, and achievements appear across course discussions.
            </p>
          </div>

          {savedSuccess && (
            <span className="flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile Saved!</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={currentUser?.email || 'learner@uqlearn.com'}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Professional Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Aspiring Cloud Architect | TypeScript Enthusiast"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bio & Learning Goals</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GitHub Profile Link</label>
              <input
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">LinkedIn Profile Link</label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notifications Preferences */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>Notification & Email Preferences</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Course Curriculum Updates</p>
              <p className="text-[11px] text-slate-500">Receive emails when instructors add new lectures or exercise files.</p>
            </div>
            <input
              type="checkbox"
              checked={notifyUpdates}
              onChange={(e) => setNotifyUpdates(e.target.checked)}
              className="w-4 h-4 accent-teal-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Q&A Discussion Replies</p>
              <p className="text-[11px] text-slate-500">Get notified when an instructor or peer answers your question.</p>
            </div>
            <input
              type="checkbox"
              checked={notifyReplies}
              onChange={(e) => setNotifyReplies(e.target.checked)}
              className="w-4 h-4 accent-teal-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">UQlearn Weekly Promotions & Updates</p>
              <p className="text-[11px] text-slate-500">Exclusive news, new course announcements, and platform updates.</p>
            </div>
            <input
              type="checkbox"
              checked={notifyPromos}
              onChange={(e) => setNotifyPromos(e.target.checked)}
              className="w-4 h-4 accent-teal-600 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
