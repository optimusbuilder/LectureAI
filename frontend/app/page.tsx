"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GraduationCap, Presentation, Loader2, Sparkles } from "lucide-react"

export default function LandingPage() {
  const [url, setUrl] = useState("")
  const [mode, setMode] = useState("student")
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!url.trim()) return
    setIsLoading(true)
    // Simulate analysis - replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              LectureAI
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-2xl w-full text-center space-y-10">
          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance leading-tight">
              Turn any lecture into a study environment
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto text-pretty">
              Paste a YouTube lecture URL to generate personalized study
              materials or a pedagogical audit.
            </p>
          </div>

          {/* Input Section */}
          <div className="space-y-6">
            {/* URL Input */}
            <div className="relative">
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-14 px-5 text-base md:text-lg rounded-xl border-2 border-input bg-background focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
              />
            </div>

            {/* Mode Toggle */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Select your mode
              </span>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => value && setMode(value)}
                className="bg-muted p-1 rounded-lg"
              >
                <ToggleGroupItem
                  value="student"
                  aria-label="Student Mode"
                  className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm px-4 py-2 rounded-md gap-2 text-muted-foreground transition-all"
                >
                  <GraduationCap className="size-4" />
                  <span className="font-medium">Student Mode</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="faculty"
                  aria-label="Faculty Mode"
                  className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm px-4 py-2 rounded-md gap-2 text-muted-foreground transition-all"
                >
                  <Presentation className="size-4" />
                  <span className="font-medium">Faculty Mode</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !url.trim()}
              size="lg"
              className="h-12 px-8 text-base font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <span>Analyze Lecture</span>
              )}
            </Button>
          </div>

          {/* Mode Description */}
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              {mode === "student" ? (
                <>
                  <span className="font-medium text-foreground">
                    Student Mode:
                  </span>{" "}
                  Generate flashcards, summaries, and practice questions from
                  the lecture.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    Faculty Mode:
                  </span>{" "}
                  Receive a pedagogical audit with teaching effectiveness
                  insights.
                </>
              )}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>© 2024 LectureAI</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
