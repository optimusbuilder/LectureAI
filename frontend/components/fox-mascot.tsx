"use client"

import { cn } from "@/lib/utils"

type FoxExpression = "happy" | "thinking" | "celebrating" | "studying"
type FoxSize = "sm" | "md" | "lg" | "xl"

interface FoxMascotProps {
  expression?: FoxExpression
  size?: FoxSize
  className?: string
  animate?: boolean
}

const sizeMap: Record<FoxSize, number> = {
  sm: 32,
  md: 64,
  lg: 128,
  xl: 200,
}

export function FoxMascot({ 
  expression = "happy", 
  size = "md",
  className,
  animate = true 
}: FoxMascotProps) {
  const pixelSize = sizeMap[size]
  
  const animationClass = animate ? {
    happy: "animate-float",
    thinking: "animate-think",
    celebrating: "animate-celebrate",
    studying: "",
  }[expression] : ""

  return (
    <div 
      className={cn(animationClass, className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={pixelSize}
        height={pixelSize}
      >
        {/* Left Ear */}
        <path
          d="M25 35 L15 10 L40 25 Z"
          fill="#FF9600"
          stroke="#E87600"
          strokeWidth="1"
        />
        <path
          d="M27 32 L20 15 L37 27 Z"
          fill="#FFB347"
        />
        
        {/* Right Ear */}
        <path
          d="M75 35 L85 10 L60 25 Z"
          fill="#FF9600"
          stroke="#E87600"
          strokeWidth="1"
        />
        <path
          d="M73 32 L80 15 L63 27 Z"
          fill="#FFB347"
        />
        
        {/* Head */}
        <ellipse
          cx="50"
          cy="50"
          rx="35"
          ry="32"
          fill="#FF9600"
        />
        
        {/* Face white patch */}
        <ellipse
          cx="50"
          cy="58"
          rx="22"
          ry="20"
          fill="#FFFFFF"
        />
        
        {/* Snout */}
        <ellipse
          cx="50"
          cy="62"
          rx="12"
          ry="10"
          fill="#FFFFFF"
        />
        
        {/* Nose */}
        <ellipse
          cx="50"
          cy="56"
          rx="5"
          ry="4"
          fill="#3C3C3C"
        />
        
        {/* Eyes based on expression */}
        {expression === "happy" && (
          <>
            {/* Happy eyes - normal round */}
            <circle cx="38" cy="45" r="6" fill="#FFFFFF" />
            <circle cx="62" cy="45" r="6" fill="#FFFFFF" />
            <circle cx="39" cy="45" r="4" fill="#3C3C3C" />
            <circle cx="63" cy="45" r="4" fill="#3C3C3C" />
            <circle cx="40" cy="44" r="1.5" fill="#FFFFFF" />
            <circle cx="64" cy="44" r="1.5" fill="#FFFFFF" />
          </>
        )}
        
        {expression === "thinking" && (
          <>
            {/* Thinking eyes - looking up */}
            <circle cx="38" cy="45" r="6" fill="#FFFFFF" />
            <circle cx="62" cy="45" r="6" fill="#FFFFFF" />
            <circle cx="38" cy="42" r="4" fill="#3C3C3C" />
            <circle cx="62" cy="42" r="4" fill="#3C3C3C" />
            <circle cx="39" cy="41" r="1.5" fill="#FFFFFF" />
            <circle cx="63" cy="41" r="1.5" fill="#FFFFFF" />
            {/* Thought bubble */}
            <circle cx="82" cy="20" r="3" fill="#E5E5E5" />
            <circle cx="88" cy="12" r="4" fill="#E5E5E5" />
            <circle cx="95" cy="5" r="5" fill="#E5E5E5" />
          </>
        )}
        
        {expression === "celebrating" && (
          <>
            {/* Celebrating eyes - happy closed arcs */}
            <path
              d="M32 45 Q38 40 44 45"
              stroke="#3C3C3C"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M56 45 Q62 40 68 45"
              stroke="#3C3C3C"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Sparkles */}
            <path d="M15 30 L18 25 L21 30 L18 35 Z" fill="#FFC800" />
            <path d="M85 30 L88 25 L91 30 L88 35 Z" fill="#FFC800" />
            <path d="M50 10 L53 5 L56 10 L53 15 Z" fill="#FFC800" />
            {/* Blush */}
            <ellipse cx="30" cy="55" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
            <ellipse cx="70" cy="55" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
          </>
        )}
        
        {expression === "studying" && (
          <>
            {/* Studying eyes - with glasses */}
            <circle cx="38" cy="45" r="6" fill="#FFFFFF" />
            <circle cx="62" cy="45" r="6" fill="#FFFFFF" />
            <circle cx="39" cy="45" r="4" fill="#3C3C3C" />
            <circle cx="63" cy="45" r="4" fill="#3C3C3C" />
            <circle cx="40" cy="44" r="1.5" fill="#FFFFFF" />
            <circle cx="64" cy="44" r="1.5" fill="#FFFFFF" />
            {/* Glasses */}
            <circle cx="38" cy="45" r="10" stroke="#3C3C3C" strokeWidth="2" fill="none" />
            <circle cx="62" cy="45" r="10" stroke="#3C3C3C" strokeWidth="2" fill="none" />
            <path d="M48 45 L52 45" stroke="#3C3C3C" strokeWidth="2" />
            <path d="M28 45 L20 42" stroke="#3C3C3C" strokeWidth="2" />
            <path d="M72 45 L80 42" stroke="#3C3C3C" strokeWidth="2" />
          </>
        )}
        
        {/* Mouth based on expression */}
        {expression === "happy" && (
          <path
            d="M44 65 Q50 72 56 65"
            stroke="#3C3C3C"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}
        
        {expression === "thinking" && (
          <ellipse cx="50" cy="67" rx="3" ry="2" fill="#3C3C3C" />
        )}
        
        {expression === "celebrating" && (
          <path
            d="M42 64 Q50 75 58 64"
            stroke="#3C3C3C"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}
        
        {expression === "studying" && (
          <path
            d="M46 66 L54 66"
            stroke="#3C3C3C"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        
        {/* Tail */}
        <path
          d="M10 80 Q0 60 15 50 Q25 55 20 70 Q15 85 10 80"
          fill="#FF9600"
        />
        <path
          d="M13 75 Q5 60 17 53 Q22 56 19 67 Q16 78 13 75"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  )
}
