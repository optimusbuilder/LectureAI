"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { FoxMascot } from "@/components/fox-mascot"
import { pollJob, searchLecture, regenerateStudentMaterials, analyzeChunk, getAudio, generateQuiz } from "@/lib/api"
import { KnowledgeMap } from "@/components/knowledge-map"
import { MarkdownContent } from "@/components/markdown-content"
import { 
  Globe, 
  FileText, 
  Layers, 
  Search, 
  Play, 
  ChevronLeft, 
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Compass,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Trophy
} from "lucide-react"

type Tab = "summary" | "flashcards" | "quiz" | "search" | "explore"
type SummaryDepth = "short" | "medium" | "full"

interface QuizQuestion {
  question: string
  choices: string[]
  answerIndex: number
  explanation: string
  timestamp: number
  youtubeLink?: string
}

interface QuizData {
  title: string
  scope: string
  questions: QuizQuestion[]
  language: string
}

export default function DashboardPage() {
  const params = useParams()
  const jobId = params.jobId as string

  // Data state
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("summary")
  const [summaryDepth, setSummaryDepth] = useState<SummaryDepth>("medium")
  const [currentCard, setCurrentCard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [language, setLanguage] = useState("en")
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [analyses, setAnalyses] = useState<Record<number, string>>({})
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null)
  const [quizTopicId, setQuizTopicId] = useState("all")
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  // Fetch data from backend
  useEffect(() => {
    if (!jobId) return
    const fetchData = async () => {
      try {
        const job = await pollJob(jobId)
        if (job.status === "complete") {
          setData(job)
          setLanguage(job.result.language || "en")
        } else if (job.status === "error") {
          setError(job.message || "Failed to load study materials")
        }
      } catch (err) {
        console.error(err)
        setError("Failed to connect to the server")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [jobId])

  // Keyboard navigation for flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data) return
      const { flashcards } = data.result || {}
      if (!flashcards || flashcards.length === 0) return
      if (activeTab !== "flashcards") return
      if (document.activeElement?.tagName === "INPUT") return

      if (e.key === "ArrowRight") {
        setIsFlipped(false)
        setCurrentCard(prev => (prev + 1) % flashcards.length)
      } else if (e.key === "ArrowLeft") {
        setIsFlipped(false)
        setCurrentCard(prev => (prev - 1 + flashcards.length) % flashcards.length)
      } else if (e.key === " ") {
        e.preventDefault()
        setIsFlipped(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [data, activeTab])

  const handleLanguageChange = async (newLang: string) => {
    if (newLang === language || !data) return
    setLanguage(newLang)
    setIsRegenerating(true)
    try {
      const newResult = await regenerateStudentMaterials(jobId, newLang)
      setData((prev: any) => ({ ...prev, result: newResult }))
      setCurrentCard(0)
      setIsFlipped(false)
      setQuiz(null)
      setQuizAnswers({})
      setQuizSubmitted(false)
    } catch (err) {
      console.error("Language regeneration failed:", err)
      setLanguage(language)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.trim().length < 2 || !data) return
    setIsSearching(true)
    setAnalyses({}) // Clear previous analyses
    try {
      const { results } = await searchLecture(searchQuery, data.videoMeta.videoId)
      setSearchResults(results)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAnalyzeChunk = async (index: number, text: string) => {
    if (analyzingIndex !== null) return
    setAnalyzingIndex(index)
    try {
      const { analysis } = await analyzeChunk(searchQuery, text)
      setAnalyses(prev => ({ ...prev, [index]: analysis }))
    } catch (err) {
      console.error(err)
    } finally {
      setAnalyzingIndex(null)
    }
  }

  const handlePlayAudio = async (text: string, id: string) => {
    if (audioLoadingId || playingAudioId) return
    setAudioLoadingId(id)
    try {
      const blob = await getAudio(text)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onplay = () => {
        setAudioLoadingId(null)
        setPlayingAudioId(id)
      }
      audio.onended = () => {
        setPlayingAudioId(null)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        setAudioLoadingId(null)
        setPlayingAudioId(null)
      }
      audio.play()
    } catch (err) {
      console.error(err)
      setAudioLoadingId(null)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!data || isGeneratingQuiz) return
    setIsGeneratingQuiz(true)
    setQuizSubmitted(false)
    setQuizAnswers({})
    try {
      const nextQuiz = await generateQuiz(jobId, quizTopicId, language)
      setQuiz(nextQuiz)
    } catch (err) {
      console.error("Quiz generation failed:", err)
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleQuizAnswer = (questionIndex: number, choiceIndex: number) => {
    if (quizSubmitted) return
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: choiceIndex }))
  }

  const quizScore = quiz
    ? quiz.questions.reduce((score, question, index) => (
      quizAnswers[index] === question.answerIndex ? score + 1 : score
    ), 0)
    : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const nextCard = () => {
    setIsFlipped(false)
    setCurrentCard(prev => (prev + 1) % flashcards.length)
  }

  const prevCard = () => {
    setIsFlipped(false)
    setCurrentCard(prev => (prev - 1 + flashcards.length) % flashcards.length)
  }

  const cardColors = ["duo-green", "duo-blue", "duo-orange", "duo-purple", "duo-green"]

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-duo-green" />
        <span className="text-duo-text font-bold">Loading study materials...</span>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <FoxMascot size="lg" expression="thinking" />
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-duo-text font-bold text-lg">{error || "Study materials not found"}</p>
          <Link href="/" className="btn-3d-primary inline-block">
            Try another video
          </Link>
        </div>
      </div>
    )
  }

  const { result, videoMeta } = data
  const { outline, summaries, flashcards } = result

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-80 bg-duo-surface border-r border-duo-border flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-duo-border">
          <Link href="/" className="flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4 text-duo-text-muted" />
            <span className="text-sm font-semibold text-duo-text-muted">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <FoxMascot size="sm" expression="studying" animate={false} />
            <span className="text-duo-green font-extrabold text-lg">LectureAI</span>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 border-b border-duo-border">
          <div className="card-duo p-4">
            <h2 className="font-bold text-duo-text text-sm leading-tight mb-1">
              {videoMeta.title}
            </h2>
            <p className="text-duo-text-muted text-xs font-semibold">
              {videoMeta.author} • {formatTime(videoMeta.duration)}
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="p-4 border-b border-duo-border">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-duo-text-muted" />
            <span className="text-xs font-bold uppercase tracking-wider text-duo-text-muted">
              Language
            </span>
          </div>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isRegenerating}
            className="w-full rounded-xl border-2 border-duo-border bg-white px-3 py-2 text-sm font-semibold text-duo-text focus:border-duo-green focus:outline-none disabled:opacity-50"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="zh">Mandarin</option>
            <option value="ar">Arabic</option>
            <option value="pt">Portuguese</option>
            <option value="hi">Hindi</option>
          </select>
          {isRegenerating && (
            <div className="flex items-center gap-2 mt-2 text-duo-green">
              <RotateCcw className="w-3 h-3 animate-spin" />
              <span className="text-xs font-bold">Translating...</span>
            </div>
          )}
        </div>

        {/* Outline */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-duo-text-muted mb-3">
            Outline
          </h3>
          <div className="space-y-2">
            {outline.map((item: any, index: number) => (
              <a
                key={index}
                href={item.youtubeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors text-left block"
              >
                <span className="px-2 py-1 rounded-full bg-duo-green/10 text-duo-green text-xs font-bold">
                  {formatTime(item.timestamp)}
                </span>
                <span className="text-sm font-semibold text-duo-text flex-1">
                  {item.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Regenerating Banner */}
        {isRegenerating && (
          <div className="bg-duo-green/5 border-b border-duo-green/20 px-6 py-3 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-duo-green" />
            <span className="text-duo-green font-bold text-sm">Regenerating in a new language...</span>
          </div>
        )}

        {/* Tab Bar */}
        <div className="p-4 border-b border-duo-border">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === "summary"
                  ? "bg-duo-green text-white border-b-4 border-duo-green-dark"
                  : "bg-white text-duo-text border-2 border-duo-border border-b-4 hover:bg-duo-surface"
              }`}
            >
              <FileText className="w-4 h-4" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab("flashcards")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === "flashcards"
                  ? "bg-duo-green text-white border-b-4 border-duo-green-dark"
                  : "bg-white text-duo-text border-2 border-duo-border border-b-4 hover:bg-duo-surface"
              }`}
            >
              <Layers className="w-4 h-4" />
              Flashcards
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === "quiz"
                  ? "bg-duo-orange text-white border-b-4 border-duo-orange-dark"
                  : "bg-white text-duo-text border-2 border-duo-border border-b-4 hover:bg-duo-surface"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Quiz
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === "search"
                  ? "bg-duo-green text-white border-b-4 border-duo-green-dark"
                  : "bg-white text-duo-text border-2 border-duo-border border-b-4 hover:bg-duo-surface"
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={() => setActiveTab("explore")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
                activeTab === "explore"
                  ? "bg-duo-purple text-white border-b-4 border-duo-purple-dark"
                  : "bg-white text-duo-text border-2 border-duo-border border-b-4 hover:bg-duo-surface"
              }`}
            >
              <Compass className="w-4 h-4" />
              Explore
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Tab */}
          {activeTab === "summary" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex gap-3">
                  {(["short", "medium", "full"] as const).map((depth) => (
                    <button
                      key={depth}
                      onClick={() => setSummaryDepth(depth)}
                      className={`px-6 py-3 rounded-full font-extrabold text-sm uppercase tracking-wider transition-all ${
                        summaryDepth === depth
                          ? "bg-duo-green text-white border-b-4 border-duo-green-dark"
                          : "bg-white text-duo-text border-2 border-duo-border border-b-4 hover:bg-duo-surface"
                      }`}
                    >
                      {depth === "short" ? "90 Sec" : depth === "medium" ? "5 Min" : "Full Study"}
                    </button>
                  ))}
                </div>

                {summaryDepth === "short" && (
                  <button
                    onClick={() => handlePlayAudio(summaries.short, "summary-short")}
                    disabled={!!audioLoadingId || !!playingAudioId}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-duo-blue text-white font-extrabold text-sm uppercase tracking-wider border-b-4 border-duo-blue-dark disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {audioLoadingId === "summary-short" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : playingAudioId === "summary-short" ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    {playingAudioId === "summary-short" ? "Playing..." : "Listen to Key Takeaways"}
                  </button>
                )}
              </div>

              <div className="prose prose-xl max-w-none">
                <div className="text-duo-text font-bold text-lg md:text-xl leading-relaxed whitespace-pre-line bg-duo-surface/50 p-8 rounded-3xl border-2 border-duo-border/50">
                  <MarkdownContent>{summaries[summaryDepth]}</MarkdownContent>
                </div>
              </div>
            </div>
          )}

          {/* Flashcards Tab */}
          {activeTab === "flashcards" && flashcards && flashcards.length > 0 && (
            <div className="max-w-4xl mx-auto py-4">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-duo-green flex items-center justify-center border-b-4 border-duo-green-dark shadow-sm">
                  <span className="text-white text-xl font-black">{currentCard + 1}</span>
                </div>
                <span className="text-duo-text-muted font-black text-lg">
                  of {flashcards.length} Mastery Cards
                </span>
              </div>

              <div 
                className="flashcard-container mb-12 cursor-pointer h-[480px]"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className={`flashcard relative h-full ${isFlipped ? "flipped" : ""}`}>
                  {/* Front */}
                  <div className={`flashcard-face absolute inset-0 card-duo p-12 border-b-8 border-${cardColors[currentCard % cardColors.length]} flex flex-col shadow-xl`}>
                    <span className={`self-start px-4 py-2 rounded-2xl bg-${cardColors[currentCard % cardColors.length]}/10 text-${cardColors[currentCard % cardColors.length]} text-sm font-black uppercase tracking-widest mb-4 flex-shrink-0`}>
                      Critical Question
                    </span>
                    <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar pr-2">
                      <MarkdownContent className="text-center text-2xl md:text-3xl lg:text-4xl font-black leading-tight">
                        {flashcards[currentCard].front}
                      </MarkdownContent>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-duo-text-muted font-bold mt-4 flex-shrink-0">
                      <span className="animate-bounce">👇</span>
                      <span>Tap to reveal the answer</span>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="flashcard-face flashcard-back absolute inset-0 card-duo p-12 border-b-8 border-duo-green flex flex-col shadow-xl">
                    <span className="self-start px-4 py-2 rounded-2xl bg-duo-green/10 text-duo-green text-sm font-black uppercase tracking-widest mb-8">
                      Expert Answer
                    </span>
                    <div className="flex-1 flex items-center justify-center">
                      <MarkdownContent className="text-center text-2xl md:text-3xl font-bold leading-relaxed">
                        {flashcards[currentCard].back}
                      </MarkdownContent>
                    </div>
                    <div className="flex flex-col items-center gap-4 mt-8">
                      <a
                        href={flashcards[currentCard].youtubeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 bg-duo-blue text-white px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest border-b-4 border-duo-blue-dark hover:-translate-y-0.5 active:translate-y-0 transition-all"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Watch Proof at {formatTime(flashcards[currentCard].timestamp)}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={prevCard} 
                  className="btn-3d-secondary flex items-center gap-3 px-8 py-4 text-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                  Previous
                </button>

                <div className="flex gap-3">
                  {flashcards.map((_: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => { setIsFlipped(false); setCurrentCard(index) }}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentCard 
                          ? "bg-duo-green scale-150 shadow-sm" 
                          : "bg-duo-border hover:bg-duo-text-muted"
                      }`}
                    />
                  ))}
                </div>

                <button 
                  onClick={nextCard} 
                  className="btn-3d-primary flex items-center gap-3 px-10 py-4 text-lg"
                >
                  Next Card
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 mt-12 text-duo-text-muted font-bold bg-duo-surface p-4 rounded-2xl">
                <div className="flex gap-2">
                  <kbd className="px-3 py-1 bg-white border-2 border-duo-border rounded-lg text-sm shadow-sm">←</kbd>
                  <kbd className="px-3 py-1 bg-white border-2 border-duo-border rounded-lg text-sm shadow-sm">→</kbd>
                </div>
                <span className="text-sm">Navigate</span>
                <div className="w-px h-4 bg-duo-border mx-2" />
                <kbd className="px-4 py-1 bg-white border-2 border-duo-border rounded-lg text-sm shadow-sm">SPACE</kbd>
                <span className="text-sm">Flip Card</span>
              </div>
            </div>
          )}

          {/* Flashcards empty state */}
          {activeTab === "flashcards" && (!flashcards || flashcards.length === 0) && (
            <div className="text-center py-12">
              <FoxMascot size="md" expression="thinking" />
              <p className="text-duo-text-muted font-semibold mt-4">
                No flashcards were generated for this lecture.
              </p>
            </div>
          )}

          {/* Quiz Tab */}
          {activeTab === "quiz" && (
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                <aside className="space-y-4">
                  <div className="card-duo p-5 border-b-4 border-duo-orange">
                    <div className="w-12 h-12 rounded-full bg-duo-orange flex items-center justify-center mb-4">
                      <ClipboardCheck className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-duo-text mb-2">Quiz Yourself</h2>
                    <p className="text-sm font-semibold text-duo-text-muted leading-relaxed">
                      Generate 10 fresh questions from the whole lecture or one topic, then submit for instant scoring.
                    </p>
                  </div>

                  <div className="card-duo p-5 space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-duo-text-muted">
                        Scope
                      </label>
                      <select
                        value={quizTopicId}
                        onChange={(e) => {
                          setQuizTopicId(e.target.value)
                          setQuiz(null)
                          setQuizAnswers({})
                          setQuizSubmitted(false)
                        }}
                        disabled={isGeneratingQuiz}
                        className="mt-2 w-full rounded-xl border-2 border-duo-border bg-white px-3 py-2 text-sm font-bold text-duo-text focus:border-duo-orange focus:outline-none disabled:opacity-50"
                      >
                        <option value="all">Whole lecture</option>
                        {(data.intelligenceData?.topics || []).map((topic: any, index: number) => (
                          <option key={topic.id || index} value={topic.id || `topic_${index}`}>
                            {topic.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateQuiz}
                      disabled={isGeneratingQuiz}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-duo-orange px-6 py-3 text-sm font-black uppercase tracking-wider text-white border-b-4 border-duo-orange-dark transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    >
                      {isGeneratingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {quiz ? "Generate New Quiz" : "Generate Quiz"}
                    </button>

                    {quiz && (
                      <div className="rounded-2xl bg-duo-surface p-4">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-duo-yellow" />
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-duo-text-muted">Score</p>
                            <p className="text-lg font-black text-duo-text">
                              {quizSubmitted ? `${quizScore}/${quiz.questions.length}` : `${Object.keys(quizAnswers).length}/${quiz.questions.length} answered`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </aside>

                <section>
                  {!quiz && !isGeneratingQuiz && (
                    <div className="card-duo min-h-[420px] flex flex-col items-center justify-center text-center p-10">
                      <FoxMascot size="lg" expression="studying" />
                      <h3 className="mt-6 text-2xl font-black text-duo-text">Ready when you are</h3>
                      <p className="mt-2 max-w-md text-sm font-semibold text-duo-text-muted">
                        Pick a scope and generate a 10-question quiz based on the lecture content.
                      </p>
                    </div>
                  )}

                  {isGeneratingQuiz && (
                    <div className="card-duo min-h-[420px] flex flex-col items-center justify-center text-center p-10">
                      <Loader2 className="w-10 h-10 animate-spin text-duo-orange mb-4" />
                      <h3 className="text-2xl font-black text-duo-text">Writing your quiz...</h3>
                      <p className="mt-2 text-sm font-semibold text-duo-text-muted">
                        Building fresh questions from the transcript.
                      </p>
                    </div>
                  )}

                  {quiz && !isGeneratingQuiz && (
                    <div className="space-y-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h3 className="text-2xl font-black text-duo-text">{quiz.title}</h3>
                          <p className="text-sm font-bold text-duo-text-muted">{quiz.scope}</p>
                        </div>
                        <button
                          onClick={() => setQuizSubmitted(true)}
                          disabled={Object.keys(quizAnswers).length < quiz.questions.length || quizSubmitted}
                          className="rounded-full bg-duo-green px-6 py-3 text-sm font-black uppercase tracking-wider text-white border-b-4 border-duo-green-dark transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                          {quizSubmitted ? `Scored ${quizScore}/${quiz.questions.length}` : "Submit Quiz"}
                        </button>
                      </div>

                      {quiz.questions.map((question, questionIndex) => {
                        const selected = quizAnswers[questionIndex]
                        const isCorrect = selected === question.answerIndex
                        return (
                          <div key={questionIndex} className="card-duo p-5">
                            <div className="flex items-start gap-4 mb-4">
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-duo-orange text-sm font-black text-white">
                                {questionIndex + 1}
                              </span>
                              <div className="flex-1">
                                <MarkdownContent className="text-lg font-black leading-snug text-duo-text">
                                  {question.question}
                                </MarkdownContent>
                                {question.youtubeLink && (
                                  <a
                                    href={question.youtubeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-duo-blue/10 px-3 py-1 text-xs font-black text-duo-blue hover:bg-duo-blue hover:text-white"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    {formatTime(question.timestamp)}
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {question.choices.map((choice, choiceIndex) => {
                                const isSelected = selected === choiceIndex
                                const isAnswer = question.answerIndex === choiceIndex
                                const resultClass = quizSubmitted
                                  ? isAnswer
                                    ? "border-duo-green bg-duo-green/10"
                                    : isSelected
                                      ? "border-duo-red bg-duo-red/10"
                                      : "border-duo-border bg-white"
                                  : isSelected
                                    ? "border-duo-orange bg-duo-orange/10"
                                    : "border-duo-border bg-white hover:bg-duo-surface"

                                return (
                                  <button
                                    key={choiceIndex}
                                    onClick={() => handleQuizAnswer(questionIndex, choiceIndex)}
                                    disabled={quizSubmitted}
                                    className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${resultClass}`}
                                  >
                                    <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                      quizSubmitted && isAnswer
                                        ? "bg-duo-green text-white"
                                        : quizSubmitted && isSelected && !isAnswer
                                          ? "bg-duo-red text-white"
                                          : isSelected
                                            ? "bg-duo-orange text-white"
                                            : "bg-duo-surface text-duo-text-muted"
                                    }`}>
                                      {String.fromCharCode(65 + choiceIndex)}
                                    </span>
                                    <MarkdownContent className="text-sm font-bold leading-relaxed text-duo-text">
                                      {choice}
                                    </MarkdownContent>
                                  </button>
                                )
                              })}
                            </div>

                            {quizSubmitted && (
                              <div className={`mt-4 rounded-2xl border-2 p-4 ${
                                isCorrect ? "border-duo-green/30 bg-duo-green/5" : "border-duo-red/30 bg-duo-red/5"
                              }`}>
                                <div className="mb-2 flex items-center gap-2">
                                  {isCorrect ? (
                                    <CheckCircle2 className="w-5 h-5 text-duo-green" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-duo-red" />
                                  )}
                                  <span className="text-sm font-black text-duo-text">
                                    {isCorrect ? "Correct" : "Review this one"}
                                  </span>
                                </div>
                                <MarkdownContent className="text-sm font-semibold leading-relaxed text-duo-text">
                                  {question.explanation}
                                </MarkdownContent>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSearch} className="flex gap-4 mb-12">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-duo-text-muted" />
                  <input
                    type="text"
                    placeholder="Search for any concept, fact, or question from the lecture..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-duo pl-14 py-4 text-lg"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSearching || searchQuery.trim().length < 2}
                  className="btn-3d-primary px-10 py-4 text-base disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search Lecture"}
                </button>
              </form>

              {isSearching ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-duo-green mx-auto mb-3" />
                  <p className="text-duo-text-muted font-semibold">Searching lecture...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-duo-text-muted font-semibold text-sm">
                    {searchResults.length} results found
                  </p>
                  {searchResults.map((result: any, index: number) => (
                    <div key={index} className="space-y-3">
                      <div className="w-full card-duo p-4 text-left hover:border-duo-green transition-colors relative group">
                        <div className="flex items-start gap-3">
                          <a
                            href={result.youtubeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 px-2 py-1 rounded-full bg-duo-green/10 text-duo-green text-xs font-bold hover:bg-duo-green hover:text-white transition-colors"
                          >
                            {formatTime(result.startTime)}
                          </a>
                          <MarkdownContent className="text-duo-text font-semibold text-sm flex-1">
                            {result.text}
                          </MarkdownContent>
                          
                          {!analyses[index] && (
                            <button
                              onClick={() => handleAnalyzeChunk(index, result.text)}
                              disabled={analyzingIndex !== null}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-duo-purple text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                              {analyzingIndex === index ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              Explain
                            </button>
                          )}
                        </div>
                      </div>

                      {analyses[index] && (
                        <div className="flex gap-3 items-start pl-4 animate-fade-in">
                          <div className="flex-shrink-0 mt-1">
                            <FoxMascot size="sm" expression="happy" animate={false} />
                          </div>
                          <div className="flex-1 bg-duo-surface rounded-2xl rounded-tl-none p-4 border-2 border-duo-border relative">
                            {/* Speech bubble tail */}
                            <div className="absolute -left-2 top-0 w-2 h-2 bg-duo-surface border-l-2 border-t-2 border-duo-border -translate-x-0.5" />
                            <MarkdownContent className="text-sm font-semibold text-duo-text leading-relaxed pr-8">
                              {analyses[index]}
                            </MarkdownContent>
                            <button
                              onClick={() => handlePlayAudio(analyses[index], `analysis-${index}`)}
                              disabled={!!audioLoadingId || !!playingAudioId}
                              className="absolute right-3 top-3 text-duo-blue hover:text-duo-blue-dark transition-colors disabled:opacity-50"
                            >
                              {audioLoadingId === `analysis-${index}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : playingAudioId === `analysis-${index}` ? (
                                <VolumeX className="w-4 h-4" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div className="text-center py-12">
                  <p className="text-duo-text-muted font-semibold">
                    No results found. Try different keywords.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-duo-border mx-auto mb-4" />
                  <p className="text-duo-text-muted font-semibold">
                    Search for specific topics, concepts, or questions from the lecture.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Explore Tab */}
          {activeTab === "explore" && (
            <div className="max-w-6xl mx-auto h-full">
              <KnowledgeMap
                topics={(data.intelligenceData?.topics || []).map((t: any, i: number) => ({
                  ...t,
                  id: t.id || `topic_${i}`
                }))}
                connections={data.intelligenceData?.topicConnections || []}
                videoId={videoMeta.videoId}
                jobId={jobId}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
