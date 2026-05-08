"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
  { bg: "#58CC02", border: "#458B00", light: "#58CC0220" },
  { bg: "#1CB0F6", border: "#1899D6", light: "#1CB0F620" },
  { bg: "#FF9600", border: "#E87600", light: "#FF960020" },
  { bg: "#CE82FF", border: "#A855F7", light: "#CE82FF20" },
  { bg: "#FFC800", border: "#E5B300", light: "#FFC80020" },
]

function computeLayout(topics: Topic[], width: number, height: number) {
  const nodes: { x: number; y: number; topic: Topic; color: typeof NODE_COLORS[0] }[] = []
  const count = topics.length
  if (count === 0) return nodes

  const centerX = width / 2
  const centerY = height / 2
  const radiusX = Math.min(width * 0.35, 300)
  const radiusY = Math.min(height * 0.35, 220)

  topics.forEach((topic, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    const x = centerX + radiusX * Math.cos(angle)
    const y = centerY + radiusY * Math.sin(angle)
    nodes.push({
      x,
      y,
      topic,
      color: NODE_COLORS[i % NODE_COLORS.length]
    })
  })

  return nodes
}

export function KnowledgeMap({ topics, connections, videoId, jobId }: KnowledgeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 700, height: 500 })
  const chatEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 450)
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const nodes = computeLayout(topics, dimensions.width, dimensions.height)

  const getNodeById = useCallback((id: string) => {
    return nodes.find(n => n.topic.id === id)
  }, [nodes])

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
      <div className={`flex-1 relative ${selectedTopic ? 'w-3/5' : 'w-full'} transition-all duration-300`}>
        <div ref={containerRef} className="w-full h-[500px] card-duo overflow-hidden relative">
          {/* Header */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-duo-border">
            <Compass className="w-4 h-4 text-duo-green" />
            <span className="text-xs font-bold text-duo-text-muted uppercase tracking-wider">Knowledge Map</span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="w-full h-full"
            style={{ minHeight: 450 }}
          >
            {/* Connections (edges) */}
            {connections.map((conn, i) => {
              const fromNode = getNodeById(conn.from)
              const toNode = getNodeById(conn.to)
              if (!fromNode || !toNode) return null

              const midX = (fromNode.x + toNode.x) / 2
              const midY = (fromNode.y + toNode.y) / 2
              const offsetX = (toNode.y - fromNode.y) * 0.15
              const offsetY = (fromNode.x - toNode.x) * 0.15

              return (
                <g key={`edge-${i}`}>
                  <path
                    d={`M ${fromNode.x} ${fromNode.y} Q ${midX + offsetX} ${midY + offsetY} ${toNode.x} ${toNode.y}`}
                    fill="none"
                    stroke="#E5E5E5"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-all duration-300"
                  />
                  {/* Relationship label */}
                  <text
                    x={midX + offsetX * 0.5}
                    y={midY + offsetY * 0.5}
                    textAnchor="middle"
                    className="fill-duo-text-muted text-[9px] font-semibold"
                    dy="-4"
                  >
                    {conn.relationship}
                  </text>
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const isSelected = selectedTopic?.id === node.topic.id
              const radius = isSelected ? 48 : 40

              return (
                <g
                  key={node.topic.id || i}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={() => handleNodeClick(node.topic)}
                >
                  {/* Glow ring for selected */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 8}
                      fill="none"
                      stroke={node.color.bg}
                      strokeWidth="3"
                      opacity="0.3"
                      className="animate-pulse"
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={isSelected ? node.color.bg : "white"}
                    stroke={node.color.bg}
                    strokeWidth={isSelected ? 4 : 3}
                    className="transition-all duration-200 hover:scale-110"
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />

                  {/* Topic number */}
                  <text
                    x={node.x}
                    y={node.y - 6}
                    textAnchor="middle"
                    className={`text-[11px] font-black ${isSelected ? 'fill-white' : 'fill-duo-text-muted'}`}
                  >
                    {formatTime(node.topic.startTime)}
                  </text>

                  {/* Topic title (truncated) */}
                  <text
                    x={node.x}
                    y={node.y + 10}
                    textAnchor="middle"
                    className={`text-[10px] font-bold ${isSelected ? 'fill-white' : 'fill-duo-text'}`}
                  >
                    {node.topic.title.length > 16
                      ? node.topic.title.slice(0, 14) + "…"
                      : node.topic.title}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Hint */}
          {!selectedTopic && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-duo-border">
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
            
            <div className="flex items-center gap-2 mt-2">
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
                <span key={i} className="px-2 py-0.5 rounded-full bg-duo-surface text-duo-text-muted text-[10px] font-bold">
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
