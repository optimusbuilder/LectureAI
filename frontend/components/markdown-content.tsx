"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface MarkdownContentProps {
  children: string
  className?: string
}

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ className, ...props }) => (
            <a
              {...props}
              className={cn("font-extrabold text-duo-blue underline decoration-duo-blue/30 underline-offset-4", className)}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          strong: ({ className, ...props }) => (
            <strong {...props} className={cn("font-black text-duo-text", className)} />
          ),
          p: ({ className, ...props }) => (
            <p {...props} className={cn("mb-4 last:mb-0", className)} />
          ),
          ul: ({ className, ...props }) => (
            <ul {...props} className={cn("my-4 list-disc space-y-2 pl-6", className)} />
          ),
          ol: ({ className, ...props }) => (
            <ol {...props} className={cn("my-4 list-decimal space-y-2 pl-6", className)} />
          ),
          li: ({ className, ...props }) => (
            <li {...props} className={cn("pl-1", className)} />
          ),
          h1: ({ className, ...props }) => (
            <h1 {...props} className={cn("mb-4 text-3xl font-black text-duo-text", className)} />
          ),
          h2: ({ className, ...props }) => (
            <h2 {...props} className={cn("mb-3 mt-6 text-2xl font-black text-duo-text first:mt-0", className)} />
          ),
          h3: ({ className, ...props }) => (
            <h3 {...props} className={cn("mb-2 mt-5 text-xl font-black text-duo-text first:mt-0", className)} />
          ),
          code: ({ className, ...props }) => (
            <code {...props} className={cn("rounded-md bg-white px-1.5 py-0.5 font-mono text-sm text-duo-purple", className)} />
          ),
        }}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  )
}
