import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { saveInstructorOnboardingApi } from '../../lib/apiConfig';

export const InstructorOnboardingWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentUser } = useApp();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!answers[step]) return;
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (currentUser?.id) {
        setIsSubmitting(true);
        try {
          // Store to the database API
          await saveInstructorOnboardingApi({ userId: currentUser.id, answers });
          
          // Save to local storage on final step
          localStorage.setItem(`uqlearn_instructor_onboarding_completed_${currentUser.id}`, 'true');
        } catch (error) {
          console.error("Failed to save onboarding responses:", error);
          // Allow completion even if API fails to prevent blocking the user
          localStorage.setItem(`uqlearn_instructor_onboarding_completed_${currentUser.id}`, 'true');
        } finally {
          setIsSubmitting(false);
          onComplete();
        }
      } else {
        onComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return {
          title: "Welcome to UQlearn Instructor Studio",
          description: "We're thrilled to have you here. UQlearn empowers educators and industry experts to create impactful, engaging learning experiences. Let's start by understanding your background so we can best support your journey in building transformative courses.",
          question: "Which of the following best describes your teaching experience?",
          options: [
            "I'm new to teaching",
            "I mentor or teach informally",
            "I teach professionally in-person",
            "I have experience teaching online"
          ]
        };
      case 2:
        return {
          title: "Mastering the Camera",
          description: "High-quality video content is at the heart of our platform. Don't worry if you don't have a Hollywood studio—our tools and guidelines are designed to help creators at any skill level produce professional, crisp lessons right from their home or office.",
          question: "How comfortable are you with video production and editing?",
          options: [
            "I'm just starting out",
            "I know the basics",
            "I'm very comfortable on camera",
            "I already have fully produced videos"
          ]
        };
      case 3:
        return {
          title: "Growing Your Student Base",
          description: "Great courses deserve great visibility. UQlearn provides powerful discovery tools to put your content in front of eager learners globally. To help tailor our promotional strategies, it helps to know if you are bringing an existing community with you.",
          question: "Do you currently have an established audience or following?",
          options: [
            "No existing audience yet",
            "I have a growing community",
            "I have a large established following"
          ]
        };
      default:
        return null;
    }
  };

  const currentContent = getStepContent();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-6">
          <div className="text-2xl font-black text-indigo-700 tracking-tight">UQlearn</div>
          <div className="text-slate-500 font-medium border-l border-slate-300 pl-6">
            Step {step} of 3
          </div>
        </div>
        <button 
          onClick={onComplete}
          className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
        >
          Exit
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-200">
        <div className={`h-full bg-indigo-600 transition-all duration-300 ease-in-out ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center p-6 mt-8">
        <div className="w-full max-w-2xl">
          {currentContent?.title && (
            <h1 className="text-4xl font-bold text-slate-900 mb-6 font-serif">{currentContent.title}</h1>
          )}
          <p className="text-lg text-slate-700 mb-10 leading-relaxed">
            {currentContent?.description}
          </p>

          <h2 className="text-xl font-bold text-slate-900 mb-6">{currentContent?.question}</h2>
          
          <div className="space-y-4 mb-10">
            {currentContent?.options.map((option) => (
              <label 
                key={option} 
                className={`block border rounded-lg p-5 cursor-pointer transition-all ${
                  answers[step] === option 
                    ? 'border-indigo-900 bg-indigo-50/30 ring-1 ring-indigo-900' 
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    answers[step] === option ? 'border-indigo-900' : 'border-slate-400'
                  }`}>
                    {answers[step] === option && (
                      <div className="w-3 h-3 bg-indigo-900 rounded-full"></div>
                    )}
                  </div>
                  <span className="text-lg font-medium text-slate-800">{option}</span>
                </div>
                <input 
                  type="radio" 
                  name={`step-${step}`} 
                  value={option} 
                  className="hidden" 
                  checked={answers[step] === option}
                  onChange={() => setAnswers({...answers, [step]: option})}
                />
              </label>
            ))}
          </div>

        </div>
      </main>

      {/* Footer / Actions */}
      <footer className="border-t border-slate-200 p-6 flex justify-between items-center bg-white sticky bottom-0">
        <div className={`max-w-2xl mx-auto w-full flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button 
              onClick={handlePrevious}
              className="px-8 py-3 font-bold text-lg rounded-md transition-colors border border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              Previous
            </button>
          )}
          
          <button 
            onClick={handleContinue}
            disabled={!answers[step] || isSubmitting}
            className={`px-8 py-3 font-bold text-lg rounded-md transition-colors ${
              answers[step] && !isSubmitting
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </footer>
    </div>
  );
};
