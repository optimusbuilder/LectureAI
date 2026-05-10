"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { FoxMascot } from "./fox-mascot"
import { MarkdownContent } from "./markdown-content"
import { chatWithTopic } from "@/lib/api"
import { Send, X, Play, Loader2, MessageCircle, Route, Network, Clock3 } from "lucide-react"

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

const ROUTE_COLORS = ["#1CB0F6", "#58CC02", "#FF9600", "#CE82FF", "#FF4B4B", "#FFC800"]
const DISTRICT_COLORS = ["#DDF4C8", "#CFEAFF", "#FFE8B8", "#EFD9FF"]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function truncateLabel(label: string, max = 26) {
  return label.length > max ? `${label.slice(0, max - 1)}...` : label
}

function splitLabel(label: string, maxLineLength = 20) {
  const words = label.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  words.forEach(word => {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxLineLength && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  })

  if (current) lines.push(current)

  if (lines.length <= 2) return lines
  return [lines[0], truncateLabel(lines.slice(1).join(" "), maxLineLength + 2)]
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

  const connectedTopicIds = useMemo(() => {
    const ids = new Set<string>()
    connections.forEach(connection => {
      ids.add(connection.from)
      ids.add(connection.to)
    })
    return ids
  }, [connections])

  const mapData = useMemo(() => {
    const stationGap = 220
    const rowGap = 210
    const left = 170
    const top = 260
    const cols = Math.max(3, Math.min(4, Math.ceil(Math.sqrt(sortedTopics.length + 2))))
    const rows = Math.max(1, Math.ceil(sortedTopics.length / cols))

    const stations = sortedTopics.map((topic, index) => {
      const row = Math.floor(index / cols)
      const positionInRow = index % cols
      const isReverse = row % 2 === 1
      const col = isReverse ? cols - 1 - positionInRow : positionInRow
      const x = left + col * stationGap
      const y = top + row * rowGap
      const lineIndex = row % ROUTE_COLORS.length

      return {
        topic,
        index,
        row,
        col,
        x,
        y,
        lineIndex,
        color: ROUTE_COLORS[lineIndex],
        isHub: connectedTopicIds.has(topic.id)
      }
    })

    const width = Math.max(1040, left * 2 + (cols - 1) * stationGap + 300)
    const height = Math.max(660, top + (rows - 1) * rowGap + 230)
    return { stations, width, height, cols, rows, top, rowGap }
  }, [connectedTopicIds, sortedTopics])

  const stationById = useMemo(() => {
    const map = new Map<string, (typeof mapData.stations)[number]>()
    mapData.stations.forEach(station => map.set(station.topic.id, station))
    return map
  }, [mapData.stations])

  const flowSegments = useMemo(() => {
    const segments = []
    for (let i = 0; i < mapData.stations.length - 1; i++) {
      const current = mapData.stations[i]
      const next = mapData.stations[i + 1]
      const midX = (current.x + next.x) / 2
      const d = current.row === next.row
        ? `M ${current.x} ${current.y} L ${next.x} ${next.y}`
        : `M ${current.x} ${current.y} L ${midX} ${current.y} Q ${midX + 36} ${current.y} ${midX + 36} ${(current.y + next.y) / 2} Q ${midX + 36} ${next.y} ${next.x} ${next.y}`
      segments.push({ d, color: current.color, key: `${current.topic.id}-${next.topic.id}` })
    }
    return segments
  }, [mapData.stations])

  const relationshipLines = useMemo(() => {
    return connections
      .map((connection, index) => {
        const from = stationById.get(connection.from)
        const to = stationById.get(connection.to)
        if (!from || !to) return null

        const lift = 70 + (index % 3) * 28
        const controlY = Math.min(from.y, to.y) - lift
        const color = ROUTE_COLORS[(index + 2) % ROUTE_COLORS.length]
        const d = `M ${from.x} ${from.y} C ${from.x} ${controlY}, ${to.x} ${controlY}, ${to.x} ${to.y}`
        return { ...connection, index, d, color }
      })
      .filter(Boolean) as Array<TopicConnection & { index: number; d: string; color: string }>
  }, [connections, stationById])

  const selectedConnectionIds = useMemo(() => {
    if (!selectedTopic) return new Set<number>()
    const ids = new Set<number>()
    relationshipLines.forEach(line => {
      if (line.from === selectedTopic.id || line.to === selectedTopic.id) ids.add(line.index)
    })
    return ids
  }, [relationshipLines, selectedTopic])

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
    <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="card-duo overflow-hidden bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-duo-border bg-duo-surface/60 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Route className="w-5 h-5 text-duo-blue" />
              <h2 className="text-lg font-black text-duo-text">Lecture System Map</h2>
            </div>
            <p className="mt-1 text-xs font-bold text-duo-text-muted">
              Follow the main route, then use transfer lines to see how ideas connect.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-wider text-duo-text-muted">
            <span className="flex items-center gap-1.5"><Clock3 className="w-4 h-4" /> {sortedTopics.length} stops</span>
            <span className="flex items-center gap-1.5"><Network className="w-4 h-4" /> {connections.length} transfers</span>
          </div>
        </div>

        <div className="overflow-auto">
          <svg
            width={mapData.width}
            height={mapData.height}
            viewBox={`0 0 ${mapData.width} ${mapData.height}`}
            className="min-w-full bg-white"
          >
            <defs>
              <pattern id="map-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#F0F2F0" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width={mapData.width} height={mapData.height} fill="url(#map-grid)" />

            {Array.from({ length: mapData.rows }).map((_, row) => (
              <g key={`district-${row}`}>
                <rect
                  x={96 + (row % 2) * 52}
                  y={mapData.top - 82 + row * mapData.rowGap}
                  width={Math.min(700, mapData.width - 220)}
                  height="118"
                  rx="8"
                  fill={DISTRICT_COLORS[row % DISTRICT_COLORS.length]}
                  opacity="0.45"
                />
                <text
                  x={122 + (row % 2) * 52}
                  y={mapData.top - 52 + row * mapData.rowGap}
                  fontSize="12"
                  fontWeight="900"
                  fill="#7A8778"
                  letterSpacing="1"
                >
                  CONCEPT LINE {row + 1}
                </text>
              </g>
            ))}

            <g transform="translate(24, 24)">
              <rect width="190" height={62 + relationshipLines.slice(0, 4).length * 22} rx="14" fill="white" stroke="#E5E5E5" strokeWidth="2" />
              <text x="14" y="24" fontSize="12" fontWeight="900" fill="#3C3C3C" letterSpacing="0.8">MAP KEY</text>
              <line x1="14" y1="42" x2="42" y2="42" stroke={ROUTE_COLORS[0]} strokeWidth="8" strokeLinecap="round" />
              <text x="52" y="46" fontSize="11" fontWeight="700" fill="#777777">Lecture flow</text>
              {relationshipLines.slice(0, 4).map((line, index) => (
                <g key={`legend-${line.index}`} transform={`translate(14, ${62 + index * 22})`}>
                  <path d="M 0 6 C 8 -2, 20 -2, 28 6" fill="none" stroke={line.color} strokeWidth="4" strokeLinecap="round" strokeDasharray="5 5" />
                  <text x="38" y="10" fontSize="10" fontWeight="700" fill="#777777">
                    {truncateLabel(line.relationship, 18)}
                  </text>
                </g>
              ))}
            </g>

            {relationshipLines.map(line => {
              const isHighlighted = selectedConnectionIds.has(line.index)
              return (
                <path
                  key={`rel-${line.index}`}
                  d={line.d}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="9 10"
                  opacity={selectedTopic ? (isHighlighted ? 0.95 : 0.16) : 0.45}
                  className="transition-opacity duration-200"
                />
              )
            })}

            {flowSegments.map(segment => (
              <path
                key={segment.key}
                d={segment.d}
                fill="none"
                stroke={segment.color}
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            ))}

            {mapData.stations.map(station => {
              const isSelected = selectedTopic?.id === station.topic.id
              const isHovered = hoveredId === station.topic.id
              const isConnected = selectedTopic !== null && connections.some(
                connection => (
                  connection.from === selectedTopic.id && connection.to === station.topic.id
                ) || (
                  connection.to === selectedTopic.id && connection.from === station.topic.id
                )
              )
              const ring = station.isHub ? 19 : 14
              const labelLines = splitLabel(station.topic.title)
              const labelWidth = 172
              const labelHeight = labelLines.length > 1 ? 54 : 40
              const labelYOffset = station.row % 2 === 0 ? -86 : 52
              const labelXOffset = station.col === 0
                ? 20
                : station.col === mapData.cols - 1
                  ? -labelWidth - 20
                  : -labelWidth / 2
              const labelYOffsetText = labelLines.length > 1 ? 18 : 24

              return (
                <g
                  key={station.topic.id}
                  transform={`translate(${station.x}, ${station.y})`}
                  onClick={() => handleStationClick(station.topic)}
                  onMouseEnter={() => setHoveredId(station.topic.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  <line
                    x1="0"
                    y1={labelYOffset > 0 ? ring + 8 : -ring - 8}
                    x2={labelXOffset + labelWidth / 2}
                    y2={labelYOffset > 0 ? labelYOffset + 2 : labelYOffset + labelHeight - 2}
                    stroke="#D1D5DB"
                    strokeWidth="2"
                    strokeDasharray="3 4"
                    opacity="0.8"
                  />
                  <g transform={`translate(${labelXOffset}, ${labelYOffset})`}>
                    <rect
                      width={labelWidth}
                      height={labelHeight}
                      rx="10"
                      fill="white"
                      stroke={isSelected ? station.color : "#E5E5E5"}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      opacity="0.97"
                    />
                    {labelLines.map((line, index) => (
                      <text
                        key={line}
                        x="12"
                        y={labelYOffsetText + index * 15}
                        fontSize="11"
                        fontWeight="900"
                        fill={isSelected ? station.color : "#3C3C3C"}
                        className="select-none"
                      >
                        {line}
                      </text>
                    ))}
                    <text
                      x="12"
                      y={labelHeight - 8}
                      fontSize="9"
                      fontWeight="900"
                      fill="#8A8A8A"
                      className="select-none"
                    >
                      {formatTime(station.topic.startTime)}
                    </text>
                  </g>
                  {(isSelected || isHovered || isConnected) && (
                    <circle r={ring + 9} fill={station.color} opacity="0.16" className="animate-pulse" />
                  )}
                  <circle r={ring} fill="white" stroke="#111827" strokeWidth={station.isHub ? 4 : 3} />
                  <circle r={station.isHub ? 8 : 6} fill={isSelected ? station.color : "#FFFFFF"} stroke={station.color} strokeWidth="4" />
                  {station.isHub && <circle r="25" fill="none" stroke="#111827" strokeWidth="2" opacity="0.8" />}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <aside className="card-duo flex min-h-[560px] flex-col overflow-hidden">
        {selectedTopic ? (
          <>
            <div className="border-b border-duo-border bg-duo-surface/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-duo-green" />
                  <span className="text-xs font-black uppercase tracking-wider text-duo-text-muted">Station Chat</span>
                </div>
                <button onClick={() => setSelectedTopic(null)} className="p-1 rounded-full hover:bg-duo-border transition-colors">
                  <X className="w-4 h-4 text-duo-text-muted" />
                </button>
              </div>

              <h3 className="text-lg font-black leading-tight text-duo-text">{selectedTopic.title}</h3>
              <div className="mt-2 text-sm font-semibold leading-relaxed text-duo-text-muted">
                <MarkdownContent>{selectedTopic.summary}</MarkdownContent>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(selectedTopic.startTime)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-duo-green/10 text-duo-green text-xs font-black hover:bg-duo-green hover:text-white transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Watch at {formatTime(selectedTopic.startTime)}
                </a>
                {selectedTopic.keyTerms?.slice(0, 4).map((term, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-white text-duo-text-muted text-[10px] font-black border border-duo-border">
                    {term}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                  <FoxMascot size="md" expression="happy" />
                  <p className="text-duo-text-muted font-semibold text-sm mt-3">
                    Ask about this stop, its examples, or how it connects to nearby ideas.
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
                    <MarkdownContent>{msg.content}</MarkdownContent>
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

            <form onSubmit={handleSendMessage} className="border-t border-duo-border p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about this stop..."
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
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-8 text-center">
            <FoxMascot size="md" expression="studying" />
            <h3 className="text-xl font-black text-duo-text">Pick a station</h3>
            <p className="max-w-[260px] text-sm font-semibold leading-relaxed text-duo-text-muted">
              Click any stop to inspect the topic, jump to the lecture, and chat about that section.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
