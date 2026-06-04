import React, { useState } from 'react';
import { X, Loader2, Target, CheckCircle2, XCircle } from 'lucide-react';

interface QuizModalProps {
  documentId: string;
  onClose: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export default function QuizModal({ documentId, onClose }: QuizModalProps) {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, topic: topic.trim() }),
      });

      if (!response.ok) throw new Error('Failed to generate quiz');

      const data = await response.json();
      setQuiz(data.quiz);
      setCurrentQuestionIdx(0);
      setScore(0);
      setSelectedOption(null);
      setShowResult(false);
    } catch (error) {
      console.error(error);
      alert('Error generating quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !quiz) return;
    
    if (selectedOption === quiz[currentQuestionIdx].correct_answer) {
      setScore(prev => prev + 1);
    }
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    
    if (currentQuestionIdx < quiz.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      // Quiz complete
      setCurrentQuestionIdx(quiz.length); // Out of bounds means done
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Topic-Targeted Quiz</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {!quiz && !isGenerating && (
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-lg font-medium text-slate-200">What would you like to be tested on?</h3>
                <p className="text-slate-400 text-sm">Enter a topic, and AI will generate a 5-question quiz based strictly on the document context.</p>
              </div>
              
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Machine Learning, Data Structures, Chapter 3..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={!topic.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                Generate Quiz
              </button>
            </form>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin relative z-10" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-slate-200">Generating questions...</h3>
                <p className="text-slate-400 text-sm mt-1">Analyzing document context for "{topic}"</p>
              </div>
            </div>
          )}

          {quiz && currentQuestionIdx < quiz.length && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm font-medium text-slate-400 mb-6">
                <span>Question {currentQuestionIdx + 1} of {quiz.length}</span>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-indigo-300">Score: {score}</span>
              </div>
              
              <h3 className="text-xl font-medium text-slate-100 leading-snug">
                {quiz[currentQuestionIdx].question}
              </h3>
              
              <div className="space-y-3">
                {quiz[currentQuestionIdx].options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === quiz[currentQuestionIdx].correct_answer;
                  
                  let buttonClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 flex justify-between items-center group ";
                  
                  if (!showResult) {
                    buttonClass += isSelected 
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-200" 
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600";
                  } else {
                    if (isCorrect) {
                      buttonClass += "border-green-500 bg-green-500/10 text-green-300";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "border-red-500 bg-red-500/10 text-red-300";
                    } else {
                      buttonClass += "border-slate-700 bg-slate-800/30 text-slate-500 opacity-50";
                    }
                  }

                  return (
                    <button 
                      key={idx}
                      onClick={() => handleOptionSelect(option)}
                      className={buttonClass}
                      disabled={showResult}
                    >
                      <span className="text-sm">{option}</span>
                      {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <div className="mt-6 p-5 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2 animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="text-sm font-semibold text-slate-200">Explanation:</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{quiz[currentQuestionIdx].explanation}</p>
                </div>
              )}
            </div>
          )}

          {quiz && currentQuestionIdx >= quiz.length && (
            <div className="text-center py-12 space-y-6">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100">Quiz Complete!</h3>
              <p className="text-lg text-slate-300">
                You scored <span className="font-bold text-indigo-400">{score}</span> out of {quiz.length}
              </p>
              
              <div className="pt-8 flex gap-4 justify-center">
                <button 
                  onClick={() => setQuiz(null)} 
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
                >
                  New Quiz
                </button>
                <button 
                  onClick={onClose} 
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
                >
                  Back to Reading
                </button>
              </div>
            </div>
          )}
        </div>

        {quiz && currentQuestionIdx < quiz.length && (
          <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end">
            {!showResult ? (
              <button 
                onClick={handleSubmitAnswer}
                disabled={!selectedOption}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                Submit Answer
              </button>
            ) : (
              <button 
                onClick={handleNextQuestion}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {currentQuestionIdx < quiz.length - 1 ? 'Next Question' : 'View Results'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
