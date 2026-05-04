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

// Sample data
const auditData = {
  videoTitle: "Introduction to Thermodynamics",
  channel: "MIT OpenCourseWare",
  overallScore: 72,
  criticalImprovement: {
    timestamp: "12:34",
    title: "Complex Concept Without Visual Aid",
    description:
      "The explanation of entropy at this point relies heavily on verbal description without accompanying diagrams or animations, making it difficult for visual learners to grasp.",
    suggestedAction:
      "Add a simple diagram showing molecular disorder, or use an animation to demonstrate entropy increase in real-time.",
  },
  categories: [
    {
      title: "Clarity",
      icon: Eye,
      score: 78,
      findings: [
        "Technical jargon introduced without prior definition",
        "Strong use of analogies for abstract concepts",
        "Some sentences exceed 30 words, reducing comprehension",
      ],
      recommendations: [
        "Define terms like 'adiabatic' before first use",
        "Break complex sentences into shorter segments",
        "Add verbal signposts between topic transitions",
      ],
    },
    {
      title: "Accessibility",
      icon: Users,
      score: 65,
      findings: [
        "No captions or transcript provided",
        "Color contrast in slides meets WCAG AA",
        "Speaking pace averages 165 WPM (slightly fast)",
      ],
      recommendations: [
        "Generate and review auto-captions for accuracy",
        "Slow pace to 140-150 WPM during complex sections",
        "Provide downloadable transcript with timestamps",
      ],
    },
    {
      title: "Equity",
      icon: Users,
      score: 68,
      findings: [
        "Examples drawn primarily from Western contexts",
        "Gender-neutral language used consistently",
        "Limited representation in example scenarios",
      ],
      recommendations: [
        "Include examples from diverse cultural contexts",
        "Feature contributions from underrepresented scientists",
        "Vary scenario settings and character backgrounds",
      ],
    },
    {
      title: "Pacing",
      icon: Gauge,
      score: 82,
      findings: [
        "Good use of pauses after key concepts",
        "Recap provided at 15-minute intervals",
        "Final 5 minutes feel rushed compared to start",
      ],
      recommendations: [
        "Extend final summary by 2-3 minutes",
        "Add micro-breaks for note-taking after equations",
        "Consider splitting into two shorter segments",
      ],
    },
  ],
  timelineSuggestions: [
    {
      timestamp: "3:22",
      currentMoment:
        "So basically, thermodynamics is, um, the study of heat and energy transfer and stuff like that.",
      suggestedRewrite:
        "Thermodynamics is the branch of physics that studies how heat and energy move between systems. Let me break this down with a simple example.",
    },
    {
      timestamp: "8:15",
      currentMoment:
        "The first law is conservation of energy, which you probably learned in high school, right?",
      suggestedRewrite:
        "The first law of thermodynamics states that energy cannot be created or destroyed—only transformed. Whether or not you've encountered this before, let's explore what it means in practice.",
    },
    {
      timestamp: "15:47",
      currentMoment:
        "Entropy always increases. That's just how it works. Moving on...",
      suggestedRewrite:
        "Entropy, or disorder, naturally increases in isolated systems over time. This is a profound concept—let's pause here and consider why this matters before we continue.",
    },
    {
      timestamp: "22:03",
      currentMoment:
        "The Carnot cycle is the most efficient theoretical engine cycle and it goes like this...",
      suggestedRewrite:
        "The Carnot cycle represents the theoretical maximum efficiency any heat engine can achieve. I'll walk through each of its four stages, explaining why this ideal matters for real-world engineering.",
    },
  ],
};

export default function AuditPage() {
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
              {auditData.videoTitle}
            </h1>
            <p className="text-muted-foreground">{auditData.channel}</p>
          </div>
          <div className="flex flex-col items-center">
            <ScoreGauge score={auditData.overallScore} />
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
                  <Badge className="bg-amber-200 text-amber-800 border-amber-300">
                    <Clock className="h-3 w-3 mr-1" />
                    {auditData.criticalImprovement.timestamp}
                  </Badge>
                </div>
                <CardDescription className="text-amber-800">
                  {auditData.criticalImprovement.title}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900 mb-4 leading-relaxed">
              {auditData.criticalImprovement.description}
            </p>
            <div className="rounded-lg bg-amber-100/80 border border-amber-200 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Suggested Action
              </h4>
              <p className="text-sm text-amber-900 leading-relaxed">
                {auditData.criticalImprovement.suggestedAction}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                <Play className="h-3.5 w-3.5" />
                Jump to {auditData.criticalImprovement.timestamp}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100">
                <ArrowRight className="h-3.5 w-3.5" />
                Mark as Addressed
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2x2 Grid of Audit Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {auditData.categories.map((category) => (
            <AuditCard key={category.title} {...category} />
          ))}
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
            {auditData.timelineSuggestions.map((suggestion, index) => (
              <TimelineSuggestion
                key={suggestion.timestamp}
                {...suggestion}
                isLast={index === auditData.timelineSuggestions.length - 1}
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
