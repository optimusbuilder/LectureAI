"use client"

import { useState, useEffect } from "react"
import { Processing } from "@/components/processing"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { pollJob } from "@/lib/api"

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

  const searchParams = useSearchParams()
  const router = useRouter()
  const jobId = searchParams.get("jobId")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId || isComplete || error) return

    const poll = async () => {
      try {
        const job = await pollJob(jobId)
        
        if (job.status === "processing") {
          setVideoTitle(job.videoMeta?.title || "Analyzing Lecture...")
          
          // Map backend steps to frontend steps
          const stepMap: Record<string, string> = {
            "Extracting transcript...": "transcript",
            "Analyzing lecture content...": "analyze",
            "Building your study materials...": "materials",
            "Generating faculty report...": "materials",
            "Indexing for semantic search...": "index"
          }

          const currentStepId = stepMap[job.step]
          if (currentStepId) {
            setSteps((prev) => {
              const currentIndex = prev.findIndex(s => s.id === currentStepId)
              const newSteps = prev.map((step, idx) => {
                if (idx < currentIndex) return { ...step, status: "complete" as const }
                if (idx === currentIndex) return { ...step, status: "active" as const }
                return { ...step, status: "pending" as const }
              })
              
              // Correctly calculate progress based on the index
              setProgress(25 + (currentIndex * 25))
              return newSteps
            })
          }
        } else if (job.status === "complete") {
          setProgress(100)
          setSteps((prev) => prev.map(s => ({ ...s, status: "complete" as const })))
          setIsComplete(true)
          setVideoTitle(job.videoMeta?.title)
        } else if (job.status === "error") {
          setError(job.message || "An error occurred")
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }

    const interval = setInterval(poll, 2000)
    poll() // Initial call

    return () => clearInterval(interval)
  }, [jobId, isComplete, error])

  const handleViewResults = async () => {
    try {
      const job = await pollJob(jobId!)
      if (job.mode === "faculty") {
        router.push(`/audit/${jobId}`)
      } else {
        router.push(`/dashboard/${jobId}`)
      }
    } catch (err) {
      console.error(err)
    }
  }

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
              <Button onClick={handleViewResults} className="gap-2">
                View {steps[2].label === "Generating faculty report" ? "Faculty Report" : "Study Materials"}
              </Button>
            </div>
          )}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
