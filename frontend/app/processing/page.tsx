"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { FoxMascot } from "@/components/fox-mascot"
import { FoxGame } from "@/components/fox-game"
import { pollJob, getAudio } from "@/lib/api"
import { ArrowLeft, Check, Circle, Gamepad2, AlertCircle, Volume2 } from "lucide-react"

const steps = [
  { id: "transcript", label: "Extracting transcript..." },
  { id: "analyze", label: "Analyzing content structure..." },
  { id: "materials", label: "Generating study materials..." },
  { id: "index", label: "Building search index..." },
]

const stepVoices: Record<number, string> = {
  1: "Got it. Now I'm breaking down the lecture structure for you.",
  2: "Generating your study materials... this part is my favorite!",
  3: "Almost ready! Just building your search engine now.",
  4: "All done! I've prepared everything for you. Let's go!"
}

const errorMessages: Record<string, string> = {
  "INVALID_URL": "That doesn't look like a valid YouTube URL. Please check and try again.",
  "PRIVATE_VIDEO": "This video is private. Please use a public YouTube lecture URL.",
  "LIVESTREAM": "Live streams aren't supported. Try a recorded lecture instead.",
  "NO_CAPTIONS": "This video has no captions available. We need captions to analyze the lecture.",
  "TRANSCRIPT_ERROR": "We couldn't extract the transcript. The video may be restricted.",
}

function ProcessingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get("jobId")

  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState<string | undefined>(undefined)
  const [jobMode, setJobMode] = useState<string>("student")
  const [playedVoices, setPlayedVoices] = useState<Set<number>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playStepVoice = async (step: number) => {
    if (!stepVoices[step]) return
    if (playedVoices.has(step)) return
    
    // Kill existing audio immediately
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    setPlayedVoices(prev => {
      const next = new Set(prev)
      next.add(step)
      return next
    })

    try {
      const blob = await getAudio(stepVoices[step])
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      
      audio.play().catch(e => console.error("Audio playback interrupted", e))
      
      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === audio) audioRef.current = null
      }
    } catch (err) {
      console.error("Voice error:", err)
    }
  }

  // Trigger voice on step change
  useEffect(() => {
    if (isComplete) {
      playStepVoice(4)
    } else {
      playStepVoice(currentStep)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [currentStep, isComplete])

  useEffect(() => {
    if (!jobId || isComplete || error) return

    const poll = async () => {
      try {
        const job = await pollJob(jobId)

        if (job.status === "processing") {
          if (job.videoMeta?.title) setVideoTitle(job.videoMeta.title)
          if (job.mode) setJobMode(job.mode)

          const stepMap: Record<string, number> = {
            "Extracting transcript...": 0,
            "Analyzing lecture content...": 1,
            "Building your study materials...": 2,
            "Generating faculty report...": 2,
            "Mapping curriculum coverage...": 2,
            "Indexing for semantic search...": 3,
          }

          const stepIndex = typeof job.step === "string" && job.step.startsWith("Processing lecture")
            ? 1
            : stepMap[job.step]
          if (stepIndex !== undefined) {
            setCurrentStep(stepIndex + 1)
            setProgress(25 + stepIndex * 25)
          }
        } else if (job.status === "complete") {
          setProgress(100)
          setCurrentStep(steps.length)
          setIsComplete(true)
          if (job.videoMeta?.title) setVideoTitle(job.videoMeta.title)
          if (job.mode) setJobMode(job.mode)
        } else if (job.status === "error") {
          const msg = errorMessages[job.errorCode] || job.message || "Something went wrong. Please try again."
          setError(msg)
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }

    const interval = setInterval(poll, 2000)
    poll()
    return () => clearInterval(interval)
  }, [jobId, isComplete, error])

  const handleViewResults = () => {
    if (jobMode === "faculty") {
      router.push(`/audit/${jobId}`)
    } else if (jobMode === "provost") {
      router.push(`/provost/${jobId}`)
    } else {
      router.push(`/dashboard/${jobId}`)
    }
  }

  if (!jobId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <FoxMascot size="lg" expression="thinking" />
          <p className="text-duo-text font-bold text-lg">No job found</p>
          <Link href="/" className="btn-3d-primary inline-block">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-duo-border">
        <Link href="/" className="text-duo-text-muted hover:text-duo-text transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-2">
          <FoxMascot size="sm" expression="happy" animate={false} />
          <span className="text-duo-green font-extrabold text-xl">LectureAI</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Fox Mascot */}
        <div className="flex justify-center mb-8">
          <FoxMascot 
            size="lg" 
            expression={error ? "thinking" : isComplete ? "celebrating" : "thinking"} 
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-duo-text text-center mb-2">
          {error ? "Oops!" : isComplete ? "All done! 🎉" : "Your fox is analyzing..."}
        </h1>
        
        {videoTitle && !error && (
          <p className="text-duo-text-muted font-semibold text-center mb-8 truncate max-w-md mx-auto">
            {videoTitle}
          </p>
        )}

        {/* Error State */}
        {error ? (
          <div className="space-y-6">
            <div className="card-duo p-6 border-l-4 border-red-400">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-duo-text font-semibold">{error}</p>
              </div>
            </div>
            <div className="text-center">
              <Link href="/" className="btn-3d-primary inline-block">
                Try Another Video
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Progress Card */}
            <div className="card-duo p-6 mb-8">
              {/* Progress Bar */}
              <div className="progress-duo mb-6">
                <div 
                  className="progress-duo-bar" 
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStep
                  const isActive = index === currentStep && !isComplete
                  
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-duo-green flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 rounded-full bg-duo-green animate-pulse-dot" />
                      ) : (
                        <Circle className="w-6 h-6 text-duo-border" />
                      )}
                      <span className={`font-semibold ${
                        isCompleted ? "text-duo-text" : 
                        isActive ? "text-duo-green" : 
                        "text-duo-text-muted"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {!isComplete && (
                <p className="text-duo-text-muted font-semibold text-sm text-center mt-6">
                  This usually takes 30-60 seconds
                </p>
              )}
            </div>

            {/* View Results Button */}
            {isComplete && (
              <button
                onClick={handleViewResults}
                className="btn-3d-primary w-full text-base py-4 mb-12"
              >
                View Results
              </button>
            )}

            {/* Mini Game Section */}
            {!isComplete && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Gamepad2 className="w-5 h-5 text-duo-orange" />
                  <span className="text-xs font-bold uppercase tracking-wider text-duo-text-muted">
                    Play While You Wait
                  </span>
                </div>
                
                <div className="flex justify-center">
                  <FoxGame />
                </div>
                
                <p className="text-duo-text-muted font-semibold text-sm mt-3">
                  Space or Click to jump
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <FoxMascot size="md" expression="thinking" />
          <span className="text-duo-green font-extrabold text-xl">Loading...</span>
        </div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  )
}
