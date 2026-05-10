"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { FoxMascot } from "@/components/fox-mascot"
import { MarkdownContent } from "@/components/markdown-content"
import { pollJob } from "@/lib/api"
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Loader2,
  Play,
  Target,
  TriangleAlert,
  XCircle
} from "lucide-react"

const statusMeta: Record<string, { color: string; bg: string; icon: any }> = {
  Covered: { color: "text-duo-green", bg: "bg-duo-green/10 border-duo-green/25", icon: CheckCircle2 },
  Partial: { color: "text-duo-orange", bg: "bg-duo-orange/10 border-duo-orange/25", icon: CircleDashed },
  Missing: { color: "text-duo-red", bg: "bg-duo-red/10 border-duo-red/25", icon: XCircle },
}

function normalizeStatus(status: unknown) {
  const value = String(status || "").toLowerCase()
  if (value === "covered") return "Covered"
  if (value === "missing") return "Missing"
  return "Partial"
}

function formatTime(seconds: number) {
  const mins = Math.floor((seconds || 0) / 60)
  const secs = Math.floor((seconds || 0) % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function scoreColor(score: number) {
  if (score >= 75) return "bg-duo-green"
  if (score >= 40) return "bg-duo-orange"
  return "bg-duo-red"
}

function normalizeScore(value: unknown) {
  const score = Number(value)
  if (Number.isNaN(score)) return 0
  return Math.min(100, Math.max(0, score))
}

export default function ProvostPage() {
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
          setError(job.message || "Failed to load curriculum map")
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-duo-orange" />
        <span className="text-duo-text font-bold">Loading curriculum map...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <FoxMascot size="lg" expression="thinking" />
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-duo-text font-bold text-lg">{error || "Curriculum map not found"}</p>
          <Link href="/" className="btn-3d-primary inline-block">
            Try another course
          </Link>
        </div>
      </div>
    )
  }

  const { result = {}, lectures = [], failedLectures = [], learningObjectives = [] } = data
  const objectiveCoverage = result.objectiveCoverage || []
  const lectureMatrix = result.lectureMatrix || []
  const underServedObjectives = result.underServedObjectives || []
  const recommendations = result.recommendations || []

  return (
    <div className="min-h-screen bg-white">
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
        <span className="px-4 py-1.5 rounded-full bg-duo-orange/10 text-duo-orange text-xs font-bold uppercase tracking-wider">
          Provost Mode
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-duo-text-muted mb-2">
              Curriculum Coverage Map
            </p>
            <h1 className="text-3xl font-black text-duo-text mb-3">
              {result.courseTitle || data.courseTitle}
            </h1>
            <MarkdownContent className="max-w-3xl text-base font-semibold leading-relaxed text-duo-text-muted">
              {result.courseSummary}
            </MarkdownContent>
          </div>

          <div className="card-duo p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-duo-orange flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-duo-text-muted">Overall Coverage</p>
                <p className="text-3xl font-black text-duo-text">{result.overallCoverageScore ?? 0}%</p>
              </div>
            </div>
            <div className="h-3 rounded-full bg-duo-surface overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreColor(result.overallCoverageScore || 0)}`}
                style={{ width: `${Math.min(100, Math.max(0, result.overallCoverageScore || 0))}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-bold text-duo-text-muted">
              {lectures.length} lectures analyzed · {learningObjectives.length || objectiveCoverage.length} objectives
            </p>
          </div>
        </section>

        {failedLectures.length > 0 && (
          <section className="mb-8 rounded-2xl border-2 border-duo-yellow/30 bg-duo-yellow/5 p-5">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-duo-orange mt-0.5" />
              <div>
                <h2 className="font-black text-duo-text">Some lectures could not be processed</h2>
                <p className="mt-1 text-sm font-semibold text-duo-text-muted">
                  The map below is based on the lectures that succeeded.
                </p>
                <div className="mt-3 space-y-1">
                  {failedLectures.map((item: any, index: number) => (
                    <p key={index} className="text-xs font-bold text-duo-text-muted">
                      {item.url} · {item.errorCode}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 mb-8">
          {objectiveCoverage.map((objective: any, index: number) => {
            const status = normalizeStatus(objective.status)
            const meta = statusMeta[status]
            const Icon = meta.icon
            return (
              <article key={index} className={`rounded-3xl border-2 p-5 ${meta.bg}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                      <span className={`text-xs font-black uppercase tracking-wider ${meta.color}`}>
                        {status} · {objective.coverageScore ?? 0}% coverage · {objective.confidence ?? 0}% confidence
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-duo-text mb-2">
                      Objective {index + 1}: {objective.objective}
                    </h2>
                    <MarkdownContent className="text-sm font-semibold leading-relaxed text-duo-text">
                      {objective.summary}
                    </MarkdownContent>
                  </div>
                  <div className="w-full lg:w-56">
                    <div className="h-3 rounded-full bg-white overflow-hidden border border-duo-border">
                      <div
                        className={`h-full ${scoreColor(objective.coverageScore || 0)}`}
                        style={{ width: `${Math.min(100, Math.max(0, objective.coverageScore || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {objective.evidence && objective.evidence.length > 0 && (
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {objective.evidence.map((item: any, evidenceIndex: number) => (
                      <div key={evidenceIndex} className="rounded-2xl bg-white p-4 border border-duo-border">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-xs font-black uppercase tracking-wider text-duo-text-muted">
                            {item.lectureTitle}
                          </span>
                          {item.youtubeLink && (
                            <a
                              href={item.youtubeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-duo-blue/10 px-3 py-1 text-xs font-black text-duo-blue hover:bg-duo-blue hover:text-white"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              {formatTime(item.timestamp)}
                            </a>
                          )}
                        </div>
                        <MarkdownContent className="text-sm font-black text-duo-text">
                          {item.moment}
                        </MarkdownContent>
                        <MarkdownContent className="mt-2 text-xs font-semibold leading-relaxed text-duo-text-muted">
                          {item.whyItMatters}
                        </MarkdownContent>
                      </div>
                    ))}
                  </div>
                )}

                {(objective.gap || objective.recommendedAction) && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {objective.gap && (
                      <div className="rounded-2xl bg-white/70 p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-wider text-duo-red">Gap</p>
                        <MarkdownContent className="text-sm font-semibold text-duo-text">{objective.gap}</MarkdownContent>
                      </div>
                    )}
                    {objective.recommendedAction && (
                      <div className="rounded-2xl bg-white/70 p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-wider text-duo-green">Recommended Action</p>
                        <MarkdownContent className="text-sm font-semibold text-duo-text">{objective.recommendedAction}</MarkdownContent>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <section className="card-duo p-6 mb-8 overflow-x-auto">
          <div className="flex items-center gap-3 mb-5">
            <Target className="w-5 h-5 text-duo-purple" />
            <h2 className="text-lg font-black text-duo-text">Lecture × Objective Matrix</h2>
          </div>
          <table className="w-full min-w-[780px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-black uppercase tracking-wider text-duo-text-muted p-3 border-b border-duo-border">
                  Lecture
                </th>
                {objectiveCoverage.map((_: any, index: number) => (
                  <th key={index} className="text-center text-xs font-black uppercase tracking-wider text-duo-text-muted p-3 border-b border-duo-border">
                    Obj {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lectureMatrix.map((lecture: any, rowIndex: number) => (
                <tr key={rowIndex}>
                  <td className="sticky left-0 bg-white p-3 border-b border-duo-border">
                    <p className="font-black text-sm text-duo-text">{lecture.lectureTitle}</p>
                  </td>
                  {objectiveCoverage.map((_: any, objectiveIndex: number) => {
                    const score = normalizeScore(lecture.objectiveScores?.find((item: any) => item.objectiveIndex === objectiveIndex)?.score)
                    return (
                      <td key={objectiveIndex} className="p-3 text-center border-b border-duo-border">
                        <div className="mx-auto h-9 w-16 rounded-full bg-duo-surface p-1">
                          <div
                            className={`h-full rounded-full ${scoreColor(score)}`}
                            style={{ width: `${Math.max(12, Math.min(100, score))}%` }}
                          />
                        </div>
                        <span className="mt-1 block text-xs font-black text-duo-text-muted">{score}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="card-duo p-6">
            <div className="flex items-center gap-3 mb-5">
              <TriangleAlert className="w-5 h-5 text-duo-orange" />
              <h2 className="text-lg font-black text-duo-text">Under-Served Objectives</h2>
            </div>
            <div className="space-y-3">
              {underServedObjectives.length > 0 ? underServedObjectives.map((item: any, index: number) => (
                <div key={index} className="rounded-2xl bg-duo-surface/70 p-4">
                  <MarkdownContent className="text-sm font-black text-duo-text">{item.objective}</MarkdownContent>
                  <MarkdownContent className="mt-2 text-xs font-semibold text-duo-text-muted">{item.reason}</MarkdownContent>
                  <MarkdownContent className="mt-2 text-sm font-semibold text-duo-green">{item.recommendedLectureOrActivity}</MarkdownContent>
                </div>
              )) : (
                <p className="text-sm font-semibold text-duo-text-muted">No major under-served objectives were identified.</p>
              )}
            </div>
          </div>

          <div className="card-duo p-6">
            <div className="flex items-center gap-3 mb-5">
              <BookOpen className="w-5 h-5 text-duo-green" />
              <h2 className="text-lg font-black text-duo-text">Course Recommendations</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((item: string, index: number) => (
                <div key={index} className="flex items-start gap-3 rounded-2xl bg-duo-surface/70 p-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-duo-green text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <MarkdownContent className="text-sm font-semibold text-duo-text">{item}</MarkdownContent>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card-duo p-6 mb-10">
          <div className="flex items-center gap-3 mb-5">
            <ExternalLink className="w-5 h-5 text-duo-blue" />
            <h2 className="text-lg font-black text-duo-text">Lectures Analyzed</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lectures.map((lecture: any, index: number) => (
              <a
                key={`${lecture.videoId || "lecture"}-${index}`}
                href={lecture.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border-2 border-duo-border p-4 transition-colors hover:border-duo-blue"
              >
                <p className="text-xs font-black uppercase tracking-wider text-duo-text-muted">Lecture {index + 1}</p>
                <h3 className="mt-1 font-black text-duo-text">{lecture.title}</h3>
                <p className="mt-1 text-xs font-bold text-duo-text-muted">{lecture.author} · {formatTime(lecture.duration)}</p>
              </a>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link href="/" className="btn-3d-primary inline-block">
            New Curriculum Map
          </Link>
        </div>
      </main>
    </div>
  )
}
