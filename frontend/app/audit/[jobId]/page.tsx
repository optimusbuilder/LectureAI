"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { FoxMascot } from "@/components/fox-mascot"
import { MarkdownContent } from "@/components/markdown-content"
import { pollJob } from "@/lib/api"
import { 
  ArrowLeft, 
  AlertTriangle, 
  Eye, 
  Users, 
  Scale, 
  Clock,
  Lightbulb,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wrench,
  ClipboardCheck,
  Sparkles
} from "lucide-react"

function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const getColor = (score: number) => {
    if (score >= 70) return "#58CC02"
    if (score >= 50) return "#FFC800"
    return "#FF4B4B"
  }

  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E5E5" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={getColor(score)} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-duo-text">{score}</span>
        <span className="text-xs font-black uppercase tracking-widest text-duo-text-muted">Quality</span>
      </div>
    </div>
  )
}

function ProgressBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-3 rounded-full bg-duo-surface overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500`}
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  )
}

const dimensionMeta: Record<string, { icon: any; color: string; hex: string }> = {
  "Clarity": { icon: Eye, color: "duo-green", hex: "#58CC02" },
  "Accessibility": { icon: Users, color: "duo-blue", hex: "#1CB0F6" },
  "Equity": { icon: Scale, color: "duo-orange", hex: "#FF9600" },
  "Pacing": { icon: Clock, color: "duo-purple", hex: "#CE82FF" },
}

function EvidenceLink({ videoId, timestamp, children, className = "" }: {
  videoId: string
  timestamp: number
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp || 0)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition-colors ${className}`}
    >
      <Play className="w-3 h-3 fill-current" />
      {children}
    </a>
  )
}

export default function AuditPage() {
  const params = useParams()
  const jobId = params.jobId as string

  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    const fetchData = async () => {
      try {
        const job = await pollJob(jobId)
        if (job.status === "complete") {
          setData(job)
        } else if (job.status === "error") {
          setError(job.message || "Failed to load audit")
        }
      } catch (err) {
        console.error(err)
        setError("Failed to connect to server")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [jobId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-duo-green" />
        <span className="text-duo-text font-bold">Analyzing pedagogy...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <FoxMascot size="lg" expression="thinking" />
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-duo-text font-bold text-lg">{error || "Audit report not found"}</p>
          <Link href="/" className="btn-3d-primary inline-block">
            Try another video
          </Link>
        </div>
      </div>
    )
  }

  const { result, videoMeta } = data
  const {
    overallScore,
    executiveSummary,
    strongestMoment,
    topPriority,
    dimensions,
    timestampedSuggestions,
    publishingChecklist
  } = result

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-duo-border">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-duo-text-muted hover:text-duo-text transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2">
            <FoxMascot size="sm" expression="studying" animate={false} />
            <span className="text-duo-green font-extrabold text-xl">LectureAI</span>
          </div>
        </div>
        <span className="px-4 py-1.5 rounded-full bg-duo-purple/10 text-duo-purple text-xs font-bold uppercase tracking-wider">
          Faculty Mode
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Video Info */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-duo-text mb-1">
            {videoMeta.title}
          </h1>
          <p className="text-duo-text-muted font-semibold">
            {videoMeta.author}
          </p>
          {executiveSummary && (
            <div className="mt-4 max-w-3xl rounded-2xl border-2 border-duo-border bg-duo-surface/40 p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-duo-text-muted">
                Private Coaching Summary
              </p>
              <MarkdownContent className="text-sm font-semibold leading-relaxed text-duo-text">
                {executiveSummary}
              </MarkdownContent>
            </div>
          )}
        </div>

        {/* Overall Score & Top Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card-duo p-6 flex flex-col items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-duo-text-muted mb-4">
              Overall Score
            </h2>
            <ScoreGauge score={overallScore} />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-duo-text-muted">
              Top Priority
            </h2>
            {topPriority && (
              <div className="card-duo p-4 border-l-4 border-duo-orange">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-duo-orange flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-duo-text mb-1">{topPriority.title}</h3>
                    <MarkdownContent className="text-duo-text-muted text-sm font-semibold">
                      {topPriority.description}
                    </MarkdownContent>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {topPriority.timestamp !== undefined && (
                        <EvidenceLink
                          videoId={videoMeta.videoId}
                          timestamp={topPriority.timestamp}
                          className="bg-duo-orange/10 text-duo-orange hover:bg-duo-orange hover:text-white"
                        >
                          {formatTime(topPriority.timestamp)}
                        </EvidenceLink>
                      )}
                      {topPriority.impact && (
                        <span className="rounded-full bg-duo-red/10 px-3 py-1 text-xs font-black text-duo-red">
                          {topPriority.impact} impact
                        </span>
                      )}
                      {topPriority.effort && (
                        <span className="rounded-full bg-duo-blue/10 px-3 py-1 text-xs font-black text-duo-blue">
                          {topPriority.effort}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {strongestMoment && (
              <div className="card-duo p-4 border-l-4 border-duo-green">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-duo-green flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-duo-text mb-1">{strongestMoment.title}</h3>
                    <MarkdownContent className="text-duo-text-muted text-sm font-semibold">
                      {strongestMoment.description}
                    </MarkdownContent>
                    {strongestMoment.timestamp !== undefined && (
                      <EvidenceLink
                        videoId={videoMeta.videoId}
                        timestamp={strongestMoment.timestamp}
                        className="mt-3 bg-duo-green/10 text-duo-green hover:bg-duo-green hover:text-white"
                      >
                        Keep this move at {formatTime(strongestMoment.timestamp)}
                      </EvidenceLink>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dimension Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {dimensions.map((dim: any) => {
            const meta = dimensionMeta[dim.name] || { icon: Eye, color: "duo-green", hex: "#58CC02" }
            const IconComp = meta.icon
            return (
              <div key={dim.name} className="card-duo p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${meta.hex}15` }}>
                    <IconComp className="w-5 h-5" style={{ color: meta.hex }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-duo-text">{dim.name}</h3>
                    <span className="font-extrabold" style={{ color: meta.hex }}>{dim.score}/100</span>
                  </div>
                </div>
                
                <ProgressBar score={dim.score} color={meta.hex} />
                
                <MarkdownContent className="text-duo-text-muted text-sm font-semibold mt-4 mb-3">
                  {dim.feedback}
                </MarkdownContent>
                
                <div className="grid grid-cols-1 gap-3">
                  {dim.keepDoing && dim.keepDoing.length > 0 && (
                    <div className="rounded-2xl bg-duo-green/5 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-duo-green" />
                        <span className="text-xs font-black uppercase tracking-wider text-duo-green">Keep Doing</span>
                      </div>
                      <div className="space-y-2">
                        {dim.keepDoing.map((item: string, idx: number) => (
                          <MarkdownContent key={idx} className="text-sm font-semibold text-duo-text">
                            {item}
                          </MarkdownContent>
                        ))}
                      </div>
                    </div>
                  )}

                  {dim.improveBeforePublishing && dim.improveBeforePublishing.length > 0 && (
                    <div className="rounded-2xl bg-duo-orange/5 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-duo-orange" />
                        <span className="text-xs font-black uppercase tracking-wider text-duo-orange">Improve Before Publishing</span>
                      </div>
                      <div className="space-y-2">
                        {dim.improveBeforePublishing.map((item: string, idx: number) => (
                          <MarkdownContent key={idx} className="text-sm font-semibold text-duo-text">
                            {item}
                          </MarkdownContent>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!dim.keepDoing && !dim.improveBeforePublishing) && dim.suggestions && dim.suggestions.length > 0 && (
                    <div className="space-y-2">
                      {dim.suggestions.map((suggestion: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Lightbulb className="w-4 h-4 text-duo-yellow flex-shrink-0 mt-0.5" />
                          <MarkdownContent className="text-duo-text font-semibold">{suggestion}</MarkdownContent>
                        </div>
                      ))}
                    </div>
                  )}

                  {dim.evidence && dim.evidence.length > 0 && (
                    <div className="mt-1 rounded-2xl border border-duo-border bg-white p-3">
                      <p className="mb-3 text-xs font-black uppercase tracking-wider text-duo-text-muted">
                        Evidence
                      </p>
                      <div className="space-y-3">
                        {dim.evidence.map((item: any, idx: number) => (
                          <div key={idx} className="border-t border-duo-border pt-3 first:border-t-0 first:pt-0">
                            <EvidenceLink
                              videoId={videoMeta.videoId}
                              timestamp={item.timestamp}
                              className="mb-2 bg-duo-blue/10 text-duo-blue hover:bg-duo-blue hover:text-white"
                            >
                              {formatTime(item.timestamp)}
                            </EvidenceLink>
                            <MarkdownContent className="text-sm font-black text-duo-text">
                              {item.quoteOrMoment}
                            </MarkdownContent>
                            <MarkdownContent className="mt-1 text-xs font-semibold text-duo-text-muted">
                              {item.whyItMatters}
                            </MarkdownContent>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Timeline Suggestions */}
        {timestampedSuggestions && timestampedSuggestions.length > 0 && (
          <div className="card-duo p-8 mb-12 bg-duo-surface/30">
            <h2 className="text-base font-black uppercase tracking-wider text-duo-text-muted mb-8">
              Pedagogical Timeline Analysis
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {timestampedSuggestions.map((item: any, index: number) => (
                <div 
                  key={index}
                  className={`flex items-start gap-6 p-5 rounded-3xl border-2 transition-all hover:scale-[1.01] ${
                    item.type === "positive" 
                      ? "bg-white border-duo-green/20" 
                      : "bg-white border-duo-yellow/20"
                  }`}
                >
                  <EvidenceLink
                    videoId={videoMeta.videoId}
                    timestamp={item.timestamp}
                    className={`flex-shrink-0 border-b-4 px-4 py-2 text-sm ${
                      item.type === "positive" 
                        ? "bg-duo-green text-white border-duo-green-dark" 
                        : "bg-duo-yellow text-duo-text border-duo-yellow-dark"
                    }`}
                  >
                    {formatTime(item.timestamp)}
                  </EvidenceLink>
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {item.impact && (
                        <span className="rounded-full bg-duo-red/10 px-3 py-1 text-xs font-black text-duo-red">
                          {item.impact} impact
                        </span>
                      )}
                      {item.effort && (
                        <span className="rounded-full bg-duo-blue/10 px-3 py-1 text-xs font-black text-duo-blue">
                          {item.effort}
                        </span>
                      )}
                    </div>
                    <MarkdownContent className="text-duo-text font-bold text-lg">
                      {item.note}
                    </MarkdownContent>
                    {item.suggestedRewrite && (
                      <div className="mt-4 rounded-2xl border-2 border-duo-border bg-duo-surface/60 p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-wider text-duo-text-muted">
                          {item.type === "positive" ? "Reuse This Move" : "Suggested Rewrite"}
                        </p>
                        <MarkdownContent className="text-sm font-semibold leading-relaxed text-duo-text">
                          {item.suggestedRewrite}
                        </MarkdownContent>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publishing Checklist */}
        {publishingChecklist && publishingChecklist.length > 0 && (
          <div className="card-duo p-8 mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-duo-green/10">
                <ClipboardCheck className="h-5 w-5 text-duo-green" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-duo-text">
                  Publishing Checklist
                </h2>
                <p className="text-sm font-semibold text-duo-text-muted">
                  The fastest edits to make before students see this lecture.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {publishingChecklist.map((item: any, index: number) => (
                <div key={index} className="rounded-2xl border-2 border-duo-border bg-duo-surface/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-duo-green text-xs font-black text-white">
                      {index + 1}
                    </span>
                    {item.timestamp !== undefined && (
                      <EvidenceLink
                        videoId={videoMeta.videoId}
                        timestamp={item.timestamp}
                        className="bg-white text-duo-blue hover:bg-duo-blue hover:text-white"
                      >
                        {formatTime(item.timestamp)}
                      </EvidenceLink>
                    )}
                  </div>
                  <MarkdownContent className="text-sm font-bold text-duo-text">
                    {item.item}
                  </MarkdownContent>
                  {item.impact && (
                    <span className="mt-3 inline-flex rounded-full bg-duo-red/10 px-3 py-1 text-xs font-black text-duo-red">
                      {item.impact} impact
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Analysis Button */}
        <div className="text-center">
          <Link href="/" className="btn-3d-primary inline-block">
            New Analysis
          </Link>
        </div>
      </main>
    </div>
  )
}
