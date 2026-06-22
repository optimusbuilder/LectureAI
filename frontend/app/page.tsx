"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FoxMascot } from "@/components/fox-mascot"
import { startJob, startProvostJob } from "@/lib/api"
import { FileText, Search, Layers, GraduationCap, Users, Sparkles, Building2, Plus, X } from "lucide-react"

type Mode = "student" | "faculty" | "provost"

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [mode, setMode] = useState<Mode>("student")
  const [courseTitle, setCourseTitle] = useState("")
  const [learningObjectives, setLearningObjectives] = useState("")
  const [courseUrls, setCourseUrls] = useState(["", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const urls = courseUrls.map(item => item.trim()).filter(Boolean)
    if (mode !== "provost" && !url.trim()) return
    if (mode === "provost" && (!courseTitle.trim() || !learningObjectives.trim() || urls.length < 2)) {
      setError("Provost mode needs a course title, objectives, and at least 2 lecture URLs.")
      return
    }
    
    setIsLoading(true)
    setError(null)
    try {
      const { jobId } = mode === "provost"
        ? await startProvostJob(courseTitle.trim(), learningObjectives.trim(), urls.slice(0, 10))
        : await startJob(url.trim(), mode)
      router.push(`/processing?jobId=${jobId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to start processing')
      setIsLoading(false)
    }
  }

  const updateCourseUrl = (index: number, value: string) => {
    setCourseUrls(prev => prev.map((item, itemIndex) => itemIndex === index ? value : item))
  }

  const addCourseUrl = () => {
    setCourseUrls(prev => prev.length >= 10 ? prev : [...prev, ""])
  }

  const removeCourseUrl = (index: number) => {
    setCourseUrls(prev => prev.length <= 2 ? prev : prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const features = [
    {
      icon: FileText,
      color: "bg-duo-green",
      title: "Smart Summaries",
      description: "Get concise summaries at 90 seconds, 5 minutes, or full depth."
    },
    {
      icon: Layers,
      color: "bg-duo-blue",
      title: "Interactive Flashcards",
      description: "Auto-generated flashcards with timestamps to jump back to the lecture."
    },
    {
      icon: Search,
      color: "bg-duo-orange",
      title: "Semantic Search",
      description: "Ask questions and find exact moments in the lecture instantly."
    },
    {
      icon: GraduationCap,
      color: "bg-duo-purple",
      title: "Student Mode",
      description: "Everything you need to master the material and ace your exams."
    },
    /* Hiding Faculty Mode from public use
    {
      icon: Users,
      color: "bg-duo-yellow text-duo-text",
      title: "Faculty Mode",
      description: "Pedagogical audits with clarity, accessibility, and pacing insights."
    },
    */
    {
      icon: Sparkles,
      color: "bg-duo-green",
      title: "AI-Powered",
      description: "Advanced AI analyzes lectures in under 60 seconds."
    },
    /* Hiding Provost Mode from public use
    {
      icon: Building2,
      color: "bg-duo-purple",
      title: "Provost Mode",
      description: "Map course lectures against stated learning objectives."
    }
    */
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <FoxMascot size="sm" expression="happy" animate={false} />
          <span className="text-duo-green font-extrabold text-xl">LectureAI</span>
        </div>
        <a 
          href="#features" 
          className="text-duo-text font-bold hover:text-duo-green transition-colors"
        >
          Features
        </a>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-12 pb-20">
        <div className="flex flex-col items-center text-center">
          {/* Fox Mascot */}
          <FoxMascot size="xl" expression="happy" className="mb-8" />
          
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-black text-duo-text mb-4 text-balance">
            Learn smarter, not harder
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl text-duo-text-muted font-semibold mb-10 max-w-xl text-pretty">
            Paste a YouTube lecture. Get a complete study environment in 60 seconds.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
            {mode === "provost" ? (
              <div className="space-y-4 text-left">
                <input
                  type="text"
                  placeholder="Course title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="input-duo h-12 text-base"
                  required
                />
                <textarea
                  placeholder="Paste stated learning objectives, one per line..."
                  value={learningObjectives}
                  onChange={(e) => setLearningObjectives(e.target.value)}
                  className="input-duo min-h-32 resize-none text-base"
                  required
                />
                <div className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-duo-text-muted">
                        Lecture URLs
                      </label>
                      <p className="mt-1 text-xs font-bold text-duo-text-muted">
                        Start with at least 2 lectures. Add more if the course has them.
                      </p>
                    </div>
                    <span className="rounded-full bg-duo-orange/10 px-3 py-1 text-xs font-black text-duo-orange">
                      {courseUrls.filter(item => item.trim()).length}/10 added
                    </span>
                  </div>

                  {courseUrls.map((courseUrl, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-duo-surface text-sm font-black text-duo-text-muted border-2 border-duo-border">
                        {index + 1}
                      </div>
                      <input
                        type="url"
                        placeholder={`Lecture ${index + 1} YouTube URL`}
                        value={courseUrl}
                        onChange={(e) => updateCourseUrl(index, e.target.value)}
                        className="input-duo h-12 text-base"
                        required={index < 2}
                      />
                      {courseUrls.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeCourseUrl(index)}
                          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 border-duo-border bg-white text-duo-text-muted hover:border-duo-red hover:text-duo-red"
                          aria-label={`Remove lecture ${index + 1}`}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {courseUrls.length < 10 && (
                    <button
                      type="button"
                      onClick={addCourseUrl}
                      className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-duo-border border-b-4 bg-white px-5 py-3 text-sm font-black text-duo-text transition-all hover:bg-duo-surface active:translate-y-0.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add another lecture
                    </button>
                  )}
                </div>
                <p className="text-center text-xs font-bold text-duo-text-muted">
                  Provost mode processes multiple lectures, so it may take several minutes.
                </p>
              </div>
            ) : (
              <input
                type="url"
                placeholder="Paste YouTube lecture URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-duo h-14 text-center text-lg"
                required
              />
            )}

            {/* Mode Toggle hidden for public use, defaulting to student mode */}
            {/*
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setMode("student")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-100 ${
                  mode === "student"
                    ? "bg-duo-green text-white border-b-4 border-duo-green-dark"
                    : "bg-white text-duo-text border-2 border-duo-border border-b-4"
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                Student
              </button>
              <button
                type="button"
                onClick={() => setMode("faculty")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-100 ${
                  mode === "faculty"
                    ? "bg-duo-purple text-white border-b-4 border-duo-purple-dark"
                    : "bg-white text-duo-text border-2 border-duo-border border-b-4"
                }`}
              >
                <Users className="w-5 h-5" />
                Faculty
              </button>
              <button
                type="button"
                onClick={() => setMode("provost")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-100 ${
                  mode === "provost"
                    ? "bg-duo-orange text-white border-b-4 border-duo-orange-dark"
                    : "bg-white text-duo-text border-2 border-duo-border border-b-4"
                }`}
              >
                <Building2 className="w-5 h-5" />
                Provost
              </button>
            </div>
            */}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (mode === "provost" ? !courseTitle.trim() || !learningObjectives.trim() || courseUrls.filter(item => item.trim()).length < 2 : !url.trim())}
              className="btn-3d-primary w-full text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Starting..." : mode === "provost" ? "Map Curriculum" : "Analyze Lecture"}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 text-center">
                <p className="text-red-600 font-semibold text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="bg-duo-surface py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-duo-text text-center mb-12">
            Everything you need to master any lecture
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-duo p-6 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: "forwards" }}
              >
                <div className={`w-12 h-12 ${feature.color} rounded-full flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-duo-text mb-2">{feature.title}</h3>
                <p className="text-duo-text-muted font-semibold text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-duo-text-muted font-semibold text-sm">
          Made with AI-powered magic
        </p>
      </footer>
    </div>
  )
}
