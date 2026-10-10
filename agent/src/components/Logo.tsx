// Pitchwala mark: a crowned "P" (royalty: the freelancer is the one who gets chosen) with a neon spark (Gen-Z).
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="Pitchwala">
      <rect x="2" y="6" width="60" height="56" rx="18" fill="#14110F" />
      {/* crown */}
      <path d="M14 20 L20 8 L27 17 L32 5 L37 17 L44 8 L50 20 Z" fill="#C8FF3D" stroke="#14110F" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="20" cy="8" r="2.6" fill="#D9381E" />
      <circle cx="32" cy="5" r="2.8" fill="#D9381E" />
      <circle cx="44" cy="8" r="2.6" fill="#D9381E" />
      {/* P */}
      <path d="M23 54 V25 H35.5 C42.5 25 46 29 46 35 C46 41 42.5 45 35.5 45 H30.5 V54 Z M30.5 31.5 V38.5 H35 C37.6 38.5 38.8 37.2 38.8 35 C38.8 32.8 37.6 31.5 35 31.5 Z" fill="#FAF8F4" />
      {/* spark */}
      <path d="M52 40 l2.2 4.6 4.8 1.4 -4.8 1.4 -2.2 4.6 -2.2 -4.6 -4.8 -1.4 4.8 -1.4 Z" fill="#D9381E" />
    </svg>
  );
}

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={30} className="floaty" />
      <span className={`font-display text-xl font-extrabold tracking-tight ${dark ? "text-paper" : "text-ink"}`}>
        Pitch<span className="text-chilli">wala</span>
      </span>
    </span>
  );
}
