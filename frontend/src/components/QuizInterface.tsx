import { useState, useEffect } from 'react';
import api from '../services/api';

interface Question {
  questionId: string;
  questionText: string;
  questionType: string;
  codeSnippet?: string;
  options: QuestionOption[];
  topic: string;
  difficulty: number;
}

interface QuestionOption {
  optionId: string;
  text: string;
}

interface Quiz {
  quizId: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  questions: Question[];
  timeLimit: number;
  passingScore: number;
  difficulty: string;
}

interface QuizResult {
  attemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  results: QuestionResult[];
  weakAreas: string[];
  recommendation: string;
  passed: boolean;
}

interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  topic: string;
}

interface QuizInterfaceProps {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  onClose: () => void;
}

export default function QuizInterface({ bookId, chapterId, chapterTitle, onClose }: QuizInterfaceProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    generateQuiz();
  }, []);

  useEffect(() => {
    if (quiz && !result) {
      setTimeLeft(quiz.timeLimit);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            submitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, result]);

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const response = await api.post('/quiz/generate', {
        bookId,
        chapterId
      });
      setQuiz(response.data.quiz);
    } catch (err) {
      console.error('Failed to generate quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const submitQuiz = async () => {
    if (!quiz) return;

    setLoading(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const response = await api.post(`/quiz/${quiz.quizId}/submit`, {
        answers,
        timeSpent
      });
      setResult(response.data);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const retakeQuiz = async () => {
    if (!quiz) return;

    setLoading(true);
    try {
      const response = await api.post(`/quiz/${quiz.quizId}/regenerate`);
      setQuiz(response.data.quiz);
      setAnswers({});
      setResult(null);
    } catch (err) {
      console.error('Failed to regenerate quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !quiz) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Generating quiz...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Reading
          </button>
          <h2 className="text-2xl font-bold mb-2">Quiz Results</h2>
          <p className="text-gray-600">{chapterTitle}</p>
        </div>

        {/* Score Card */}
        <div className={`p-6 rounded-lg mb-6 ${result.passed ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{result.score.toFixed(0)}%</div>
            <p className="text-lg mb-2">
              {result.correctAnswers} out of {result.totalQuestions} correct
            </p>
            <p className={`font-semibold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
              {result.passed ? '✓ Passed' : '✗ Not Passed'}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">Recommendation:</h3>
          <p>{result.recommendation}</p>
        </div>

        {/* Weak Areas */}
        {result.weakAreas.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Topics to Review:</h3>
            <div className="flex flex-wrap gap-2">
              {result.weakAreas.map((area, index) => (
                <span key={index} className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Results */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xl font-semibold">Detailed Results:</h3>
          {result.results.map((qResult, index) => (
            <div
              key={qResult.questionId}
              className={`p-4 rounded-lg border-2 ${qResult.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">Question {index + 1}</h4>
                <span className={`px-3 py-1 rounded-full text-sm ${qResult.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {qResult.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Topic: {qResult.topic}</p>
              <p className="mb-2">Your answer: <span className="font-medium">{qResult.selectedAnswer}</span></p>
              {!qResult.isCorrect && (
                <p className="mb-2 text-green-700">Correct answer: <span className="font-medium">{qResult.correctAnswer}</span></p>
              )}
              <div className="bg-white p-3 rounded mt-2">
                <p className="text-sm"><strong>Explanation:</strong> {qResult.explanation}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={retakeQuiz}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Retake Quiz'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Back to Reading
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onClose}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Reading
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Quiz: {chapterTitle}</h2>
            <p className="text-gray-600">{quiz.questions.length} questions • Passing score: {quiz.passingScore}%</p>
          </div>
          <div className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-700'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6 mb-6">
        {quiz.questions.map((question, index) => (
          <div key={question.questionId} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">Question {index + 1}</h3>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {question.topic}
              </span>
            </div>

            <p className="mb-4">{question.questionText}</p>

            {question.codeSnippet && (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
                <code>{question.codeSnippet}</code>
              </pre>
            )}

            <div className="space-y-2">
              {question.options.map((option) => (
                <label
                  key={option.optionId}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    answers[question.questionId] === option.optionId
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.questionId}
                    value={option.optionId}
                    checked={answers[question.questionId] === option.optionId}
                    onChange={() => handleAnswerSelect(question.questionId, option.optionId)}
                    className="mr-3"
                  />
                  <span className="font-medium mr-2">{option.optionId}.</span>
                  <span>{option.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {Object.keys(answers).length} of {quiz.questions.length} questions answered
        </p>
        <button
          onClick={submitQuiz}
          disabled={loading || Object.keys(answers).length < quiz.questions.length}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
}
