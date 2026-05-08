"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { FoxMascot } from "./fox-mascot"
import { chatWithTopic } from "@/lib/api"
import { 
  Send, 
  X, 
  Play, 
  Loader2, 
  MessageCircle,
  MapPin
} from "lucide-react"

interface Topic {
  id: string
  title: string
  startTime: number
  endTime: number
  summary: string
  keyTerms: string[]
}

interface TopicConnection {
  from: string
  to: string
  relationship: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface KnowledgeMapProps {
  topics: Topic[]
  connections: TopicConnection[]
  videoId: string
  jobId: string
}

const LINE_COLORS = [
  "#1CB0F6", // Blue
  "#FF4B4B", // Red
  "#58CC02", // Green
  "#FF9600", // Orange
  "#CE82FF", // Purple
  "#FFC800", // Yellow
]

interface Station {
  x: number
  y: number
  topic: Topic
  lineIndex: number
}

function buildMetroLayout(topics: Topic[], connections: TopicConnection[], width: number, height: number) {
  if (topics.length === 0) return { stations: [] as Station[], lines: [] as { stations: Station[]; color: string; label: string }[] }

  const sorted = [...topics].sort((a, b) => a.startTime - b.startTime)
  const paddingX = 80
  const paddingY = 60
  const usableW = width - paddingX * 2
  const usableH = height - paddingY * 2

  // Assign topics to "lines" based on connections
  // Main line = chronological order (always exists)
  // Branch lines = groups of connected topics
  const mainLineTopics = sorted
  const branchLines: Topic[][] = []

  // Find clusters from connections
  if (connections.length > 0) {
    const connected = new Set<string>()
    connections.forEach(c => {
      connected.add(c.from)
      connected.add(c.to)
    })

    // Group connected topics into branches (up to 2 branch lines)
    const visited = new Set<string>()
    for (const conn of connections) {
      if (visited.has(conn.from) && visited.has(conn.to)) continue
      const branch: Topic[] = []
      const fromTopic = sorted.find(t => t.id === conn.from)
      const toTopic = sorted.find(t => t.id === conn.to)
      if (fromTopic && !visited.has(fromTopic.id)) {
        branch.push(fromTopic)
        visited.add(fromTopic.id)
      }
      if (toTopic && !visited.has(toTopic.id)) {
        branch.push(toTopic)
        visited.add(toTopic.id)
      }
      if (branch.length > 0 && branchLines.length < 2) {
        branchLines.push(branch)
      }
    }
  }

  // Main line runs horizontally across the middle
  const mainY = height / 2
  const stationSpacing = usableW / Math.max(mainLineTopics.length - 1, 1)

  const stations: Station[] = mainLineTopics.map((topic, i) => ({
    x: paddingX + stationSpacing * i,
    y: mainY,
    topic,
    lineIndex: 0
  }))

  // Branch lines run parallel above/below
  const branchOffsetY = 80
  branchLines.forEach((branch, branchIdx) => {
    const yOffset = branchIdx === 0 ? -branchOffsetY : branchOffsetY
    branch.forEach(topic => {
      const mainStation = stations.find(s => s.topic.id === topic.id)
      if (mainStation) {
        mainStation.lineIndex = branchIdx + 1
      }
    })
  })

  // Build line data for rendering
  const lines = [
    { stations: stations.filter(() => true), color: LINE_COLORS[0], label: "Main Flow" },
    ...branchLines.map((branch, i) => ({
      stations: stations.filter(s => branch.some(t => t.id === s.topic.id)),
      color: LINE_COLORS[i + 1],
      label: i === 0 ? "Key Concepts" : "Examples"
    }))
  ]

  return { stations, lines }
}

export function KnowledgeMap({ topics, connections, videoId, jobId }: KnowledgeMapProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 })
  const chatEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 420)
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const { stations, lines } = useMemo(
    () => buildMetroLayout(topics, connections, dimensions.width, dimensions.height),
    [topics, connections, dimensions.width, dimensions.height]
  )

  const handleNodeClick = (topic: Topic) => {
    setSelectedTopic(topic)
    setChatMessages([])
    setChatInput("")
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !selectedTopic || isSending) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsSending(true)

    try {
      const { reply } = await chatWithTopic(
        jobId,
        userMessage,
        {
          title: selectedTopic.title,
          startTime: selectedTopic.startTime,
          endTime: selectedTopic.endTime,
          summary: selectedTopic.summary,
          keyTerms: selectedTopic.keyTerms || []
        },
        chatMessages.concat({ role: "user", content: userMessage })
      )
      setChatMessages(prev => [...prev, { role: "assistant", content: reply }])
    } catch (err) {
      console.error(err)
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Try again?" }])
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FoxMascot size="md" expression="thinking" />
        <p className="text-duo-text-muted font-semibold mt-4">
          Knowledge map not available for this lecture.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Map + Chat side by side */}
      <div className="flex gap-4 flex-1">
        {/* Map Area */}
        <div className={`${selectedTopic ? 'w-3/5' : 'w-full'} transition-all duration-300 flex flex-col`}>
          <div ref={containerRef} className="flex-1 card-duo overflow-hidden relative bg-white min-h-[420px]">
            {/* Legend */}
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-2xl border border-duo-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-duo-text-muted" />
                <span className="text-[10px] font-black uppercase tracking-wider text-duo-text-muted">Lecture Route Map</span>
              </div>
              <div className="space-y-1.5">
                {lines.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-[4px] rounded-full" style={{ backgroundColor: line.color }} />
                    <span className="text-[10px] font-bold text-duo-text">{line.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time indicators */}
            <div className="absolute bottom-3 left-20 right-20 flex justify-between pointer-events-none">
              <span className="text-[10px] font-bold text-duo-text-muted bg-white/80 px-2 py-0.5 rounded">
                {formatTime(topics[0]?.startTime || 0)}
              </span>
              <span className="text-[10px] font-bold text-duo-text-muted bg-white/80 px-2 py-0.5 rounded">
                {formatTime(topics[topics.length - 1]?.endTime || 0)}
              </span>
            </div>

            <svg
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              className="w-full h-full"
              style={{ minHeight: 420 }}
            >
              {/* Main track line (thick background) */}
              {stations.length > 1 && (
                <path
                  d={`M ${stations[0].x} ${stations[0].y} ${stations.slice(1).map(s => `L ${s.x} ${s.y}`).join(' ')}`}
                  fill="none"
                  stroke={LINE_COLORS[0]}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              )}

              {/* Branch connection lines */}
              {connections.map((conn, i) => {
                const fromStation = stations.find(s => s.topic.id === conn.from)
                const toStation = stations.find(s => s.topic.id === conn.to)
                if (!fromStation || !toStation) return null

                // Skip adjacent stations (already connected by main line)
                const fromIdx = stations.indexOf(fromStation)
                const toIdx = stations.indexOf(toStation)
                if (Math.abs(fromIdx - toIdx) === 1) return null

                const color = LINE_COLORS[(i % (LINE_COLORS.length - 1)) + 1]
                const offsetY = i % 2 === 0 ? -50 - (i * 8) : 50 + (i * 8)
                const midX = (fromStation.x + toStation.x) / 2

                // Metro-style: go up/down at 45°, horizontal, then back at 45°
                const diagLen = Math.abs(offsetY)
                const path = `M ${fromStation.x} ${fromStation.y} 
                  L ${fromStation.x + diagLen} ${fromStation.y + offsetY}
                  L ${toStation.x - diagLen} ${toStation.y + offsetY}
                  L ${toStation.x} ${toStation.y}`

                return (
                  <path
                    key={`branch-${i}`}
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={selectedTopic && (selectedTopic.id === conn.from || selectedTopic.id === conn.to) ? 0.9 : 0.35}
                    className="transition-opacity duration-300"
                  />
                )
              })}

              {/* Station nodes */}
              {stations.map((station, i) => {
                const isSelected = selectedTopic?.id === station.topic.id
                const stationRadius = isSelected ? 14 : 11

                return (
                  <g
                    key={station.topic.id || i}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(station.topic)}
                  >
                    {/* Outer ring */}
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={stationRadius + 3}
                      fill="white"
                      stroke={isSelected ? LINE_COLORS[0] : "#E5E5E5"}
                      strokeWidth={isSelected ? 3 : 2}
                      className="transition-all duration-200"
                    />
                    {/* Inner dot */}
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={stationRadius - 3}
                      fill={isSelected ? LINE_COLORS[0] : LINE_COLORS[0]}
                      opacity={isSelected ? 1 : 0.7}
                      className="transition-all duration-200"
                    />

                    {/* Station label */}
                    <text
                      x={station.x}
                      y={station.y + stationRadius + 18}
                      textAnchor="middle"
                      className={`text-[10px] font-bold ${isSelected ? 'fill-duo-text' : 'fill-duo-text-muted'}`}
                    >
                      {station.topic.title.length > 18
                        ? station.topic.title.slice(0, 16) + "…"
                        : station.topic.title}
                    </text>

                    {/* Timestamp below label */}
                    <text
                      x={station.x}
                      y={station.y + stationRadius + 32}
                      textAnchor="middle"
                      className="text-[9px] font-semibold fill-duo-text-muted"
                      opacity="0.6"
                    >
                      {formatTime(station.topic.startTime)}
                    </text>

                    {/* Selection indicator */}
                    {isSelected && (
                      <circle
                        cx={station.x}
                        cy={station.y}
                        r={stationRadius + 8}
                        fill="none"
                        stroke={LINE_COLORS[0]}
                        strokeWidth="2"
                        opacity="0.4"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Hint */}
            {!selectedTopic && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full border border-duo-border shadow-sm">
                <span className="text-xs font-bold text-duo-text-muted">Click any station to explore & chat with AI</span>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        {selectedTopic && (
          <div className="w-2/5 min-w-[320px] flex flex-col card-duo overflow-hidden animate-fade-in">
            {/* Panel Header */}
            <div className="p-4 border-b border-duo-border bg-duo-surface/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-duo-green" />
                  <span className="text-xs font-bold uppercase tracking-wider text-duo-text-muted">Station Chat</span>
                </div>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="p-1 rounded-full hover:bg-duo-border transition-colors"
                >
                  <X className="w-4 h-4 text-duo-text-muted" />
                </button>
              </div>

              <h3 className="font-bold text-duo-text text-sm">{selectedTopic.title}</h3>
              <p className="text-xs text-duo-text-muted font-semibold mt-1 line-clamp-2">{selectedTopic.summary}</p>
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(selectedTopic.startTime)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-duo-green/10 text-duo-green text-[10px] font-bold hover:bg-duo-green hover:text-white transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Watch at {formatTime(selectedTopic.startTime)}
                </a>
                {selectedTopic.keyTerms?.slice(0, 3).map((term, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-duo-surface text-duo-text-muted text-[10px] font-bold border border-duo-border">
                    {term}
                  </span>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[280px]">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                  <FoxMascot size="sm" expression="happy" />
                  <p className="text-duo-text-muted font-semibold text-xs mt-2">
                    Ask me anything about "{selectedTopic.title}"
                  </p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 mt-1">
                      <FoxMascot size="sm" expression="happy" animate={false} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm font-semibold ${
                      msg.role === "user"
                        ? "bg-duo-green text-white rounded-br-sm"
                        : "bg-duo-surface text-duo-text rounded-bl-sm border border-duo-border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex gap-2 justify-start">
                  <div className="flex-shrink-0 mt-1">
                    <FoxMascot size="sm" expression="thinking" />
                  </div>
                  <div className="bg-duo-surface text-duo-text-muted rounded-2xl rounded-bl-sm px-3 py-2 border border-duo-border">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-duo-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about this topic..."
                  className="flex-1 rounded-full border-2 border-duo-border bg-white px-4 py-2 text-sm font-semibold text-duo-text placeholder:text-duo-text-muted focus:border-duo-green focus:outline-none"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !chatInput.trim()}
                  className="w-9 h-9 rounded-full bg-duo-green flex items-center justify-center text-white disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
