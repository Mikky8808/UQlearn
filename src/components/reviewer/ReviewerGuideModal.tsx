import React from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface ReviewerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewerGuideModal: React.FC<ReviewerGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Sharp-edged Modal Container */}
      <div className="bg-[#17181a] border border-slate-800 rounded-none shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-white overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#212225] border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-none text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide uppercase">
                Reviewer Description Audit Guide
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Standard reference criteria for auditing course descriptions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-none text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-200 text-xs sm:text-sm">
          
          {/* Section 1: What Learner Will Access */}
          <div className="bg-[#1f2023] border border-slate-800 p-4 rounded-none space-y-2">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">
              1. What Learner Will Access
            </h4>
            <p className="text-xs text-slate-300 font-semibold italic">
              Verify that the course description highlights clear value metrics: i.e.
            </p>
            <div className="text-slate-200 font-mono text-xs space-y-1 pl-1 pt-1">
              <div>Best Seller Course Status</div>
              <div>80+ Hours Video / Material</div>
              <div>Premium Coaching Details</div>
              <div>24-Hour Support Guarantee</div>
              <div>100% Practical Content</div>
              <div>Real-Time Hands-On from Lecture 1</div>
            </div>
          </div>

          {/* Section 2: Course Goals Stated */}
          <div className="bg-[#1f2023] border border-slate-800 p-4 rounded-none space-y-2">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">
              2. Course Goals Stated
            </h4>
            <p className="text-xs text-slate-300 font-semibold italic">
              Ensure clear, outcome-based course goals are explicitly stated: i.e.
            </p>
            <div className="text-slate-200 font-mono text-xs space-y-1 pl-1 pt-1">
              <div>Grow Agency</div>
              <div>Build Strategy with ChatGPT</div>
              <div>Become Freelancer</div>
              <div>Get Hired as Expert</div>
            </div>
          </div>

          {/* Section 3: You'll Learn To */}
          <div className="bg-[#1f2023] border border-slate-800 p-4 rounded-none space-y-2">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">
              3. "You'll Learn To"
            </h4>
            <p className="text-xs text-slate-300 font-semibold italic">
              Verify "You'll Learn To" section features actionable practical skills: i.e.
            </p>
            <div className="text-slate-200 font-mono text-xs space-y-1 pl-1 pt-1">
              <div>Build Agency</div>
              <div>Price Services</div>
              <div>Build Website</div>
              <div>Get &amp; Keep Clients</div>
              <div>Hire Right People</div>
              <div>Customer Relationship</div>
              <div>Outsourcing</div>
            </div>
          </div>

          {/* Section 4: Who This Course Is For */}
          <div className="bg-[#1f2023] border border-slate-800 p-4 rounded-none space-y-2">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">
              4. Who This Course Is For
            </h4>
            <p className="text-xs text-slate-300 font-semibold italic">
              Confirm target learner audience personas are defined ("Who this course is for"): i.e.
            </p>
            <div className="text-slate-200 font-mono text-xs space-y-1 pl-1 pt-1">
              <div>Agency Newcomers</div>
              <div>SMMA Newcomers</div>
              <div>Freelancers</div>
              <div>Business Owners</div>
              <div>Social Media Marketers</div>
              <div>Digital Marketers</div>
              <div>Influencers</div>
              <div>Side Hustlers</div>
            </div>
          </div>

          {/* Section 5: Mandatory Bonuses & Guarantee */}
          <div className="bg-[#231e17] border border-amber-900/60 p-4 rounded-none space-y-2">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
              5. Mandatory Bonuses &amp; Guarantee
            </h4>
            <p className="text-xs text-amber-200 font-semibold italic">
              Tell them to include this in the description:
            </p>
            <div className="text-amber-100 font-mono text-xs space-y-1.5 pl-1 pt-1 font-semibold">
              <div>Lifetime Access to Future Updates</div>
              <div>Tools / Articles / Templates</div>
              <div>Q&amp;A Support (Direct Instructor Response)</div>
              <div>Downloadable Certificate of Completion</div>
              <div className="text-amber-300 font-bold">30-Day Money Back Guarantee</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#212225] border-t border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Reviewer Standard Reference Guide
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-none text-xs transition-all cursor-pointer shadow-md"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
