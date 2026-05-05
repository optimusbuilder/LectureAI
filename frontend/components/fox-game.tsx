"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface FoxGameProps {
  className?: string
}

export function FoxGame({ className }: FoxGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  
  const gameRef = useRef({
    fox: { x: 100, y: 150, vy: 0, width: 45, height: 45 },
    obstacles: [] as { x: number; y: number; type: "books" | "coffee" | "pencil" | "bird"; width: number; height: number; speedMultiplier?: number }[],
    groundY: 210,
    gravity: 0.7,
    jumpForce: -13,
    speed: 5,
    frameCount: 0,
    isJumping: false,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    groundOffset: 0
  })

  const drawFox = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    // Body
    ctx.fillStyle = "#FF9600"
    ctx.beginPath()
    ctx.ellipse(x + size/2, y + size/2 + 5, size/2 - 5, size/2 - 8, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Ears
    ctx.fillStyle = "#FF9600"
    ctx.beginPath()
    ctx.moveTo(x + 8, y + 15)
    ctx.lineTo(x + 5, y - 5)
    ctx.lineTo(x + 18, y + 10)
    ctx.fill()
    
    ctx.beginPath()
    ctx.moveTo(x + size - 8, y + 15)
    ctx.lineTo(x + size - 5, y - 5)
    ctx.lineTo(x + size - 18, y + 10)
    ctx.fill()
    
    // Inner ears
    ctx.fillStyle = "#FFB347"
    ctx.beginPath()
    ctx.moveTo(x + 10, y + 12)
    ctx.lineTo(x + 8, y + 2)
    ctx.lineTo(x + 16, y + 10)
    ctx.fill()
    
    ctx.beginPath()
    ctx.moveTo(x + size - 10, y + 12)
    ctx.lineTo(x + size - 8, y + 2)
    ctx.lineTo(x + size - 16, y + 10)
    ctx.fill()
    
    // Face white patch
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.ellipse(x + size/2, y + size/2 + 8, size/3, size/3 - 2, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Eyes
    ctx.fillStyle = "#3C3C3C"
    ctx.beginPath()
    ctx.arc(x + size/2 - 8, y + size/2 - 2, 3, 0, Math.PI * 2)
    ctx.arc(x + size/2 + 8, y + size/2 - 2, 3, 0, Math.PI * 2)
    ctx.fill()
    
    // Eye highlights
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.arc(x + size/2 - 7, y + size/2 - 3, 1, 0, Math.PI * 2)
    ctx.arc(x + size/2 + 9, y + size/2 - 3, 1, 0, Math.PI * 2)
    ctx.fill()
    
    // Nose
    ctx.fillStyle = "#3C3C3C"
    ctx.beginPath()
    ctx.ellipse(x + size/2, y + size/2 + 5, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Tail
    ctx.fillStyle = "#FF9600"
    ctx.beginPath()
    ctx.ellipse(x - 5, y + size/2 + 10, 8, 5, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.ellipse(x - 8, y + size/2 + 10, 4, 3, -0.5, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, type: string) => {
    if (type === "books") {
      // Stack of books
      const colors = ["#FF4B4B", "#1CB0F6", "#58CC02"]
      colors.forEach((color, i) => {
        ctx.fillStyle = color
        ctx.fillRect(x, y + i * 10, 25, 10)
        ctx.strokeStyle = "#3C3C3C"
        ctx.lineWidth = 1
        ctx.strokeRect(x, y + i * 10, 25, 10)
      })
    } else if (type === "coffee") {
      // Coffee cup
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 5, y + 30)
      ctx.lineTo(x + 25, y + 30)
      ctx.lineTo(x + 30, y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = "#3C3C3C"
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Coffee inside
      ctx.fillStyle = "#8B4513"
      ctx.beginPath()
      ctx.moveTo(x + 3, y + 5)
      ctx.lineTo(x + 7, y + 28)
      ctx.lineTo(x + 23, y + 28)
      ctx.lineTo(x + 27, y + 5)
      ctx.closePath()
      ctx.fill()
      
      // Handle
      ctx.strokeStyle = "#3C3C3C"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x + 32, y + 15, 8, -Math.PI/2, Math.PI/2)
      ctx.stroke()
    } else if (type === "pencil") {
      // Pencil
      ctx.fillStyle = "#FFC800"
      ctx.fillRect(x + 5, y, 10, 35)
      
      // Tip
      ctx.fillStyle = "#3C3C3C"
      ctx.beginPath()
      ctx.moveTo(x + 5, y + 35)
      ctx.lineTo(x + 10, y + 45)
      ctx.lineTo(x + 15, y + 35)
      ctx.closePath()
      ctx.fill()
      
      // Eraser
      ctx.fillStyle = "#FFB6C1"
      ctx.fillRect(x + 5, y, 10, 8)
      
      // Metal band
      ctx.fillStyle = "#C0C0C0"
    } else if (type === "bird") {
      // Procrastination Bird
      ctx.fillStyle = "#CE82FF"
      ctx.beginPath()
      ctx.ellipse(x + 15, y + 10, 15, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Wings
      const wingOffset = Math.sin(Date.now() / 100) * 10
      ctx.beginPath()
      ctx.moveTo(x + 15, y + 10)
      ctx.lineTo(x, y - wingOffset)
      ctx.lineTo(x + 10, y + 10)
      ctx.fill()
      
      // Eye
      ctx.fillStyle = "white"
      ctx.beginPath()
      ctx.arc(x + 22, y + 7, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "black"
      ctx.beginPath()
      ctx.arc(x + 24, y + 7, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const jump = useCallback(() => {
    const game = gameRef.current
    if (gameState === "idle") {
      setGameState("playing")
      setScore(0)
      game.obstacles = []
      game.fox.y = game.groundY - game.fox.height
      game.fox.vy = 0
      game.frameCount = 0
      game.speed = 4
    }
    
    if (gameState === "playing" && game.fox.y >= game.groundY - game.fox.height - 5) {
      game.fox.vy = game.jumpForce
      game.isJumping = true
    }
    
    if (gameState === "gameover") {
      setGameState("idle")
    }
  }, [gameState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        jump()
      }
    }

    const handleClick = () => jump()

    window.addEventListener("keydown", handleKeyDown)
    canvas.addEventListener("click", handleClick)

    let animationId: number

    const gameLoop = () => {
      const game = gameRef.current
      
      // Clear canvas
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw ground with texture
      ctx.strokeStyle = "#58CC02"
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, game.groundY)
      ctx.lineTo(canvas.width, game.groundY)
      ctx.stroke()
      
      // Moving ground details
      ctx.strokeStyle = "#E5E5E5"
      ctx.lineWidth = 2
      game.groundOffset = (game.groundOffset + game.speed) % 100
      for (let i = -game.groundOffset; i < canvas.width; i += 100) {
        ctx.beginPath()
        ctx.moveTo(i, game.groundY + 10)
        ctx.lineTo(i + 40, game.groundY + 10)
        ctx.stroke()
      }

      if (gameState === "idle") {
        // Draw idle state
        drawFox(ctx, game.fox.x, game.groundY - game.fox.height, game.fox.width)
        
        ctx.fillStyle = "#3C3C3C"
        ctx.font = "bold 16px Nunito, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("Press Space or Click to play!", canvas.width / 2, canvas.height / 2 - 20)
      } else if (gameState === "playing") {
        game.frameCount++
        
        // Apply gravity
        game.fox.vy += game.gravity
        game.fox.y += game.fox.vy
        
        // Ground collision
        if (game.fox.y >= game.groundY - game.fox.height) {
          game.fox.y = game.groundY - game.fox.height
          game.fox.vy = 0
          game.isJumping = false
        }
        
        // Spawn obstacles
        if (game.frameCount % 90 === 0) {
          const types: ("books" | "coffee" | "pencil" | "bird")[] = ["books", "coffee", "pencil", "bird"]
          const type = types[Math.floor(Math.random() * types.length)]
          const heights = { books: 35, coffee: 40, pencil: 50, bird: 25 }
          const widths = { books: 30, coffee: 35, pencil: 25, bird: 35 }
          
          let y = game.groundY - heights[type]
          if (type === "bird") {
            // Birds fly at different levels
            y = game.groundY - 60 - Math.random() * 60
          }
          
          game.obstacles.push({
            x: canvas.width,
            y,
            type,
            width: widths[type],
            height: heights[type],
            speedMultiplier: type === "bird" ? 1.2 : 1
          })
        }
        
        // Update and draw obstacles
        game.obstacles = game.obstacles.filter(obs => {
          obs.x -= game.speed * (obs.speedMultiplier || 1)
          
          // Collision detection
          const foxBox = {
            x: game.fox.x + 10,
            y: game.fox.y + 10,
            width: game.fox.width - 20,
            height: game.fox.height - 20,
          }
          const obsBox = {
            x: obs.x,
            y: obs.y,
            width: obs.width,
            height: obs.height,
          }
          
          if (
            foxBox.x < obsBox.x + obsBox.width &&
            foxBox.x + foxBox.width > obsBox.x &&
            foxBox.y < obsBox.y + obsBox.height &&
            foxBox.y + foxBox.height > obsBox.y
          ) {
            setGameState("gameover")
            setHighScore(prev => Math.max(prev, Math.floor(game.frameCount / 10)))
          }
          
          drawObstacle(ctx, obs.x, game.groundY - obs.height, obs.type)
          
          return obs.x > -50
        })
        
        // Draw fox
        drawFox(ctx, game.fox.x, game.fox.y, game.fox.width)
        
        // Update score
        setScore(Math.floor(game.frameCount / 10))
        
        // Draw score
        ctx.fillStyle = "#3C3C3C"
        ctx.font = "bold 20px Nunito, sans-serif"
        ctx.textAlign = "right"
        ctx.fillText(`${Math.floor(game.frameCount / 10)}`, canvas.width - 20, 30)
        
        // Increase difficulty
        if (game.frameCount % 500 === 0) {
          game.speed += 0.5
        }
      } else if (gameState === "gameover") {
        // Draw game over state
        drawFox(ctx, game.fox.x, game.fox.y, game.fox.width)
        
        // Draw remaining obstacles
        game.obstacles.forEach(obs => {
          drawObstacle(ctx, obs.x, game.groundY - obs.height, obs.type)
        })
        
        // Overlay
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        ctx.fillStyle = "#FF4B4B"
        ctx.font = "bold 24px Nunito, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30)
        
        ctx.fillStyle = "#58CC02"
        ctx.font = "bold 18px Nunito, sans-serif"
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2)
        
        ctx.fillStyle = "#777777"
        ctx.font = "600 14px Nunito, sans-serif"
        ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 25)
        ctx.fillText("Click or Space to try again", canvas.width / 2, canvas.height / 2 + 50)
      }

      animationId = requestAnimationFrame(gameLoop)
    }

    gameLoop()

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      canvas.removeEventListener("click", handleClick)
      cancelAnimationFrame(animationId)
    }
  }, [gameState, jump, drawFox, drawObstacle, score, highScore])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={250}
      className={`rounded-3xl border-4 border-duo-border cursor-pointer shadow-lg w-full max-w-3xl ${className}`}
    />
  )
}
