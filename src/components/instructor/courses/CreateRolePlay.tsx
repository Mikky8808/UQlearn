import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  ExternalLink,
  Pencil,
  RotateCw,
  X,
  Play,
  Square,
  Bold,
  Italic,
  List,
  ListOrdered,
  Mic,
  MessageSquare,
  Volume2
} from 'lucide-react';

export interface RolePlayData {
  id?: string;
  courseId?: string;
  moduleId?: string;
  title: string;
  skillsToPractice?: string;
  scenario?: string;
  additionalContext?: string;
  linkedLectures?: string[];
  status?: string;
  // Step 2 Review details
  meetingTitle?: string;
  meetingDuration?: string;
  learnerRole?: string;
  characterName?: string;
  audioCharacter?: string;
  characterRole?: string;
  personalityAndBackground?: string;
}

export interface CreateRolePlayProps {
  initialRolePlay?: RolePlayData;
  courseId?: string;
  moduleId?: string;
  currentUser?: any;
  modules?: any[];
  onBack: () => void;
  onSave: (rolePlay: RolePlayData) => void;
  onPublish?: (rolePlay: RolePlayData) => void;
}

const AUDIO_CHARACTERS = [
  {
    id: 'Character 1',
    name: 'Character 1 (Jordan)',
    gender: 'female',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    description: 'Empathetic and thoughtful tone'
  },
  {
    id: 'Character 2',
    name: 'Character 2',
    gender: 'male',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'Direct and analytical tone'
  },
  {
    id: 'Character 3',
    name: 'Character 3 (Sam)',
    gender: 'neutral',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    description: 'Calm and steady tone'
  }
];

export const CreateRolePlay: React.FC<CreateRolePlayProps> = ({
  initialRolePlay,
  courseId,
  moduleId,
  modules = [],
  onBack,
  onSave,
  onPublish
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Form State - Step 1
  const [title, setTitle] = useState(initialRolePlay?.title || 'test');
  const [isEditingTitleInline, setIsEditingTitleInline] = useState(false);
  const [skillsToPractice, setSkillsToPractice] = useState(
    initialRolePlay?.skillsToPractice || ''
  );
  const [scenario, setScenario] = useState(
    initialRolePlay?.scenario || ''
  );
  const [additionalContext, setAdditionalContext] = useState(
    initialRolePlay?.additionalContext || ''
  );
  const [linkedLectures, setLinkedLectures] = useState<string[]>(
    initialRolePlay?.linkedLectures || []
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    initialRolePlay?.status === 'published' || (initialRolePlay as any)?.isPublished || false
  );

  // Lectures linkage state
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isTouched, setIsTouched] = useState(false);

  // Form State - Step 2 (Review details matching screenshots)
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState(
    initialRolePlay?.meetingTitle || 'Meeting with Alex'
  );
  const [reviewScenario, setReviewScenario] = useState(
    initialRolePlay?.scenario ||
    "You are the team lead at a mid-sized software company. One of your direct reports, Alex, a talented developer, has missed their second consecutive sprint deadline, jeopardizing an upcoming client demo. During this 15-minute one-on-one, you need to address this recurring issue, uncover its underlying causes, and collaboratively define a path forward. Alex appears defensive and offers surface-level excuses but needs clear support to re-engage and succeed in their role."
  );
  const [meetingDuration, setMeetingDuration] = useState<string>(
    initialRolePlay?.meetingDuration || '3'
  );
  const [learnerRole, setLearnerRole] = useState(
    initialRolePlay?.learnerRole || 'Team lead in a mid-sized software company.'
  );
  const [characterName, setCharacterName] = useState(
    initialRolePlay?.characterName || 'Alex'
  );
  const [audioCharacter, setAudioCharacter] = useState(
    initialRolePlay?.audioCharacter || 'Character 2'
  );
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false);
  const [characterRole, setCharacterRole] = useState(
    initialRolePlay?.characterRole ||
    'A talented but disengaged software developer reporting to the learner.'
  );
  const [personalityAndBackground, setPersonalityAndBackground] = useState(
    initialRolePlay?.personalityAndBackground ||
    "Alex is a skilled developer who felt a setback six weeks ago when they were passed over for a promotion they thought they deserved. Since then, they've been disengaged, missing deadlines, and projecting frustration onto trivial technical details. In conversations, Alex will initially deflect responsibility, cite unrealistic expectations, and test the leader's patience before opening up if treated with empathy."
  );

  // Interaction State for Step 2
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewChatMessages, setPreviewChatMessages] = useState<Array<{ sender: 'ai' | 'learner', text: string }>>([
    { sender: 'ai', text: "Hey, thanks for setting up this 1-on-1. I know you wanted to discuss the sprint deliverables. What's on your mind?" }
  ]);
  const [previewInputText, setPreviewInputText] = useState('');

  // Audio preview handler
  const handleToggleAudioPreview = () => {
    if (isPlayingAudio) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = `Hello. I am ${characterName}. I am ready for our meeting. Let's discuss the project challenges.`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.pitch = audioCharacter === 'Character 1' ? 1.2 : 0.9;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingAudio(false), 2500);
    }
  };

  // Regeneration Handler
  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
      setReviewScenario(
        `You are the engineering director at a high-growth tech organization. Your direct report, ${characterName}, who previously was a stellar performer, has missed multiple recent milestones. In this session, you must establish psychological safety, clarify performance standards without escalating confrontation, and align on an actionable plan.`
      );
      setPersonalityAndBackground(
        `${characterName} is proud of their craftsmanship and feels their recent efforts went unrecognized during the last review cycle. When challenged, they tend to intellectualize issues or blame cross-functional roadblocks, but will become deeply collaborative once they perceive genuine leadership support.`
      );
      setSaveSuccessMessage('Role Play scenario and character regenerated successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }, 800);
  };

  // Sections list for Step 1
  const formattedSections = useMemo(() => {
    if (!modules || modules.length === 0) {
      return [
        {
          id: moduleId || 'sec-1',
          title: 'Section 1: Introduction',
          lessons: [
            { id: 'lec-1', title: '1. Introduction', duration: '5 mins', isWarning: true }
          ]
        }
      ];
    }
    return modules.map((m, idx) => ({
      id: m.id,
      title: m.title ? (m.title.startsWith('Section') ? m.title : `Section ${idx + 1}: ${m.title}`) : `Section ${idx + 1}`,
      lessons: (m.lessons || []).map((l: any, lIdx: number) => ({
        id: l.id,
        title: l.title || `${lIdx + 1}. Lecture`,
        type: l.type,
        duration: l.duration || '5 mins',
        isWarning: l.status !== 'published'
      }))
    }));
  }, [modules, moduleId]);

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  const toggleLectureSelect = (lecId: string) => {
    setLinkedLectures(prev => 
      prev.includes(lecId) ? prev.filter(id => id !== lecId) : [...prev, lecId]
    );
  };

  const handleSaveAction = (publishFlag: boolean = isPublished) => {
    setIsTouched(true);
    if (!title.trim()) {
      return;
    }

    const updatedData: RolePlayData = {
      id: initialRolePlay?.id || `roleplay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      courseId: courseId || initialRolePlay?.courseId,
      moduleId: moduleId || initialRolePlay?.moduleId,
      title: title.trim(),
      skillsToPractice,
      scenario: activeStep === 2 ? reviewScenario : scenario,
      additionalContext,
      linkedLectures,
      status: publishFlag ? 'published' : 'draft',
      meetingTitle,
      meetingDuration,
      learnerRole,
      characterName,
      audioCharacter,
      characterRole,
      personalityAndBackground
    };

    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      if (publishFlag) {
        setIsPublished(true);
        if (onPublish) onPublish(updatedData);
      } else {
        if (onSave) onSave(updatedData);
      }
      setSaveSuccessMessage(publishFlag ? 'Practice Role Play published successfully!' : 'Practice Role Play saved successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }, 350);
  };

  const handleStep1Generate = () => {
    setIsTouched(true);
    // If user provided scenario in step 1, sync into reviewScenario
    if (scenario.trim()) {
      setReviewScenario(prev => scenario.length > 50 ? scenario : prev);
    }
    setActiveStep(2);
  };

  const selectedCharObj = AUDIO_CHARACTERS.find(c => c.id === audioCharacter) || AUDIO_CHARACTERS[1];

  return (
    <div className="min-h-screen -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 p-4 sm:p-8 bg-gradient-to-br from-purple-50/70 via-indigo-50/30 to-amber-50/30 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-900 transition-colors">
      
      {/* Top Header Navigation matching Screenshot image_0d4345cb.png */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-purple-100/60 dark:border-slate-800/80 mb-6">
        
        {/* Left: Back button + inline editable title */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-bold text-[#5542F6] dark:text-purple-400 hover:text-purple-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to curriculum</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          {/* Editable title with pencil icon */}
          {isEditingTitleInline ? (
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitleInline(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitleInline(false);
                }}
                autoFocus
                className="px-2 py-1 text-sm font-bold border border-purple-400 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={() => setIsEditingTitleInline(false)}
                className="p-1 text-emerald-600 hover:text-emerald-700"
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingTitleInline(true)}
              className="flex items-center space-x-1.5 text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:text-purple-600 transition-colors"
              title="Click to edit title"
            >
              <span>{title || 'test'}</span>
              <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-purple-600 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Center: Stepper Wizard matching Screenshot image_0d4345cb.png */}
        <div className="flex items-center justify-center space-x-3">
          {/* Step 1 indicator */}
          <div 
            onClick={() => setActiveStep(1)}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              activeStep === 1 
                ? 'bg-[#1E1256] text-white shadow-sm' 
                : 'bg-[#6D28D9] text-white'
            }`}>
              {activeStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
            </div>
            <span className={`text-xs font-semibold ${
              activeStep === 1 
                ? 'text-slate-900 dark:text-slate-100' 
                : 'text-slate-700 dark:text-slate-300 group-hover:text-purple-600'
            }`}>
              Role Play setup
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-600 text-sm">→</span>

          {/* Step 2 indicator */}
          <div 
            onClick={() => setActiveStep(2)}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              activeStep === 2 
                ? 'bg-[#6D28D9] text-white shadow-sm' 
                : 'border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
            }`}>
              2
            </div>
            <span className={`text-xs ${
              activeStep === 2 
                ? 'font-bold text-slate-900 dark:text-slate-100' 
                : 'font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700'
            }`}>
              Review details
            </span>
          </div>
        </div>

        {/* Right: Actions (Preview, Save, Publish) */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-1.5 border border-purple-600/70 text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAction(false)}
            disabled={isSaving}
            className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
          </button>

          <button
            type="button"
            onClick={() => handleSaveAction(true)}
            disabled={isSaving}
            className="px-4 py-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <span>Publish</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="max-w-5xl mx-auto my-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* STEP 2: REVIEW DETAILS SCREEN (MATCHING USER SCREENSHOTS image_0d4345cb.png, image_01053a5c.png, image_6675de6f.png) */}
      {activeStep === 2 && (
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Banner Callout matching image_0d4345cb.png */}
          {!bannerDismissed && (
            <div className="relative bg-[#F8F6FF] dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-6 sm:p-7 shadow-sm transition-all">
              {/* Close button */}
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                {/* Sparkle icon */}
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 fill-purple-600/30" />
                </div>

                <div className="space-y-3.5 flex-1 pr-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Your Practice Role Play is ready to review
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Not happy with the results? Go back to refine your inputs and regenerate.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setBannerDismissed(true)}
                      className="px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      Looks good
                    </button>

                    <button
                      type="button"
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="px-4 py-2 bg-white dark:bg-slate-900 border border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold text-xs sm:text-sm rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main White Review Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-purple-900/5 p-6 sm:p-10 space-y-10 transition-all">
            
            {/* SECTION 1: Meeting Details matching image_0d4345cb.png & image_01053a5c.png */}
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Meeting Details
              </h2>

              {/* Field 1: Meeting title */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Meeting title
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    A short, descriptive title learners will see at the start of the Role Play.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Meeting with Alex"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                  />
                </div>
              </div>

              {/* Field 2: Scenario with Rich Text Toolbar matching image_01053a5c.png */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-3">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Scenario
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Set who&apos;s involved, what&apos;s at stake, and the challenge the learner walks into. Don&apos;t reveal how it should play out. Use direct and active language.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-purple-600 focus-within:border-purple-600 bg-white dark:bg-slate-950">
                    {/* Rich text formatting bar matching screenshot */}
                    <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewScenario(prev => prev + ' **emphasized**');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Bold"
                        >
                          <Bold className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewScenario(prev => prev + ' *italic*');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Italic"
                        >
                          <Italic className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewScenario(prev => prev + '\n1. First point');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Numbered list"
                        >
                          <ListOrdered className="w-4 h-4 stroke-[2.2]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewScenario(prev => prev + '\n- Bullet item');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Bullet list"
                        >
                          <List className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>

                      {/* Character count on far right */}
                      <span className="text-xs text-slate-400 font-mono">
                        {reviewScenario.length}
                      </span>
                    </div>

                    <textarea
                      rows={7}
                      value={reviewScenario}
                      onChange={(e) => setReviewScenario(e.target.value)}
                      className="w-full p-4 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed outline-none resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* Field 3: Meeting duration matching image_01053a5c.png */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-3">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Meeting duration
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Choose the time limit that matches the complexity of your scenario.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Option 1: 3 minutes */}
                    <div
                      onClick={() => setMeetingDuration('3')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        meetingDuration === '3'
                          ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/20 dark:bg-purple-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          meetingDuration === '3' 
                            ? 'border-purple-600' 
                            : 'border-slate-400'
                        }`}>
                          {meetingDuration === '3' && (
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          3 minutes
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                        Quick, focused exchange
                      </p>
                    </div>

                    {/* Option 2: 5 minutes */}
                    <div
                      onClick={() => setMeetingDuration('5')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        meetingDuration === '5'
                          ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/20 dark:bg-purple-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          meetingDuration === '5' 
                            ? 'border-purple-600' 
                            : 'border-slate-400'
                        }`}>
                          {meetingDuration === '5' && (
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          5 minutes
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                        Most common scenarios
                      </p>
                    </div>

                    {/* Option 3: 10 minutes */}
                    <div
                      onClick={() => setMeetingDuration('10')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        meetingDuration === '10'
                          ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/20 dark:bg-purple-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          meetingDuration === '10' 
                            ? 'border-purple-600' 
                            : 'border-slate-400'
                        }`}>
                          {meetingDuration === '10' && (
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          10 minutes
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                        Complex or high-stakes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field 4: Learner role matching image_01053a5c.png */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-3">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Learner role
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Describe who the learner is, their job title and context within the scenario.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <input
                    type="text"
                    value={learnerRole}
                    onChange={(e) => setLearnerRole(e.target.value)}
                    placeholder="Team lead in a mid-sized software company."
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Character Setup matching image_6675de6f.png */}
            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Character setup
              </h2>

              {/* Field 1: Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Name
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    The name your AI character will use during the Role Play.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Alex"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                  />
                </div>
              </div>

              {/* Field 2: Audio character matching image_6675de6f.png */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-3">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Audio character
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Choose how this character looks and sounds in audio mode.
                  </p>
                </div>

                <div className="md:col-span-8 relative">
                  <div className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-between shadow-xs">
                    
                    {/* Avatar and Character selector trigger */}
                    <div 
                      onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
                      className="flex items-center space-x-3 cursor-pointer group flex-1"
                    >
                      <img
                        src={selectedCharObj.avatar}
                        alt={selectedCharObj.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/20 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600">
                            {selectedCharObj.name}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-xs text-slate-400 block">
                          {selectedCharObj.description}
                        </span>
                      </div>
                    </div>

                    {/* Audio Preview Play Button matching screenshot */}
                    <button
                      type="button"
                      onClick={handleToggleAudioPreview}
                      className="w-9 h-9 rounded-full hover:bg-purple-50 dark:hover:bg-purple-950/60 flex items-center justify-center text-purple-700 dark:text-purple-400 transition-colors cursor-pointer"
                      title={isPlayingAudio ? "Stop sample" : "Play audio sample"}
                    >
                      {isPlayingAudio ? (
                        <Square className="w-4 h-4 fill-purple-600 text-purple-600 animate-pulse" />
                      ) : (
                        <Play className="w-4 h-4 fill-purple-600 text-purple-600 ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Character selection dropdown */}
                  {showCharacterDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden animate-fadeIn">
                      {AUDIO_CHARACTERS.map((char) => (
                        <div
                          key={char.id}
                          onClick={() => {
                            setAudioCharacter(char.id);
                            setShowCharacterDropdown(false);
                          }}
                          className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer ${
                            audioCharacter === char.id ? 'bg-purple-50/50 dark:bg-purple-950/30' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={char.avatar}
                              alt={char.name}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                {char.name}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                {char.description}
                              </span>
                            </div>
                          </div>

                          {audioCharacter === char.id && (
                            <Check className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Field 3: Character role matching image_6675de6f.png */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-3">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Character role
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Describe who this character is within the scenario — their job title and relationship to the learner.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <input
                    type="text"
                    value={characterRole}
                    onChange={(e) => setCharacterRole(e.target.value)}
                    placeholder="A talented but disengaged software developer reporting to the learner."
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                  />
                </div>
              </div>

              {/* Field 4: Personality and background with Toolbar matching image_6675de6f.png */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-3">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Personality and background
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Describe how this character thinks, feels, and behaves. The more specific you are, the more realistic the conversation will feel.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-purple-600 focus-within:border-purple-600 bg-white dark:bg-slate-950">
                    {/* Rich text formatting bar matching screenshot */}
                    <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400">
                        <button
                          type="button"
                          onClick={() => {
                            setPersonalityAndBackground(prev => prev + ' **bold**');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Bold"
                        >
                          <Bold className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPersonalityAndBackground(prev => prev + ' *italic*');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Italic"
                        >
                          <Italic className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPersonalityAndBackground(prev => prev + '\n1. First behavioral pattern');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Numbered list"
                        >
                          <ListOrdered className="w-4 h-4 stroke-[2.2]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPersonalityAndBackground(prev => prev + '\n- Trait');
                          }}
                          className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-800 dark:text-purple-300 transition-colors"
                          title="Bullet list"
                        >
                          <List className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>

                      {/* Character count on far right */}
                      <span className="text-xs text-slate-400 font-mono">
                        {personalityAndBackground.length}
                      </span>
                    </div>

                    <textarea
                      rows={6}
                      value={personalityAndBackground}
                      onChange={(e) => setPersonalityAndBackground(e.target.value)}
                      className="w-full p-4 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed outline-none resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions of Step 2 matching image_0d4345cb.png */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="text-sm font-bold text-[#6D28D9] hover:text-[#5B21B6] transition-colors cursor-pointer"
              >
                Back
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleSaveAction(false)}
                  disabled={isSaving}
                  className="px-5 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAction(true)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <span>Publish</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* STEP 1: SETUP SCREEN */}
      {activeStep === 1 && (
        <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-purple-900/5 p-6 sm:p-10 space-y-8 my-4 transition-all">
          
          {/* Header info */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Set up your Practice Role Play
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Role Plays let learners practice soft skills through realistic AI-powered conversations. Describe your scenario and we&apos;ll build the experience.
            </p>
          </div>

          {/* Field: Role Play Title */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Role Play Title</span>
              <span className="text-xs font-normal text-slate-400">{100 - title.length}</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Role Play title here"
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors"
            />
          </div>

          {/* Field: Skills to practice */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Skills to practice
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The skills you list here are what learners will be assessed on.
            </p>
            <textarea
              rows={4}
              value={skillsToPractice}
              onChange={(e) => setSkillsToPractice(e.target.value)}
              placeholder="e.g. active listening, giving constructive feedback"
              className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors resize-y"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add at least 100 characters to generate a tailored Role Play.
            </p>
          </div>

          {/* Field: Scenario */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Scenario
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Describe who&apos;s involved, what&apos;s at stake, and the challenge the learner needs to navigate.
            </p>
            <textarea
              rows={5}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="e.g. A manager addressing repeated missed deadlines with a high-performing employee"
              className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors resize-y"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add at least 100 characters to generate a tailored Role Play.
              </p>
            </div>
          </div>

          {/* Field: Additional context */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Additional context
              </h2>
              <span className="text-xs text-slate-400 font-normal">Optional</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Background the AI knows but the learner doesn&apos;t — motivations, sensitivities, things to avoid.
            </p>
            <textarea
              rows={4}
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. The employee recently went through a difficult personal situation. They're not ready to discuss it but it's affecting their focus."
              className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors resize-y"
            />
          </div>

          {/* Field: Link related lectures */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Link related lectures
              </h2>
              <span className="text-xs text-slate-400 font-normal">Optional</span>
            </div>

            {/* Search input with purple search button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lectures"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>
              <button
                type="button"
                className="w-10 h-10 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Selection status and time budget bar */}
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
              <span className="font-medium">{linkedLectures.length} lectures selected</span>
              <div className="flex-1 mx-4 h-2 bg-purple-100 dark:bg-purple-950/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, (linkedLectures.length / 8) * 100)}%` }}
                />
              </div>
              <span className="font-medium">0 / 40 mins</span>
            </div>

            {/* Collapsible Sections and Lectures list */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {formattedSections.map((sec) => {
                const isCollapsed = !!collapsedSections[sec.id];
                const nonRolePlayLessons = sec.lessons.filter((l: any) => l.type !== 'roleplay');

                return (
                  <div key={sec.id} className="bg-white dark:bg-slate-900">
                    {/* Section Header */}
                    <div 
                      className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between cursor-pointer select-none"
                      onClick={() => toggleSectionCollapse(sec.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={nonRolePlayLessons.length > 0 && nonRolePlayLessons.every((l: any) => linkedLectures.includes(l.id))}
                          onChange={(e) => {
                            e.stopPropagation();
                            const allIds = nonRolePlayLessons.map((l: any) => l.id);
                            if (allIds.every((id: string) => linkedLectures.includes(id))) {
                              setLinkedLectures(prev => prev.filter(id => !allIds.includes(id)));
                            } else {
                              setLinkedLectures(prev => Array.from(new Set([...prev, ...allIds])));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{sec.title}</span>
                          <span className="text-[11px] text-slate-400 block">{nonRolePlayLessons.length} lecture{nonRolePlayLessons.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>

                      <button type="button" className="p-1 text-slate-400 hover:text-slate-600">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Section items */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {nonRolePlayLessons.map((lec: any) => (
                          <div 
                            key={lec.id}
                            className="px-6 py-2.5 flex items-center space-x-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer"
                            onClick={() => toggleLectureSelect(lec.id)}
                          >
                            <input
                              type="checkbox"
                              checked={linkedLectures.includes(lec.id)}
                              onChange={() => toggleLectureSelect(lec.id)}
                              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">
                              {lec.title}
                            </span>
                            {lec.isWarning && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                        ))}

                        {/* Current Role Play banner */}
                        <div className="px-6 py-3 bg-[#F4F1FD] dark:bg-purple-950/40 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                              Role Play: {title || 'test'}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 bg-purple-200/80 dark:bg-purple-900/60 text-[#5542F6] dark:text-purple-300 font-bold text-[11px] rounded-lg">
                            This Role Play
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSaveAction(false)}
              disabled={isSaving}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Draft'}
            </button>

            <button
              type="button"
              onClick={handleStep1Generate}
              className="px-6 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Role Play</span>
            </button>
          </div>
        </div>
      )}

      {/* INTERACTIVE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedCharObj.avatar}
                  alt={characterName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50"
                />
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <span>{meetingTitle || `Meeting with ${characterName}`}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                      {meetingDuration} mins limit
                    </span>
                  </h3>
                  <p className="text-xs text-purple-100">
                    Character: {characterName} ({characterRole})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Learner Context Banner */}
            <div className="px-6 py-3 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Your Role:</strong> {learnerRole}
              </span>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
              {previewChatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${msg.sender === 'learner' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <img
                      src={selectedCharObj.avatar}
                      alt={characterName}
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  )}
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'learner'
                        ? 'bg-[#6D28D9] text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Input bar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <input
                type="text"
                value={previewInputText}
                onChange={(e) => setPreviewInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && previewInputText.trim()) {
                    const text = previewInputText.trim();
                    setPreviewChatMessages(prev => [...prev, { sender: 'learner', text }]);
                    setPreviewInputText('');
                    setTimeout(() => {
                      setPreviewChatMessages(prev => [
                        ...prev, 
                        { 
                          sender: 'ai', 
                          text: `I appreciate you bringing that up. To be completely candid, I felt my recent contributions weren't valued, so it felt like deadlines were arbitrary. But I want to deliver quality work.`
                        }
                      ]);
                    }, 900);
                  }
                }}
                placeholder={`Respond to ${characterName}... (press Enter to send)`}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-purple-600"
              />
              <button
                type="button"
                onClick={() => {
                  if (previewInputText.trim()) {
                    const text = previewInputText.trim();
                    setPreviewChatMessages(prev => [...prev, { sender: 'learner', text }]);
                    setPreviewInputText('');
                    setTimeout(() => {
                      setPreviewChatMessages(prev => [
                        ...prev, 
                        { 
                          sender: 'ai', 
                          text: `I appreciate you bringing that up. To be completely candid, I felt my recent contributions weren't valued, so it felt like deadlines were arbitrary. But I want to deliver quality work.`
                        }
                      ]);
                    }, 900);
                  }
                }}
                className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl text-xs font-bold transition-colors"
              >
                Send
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
