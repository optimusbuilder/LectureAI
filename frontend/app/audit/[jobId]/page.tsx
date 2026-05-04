"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  AlertTriangle,
  Clock,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Play,
  Eye,
  Users,
  Gauge,
  ChevronLeft,
} from "lucide-react";

// Circular Score Gauge Component
function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getStrokeColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

// Audit Category Card Component
function AuditCard({
  title,
  icon: Icon,
  score,
  findings,
  recommendations,
}: {
  title: string;
  icon: React.ElementType;
  score: number;
  findings: string[];
  recommendations: string[];
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {score}/100
          </Badge>
        </div>
        <Progress
          value={score}
          className={`h-1.5 mt-2 [&>[data-slot=progress-indicator]]:${getScoreColor(score)}`}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Findings
          </h4>
          <ul className="space-y-1.5">
            {findings.map((finding, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                {finding}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Recommendations
          </h4>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-foreground">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Timeline Suggestion Item
function TimelineSuggestion({
  timestamp,
  currentMoment,
  suggestedRewrite,
  isLast,
}: {
  timestamp: string;
  currentMoment: string;
  suggestedRewrite: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-mono font-medium">
          {timestamp}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-2" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Current Moment
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                {currentMoment}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Suggested Rewrite
              </h4>
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 font-mono text-sm text-emerald-900 leading-relaxed">
                {`"${suggestedRewrite}"`}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
              <Play className="h-3 w-3" />
              Jump to {timestamp}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useParams } from "next/navigation"
import { pollJob } from "@/lib/api"
import { useEffect } from "react"

export default function AuditPage() {
  const params = useParams()
  const jobId = params.jobId as string
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!jobId) return
    const fetchData = async () => {
      try {
        const job = await pollJob(jobId)
        if (job.status === "complete") {
          setData(job)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [jobId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Analyzing pedagogy...</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center">Audit report not found.</div>

  const { result, videoMeta } = data
  const { overallScore, topPriority, dimensions, timestampedSuggestions } = result
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">LectureAI</span>
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                New Analysis
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Top Section: Video Info + Score */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <Badge variant="secondary" className="mb-2">
              Faculty Mode
            </Badge>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {videoMeta.title}
            </h1>
            <p className="text-muted-foreground">{videoMeta.author}</p>
          </div>
          <div className="flex flex-col items-center">
            <ScoreGauge score={overallScore} />
            <span className="text-sm font-medium text-muted-foreground mt-2">
              Overall Quality Score
            </span>
          </div>
        </div>

        {/* High Priority Card */}
        <Card className="mb-8 border-amber-300 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg text-amber-900">
                    Critical Improvement
                  </CardTitle>
                  {topPriority.timestamp && (
                    <Badge className="bg-amber-200 text-amber-800 border-amber-300">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(topPriority.timestamp)}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-amber-800">
                  Priority Action
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900 mb-4 leading-relaxed">
              {topPriority.issue}
            </p>
            <div className="rounded-lg bg-amber-100/80 border border-amber-200 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Suggested Action
              </h4>
              <p className="text-sm text-amber-900 leading-relaxed">
                {topPriority.suggestion}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Grid of Audit Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {dimensions.map((category: any) => {
            const icons: Record<string, any> = { Clarity: Eye, Accessibility: Users, Equity: Users, Pacing: Gauge };
            return (
              <AuditCard 
                key={category.name} 
                title={category.name}
                icon={icons[category.name] || Sparkles}
                score={category.score}
                findings={category.findings}
                recommendations={category.suggestions}
              />
            );
          })}
        </div>

        {/* Timestamped Suggestions Timeline */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Timestamped Suggestions
            </h2>
            <Badge variant="outline">
              {auditData.timelineSuggestions.length} items
            </Badge>
          </div>

          <div className="pl-2">
            {timestampedSuggestions.map((suggestion: any, index: number) => (
              <TimelineSuggestion
                key={index}
                timestamp={formatTime(suggestion.timestamp)}
                currentMoment={suggestion.issue}
                suggestedRewrite={suggestion.rewrite}
                isLast={index === timestampedSuggestions.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Export Section */}
        <Card className="bg-muted/30">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Export Your Audit Report
                </h3>
                <p className="text-sm text-muted-foreground">
                  Download a comprehensive PDF or share with your team
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Share Report</Button>
                <Button>Download PDF</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <span className="text-border">|</span>
            <Link href="#" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
