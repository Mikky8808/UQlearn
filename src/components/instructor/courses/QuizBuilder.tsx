import React, { useState } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Check, 
  X, 
  Copy, 
  Eye, 
  Clock, 
  Award, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Settings, 
  Save, 
  RotateCcw, 
  Lightbulb, 
  AlertCircle,
  Play,
  FileCheck,
  Zap,
  Code,
  Shuffle
} from 'lucide-react';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'multi-select' | 'true-false';
  points: number;
  options: QuizOption[];
  generalExplanation?: string;
  hint?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface QuizData {
  id: string;
  title: string;
  description: string;
  passingScore: number; // percentage e.g. 80
  timeLimitMinutes: number; // 0 for unlimited
  maxAttempts: number; // 0 for unlimited
  shuffleQuestions: boolean;
  showExplanations: boolean;
  questions: QuizQuestion[];
}

interface QuizBuilderProps {
  initialQuiz?: Partial<QuizData>;
  onSave?: (quiz: QuizData) => void;
  onCancel?: () => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({
  initialQuiz,
  onSave,
  onCancel,
}) => {
  // Quiz Header Settings
  const [quizTitle, setQuizTitle] = useState(initialQuiz?.title || 'Section 2: Microservices & Event Stream Assessment');
  const [quizDescription, setQuizDescription] = useState(
    initialQuiz?.description || 'Test your knowledge on WebSocket upgrade handshakes, optimistic state rollbacks, and message brokers.'
  );
  const [passingScore, setPassingScore] = useState(initialQuiz?.passingScore || 80);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(initialQuiz?.timeLimitMinutes || 15);
  const [maxAttempts, setMaxAttempts] = useState(initialQuiz?.maxAttempts || 3);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialQuiz?.shuffleQuestions ?? true);
  const [showExplanations, setShowExplanations] = useState(initialQuiz?.showExplanations ?? true);

  // Questions List
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuiz?.questions || [
    {
      id: 'q-1',
      question: 'Which HTTP header is mandatory for initiating a WebSocket protocol upgrade handshake?',
      type: 'multiple-choice',
      points: 10,
      difficulty: 'Intermediate',
      generalExplanation: 'The "Upgrade: websocket" header paired with "Connection: Upgrade" informs the reverse proxy and server to transition from HTTP to a bi-directional TCP socket stream.',
      hint: 'Think about switching protocols from standard HTTP to bi-directional sockets.',
      options: [
        { id: 'opt-1-1', text: 'Upgrade: websocket', isCorrect: true, explanation: 'Correct! This header signals the switch to WebSocket protocol.' },
        { id: 'opt-1-2', text: 'Connection: keep-alive', isCorrect: false },
        { id: 'opt-1-3', text: 'Authorization: Bearer <token>', isCorrect: false },
        { id: 'opt-1-4', text: 'Content-Type: application/octet-stream', isCorrect: false }
      ]
    },
    {
      id: 'q-2',
      question: 'When should an "Optimistic UI Update" be rolled back in a client application?',
      type: 'multiple-choice',
      points: 10,
      difficulty: 'Beginner',
      generalExplanation: 'Optimistic UI assumes success immediately; if the server responds with an error status (e.g. 4xx/5xx) or timeout, the local state must revert to its prior state.',
      hint: 'Consider what happens when the network connection drops or the server rejects the write.',
      options: [
        { id: 'opt-2-1', text: 'Immediately before dispatching the request to the network', isCorrect: false },
        { id: 'opt-2-2', text: 'Only when the server returns an HTTP error code or network timeout', isCorrect: true, explanation: 'Correct! Optimistic updates are retained on success and rolled back on error.' },
        { id: 'opt-2-3', text: 'Whenever a user navigates to another page tab', isCorrect: false },
        { id: 'opt-2-4', text: 'Never; client state should remain fixed regardless of server response', isCorrect: false }
      ]
    },
    {
      id: 'q-3',
      question: 'Which of the following are benefits of implementing event-driven microservices with Apache Kafka or RabbitMQ? (Select the most accurate statement)',
      type: 'multiple-choice',
      points: 10,
      difficulty: 'Advanced',
      generalExplanation: 'Event streaming decouples producers from consumers, buffering surges in load and enabling asynchronous task execution.',
      options: [
        { id: 'opt-3-1', text: 'Complete temporal decoupling between publisher and consumer services with high throughput buffering', isCorrect: true },
        { id: 'opt-3-2', text: 'Eliminates the need for any persistent database storage', isCorrect: false },
        { id: 'opt-3-3', text: 'Forces all operations to execute synchronously within 5 milliseconds', isCorrect: false },
        { id: 'opt-3-4', text: 'Guarantees zero memory allocation across all Node.js cluster processes', isCorrect: false }
      ]
    }
  ]);

  // Selected Active Question for Editing
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const activeQuestion = questions[selectedQuestionIndex] || questions[0];

  // View Mode: 'builder' vs 'preview' vs 'settings'
  const [viewMode, setViewMode] = useState<'builder' | 'preview' | 'settings'>('builder');

  // Preview Mode State for Interactive Testing
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handlers for Question Modification
  const handleUpdateActiveQuestion = (updates: Partial<QuizQuestion>) => {
    setQuestions(prev => prev.map((q, idx) => idx === selectedQuestionIndex ? { ...q, ...updates } : q));
  };

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      question: `Question ${questions.length + 1}: Enter your question statement here...`,
      type: 'multiple-choice',
      points: 10,
      difficulty: 'Intermediate',
      options: [
        { id: `opt-${Date.now()}-1`, text: 'Option A (Correct Answer)', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'Option B', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: 'Option C', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: 'Option D', isCorrect: false },
      ]
    };
    setQuestions([...questions, newQ]);
    setSelectedQuestionIndex(questions.length);
    showNotification('New multiple-choice question added!');
  };

  const handleDeleteQuestion = (indexToDelete: number) => {
    if (questions.length <= 1) {
      showNotification('A quiz must contain at least 1 question.', 'info');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== indexToDelete);
    setQuestions(updated);
    setSelectedQuestionIndex(Math.max(0, indexToDelete - 1));
    showNotification('Question deleted.');
  };

  const handleDuplicateQuestion = (index: number) => {
    const toClone = questions[index];
    const cloned: QuizQuestion = {
      ...toClone,
      id: `q-${Date.now()}`,
      question: `${toClone.question} (Copy)`,
      options: toClone.options.map(o => ({ ...o, id: `opt-${Date.now()}-${Math.random()}` }))
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, cloned);
    setQuestions(updated);
    setSelectedQuestionIndex(index + 1);
    showNotification('Question duplicated.');
  };

  // Option Handlers
  const handleAddOption = () => {
    if (!activeQuestion) return;
    if (activeQuestion.options.length >= 6) {
      showNotification('Maximum 6 answer options per question.', 'info');
      return;
    }
    const newOpt: QuizOption = {
      id: `opt-${Date.now()}`,
      text: `New Option ${String.fromCharCode(65 + activeQuestion.options.length)}`,
      isCorrect: false
    };
    handleUpdateActiveQuestion({
      options: [...activeQuestion.options, newOpt]
    });
  };

  const handleUpdateOption = (optId: string, updates: Partial<QuizOption>) => {
    if (!activeQuestion) return;
    handleUpdateActiveQuestion({
      options: activeQuestion.options.map(opt => opt.id === optId ? { ...opt, ...updates } : opt)
    });
  };

  const handleSetCorrectOption = (optId: string) => {
    if (!activeQuestion) return;
    handleUpdateActiveQuestion({
      options: activeQuestion.options.map(opt => ({
        ...opt,
        isCorrect: opt.id === optId
      }))
    });
    showNotification('Correct answer selected.');
  };

  const handleDeleteOption = (optId: string) => {
    if (!activeQuestion) return;
    if (activeQuestion.options.length <= 2) {
      showNotification('Multiple-choice questions need at least 2 options.', 'info');
      return;
    }
    const wasCorrect = activeQuestion.options.find(o => o.id === optId)?.isCorrect;
    const remaining = activeQuestion.options.filter(o => o.id !== optId);
    // If we deleted the correct one, make the first one correct by default
    if (wasCorrect && remaining.length > 0) {
      remaining[0].isCorrect = true;
    }
    handleUpdateActiveQuestion({ options: remaining });
  };

  // AI Generator Simulator
  const handleGenerateAiQuestions = () => {
    const aiQuestion: QuizQuestion = {
      id: `q-ai-${Date.now()}`,
      question: 'Which consistency model does Firestore provide for strong document reads within the same regional cluster?',
      type: 'multiple-choice',
      points: 10,
      difficulty: 'Advanced',
      generalExplanation: 'Cloud Firestore uses multi-region Paxos consensus to guarantee strong consistency for all document lookups and transactional queries.',
      options: [
        { id: `opt-ai-1`, text: 'Strong Consistency with ACID transactional guarantees', isCorrect: true },
        { id: `opt-ai-2`, text: 'Eventual consistency with dirty read anomalies', isCorrect: false },
        { id: `opt-ai-3`, text: 'Probabilistic consistency bounded by 10-second latency', isCorrect: false },
        { id: `opt-ai-4`, text: 'Read-your-writes only with client-side caching', isCorrect: false }
      ]
    };
    setQuestions([...questions, aiQuestion]);
    setSelectedQuestionIndex(questions.length);
    showNotification('AI Generated new Multiple-Choice question from syllabus!');
  };

  // Save Quiz Handler
  const handleSaveAll = () => {
    const payload: QuizData = {
      id: initialQuiz?.id || `quiz-${Date.now()}`,
      title: quizTitle,
      description: quizDescription,
      passingScore,
      timeLimitMinutes,
      maxAttempts,
      shuffleQuestions,
      showExplanations,
      questions
    };
    if (onSave) onSave(payload);
    showNotification('Quiz saved to course module successfully!');
  };

  // Calculate stats
  const totalPoints = questions.reduce((acc, q) => acc + q.points, 0);

  // Calculate Student Preview Score
  const calculatePreviewScore = () => {
    let earned = 0;
    questions.forEach(q => {
      const selectedOptId = previewAnswers[q.id];
      const correctOpt = q.options.find(o => o.isCorrect);
      if (correctOpt && correctOpt.id === selectedOptId) {
        earned += q.points;
      }
    });
    return earned;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold shadow-2xl transition-all ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Interactive Quiz & Assessment Studio</span>
            </div>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Quiz Title..."
              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
            />
            <input
              type="text"
              value={quizDescription}
              onChange={(e) => setQuizDescription(e.target.value)}
              placeholder="Instructions or summary for learners..."
              className="text-xs text-slate-500 bg-transparent w-full focus:outline-none px-1"
            />
          </div>

          {/* Action Tabs & Save Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setViewMode('builder')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'builder'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Question Builder
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('preview');
                  setPreviewSubmitted(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Learner Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'settings'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Quiz</span>
            </button>
          </div>
        </div>

        {/* Quick Quiz Metadata Bar */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Award className="w-4 h-4 text-emerald-500" />
            <span className="font-bold">{questions.length} Questions</span>
            <span>({totalPoints} Total Points)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold">{timeLimitMinutes > 0 ? `${timeLimitMinutes} Mins Time Limit` : 'Untimed'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            <span className="font-semibold">Passing: {passingScore}%</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <RotateCcw className="w-4 h-4 text-purple-500" />
            <span className="font-semibold">Attempts: {maxAttempts > 0 ? `${maxAttempts} Max` : 'Unlimited'}</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: BUILDER MODE */}
      {viewMode === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Questions Sidebar & Navigator (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Questions ({questions.length})
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleGenerateAiQuestions}
                    className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    title="Generate question with Gemini AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px]">AI Auto</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    title="Add new question"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Add</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {questions.map((q, qIdx) => {
                  const isSelected = qIdx === selectedQuestionIndex;
                  const correctOpt = q.options.find(o => o.isCorrect);

                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestionIndex(qIdx)}
                      className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-1 ring-emerald-400 dark:ring-emerald-800'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          Q{qIdx + 1}. Multiple Choice
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {q.points} pts
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateQuestion(qIdx);
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-0.5"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(qIdx);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-0.5"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 line-clamp-2 text-[11px] font-medium leading-relaxed">
                        {q.question || 'Empty question prompt...'}
                      </p>

                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{q.options.length} options</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[120px]">
                          ✓ {correctOpt ? correctOpt.text : 'No correct answer'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Question {questions.length + 1}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Question Editor Form (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {activeQuestion ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
                
                {/* Editor Header for this Question */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Editing Question #{selectedQuestionIndex + 1}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Multiple-Choice Question Parameters</h3>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5">
                      <label className="text-xs font-bold text-slate-500">Points:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={activeQuestion.points}
                        onChange={(e) => handleUpdateActiveQuestion({ points: Number(e.target.value) || 1 })}
                        className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                      />
                    </div>

                    <select
                      value={activeQuestion.difficulty || 'Intermediate'}
                      onChange={(e: any) => handleUpdateActiveQuestion({ difficulty: e.target.value })}
                      className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Question Statement Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Question Prompt / Text</span>
                    <span className="text-[10px] font-normal text-slate-400">Markdown & code snippets supported</span>
                  </label>
                  <textarea
                    rows={3}
                    value={activeQuestion.question}
                    onChange={(e) => handleUpdateActiveQuestion({ question: e.target.value })}
                    placeholder="Enter the question clearly..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 outline-hidden leading-relaxed"
                  />
                </div>

                {/* Options Manager */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <span>Answer Options ({activeQuestion.options.length})</span>
                      <span className="text-[11px] font-normal text-slate-400">(Select the radio button for the correct answer)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  </div>

                  {/* Option Rows */}
                  <div className="space-y-3">
                    {activeQuestion.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            opt.isCorrect
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {/* Correct Indicator / Radio Button */}
                            <button
                              type="button"
                              onClick={() => handleSetCorrectOption(opt.id)}
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all cursor-pointer ${
                                opt.isCorrect
                                  ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                  : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-500 hover:border-emerald-500'
                              }`}
                              title={opt.isCorrect ? 'Correct Answer' : 'Click to mark as Correct Answer'}
                            >
                              {opt.isCorrect ? <Check className="w-4 h-4" /> : letter}
                            </button>

                            {/* Option Text Input */}
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleUpdateOption(opt.id, { text: e.target.value })}
                              placeholder={`Option ${letter} text...`}
                              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />

                            {/* Correct Answer Badge */}
                            {opt.isCorrect && (
                              <span className="hidden sm:inline text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded-md shrink-0">
                                Correct Answer
                              </span>
                            )}

                            {/* Delete Option */}
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(opt.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg shrink-0"
                              title="Delete option"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Optional Explanation for this option */}
                          {opt.isCorrect && (
                            <div className="mt-2.5 pl-10 pr-2">
                              <input
                                type="text"
                                value={opt.explanation || ''}
                                onChange={(e) => handleUpdateOption(opt.id, { explanation: e.target.value })}
                                placeholder="Why is this option correct? (Optional explanation shown to learners after answering)"
                                className="w-full bg-transparent text-[11px] text-emerald-800 dark:text-emerald-300 placeholder-emerald-600/50 focus:outline-none border-b border-emerald-300/40 pb-0.5"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall Explanation & Hint Accordion / Fields */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>General Explanation & Learning Notes</span>
                    </label>
                    <textarea
                      rows={2}
                      value={activeQuestion.generalExplanation || ''}
                      onChange={(e) => handleUpdateActiveQuestion({ generalExplanation: e.target.value })}
                      placeholder="Comprehensive explanation displayed on the review screen..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-hidden"
                    />
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border p-12 text-center text-xs text-slate-400">
                No question selected. Click "Add Question" to begin.
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW 2: INTERACTIVE STUDENT PREVIEW MODE */}
      {viewMode === 'preview' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-xs font-bold">
                <Play className="w-3 h-3" />
                <span>Interactive Learner Assessment Simulator</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">{quizTitle}</h3>
              <p className="text-xs text-slate-500">{quizDescription}</p>
            </div>

            {previewSubmitted && (
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Score Result</span>
                <span className={`text-xl font-black ${
                  (calculatePreviewScore() / totalPoints) * 100 >= passingScore ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {calculatePreviewScore()} / {totalPoints} pts ({Math.round((calculatePreviewScore() / totalPoints) * 100)}%)
                </span>
              </div>
            )}
          </div>

          {/* Questions in Preview */}
          <div className="space-y-6">
            {questions.map((q, qIdx) => {
              const selectedOptId = previewAnswers[q.id];
              const isAnswered = Boolean(selectedOptId);

              return (
                <div key={q.id} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                      {qIdx + 1}. {q.question}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                      {q.points} pts
                    </span>
                  </div>

                  {/* Multiple Choice Options List */}
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedOptId === opt.id;
                      const letter = String.fromCharCode(65 + optIdx);

                      let optionStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
                      if (previewSubmitted) {
                        if (opt.isCorrect) {
                          optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold';
                        } else if (isSelected && !opt.isCorrect) {
                          optionStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200';
                        }
                      } else if (isSelected) {
                        optionStyle = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 font-bold';
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={previewSubmitted}
                          onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                          className={`w-full p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${optionStyle}`}
                        >
                          <div className="flex items-center space-x-3 text-left">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px]">
                              {letter}
                            </span>
                            <span>{opt.text}</span>
                          </div>

                          {previewSubmitted && opt.isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          {previewSubmitted && isSelected && !opt.isCorrect && (
                            <X className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback Explanation Display */}
                  {previewSubmitted && showExplanations && (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                      <span className="font-bold flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Explanation:</span>
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {q.generalExplanation || 'No specific explanation provided for this question.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submission / Retake Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setPreviewAnswers({});
                setPreviewSubmitted(false);
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Reset Answers
            </button>

            {!previewSubmitted ? (
              <button
                type="button"
                onClick={() => setPreviewSubmitted(true)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Submit Test Preview
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('builder')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Back to Question Editor
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: ADVANCED QUIZ SETTINGS */}
      {viewMode === 'settings' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Quiz Grading & Attempt Rules</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control passing thresholds, timer limits, attempt caps, and explanation reveals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Passing Threshold (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Learners must score at least this percentage to earn module credit.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Time Limit (Minutes)</label>
              <input
                type="number"
                min="0"
                max="180"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Set to 0 for untimed open-book assessments.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Max Allowed Attempts</label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Set to 0 for unlimited attempts.</span>
            </div>

            <div className="space-y-4 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Randomize question sequence for each learner</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExplanations}
                  onChange={(e) => setShowExplanations(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show detailed answer explanations after submission</span>
              </label>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
