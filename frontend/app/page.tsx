"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FoxMascot } from "@/components/fox-mascot"
import { startJob } from "@/lib/api"
import { FileText, Search, Layers, GraduationCap, Users, Sparkles } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [mode, setMode] = useState<"student" | "faculty">("student")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    
    setIsLoading(true)
    setError(null)
    try {
      const { jobId } = await startJob(url.trim(), mode)
      router.push(`/processing?jobId=${jobId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to start processing')
      setIsLoading(false)
    }
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
    {
      icon: Users,
      color: "bg-duo-yellow text-duo-text",
      title: "Faculty Mode",
      description: "Pedagogical audits with clarity, accessibility, and pacing insights."
    },
    {
      icon: Sparkles,
      color: "bg-duo-green",
      title: "AI-Powered",
      description: "Advanced AI analyzes lectures in under 60 seconds."
    }
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
          <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-6">
            {/* URL Input */}
            <input
              type="url"
              placeholder="Paste YouTube lecture URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-duo h-14 text-center text-lg"
              required
            />

            {/* Mode Toggle */}
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="btn-3d-primary w-full text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Starting..." : "Analyze Lecture"}
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
