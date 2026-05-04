"use client"

import { useState, useEffect } from "react"
import { Processing } from "@/components/processing"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw } from "lucide-react"
import Link from "next/link"

type StepStatus = "complete" | "active" | "pending"

interface Step {
  id: string
  label: string
  status: StepStatus
}

const initialSteps: Step[] = [
  { id: "transcript", label: "Extracting transcript", status: "active" },
  { id: "analyze", label: "Analyzing lecture content", status: "pending" },
  { id: "materials", label: "Building study materials", status: "pending" },
  { id: "index", label: "Indexing for semantic search", status: "pending" },
]

export default function ProcessingPage() {
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [progress, setProgress] = useState(5)
  const [videoTitle, setVideoTitle] = useState<string | undefined>(undefined)
  const [isComplete, setIsComplete] = useState(false)

  const resetDemo = () => {
    setSteps(initialSteps)
    setProgress(5)
    setVideoTitle(undefined)
    setIsComplete(false)
  }

  useEffect(() => {
    if (isComplete) return

    // Simulate video title loading
    const titleTimer = setTimeout(() => {
      setVideoTitle("Introduction to Thermodynamics")
    }, 1500)

    // Step 1: Extracting transcript (0-25%)
    const step1Timer = setTimeout(() => {
      setProgress(25)
      setSteps((prev) =>
        prev.map((step) =>
          step.id === "transcript"
            ? { ...step, status: "complete" }
            : step.id === "analyze"
              ? { ...step, status: "active" }
              : step
        )
      )
    }, 3000)

    // Step 2: Analyzing lecture content (25-50%)
    const step2Timer = setTimeout(() => {
      setProgress(50)
      setSteps((prev) =>
        prev.map((step) =>
          step.id === "analyze"
            ? { ...step, status: "complete" }
            : step.id === "materials"
              ? { ...step, status: "active" }
              : step
        )
      )
    }, 6000)

    // Step 3: Building study materials (50-75%)
    const step3Timer = setTimeout(() => {
      setProgress(75)
      setSteps((prev) =>
        prev.map((step) =>
          step.id === "materials"
            ? { ...step, status: "complete" }
            : step.id === "index"
              ? { ...step, status: "active" }
              : step
        )
      )
    }, 9000)

    // Step 4: Indexing for semantic search (75-100%)
    const step4Timer = setTimeout(() => {
      setProgress(100)
      setSteps((prev) =>
        prev.map((step) =>
          step.id === "index" ? { ...step, status: "complete" } : step
        )
      )
      setIsComplete(true)
    }, 12000)

    return () => {
      clearTimeout(titleTimer)
      clearTimeout(step1Timer)
      clearTimeout(step2Timer)
      clearTimeout(step3Timer)
      clearTimeout(step4Timer)
    }
  }, [isComplete])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="text-sm font-medium">Back to LectureAI</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={resetDemo}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            Restart Demo
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Processing Your Lecture
            </h1>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? "Analysis complete! Your study materials are ready."
                : "Please wait while we analyze your lecture..."}
            </p>
          </div>

          <Processing
            videoTitle={videoTitle}
            steps={steps}
            progress={progress}
          />

          {isComplete && (
            <div className="flex justify-center">
              <Button className="gap-2">View Study Materials</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
