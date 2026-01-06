import { useEffect, useState } from "react"

interface MascotProps {
  className?: string
  size?: number
  width?: number
  height?: number
  animationClassName?: string
}

export function Mascot({
  className = "",
  size = 180,
  width,
  height,
  animationClassName,
}: MascotProps) {
  const [isBlinking, setIsBlinking] = useState(false)
  const resolvedWidth = width ?? size
  const resolvedHeight = height ?? size
  const resolvedAnimationClassName = animationClassName ?? "mascot-float"

  // Random blinking effect
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        blink()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: resolvedWidth, height: resolvedHeight }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${resolvedAnimationClassName} h-full w-full`}
      >
        {/* Glow effect behind */}
        <defs>
          <radialGradient id="mascotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(45, 212, 191, 0.3)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
          </radialGradient>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
          <linearGradient id="faceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle cx="100" cy="100" r="90" fill="url(#mascotGlow)" />

        {/* Antenna */}
        <line
          x1="100"
          y1="35"
          x2="100"
          y2="20"
          stroke="url(#accentGradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="100"
          cy="15"
          r="6"
          fill="url(#accentGradient)"
          className="mascot-pulse"
        />

        {/* Head/Body - rounded rectangle */}
        <rect
          x="45"
          y="40"
          width="110"
          height="120"
          rx="30"
          fill="url(#bodyGradient)"
          className="drop-shadow-lg"
        />

        {/* Face screen */}
        <rect
          x="55"
          y="55"
          width="90"
          height="70"
          rx="15"
          fill="url(#faceGradient)"
        />

        {/* Screen shine */}
        <rect
          x="60"
          y="60"
          width="30"
          height="8"
          rx="4"
          fill="rgba(255,255,255,0.1)"
        />

        {/* Eyes */}
        <g className={isBlinking ? "mascot-blink" : ""}>
          {/* Left eye */}
          <ellipse
            cx="78"
            cy="85"
            rx={isBlinking ? 8 : 8}
            ry={isBlinking ? 2 : 10}
            fill="#2dd4bf"
            className="transition-all duration-100"
          />
          {/* Left eye shine */}
          {!isBlinking && (
            <circle cx="81" cy="82" r="3" fill="rgba(255,255,255,0.6)" />
          )}

          {/* Right eye */}
          <ellipse
            cx="122"
            cy="85"
            rx={isBlinking ? 8 : 8}
            ry={isBlinking ? 2 : 10}
            fill="#2dd4bf"
            className="transition-all duration-100"
          />
          {/* Right eye shine */}
          {!isBlinking && (
            <circle cx="125" cy="82" r="3" fill="rgba(255,255,255,0.6)" />
          )}
        </g>

        {/* Happy mouth */}
        <path
          d="M 85 105 Q 100 118 115 105"
          stroke="#2dd4bf"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cheek blush */}
        <circle cx="65" cy="95" r="6" fill="rgba(217, 70, 239, 0.3)" />
        <circle cx="135" cy="95" r="6" fill="rgba(217, 70, 239, 0.3)" />

        {/* Side panels */}
        <rect
          x="35"
          y="70"
          width="8"
          height="40"
          rx="4"
          fill="url(#accentGradient)"
        />
        <rect
          x="157"
          y="70"
          width="8"
          height="40"
          rx="4"
          fill="url(#accentGradient)"
        />

        {/* Bottom details */}
        <rect
          x="70"
          y="140"
          width="15"
          height="8"
          rx="2"
          fill="rgba(255,255,255,0.2)"
        />
        <rect
          x="92"
          y="140"
          width="15"
          height="8"
          rx="2"
          fill="rgba(255,255,255,0.2)"
        />
        <rect
          x="115"
          y="140"
          width="15"
          height="8"
          rx="2"
          fill="rgba(255,255,255,0.2)"
        />

        {/* Sparkle decorations */}
        <g className="mascot-sparkle">
          <path
            d="M 170 50 L 173 55 L 178 55 L 174 59 L 176 64 L 170 60 L 164 64 L 166 59 L 162 55 L 167 55 Z"
            fill="#d946ef"
            opacity="0.8"
          />
        </g>
        <g className="mascot-sparkle-delayed">
          <path
            d="M 35 130 L 37 133 L 41 133 L 38 136 L 39 140 L 35 137 L 31 140 L 32 136 L 29 133 L 33 133 Z"
            fill="#2dd4bf"
            opacity="0.6"
          />
        </g>
      </svg>

      <style>{`
        .mascot-float {
          animation: mascotFloat 4s ease-in-out infinite;
        }

        .mascot-pulse {
          animation: mascotPulse 2s ease-in-out infinite;
        }

        .mascot-float-drift {
          animation: mascotDrift 4.8s ease-in-out infinite;
        }

        .mascot-sparkle {
          animation: mascotSparkle 3s ease-in-out infinite;
        }

        .mascot-sparkle-delayed {
          animation: mascotSparkle 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        @keyframes mascotFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes mascotPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }

        @keyframes mascotDrift {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
          }
          50% {
            transform: translate(14px, -12px) scale(1.08) rotate(-2deg);
            filter:
              drop-shadow(0 12px 24px rgba(139, 92, 246, 0.35))
              drop-shadow(0 0 18px rgba(192, 132, 252, 0.45));
          }
        }

        @keyframes mascotSparkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}
