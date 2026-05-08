"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { FoxMascot } from "./fox-mascot"
import { chatWithTopic } from "@/lib/api"
import { Send, X, Play, Loader2, MessageCircle } from "lucide-react"

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

const LINE_COLORS = {
  main: "#1CB0F6",
  branch1: "#FF4B4B",
  branch2: "#58CC02",
  branch3: "#FF9600",
  branch4: "#CE82FF",
  branch5: "#FFC800",
}

const BRANCH_COLOR_ARRAY = [
  LINE_COLORS.branch1,
  LINE_COLORS.branch2,
  LINE_COLORS.branch3,
  LINE_COLORS.branch4,
  LINE_COLORS.branch5,
]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function KnowledgeMap({ topics, connections, videoId, jobId }: KnowledgeMapProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => a.startTime - b.startTime)
  }, [topics])

  const topicIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    sortedTopics.forEach((topic, index) => map.set(topic.id, index))
    return map
  }, [sortedTopics])

  const selectedConnections = useMemo(() => {
    if (!selectedTopic) return new Set<number>()
    const indices = new Set<number>()
    connections.forEach((conn, idx) => {
      if (conn.from === selectedTopic.id || conn.to === selectedTopic.id) {
        indices.add(idx)
      }
    })
    return indices
  }, [selectedTopic, connections])

  // Layout
  const padding = { left: 120, right: 120, top: 140, bottom: 80 }
  const stationSpacing = 140
  const svgWidth = Math.max(800, padding.left + padding.right + (sortedTopics.length - 1) * stationSpacing)
  const svgHeight = 460
  const mainLineY = svgHeight / 2 + 20

  const getStationX = (index: number) => padding.left + index * stationSpacing

  const handleStationClick = (topic: Topic) => {
    if (selectedTopic?.id === topic.id) {
      setSelectedTopic(null)
    } else {
      setSelectedTopic(topic)
      setChatMessages([])
      setChatInput("")
    }
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

  // Generate branch paths with 45-degree angles
  const generateBranchPath = (fromIdx: number, toIdx: number, branchIndex: number): string => {
    const x1 = getStationX(fromIdx)
    const x2 = getStationX(toIdx)
    const isAbove = branchIndex % 2 === 0
    const layerOffset = Math.floor(branchIndex / 2) + 1
    const branchHeight = 50 + layerOffset * 30
    const branchY = isAbove ? mainLineY - branchHeight : mainLineY + branchHeight
    const offset45 = branchHeight

    return `M ${x1} ${mainLineY} L ${x1 + offset45} ${branchY} L ${x2 - offset45} ${branchY} L ${x2} ${mainLineY}`
  }

  const branchConnections = useMemo(() => {
    return connections
      .map((conn, originalIndex) => {
        const fromIdx = topicIndexMap.get(conn.from)
        const toIdx = topicIndexMap.get(conn.to)
        if (fromIdx === undefined || toIdx === undefined) return null
        if (Math.abs(fromIdx - toIdx) <= 1) return null
        return {
          ...conn,
          fromIdx: Math.min(fromIdx, toIdx),
          toIdx: Math.max(fromIdx, toIdx),
          originalIndex,
        }
      })
      .filter(Boolean) as Array<{
      from: string; to: string; relationship: string
      fromIdx: number; toIdx: number; originalIndex: number
    }>
  }, [connections, topicIndexMap])

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
    <div className="flex gap-4 h-full">
      {/* Metro Map */}
      <div className={`${selectedTopic ? 'w-3/5' : 'w-full'} transition-all duration-300`}>
        <div className="card-duo overflow-auto bg-white min-h-[460px]">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="min-w-full"
          >
            {/* Legend */}
            <g transform="translate(20, 16)">
              <rect
                x="0" y="0"
                width="150"
                height={34 + branchConnections.length * 22 + 8}
                rx="10"
                fill="white"
                stroke="#E5E5E5"
                strokeWidth="1.5"
              />
              <text x="12" y="22" fontSize="11" fontWeight="800" fill="#3C3C3C" letterSpacing="0.5">
                LECTURE ROUTE
              </text>
              <g transform="translate(12, 34)">
                <line x1="0" y1="5" x2="20" y2="5" stroke={LINE_COLORS.main} strokeWidth="6" strokeLinecap="round" />
                <text x="28" y="9" fontSize="10" fontWeight="600" fill="#777777">Main Flow</text>
              </g>
              {branchConnections.map((branch, idx) => (
                <g key={branch.originalIndex} transform={`translate(12, ${56 + idx * 22})`}>
                  <line
                    x1="0" y1="5" x2="20" y2="5"
                    stroke={BRANCH_COLOR_ARRAY[idx % BRANCH_COLOR_ARRAY.length]}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <text x="28" y="9" fontSize="10" fontWeight="600" fill="#777777">
                    {branch.relationship.length > 14
                      ? branch.relationship.slice(0, 12) + "…"
                      : branch.relationship}
                  </text>
                </g>
              ))}
            </g>

            {/* Branch lines */}
            {branchConnections.map((branch, idx) => {
              const isHighlighted = selectedConnections.has(branch.originalIndex)
              return (
                <path
                  key={`branch-${branch.originalIndex}`}
                  d={generateBranchPath(branch.fromIdx, branch.toIdx, idx)}
                  stroke={BRANCH_COLOR_ARRAY[idx % BRANCH_COLOR_ARRAY.length]}
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={selectedTopic ? (isHighlighted ? 1 : 0.25) : 0.6}
                  className="transition-opacity duration-200"
                />
              )
            })}

            {/* Main line */}
            <line
              x1={padding.left - 20}
              y1={mainLineY}
              x2={getStationX(sortedTopics.length - 1) + 20}
              y2={mainLineY}
              stroke={LINE_COLORS.main}
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* End caps */}
            <circle cx={padding.left - 26} cy={mainLineY} r="6" fill={LINE_COLORS.main} />
            <circle cx={getStationX(sortedTopics.length - 1) + 26} cy={mainLineY} r="6" fill={LINE_COLORS.main} />

            {/* Stations */}
            {sortedTopics.map((topic, index) => {
              const x = getStationX(index)
              const y = mainLineY
              const isSelected = selectedTopic?.id === topic.id
              const isHovered = hoveredId === topic.id
              const isConnected = selectedTopic !== null && connections.some(
                c => (c.from === selectedTopic.id && c.to === topic.id) || (c.to === selectedTopic.id && c.from === topic.id)
              )

              const scale = isHovered || isSelected ? 1.2 : 1
              const r = 12

              return (
                <g
                  key={topic.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => handleStationClick(topic)}
                  onMouseEnter={() => setHoveredId(topic.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  {(isSelected || isConnected) && (
                    <circle r={r + 8} fill="none" stroke={isSelected ? LINE_COLORS.main : "#94a3b8"} strokeWidth="3" opacity="0.4" className="animate-pulse" />
                  )}
                  <circle r={r * scale} fill="white" stroke={LINE_COLORS.main} strokeWidth="4" className="transition-all duration-150" />
                  {isSelected && <circle r={4} fill={LINE_COLORS.main} />}

                  {/* Label rotated 45° */}
                  <g transform={`translate(0, ${-r - 10}) rotate(-45)`}>
                    <text x="0" y="0" fontSize="11" fontWeight="700" fill={isSelected ? "#1CB0F6" : "#3C3C3C"} textAnchor="start" className="select-none">
                      {topic.title.length > 22 ? topic.title.slice(0, 20) + "…" : topic.title}
                    </text>
                  </g>

                  {/* Timestamp */}
                  <text x="0" y={r + 20} fontSize="10" fontWeight="600" fill="#9ca3af" textAnchor="middle" className="select-none">
                    {formatTime(topic.startTime)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Chat Panel */}
      {selectedTopic && (
        <div className="w-2/5 min-w-[300px] flex flex-col card-duo overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-duo-border bg-duo-surface/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-duo-green" />
                <span className="text-xs font-bold uppercase tracking-wider text-duo-text-muted">Station Chat</span>
              </div>
              <button onClick={() => setSelectedTopic(null)} className="p-1 rounded-full hover:bg-duo-border transition-colors">
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

          {/* Messages */}
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
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm font-semibold ${
                  msg.role === "user"
                    ? "bg-duo-green text-white rounded-br-sm"
                    : "bg-duo-surface text-duo-text rounded-bl-sm border border-duo-border"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 mt-1"><FoxMascot size="sm" expression="thinking" /></div>
                <div className="bg-duo-surface rounded-2xl rounded-bl-sm px-3 py-2 border border-duo-border">
                  <Loader2 className="w-4 h-4 animate-spin text-duo-text-muted" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
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
