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
  Compass
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

const NODE_COLORS = [
  { bg: "#1CB0F6", text: "#fff" },
  { bg: "#58CC02", text: "#fff" },
  { bg: "#FF9600", text: "#fff" },
  { bg: "#CE82FF", text: "#fff" },
  { bg: "#FF4B4B", text: "#fff" },
  { bg: "#FFC800", text: "#3C3C3C" },
  { bg: "#1899D6", text: "#fff" },
  { bg: "#89E219", text: "#3C3C3C" },
]

interface NodePosition {
  x: number
  y: number
  radius: number
  topic: Topic
  color: typeof NODE_COLORS[0]
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function computeLayout(topics: Topic[], width: number, height: number): NodePosition[] {
  if (topics.length === 0) return []

  const nodes: NodePosition[] = []
  const padding = 70
  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2

  const minRadius = 32
  const maxRadius = 52

  // Calculate node sizes based on topic duration
  const durations = topics.map(t => (t.endTime || 0) - (t.startTime || 0))
  const maxDuration = Math.max(...durations, 1)

  // Place nodes using a force-relaxed grid with seeded randomness for determinism
  const cols = Math.ceil(Math.sqrt(topics.length * (usableWidth / usableHeight)))
  const rows = Math.ceil(topics.length / cols)
  const cellW = usableWidth / cols
  const cellH = usableHeight / rows

  topics.forEach((topic, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const durationRatio = durations[i] / maxDuration
    const radius = minRadius + (maxRadius - minRadius) * Math.max(durationRatio, 0.4)

    // Deterministic scattered position within grid cell
    const jitterX = (seededRandom(i * 7 + 3) - 0.5) * cellW * 0.5
    const jitterY = (seededRandom(i * 13 + 7) - 0.5) * cellH * 0.4

    const x = padding + cellW * (col + 0.5) + jitterX
    const y = padding + cellH * (row + 0.5) + jitterY

    nodes.push({
      x: Math.max(padding + radius, Math.min(width - padding - radius, x)),
      y: Math.max(padding + radius, Math.min(height - padding - radius, y)),
      radius,
      topic,
      color: NODE_COLORS[i % NODE_COLORS.length]
    })
  })

  return nodes
}

export function KnowledgeMap({ topics, connections, videoId, jobId }: KnowledgeMapProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 750, height: 500 })
  const chatEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 480)
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const nodes = useMemo(
    () => computeLayout(topics, dimensions.width, dimensions.height),
    [topics, dimensions.width, dimensions.height]
  )

  const getNodeById = (id: string) => nodes.find(n => n.topic.id === id)

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
    <div className="flex h-full gap-4">
      {/* Map Area */}
      <div className={`${selectedTopic ? 'w-3/5' : 'w-full'} transition-all duration-300`}>
        <div ref={containerRef} className="w-full h-[500px] card-duo overflow-hidden relative bg-gradient-to-br from-white to-duo-surface/50">
          {/* Header badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-duo-border shadow-sm">
            <Compass className="w-4 h-4 text-duo-purple" />
            <span className="text-xs font-bold text-duo-text-muted uppercase tracking-wider">Knowledge Map</span>
          </div>

          <svg
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="w-full h-full"
            style={{ minHeight: 480 }}
          >
            {/* Edges */}
            {connections.map((conn, i) => {
              const fromNode = getNodeById(conn.from)
              const toNode = getNodeById(conn.to)
              if (!fromNode || !toNode) return null

              const isSelectedEdge =
                selectedTopic?.id === conn.from || selectedTopic?.id === conn.to

              // Curved path with slight offset for visual interest
              const midX = (fromNode.x + toNode.x) / 2
              const midY = (fromNode.y + toNode.y) / 2
              const dx = toNode.x - fromNode.x
              const dy = toNode.y - fromNode.y
              const offset = 20 + (i % 3) * 10
              const cpX = midX + (dy / Math.hypot(dx, dy)) * offset * (i % 2 === 0 ? 1 : -1)
              const cpY = midY - (dx / Math.hypot(dx, dy)) * offset * (i % 2 === 0 ? 1 : -1)

              return (
                <path
                  key={`edge-${i}`}
                  d={`M ${fromNode.x} ${fromNode.y} Q ${cpX} ${cpY} ${toNode.x} ${toNode.y}`}
                  fill="none"
                  stroke={isSelectedEdge ? fromNode.color.bg : fromNode.color.bg}
                  strokeWidth={isSelectedEdge ? 3 : 2}
                  strokeOpacity={isSelectedEdge ? 0.8 : 0.25}
                  className="transition-all duration-300"
                />
              )
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const isSelected = selectedTopic?.id === node.topic.id
              const displayRadius = isSelected ? node.radius + 6 : node.radius
              const title = node.topic.title
              const maxChars = Math.floor(node.radius / 4.5)
              const lines = title.length > maxChars
                ? [title.slice(0, maxChars), title.slice(maxChars, maxChars * 2).trim() + (title.length > maxChars * 2 ? "…" : "")]
                : [title]

              return (
                <g
                  key={node.topic.id || i}
                  className="cursor-pointer"
                  onClick={() => handleNodeClick(node.topic)}
                >
                  {/* Selection glow */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={displayRadius + 6}
                      fill="none"
                      stroke={node.color.bg}
                      strokeWidth="3"
                      strokeOpacity="0.4"
                      className="animate-pulse"
                    />
                  )}

                  {/* Shadow */}
                  <circle
                    cx={node.x}
                    cy={node.y + 3}
                    r={displayRadius}
                    fill="black"
                    fillOpacity="0.08"
                  />

                  {/* Main circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={displayRadius}
                    fill={node.color.bg}
                    className="transition-all duration-200"
                  />

                  {/* Label */}
                  {lines.map((line, lineIdx) => (
                    <text
                      key={lineIdx}
                      x={node.x}
                      y={node.y + (lineIdx - (lines.length - 1) / 2) * 13}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={node.color.text}
                      className="text-[11px] font-bold pointer-events-none select-none"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })}
          </svg>

          {/* Hint */}
          {!selectedTopic && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-duo-border shadow-sm">
              <span className="text-xs font-bold text-duo-text-muted">Click any topic to explore & chat</span>
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
                <span className="text-xs font-bold uppercase tracking-wider text-duo-text-muted">Topic Chat</span>
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
                {formatTime(selectedTopic.startTime)}
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
  )
}
