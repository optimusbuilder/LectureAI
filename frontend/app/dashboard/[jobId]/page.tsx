"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  Play,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  BookOpen,
  Layers,
  Globe,
} from "lucide-react"

// Mock data for the lecture outline
const outlineData = [
  { id: 1, timestamp: "0:00", title: "Introduction to Thermodynamics", duration: "4:20" },
  { id: 2, timestamp: "4:20", title: "The First Law of Thermodynamics", duration: "8:15" },
  { id: 3, timestamp: "12:35", title: "Energy Conservation Examples", duration: "6:40" },
  { id: 4, timestamp: "19:15", title: "The Second Law Explained", duration: "10:30" },
  { id: 5, timestamp: "29:45", title: "Entropy and Disorder", duration: "7:25" },
  { id: 6, timestamp: "37:10", title: "Heat Engines and Efficiency", duration: "9:00" },
  { id: 7, timestamp: "46:10", title: "Carnot Cycle Deep Dive", duration: "8:45" },
  { id: 8, timestamp: "54:55", title: "Real-World Applications", duration: "5:05" },
]

// Mock flashcard data
const flashcardsData = [
  {
    id: 1,
    question: "What is the First Law of Thermodynamics?",
    answer: "Energy cannot be created or destroyed, only transformed from one form to another. The total energy of an isolated system remains constant.",
    timestamp: "4:20",
  },
  {
    id: 2,
    question: "Define Entropy in thermodynamic terms.",
    answer: "Entropy is a measure of the disorder or randomness in a system. The Second Law states that entropy in an isolated system always increases over time.",
    timestamp: "29:45",
  },
  {
    id: 3,
    question: "What is the Carnot efficiency formula?",
    answer: "η = 1 - (Tc/Th), where Tc is the cold reservoir temperature and Th is the hot reservoir temperature, both in Kelvin.",
    timestamp: "46:10",
  },
  {
    id: 4,
    question: "What distinguishes reversible from irreversible processes?",
    answer: "Reversible processes occur infinitely slowly and can return both system and surroundings to their original states. Irreversible processes are spontaneous and increase total entropy.",
    timestamp: "37:10",
  },
]

// Mock search results
const searchResultsData = [
  {
    id: 1,
    snippet: "The First Law of Thermodynamics states that energy is conserved in any thermodynamic process...",
    timestamp: "4:20",
  },
  {
    id: 2,
    snippet: "When we talk about energy conservation, we must consider both kinetic and potential energy forms...",
    timestamp: "12:35",
  },
  {
    id: 3,
    snippet: "Heat engines convert thermal energy into mechanical work, but always with some energy loss...",
    timestamp: "37:10",
  },
]

// Summary content for different depths
const summaryContent = {
  "90-sec": `This lecture covers the fundamental laws of thermodynamics. The First Law establishes energy conservation, while the Second Law introduces entropy and explains why processes have a preferred direction. Key applications include heat engines and the Carnot cycle, which represents the maximum theoretical efficiency for any heat engine.`,
  "5-min": `This comprehensive lecture on thermodynamics begins with foundational concepts and builds toward practical applications.

**The First Law** establishes that energy cannot be created or destroyed, only transformed. This principle underlies all energy calculations in physics and engineering.

**The Second Law** introduces entropy—a measure of disorder that always increases in isolated systems. This explains why heat flows from hot to cold spontaneously, never the reverse.

**Heat Engines** convert thermal energy to mechanical work. The Carnot cycle represents the theoretical maximum efficiency, limited by the temperature difference between hot and cold reservoirs.

**Key Takeaway:** Understanding these laws is essential for engineering efficient systems, from power plants to refrigerators.`,
  full: `# Complete Lecture Summary

## Introduction (0:00 - 4:20)
The lecture opens with a historical overview of thermodynamics, tracing its development from early steam engine research to modern applications. Professor Chen emphasizes that thermodynamics governs everything from biological processes to cosmic events.

## The First Law of Thermodynamics (4:20 - 12:35)
Energy conservation is the cornerstone of physics. The First Law states:
- Energy cannot be created or destroyed
- Internal energy changes equal heat added minus work done: ΔU = Q - W
- This applies to all closed systems regardless of the process path

Several worked examples demonstrate energy calculations for expanding gases and phase transitions.

## The Second Law Explained (19:15 - 29:45)
The Second Law introduces the concept of entropy, explaining:
- Why certain processes are irreversible
- The statistical nature of entropy as molecular disorder
- Clausius inequality: ∮(dQ/T) ≤ 0

## Entropy and Disorder (29:45 - 37:10)
Entropy is examined through multiple lenses:
- Macroscopic: heat flow direction
- Statistical: Boltzmann's definition S = k ln(W)
- Information theory connections

## Heat Engines and Efficiency (37:10 - 46:10)
Practical applications of thermodynamics focus on:
- Converting heat to useful work
- Efficiency limitations imposed by the Second Law
- Real vs. ideal engine performance

## Carnot Cycle Deep Dive (46:10 - 54:55)
The Carnot cycle represents theoretical perfection:
- Four reversible processes: two isothermal, two adiabatic
- Efficiency η = 1 - Tc/Th depends only on reservoir temperatures
- No real engine can exceed Carnot efficiency

## Real-World Applications (54:55 - 60:00)
The lecture concludes with modern applications:
- Power plant design and optimization
- Refrigeration and heat pump technology
- Renewable energy systems
- Climate science and atmospheric thermodynamics`,
}

import { useSearchParams, useParams } from "next/navigation"
import { pollJob, searchLecture } from "@/lib/api"
import { useEffect } from "react"

export default function StudentDashboard() {
  const params = useParams()
  const jobId = params.jobId as string
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState("en")
  const [summaryDepth, setSummaryDepth] = useState<"short" | "medium" | "full">("medium")
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!jobId) return
    const fetchData = async () => {
      try {
        const job = await pollJob(jobId)
        if (job.status === "complete") {
          setData(job)
          setLanguage(job.result.language || "en")
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [jobId])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length > 2) {
      setIsSearching(true)
      try {
        const { results } = await searchLecture(query, data.videoMeta.videoId)
        setSearchResults(results)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading your study materials...</div>
  if (!data) return <div className="min-h-screen flex items-center justify-center">Data not found.</div>

  const { result, videoMeta } = data
  const { outline, summaries, flashcards } = result

  const nextFlashcard = () => {
    setIsFlipped(false)
    setCurrentFlashcard((prev) => (prev + 1) % flashcardsData.length)
  }

  const prevFlashcard = () => {
    setIsFlipped(false)
    setCurrentFlashcard((prev) => (prev - 1 + flashcardsData.length) % flashcardsData.length)
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Sidebar */}
      <aside className="w-[280px] border-r border-border flex flex-col bg-sidebar">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-sidebar-primary" />
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              LectureAI
            </span>
          </div>
          
          {/* Video Info */}
          <div className="space-y-1">
            <h2 className="font-semibold text-sidebar-foreground leading-tight">
              {videoMeta.title}
            </h2>
            <p className="text-sm text-muted-foreground">{videoMeta.author}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{formatTime(videoMeta.duration)}</span>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="p-4 border-b border-sidebar-border">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
            Language
          </label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full">
              <Globe className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="zh">Mandarin</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Interactive Outline */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 pb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Lecture Outline
            </label>
          </div>
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 pb-4">
              {outline.map((chapter: any, idx: number) => (
                <a
                  key={idx}
                  href={chapter.youtubeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left px-3 py-2.5 rounded-lg transition-colors group hover:bg-sidebar-accent/50 text-sidebar-foreground block"
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className="text-xs font-mono shrink-0 border-border text-muted-foreground"
                    >
                      {formatTime(chapter.timestamp)}
                    </Badge>
                    <span className="text-sm leading-tight">{chapter.title}</span>
                  </div>
                </a>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Main Header */}
        <header className="h-14 border-b border-border flex items-center px-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="size-4" />
            <span>Study Materials</span>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">Introduction to Thermodynamics</span>
          </nav>
        </header>

        {/* Tabs Content Area */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="summary" className="h-full flex flex-col">
            <div className="border-b border-border px-6 pt-4">
              <TabsList className="bg-muted">
                <TabsTrigger value="summary" className="gap-1.5">
                  <Layers className="size-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="flashcards" className="gap-1.5">
                  <BookOpen className="size-4" />
                  Flashcards
                </TabsTrigger>
                <TabsTrigger value="search" className="gap-1.5">
                  <Search className="size-4" />
                  Search
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Summary Tab */}
            <TabsContent value="summary" className="flex-1 p-6 m-0">
              <div className="max-w-3xl">
                {/* Depth Selector */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-sm text-muted-foreground">Depth:</span>
                  <div className="flex gap-2">
                    {(["short", "medium", "full"] as const).map((depth) => (
                      <Button
                        key={depth}
                        variant={summaryDepth === depth ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSummaryDepth(depth)}
                        className="text-xs"
                      >
                        {depth.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Summary Content */}
                <div className="prose prose-neutral max-w-none">
                  <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {summaries[summaryDepth]}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Flashcards Tab */}
            <TabsContent value="flashcards" className="flex-1 p-6 m-0">
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
                {/* Card Counter */}
                <div className="text-sm text-muted-foreground mb-4">
                  Card {currentFlashcard + 1} of {flashcardsData.length}
                </div>

                {/* Flashcard */}
                <Card
                  className="w-full aspect-[3/2] cursor-pointer relative overflow-hidden"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="absolute inset-0 p-8 flex flex-col">
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary" className="text-xs">
                        {isFlipped ? "Answer" : "Question"}
                      </Badge>
                      <a
                        href={flashcards[currentFlashcard].youtubeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Play className="size-3" />
                        <span>Jump to {formatTime(flashcards[currentFlashcard].timestamp)}</span>
                      </a>
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 flex items-center justify-center overflow-auto">
                      <p className="text-lg text-center leading-relaxed text-balance">
                        {isFlipped
                          ? flashcards[currentFlashcard].back
                          : flashcards[currentFlashcard].front}
                      </p>
                    </div>

                    {/* Click hint */}
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">
                        Click to {isFlipped ? "see question" : "reveal answer"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Navigation */}
                <div className="flex items-center gap-4 mt-6">
                  <Button variant="outline" size="sm" onClick={prevFlashcard}>
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextFlashcard}>
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Search Tab */}
            <TabsContent value="search" className="flex-1 p-6 m-0">
              <div className="max-w-2xl mx-auto">
                {/* Search Input */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Ask anything about this lecture...</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for concepts, terms, or topics..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                {/* Search Results */}
                <div className="space-y-3">
                  {isSearching ? (
                    <div className="text-center py-12">
                      <Loader2 className="size-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">Scanning lecture for answers...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result: any, idx: number) => (
                      <a 
                        key={idx} 
                        href={result.youtubeLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm text-foreground leading-relaxed flex-1">
                              {result.text}
                            </p>
                            <Badge
                              variant="outline"
                              className="shrink-0 font-mono text-xs gap-1"
                            >
                              <Play className="size-3" />
                              {formatTime(result.startTime)}
                            </Badge>
                          </div>
                        </Card>
                      </a>
                    ))
                  ) : searchQuery.trim().length > 2 ? (
                    <div className="text-center py-12">
                      <Search className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground">No results found for your search.</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Enter a question to start searching.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
