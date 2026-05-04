"use client"

import { CheckCircle, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type StepStatus = "complete" | "active" | "pending"

interface ProcessingStep {
  id: string
  label: string
  status: StepStatus
}

interface ProcessingProps {
  videoTitle?: string
  steps: ProcessingStep[]
  progress: number
}

export function Processing({ videoTitle, steps, progress }: ProcessingProps) {
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      {/* Progress Bar at top */}
      <Progress value={progress} className="rounded-none h-1" />

      <CardHeader className="pb-0">
        {/* Video Title Skeleton/Placeholder */}
        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Analyzing
          </span>
          {videoTitle ? (
            <h2 className="text-lg font-semibold text-foreground leading-snug text-balance">
              {videoTitle}
            </h2>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Progress Steps */}
        <div className="space-y-1">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 py-3 px-3 rounded-lg transition-colors",
                step.status === "active" && "bg-muted/50"
              )}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0">
                {step.status === "complete" && (
                  <CheckCircle className="size-5 text-emerald-500" />
                )}
                {step.status === "active" && (
                  <Loader2 className="size-5 text-blue-500 animate-spin" />
                )}
                {step.status === "pending" && (
                  <div className="size-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  step.status === "complete" && "text-foreground",
                  step.status === "active" && "text-foreground animate-pulse",
                  step.status === "pending" && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>

              {/* Step Number */}
              <span
                className={cn(
                  "ml-auto text-xs tabular-nums",
                  step.status === "pending"
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground"
                )}
              >
                {index + 1}/{steps.length}
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="justify-center border-t border-border pt-4">
        <p className="text-xs text-muted-foreground text-center">
          This usually takes 30–60 seconds for a full-length lecture.
        </p>
      </CardFooter>
    </Card>
  )
}

// Demo component to show the Processing component in action
export function ProcessingDemo() {
  const demoSteps: ProcessingStep[] = [
    { id: "transcript", label: "Extracting transcript", status: "complete" },
    { id: "analyze", label: "Analyzing lecture content", status: "active" },
    { id: "materials", label: "Building study materials", status: "pending" },
    { id: "index", label: "Indexing for semantic search", status: "pending" },
  ]

  return (
    <Processing
      videoTitle="Introduction to Thermodynamics"
      steps={demoSteps}
      progress={35}
    />
  )
}
