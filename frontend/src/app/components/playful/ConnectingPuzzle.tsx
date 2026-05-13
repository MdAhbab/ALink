import * as React from "react";
import { motion, useAnimationFrame } from "motion/react";

type Node = {
  id: string;
  name: string;
  role: "student" | "alumni";
  color: string;
  avatar: string;
  x: number;  // 0..1
  y: number;  // 0..1
  vx: number;
  vy: number;
};

const seedNodes: Node[] = [
  { id: "a", name: "Maya",   role: "alumni",  color: "#7C5CFF", avatar: "Maya",   x: 0.18, y: 0.22, vx: 0.05, vy: 0.04 },
  { id: "b", name: "Jordan", role: "alumni",  color: "#9277FF", avatar: "Jordan", x: 0.80, y: 0.30, vx: -0.04, vy: 0.05 },
  { id: "c", name: "Sofia",  role: "student", color: "#F5B461", avatar: "Sofia",  x: 0.30, y: 0.78, vx: 0.06, vy: -0.05 },
  { id: "d", name: "Ravi",   role: "student", color: "#F5B461", avatar: "Ravi",   x: 0.72, y: 0.74, vx: -0.05, vy: -0.03 },
  { id: "e", name: "Aiko",   role: "alumni",  color: "#5DE0B0", avatar: "Aiko",   x: 0.50, y: 0.18, vx: 0.03, vy: 0.04 },
  { id: "f", name: "Lucas",  role: "student", color: "#FF6B8A", avatar: "Lucas",  x: 0.52, y: 0.85, vx: -0.03, vy: -0.04 },
];

// Pairs that "connect" — alumni ↔ student. Each has a phase to pulse the connection.
const pairs: Array<[string, string, number]> = [
  ["a", "c", 0],
  ["a", "f", 1.2],
  ["b", "d", 0.6],
  ["b", "c", 2.1],
  ["e", "d", 1.8],
  ["e", "f", 0.3],
];

export function ConnectingPuzzle({ className = "" }: { className?: string }) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ w: 600, h: 600 });
  const nodesRef = React.useRef<Node[]>(JSON.parse(JSON.stringify(seedNodes)));
  const [, force] = React.useReducer((x) => x + 1, 0);
  const tRef = React.useRef(0);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    const dt = Math.min(delta, 40) / 1000;
    tRef.current += dt;
    const ns = nodesRef.current;
    for (const n of ns) {
      n.x += n.vx * dt * 0.06;
      n.y += n.vy * dt * 0.06;
      // Bounce within padded bounds
      if (n.x < 0.08) { n.x = 0.08; n.vx = Math.abs(n.vx); }
      if (n.x > 0.92) { n.x = 0.92; n.vx = -Math.abs(n.vx); }
      if (n.y < 0.10) { n.y = 0.10; n.vy = Math.abs(n.vy); }
      if (n.y > 0.90) { n.y = 0.90; n.vy = -Math.abs(n.vy); }
    }
    
    // Collision avoidance so puzzle pieces don't overlap
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[i].x - ns[j].x;
        const dy = ns[i].y - ns[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 0.22;
        if (dist > 0 && dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          ns[i].x += nx * overlap * 0.5;
          ns[i].y += ny * overlap * 0.5;
          ns[j].x -= nx * overlap * 0.5;
          ns[j].y -= ny * overlap * 0.5;
          
          // Swap velocities for realistic bounce
          const tx = ns[i].vx;
          const ty = ns[i].vy;
          ns[i].vx = ns[j].vx;
          ns[i].vy = ns[j].vy;
          ns[j].vx = tx;
          ns[j].vy = ty;
        }
      }
    }
    force();
  });

  const { w, h } = size;
  const ns = nodesRef.current;
  const idx = Object.fromEntries(ns.map((n) => [n.id, n]));
  const t = tRef.current;

  return (
    <div ref={wrapRef} className={`relative aspect-square w-full max-w-[560px] ${className}`}>
      {/* SVG connectors layer */}
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="cpLink" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7C5CFF" />
            <stop offset="1" stopColor="#F5B461" />
          </linearGradient>
          <filter id="cpGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {pairs.map(([a, b, phase], i) => {
          const A = idx[a]; const B = idx[b];
          if (!A || !B) return null;
          const ax = A.x * w, ay = A.y * h, bx = B.x * w, by = B.y * h;
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          const curve = 30 * Math.sin(t * 0.6 + phase);
          // Pulse strength: connect/disconnect cycle
          const pulse = (Math.sin(t * 0.8 + phase) + 1) / 2; // 0..1
          const active = pulse > 0.35;
          const opacity = active ? 0.25 + pulse * 0.55 : 0.08;
          const dash = active ? "0" : "4 6";
          return (
            <g key={i}>
              <path
                d={`M ${ax},${ay} Q ${mx + curve},${my - curve} ${bx},${by}`}
                stroke="url(#cpLink)"
                strokeWidth={active ? 1.6 : 1}
                fill="none"
                opacity={opacity}
                strokeDasharray={dash}
                strokeLinecap="round"
                filter="url(#cpGlow)"
              />
              {active && (
                <circle r="3" fill="#fff" filter="url(#cpGlow)">
                  <animateMotion dur="2.4s" repeatCount="indefinite"
                    path={`M ${ax},${ay} Q ${mx + curve},${my - curve} ${bx},${by}`} />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating puzzle blocks (nodes) */}
      {ns.map((n) => {
        const left = n.x * w; const top = n.y * h;
        return <PuzzleBlock key={n.id} node={n} left={left} top={top} t={t} />;
      })}

      {/* Background sparkles */}
      <Sparkles count={18} />
    </div>
  );
}

function PuzzleBlock({ node, left, top, t }: { node: Node; left: number; top: number; t: number }) {
  const wobble = 4 * Math.sin(t * 1.4 + left * 0.01);
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform"
      style={{ left, top, rotate: wobble }}
      whileHover={{ scale: 1.06, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
    >
      <PuzzleSVG color={node.color} role={node.role} />
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <img
          src={`https://api.dicebear.com/9.x/notionists/svg?seed=${node.avatar}&backgroundColor=ffffff`}
          alt=""
          className="size-9 rounded-xl ring-2 ring-white shadow-md"
        />
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-wide text-white/85 bg-black/30 rounded-full px-2 py-0.5 backdrop-blur-sm">
        {node.role} · {node.name}
      </div>
    </motion.div>
  );
}

function PuzzleSVG({ color, role }: { color: string; role: "student" | "alumni" }) {
  // A rounded puzzle piece with a tab on the right/top and slot on the bottom/left depending on role.
  const isAlumni = role === "alumni";
  const tabTop = isAlumni ? "M 22 0 q 4 0 4 -4 q 0 -8 14 -8 q 14 0 14 8 q 0 4 4 4" : null;
  const slotBottom = !isAlumni ? "M 58 64 q -4 0 -4 4 q 0 8 -14 8 q -14 0 -14 -8 q 0 -4 -4 -4" : null;
  return (
    <svg width="80" height="76" viewBox="-4 -12 88 92" className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
      <defs>
        <linearGradient id={`pf-${color.slice(1)}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        d={[
          "M 4 0",
          isAlumni ? "L 22 0" : "L 58 0",
          tabTop ?? "L 58 0",
          "L 76 0",
          "Q 80 0 80 4",
          "L 80 60",
          "Q 80 64 76 64",
          slotBottom ?? "L 58 64",
          "L 4 64",
          "Q 0 64 0 60",
          "L 0 4",
          "Q 0 0 4 0 Z",
        ].filter(Boolean).join(" ")}
        fill={`url(#pf-${color.slice(1)})`}
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function Sparkles({ count = 12 }: { count?: number }) {
  const items = React.useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    d: 2 + Math.random() * 4,
    delay: Math.random() * 2,
  })), [count]);
  return (
    <>
      {items.map(s => (
        <motion.span key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.d, height: s.d }}
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}
