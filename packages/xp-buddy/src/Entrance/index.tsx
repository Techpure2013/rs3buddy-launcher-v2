// src/Entrance/index.tsx
import * as patchrs from "../util/patchrs_napi";
import React from "react";
import ReactDOM from "react-dom/client";
import { AtlasTracker } from "../reflect2d/reflect2d";
import { SpriteCache } from "../reflect2d/spritecache";
import { XpDetector, captureSprite, XpDropType } from "../reader/xpReader";
import { useXpChartOverlay } from "../overlay";
import OverlayPositionEditor from "../overlay/OverlayPositionEditor";
import { renderStream, RenderStreamObject } from "../util/renderStream";
import { scanSprites } from "../util/spriteScanner";
import { DebugZoneOverlay, DebugZone } from "../overlay/DebugZoneOverlay";

// RS3 tick = 0.6 seconds
const TICK_MS = 600;

// Rolling window for XP rate calculation (5 minutes)
const ROLLING_WINDOW_MS = 5 * 60 * 1000;

// Max drops to keep in history
const MAX_DROP_HISTORY = 100;

// Time bucket duration for stacked bar chart (1 minute)
const BUCKET_DURATION_MS = 60 * 1000;

// ============================================================================
// API SETUP
// ============================================================================
function getApi(): patchrs.Alt1GlClient {
  patchrs.hookFirstClient();
  return patchrs.native;
}

const Alt1ApiContext = React.createContext<patchrs.Alt1GlClient>(
  null as unknown as patchrs.Alt1GlClient
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function formatXp(xp: number): string {
  if (xp >= 1000000) return (xp / 1000000).toFixed(2) + "M";
  if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
  return xp % 1 === 0 ? xp.toFixed(0) : xp.toFixed(1);
}

function formatXpInt(xp: number): string {
  if (xp >= 1000000) return (xp / 1000000).toFixed(2) + "M";
  if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
  return xp.toFixed(0);
}

function calcXpPerHour(xp: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (xp / elapsedMs) * 3600000;
}

function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

function formatTimeShort(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function getDropTypeLabel(dropType: XpDropType): string {
  switch (dropType) {
    case XpDropType.SINGLE_SKILL: return "Single";
    case XpDropType.COMBAT_SPLIT: return "Combat";
    case XpDropType.CELEBRATION_LAMP: return "Lamp";
    case XpDropType.ALL_SKILLS_LAMP: return "All Skills";
    case XpDropType.UNKNOWN_MULTI: return "Multi";
    default: return "Unknown";
  }
}

// ============================================================================
// CHART COMPONENTS
// ============================================================================
type DataPoint = { time: number; value: number };

// Drop history entry for recent drops log
type DropHistoryEntry = {
  id: number;
  timestamp: number;
  xpValue: number;
  dropType: XpDropType;
  skills: string[];
  skillXp: { skill: string; xp: number }[];
  likelySource: string | null;
};

// Get device pixel ratio for crisp rendering
function getDPR(): number {
  return window.devicePixelRatio || 1;
}

// Setup canvas for high DPI rendering
function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  const dpr = getDPR();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);
  return dpr;
}

// Line chart for XP over time
function LineChart({
  data,
  width = 280,
  height = 80,
  color = "#00ff88",
  label,
  showRate = false,
}: {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
  showRate?: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Setup for crisp high-DPI rendering
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    setupHiDPICanvas(canvas, ctx, width, height);

    // Clear
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, width, height);

    // Get min/max values
    const values = data.map((d) => d.value);
    const minVal = showRate ? 0 : Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    // Draw grid lines
    ctx.strokeStyle = "#1a1a3a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const padding = 5;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    data.forEach((point, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - minVal) / range) * chartHeight;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fillStyle = color + "20";
    ctx.fill();

    // Draw label
    if (label) {
      ctx.fillStyle = "#888";
      ctx.font = "11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(label, 5, 13);
    }

    // Draw current value
    const current = data[data.length - 1]?.value ?? 0;
    ctx.fillStyle = color;
    ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(showRate ? formatXpInt(current) + "/hr" : formatXp(current), width - 5, 13);
  }, [data, width, height, color, label, showRate]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: "4px", display: "block", width, height }}
    />
  );
}

// Clean horizontal bar chart for skill comparison (like RuneScape leaderboards)
function SkillBarChart({
  skills,
  width = 300,
  height = 300,
  onColorChange,
}: {
  skills: { name: string; xp: number; color: string }[];
  width?: number;
  height?: number;
  onColorChange?: (skill: string, color: string) => void;
}) {
  const rowHeight = 32;

  if (skills.length === 0) {
    return (
      <div style={{
        width,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#444",
        fontSize: "12px",
      }}>
        No skill data yet
      </div>
    );
  }

  const maxXp = Math.max(...skills.map(s => s.xp));

  const handleColorChange = (skill: string, color: string) => {
    saveSkillColor(skill, color);
    onColorChange?.(skill, color);
  };

  return (
    <div style={{ width, maxHeight: height, overflowY: "auto" }}>
      {skills.map((skill, i) => {
        const barPercent = maxXp > 0 ? (skill.xp / maxXp) * 100 : 0;
        return (
          <div
            key={skill.name}
            style={{
              display: "flex",
              alignItems: "center",
              height: rowHeight,
              padding: "0 4px",
              backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
              borderRadius: "4px",
            }}
          >
            {/* Rank number */}
            <span style={{
              width: "20px",
              color: "#555",
              fontSize: "11px",
              textAlign: "center",
            }}>
              {i + 1}
            </span>

            {/* Clickable color indicator */}
            <SkillColorPicker
              skill={skill.name}
              color={skill.color}
              onColorChange={handleColorChange}
            />

            {/* Skill name */}
            <span style={{
              width: "80px",
              color: "#ccc",
              fontSize: "13px",
              fontWeight: 500,
            }}>
              {skill.name}
            </span>

            {/* Bar container */}
            <div style={{
              flex: 1,
              height: "8px",
              backgroundColor: "#1a1a2e",
              borderRadius: "4px",
              overflow: "hidden",
              marginRight: "10px",
            }}>
              <div style={{
                width: `${barPercent}%`,
                height: "100%",
                backgroundColor: skill.color,
                borderRadius: "4px",
                transition: "width 0.3s ease",
              }} />
            </div>

            {/* XP value */}
            <span style={{
              width: "70px",
              color: "#00ff88",
              fontSize: "13px",
              fontWeight: "bold",
              textAlign: "right",
            }}>
              {formatXpInt(skill.xp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Backwards compat alias
const MiniChart = LineChart;

// ============================================================================
// STACKED BAR CHART (RuneMetrics Style)
// ============================================================================
type TimeBucket = {
  bucketIndex: number; // Bucket number (1, 2, 3, etc)
  startTime: number;   // Start of bucket in ms
  skills: Record<string, number>; // XP per skill in this bucket
  total: number;
};

function StackedBarChart({
  buckets,
  skills,
  width = 320,
  height = 200,
  maxBuckets = 10,
}: {
  buckets: TimeBucket[];
  skills: { name: string; color: string; icon?: string | null }[];
  width?: number;
  height?: number;
  maxBuckets?: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Setup for crisp high-DPI rendering
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    setupHiDPICanvas(canvas, ctx, width, height);

    // Chart dimensions
    const leftPadding = 50;
    const rightPadding = 10;
    const topPadding = 30; // Space for legend
    const bottomPadding = 25;

    const chartWidth = width - leftPadding - rightPadding;
    const chartHeight = height - topPadding - bottomPadding;

    // Clear canvas
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, width, height);

    // Get visible buckets (last N)
    const visibleBuckets = buckets.slice(-maxBuckets);

    if (visibleBuckets.length === 0) {
      // No data yet message
      ctx.fillStyle = "#444";
      ctx.font = "12px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for XP data...", width / 2, height / 2);
      return;
    }

    // Find max total for Y-axis scale
    const maxTotal = Math.max(...visibleBuckets.map(b => b.total), 1000);

    // Round up to nice number for Y-axis
    const niceMax = (() => {
      if (maxTotal >= 1000000) return Math.ceil(maxTotal / 1000000) * 1000000;
      if (maxTotal >= 100000) return Math.ceil(maxTotal / 100000) * 100000;
      if (maxTotal >= 10000) return Math.ceil(maxTotal / 10000) * 10000;
      if (maxTotal >= 1000) return Math.ceil(maxTotal / 1000) * 1000;
      return Math.ceil(maxTotal / 100) * 100;
    })();

    // Draw Y-axis grid lines and labels
    const gridLines = 5;
    ctx.strokeStyle = "#1a1a3a";
    ctx.lineWidth = 1;
    ctx.font = "10px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = "#666";
    ctx.textAlign = "right";

    for (let i = 0; i <= gridLines; i++) {
      const y = topPadding + (chartHeight / gridLines) * i;
      const value = niceMax - (niceMax / gridLines) * i;

      // Grid line
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(width - rightPadding, y);
      ctx.stroke();

      // Y-axis label
      ctx.fillText(formatXpInt(value), leftPadding - 5, y + 4);
    }

    // Calculate bar dimensions
    const barCount = Math.max(visibleBuckets.length, 1);
    const barGap = 4;
    const barWidth = (chartWidth - barGap * (barCount + 1)) / barCount;

    // Draw bars
    visibleBuckets.forEach((bucket, barIndex) => {
      const barX = leftPadding + barGap + (barWidth + barGap) * barIndex;
      let stackY = topPadding + chartHeight; // Start from bottom

      // Draw stacked segments for each skill (in reverse order so first skill is at bottom)
      const orderedSkills = [...skills].reverse();
      for (const skill of orderedSkills) {
        const xp = bucket.skills[skill.name] || 0;
        if (xp <= 0) continue;

        const segmentHeight = (xp / niceMax) * chartHeight;
        stackY -= segmentHeight;

        // Draw segment
        ctx.fillStyle = skill.color;
        ctx.fillRect(barX, stackY, barWidth, segmentHeight);

        // Add subtle border between segments
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(barX, stackY, barWidth, segmentHeight);
      }

      // X-axis label (time in minutes)
      ctx.fillStyle = "#888";
      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      // Format time as M:SS (e.g., "0:00", "1:00", "2:30")
      const totalSec = Math.floor(bucket.startTime / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const timeLabel = `${min}:${sec.toString().padStart(2, '0')}`;
      ctx.fillText(
        timeLabel,
        barX + barWidth / 2,
        topPadding + chartHeight + 15
      );
    });

    // Draw legend at top
    const legendY = 12;
    let legendX = leftPadding;
    const boxSize = 10;
    const spacing = 8;

    ctx.font = "10px 'Segoe UI', Arial, sans-serif";
    for (const skill of skills.slice(0, 6)) { // Max 6 skills in legend
      // Color box
      ctx.fillStyle = skill.color;
      ctx.fillRect(legendX, legendY - boxSize + 2, boxSize, boxSize);

      // Label
      ctx.fillStyle = "#aaa";
      ctx.textAlign = "left";
      const labelWidth = ctx.measureText(skill.name).width;
      ctx.fillText(skill.name, legendX + boxSize + 3, legendY);

      legendX += boxSize + 3 + labelWidth + spacing;
      if (legendX > width - 50) break; // Stop if running out of space
    }

    // Y-axis label
    ctx.save();
    ctx.fillStyle = "#666";
    ctx.font = "10px 'Segoe UI', Arial, sans-serif";
    ctx.translate(12, topPadding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("XP gained", 0, 0);
    ctx.restore();

  }, [buckets, skills, width, height, maxBuckets]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: "4px", display: "block", width, height }}
    />
  );
}

// Multi-line chart for multiple skills over time (with dots at data points)
type SkillSeries = {
  name: string;
  color: string;
  data: DataPoint[]; // XP/hr values over time
};

function StackedAreaChart({
  series,
  width = 320,
  height = 180,
  showLegend = true,
  maxDataPoints = 50, // Limit data points to prevent memory issues
}: {
  series: SkillSeries[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  maxDataPoints?: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || series.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Setup for crisp high-DPI rendering
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    setupHiDPICanvas(canvas, ctx, width, height);

    // Chart dimensions - adjusted for larger chart sizes
    const leftPadding = 50;
    const rightPadding = 15;
    const topPadding = 12;
    const bottomPadding = 28;
    const legendHeight = showLegend ? 28 : 0;

    const chartWidth = width - leftPadding - rightPadding;
    const chartHeight = height - topPadding - bottomPadding - legendHeight;

    // Clear canvas with dark background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    // Get only the last N data points from each series to limit memory
    const limitedSeries = series.map(s => ({
      ...s,
      data: s.data.slice(-maxDataPoints)
    }));

    // Find all unique time points
    const allTimes = new Set<number>();
    limitedSeries.forEach(s => s.data.forEach(d => allTimes.add(d.time)));
    let sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

    // Further limit if still too many points
    if (sortedTimes.length > maxDataPoints) {
      const step = Math.ceil(sortedTimes.length / maxDataPoints);
      sortedTimes = sortedTimes.filter((_, i) => i % step === 0 || i === sortedTimes.length - 1);
    }

    if (sortedTimes.length < 2) return;

    // Find max value across all series (not stacked - individual max)
    let maxValue = 1000;
    for (const s of limitedSeries) {
      for (const d of s.data) {
        if (d.value > maxValue) maxValue = d.value;
      }
    }
    // Round up to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    maxValue = Math.ceil(maxValue / magnitude) * magnitude;

    const minTime = sortedTimes[0];
    const maxTime = sortedTimes[sortedTimes.length - 1];
    const timeRange = maxTime - minTime || 1;

    // Draw horizontal grid lines
    ctx.strokeStyle = "#2a2a4a";
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = topPadding + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(width - rightPadding, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxValue - (maxValue / gridLines) * i;
      ctx.fillStyle = "#888";
      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(formatXpInt(value), leftPadding - 5, y + 4);
    }

    // Draw each series as a line with dots (not stacked)
    for (let seriesIdx = 0; seriesIdx < limitedSeries.length; seriesIdx++) {
      const s = limitedSeries[seriesIdx];
      if (s.data.length < 2) continue;

      const color = s.color;
      const points: { x: number; y: number }[] = [];

      // Build array of points for this series
      for (const d of s.data) {
        const x = leftPadding + ((d.time - minTime) / timeRange) * chartWidth;
        const y = topPadding + chartHeight - (d.value / maxValue) * chartHeight;
        points.push({ x, y });
      }

      // Draw the line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      for (let i = 0; i < points.length; i++) {
        if (i === 0) {
          ctx.moveTo(points[i].x, points[i].y);
        } else {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      ctx.stroke();

      // Draw dots at each data point
      for (const pt of points) {
        // Outer dot (filled circle)
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Inner dot (darker center for depth)
        ctx.beginPath();
        ctx.fillStyle = "#1a1a2e";
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw X-axis time labels - evenly spaced based on chart width
    ctx.fillStyle = "#888";
    ctx.font = "10px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";

    // Calculate optimal number of labels based on chart width (min ~50px between labels)
    const numLabels = Math.min(Math.max(3, Math.floor(chartWidth / 55)), sortedTimes.length);
    for (let i = 0; i < numLabels; i++) {
      const idx = Math.floor((i / (numLabels - 1)) * (sortedTimes.length - 1));
      const time = sortedTimes[idx];
      const x = leftPadding + ((time - minTime) / timeRange) * chartWidth;
      const y = topPadding + chartHeight + 15;

      // Format time as minutes:seconds if over 1 minute, otherwise just seconds
      const totalSec = Math.floor(time / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const label = min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
      ctx.fillText(label, x, y);
    }

    // Draw legend
    if (showLegend && series.length > 0) {
      const legendY = height - legendHeight + 15;
      let legendX = leftPadding;
      const boxSize = 10;
      const spacing = 12;

      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      for (const s of series) {
        // Color box
        ctx.fillStyle = s.color;
        ctx.fillRect(legendX, legendY - boxSize, boxSize, boxSize);

        // Label
        ctx.fillStyle = "#aaa";
        ctx.textAlign = "left";
        const labelWidth = ctx.measureText(s.name).width;
        ctx.fillText(s.name, legendX + boxSize + 4, legendY - 1);

        legendX += boxSize + 4 + labelWidth + spacing;
      }
    }

    // Y-axis label
    ctx.save();
    ctx.fillStyle = "#666";
    ctx.font = "10px 'Segoe UI', Arial, sans-serif";
    ctx.translate(12, topPadding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("XP/h", 0, 0);
    ctx.restore();
  }, [series, width, height, showLegend, maxDataPoints]);

  if (series.length === 0 || series.every(s => s.data.length < 2)) {
    return (
      <div style={{
        width,
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#444",
        fontSize: "12px",
        backgroundColor: "#0a0a1a",
        borderRadius: "4px",
      }}>
        Not enough data yet
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: "4px", display: "block", width, height }}
    />
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#0d0d1a",
    color: "#eaeaea",
    padding: "12px",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    minHeight: "100vh",
    minWidth: "400px",
  },
  header: {
    color: "#00d4ff",
    marginBottom: "12px",
    fontSize: "20px",
    borderBottom: "1px solid #00d4ff",
    paddingBottom: "6px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#12122a",
    borderRadius: "6px",
    padding: "10px",
    marginBottom: "10px",
    border: "1px solid #1a1a3a",
    overflow: "visible",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  skillRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 0",
    borderBottom: "1px solid #1a1a3a",
    cursor: "pointer",
  },
  skillIcon: {
    width: "20px",
    height: "20px",
    imageRendering: "pixelated" as const,
  },
  xpValue: {
    color: "#00ff88",
    fontWeight: "bold",
    fontSize: "16px",
  },
  xpRate: {
    color: "#ffaa00",
    fontSize: "12px",
  },
  rollingRate: {
    color: "#00d4ff",
    fontSize: "12px",
  },
  label: {
    color: "#666",
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  button: {
    backgroundColor: "#1a1a3a",
    color: "#00d4ff",
    border: "1px solid #00d4ff",
    padding: "4px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  tabButton: {
    backgroundColor: "transparent",
    color: "#666",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px 4px 0 0",
    cursor: "pointer",
    fontSize: "12px",
  },
  tabButtonActive: {
    backgroundColor: "#1a1a3a",
    color: "#00d4ff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px 4px 0 0",
    cursor: "pointer",
    fontSize: "12px",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
  },
  dropRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 0",
    borderBottom: "1px solid #1a1a2a",
    fontSize: "11px",
  },
  dropXp: {
    color: "#00ff88",
    fontWeight: "bold",
    minWidth: "50px",
  },
  dropSkills: {
    color: "#888",
    flex: 1,
  },
  dropSource: {
    color: "#ffaa00",
    fontSize: "10px",
  },
  dropType: {
    color: "#666",
    fontSize: "9px",
    padding: "1px 4px",
    backgroundColor: "#1a1a3a",
    borderRadius: "2px",
  },
  dropTime: {
    color: "#444",
    fontSize: "9px",
    minWidth: "45px",
    textAlign: "right" as const,
  },
};

// ============================================================================
// SKILL DATA TYPE
// ============================================================================
type SkillXpData = {
  total: number;
  drops: number;
  history: DataPoint[]; // Time-series data for graphs
  rateHistory: DataPoint[]; // XP/hr over time
  recentXp: { time: number; xp: number }[]; // Recent drops for rolling rate
  icon: string | null;
};

// Calculate rolling XP/hr from recent drops within window
function calcRollingXpPerHour(recentXp: { time: number; xp: number }[], windowMs: number): number {
  const now = Date.now();
  const cutoff = now - windowMs;
  const relevant = recentXp.filter(d => d.time >= cutoff);
  if (relevant.length === 0) return 0;

  const totalXp = relevant.reduce((sum, d) => sum + d.xp, 0);
  const elapsed = now - Math.min(...relevant.map(d => d.time));
  if (elapsed < 1000) return 0; // Not enough time

  return (totalXp / elapsed) * 3600000;
}

// ============================================================================
// MAIN APP
// ============================================================================
function App() {
  const glapi = React.useContext(Alt1ApiContext);

  const [isLoading, setIsLoading] = React.useState(true);
  const [loadingStatus, setLoadingStatus] = React.useState("Initializing...");
  const [startTime, setStartTime] = React.useState<number>(Date.now());
  const [skillXp, setSkillXp] = React.useState<Record<string, SkillXpData>>({});
  const [totalHistory, setTotalHistory] = React.useState<DataPoint[]>([{ time: 0, value: 0 }]);
  const [recentTotalXp, setRecentTotalXp] = React.useState<{ time: number; xp: number }[]>([]);
  const [dropHistory, setDropHistory] = React.useState<DropHistoryEntry[]>([]);
  const [totalXp, setTotalXp] = React.useState(0);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [actionCount, setActionCount] = React.useState(0);
  const [expandedSkill, setExpandedSkill] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"overview" | "skills" | "drops">("overview");
  // Sparkline stores timestamped rate data for the full session
  const [sparklineHistory, setSparklineHistory] = React.useState<{ time: number; rate: number }[]>([]);
  const [colorVersion, setColorVersion] = React.useState(0); // Triggers re-render on color change
  const [xpBuckets, setXpBuckets] = React.useState<TimeBucket[]>([]); // Time buckets for stacked bar chart
  const dropIdRef = React.useRef(0);
  const startTimeRef = React.useRef(startTime);
  const rollingRateRef = React.useRef(0); // Tracks current rolling XP/hr for sparkline

  // Debug zone overlay
  const debugZoneRef = React.useRef<DebugZoneOverlay | null>(null);
  const [debugZoneVisible, setDebugZoneVisible] = React.useState(false);
  const [debugZone, setDebugZone] = React.useState<DebugZone>({ x: 0, y: 0, width: 600, height: 600 });
  const detectorRef = React.useRef<XpDetector | null>(null);

  // Keep startTimeRef in sync with startTime state
  React.useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  // Update rolling rate ref whenever recentTotalXp changes
  React.useEffect(() => {
    const now = Date.now();
    const cutoff = now - ROLLING_WINDOW_MS;
    const relevant = recentTotalXp.filter(d => d.time >= cutoff);
    if (relevant.length > 0) {
      const totalXpInWindow = relevant.reduce((sum, d) => sum + d.xp, 0);
      const windowElapsed = now - Math.min(...relevant.map(d => d.time));
      if (windowElapsed >= 1000) {
        rollingRateRef.current = (totalXpInWindow / windowElapsed) * 3600000;
      }
    } else {
      rollingRateRef.current = 0;
    }
  }, [recentTotalXp]);

  // Update elapsed time, sparkline, and clean up stale data every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedMs(elapsed);

      // Update sparkline history with ROLLING rate (shows actual activity, not flattening average)
      // Use the rollingRateRef which is updated whenever XP drops occur
      if (elapsed > 0) {
        const rollingRate = rollingRateRef.current;
        setSparklineHistory(prev => {
          const newPoint = { time: elapsed, rate: rollingRate };
          const newHistory = [...prev, newPoint];
          // Keep max 600 points (10 mins at 1/sec), downsample if needed
          if (newHistory.length > 600) {
            // Downsample by keeping every other point but preserve peaks
            const downsampled: typeof newHistory = [];
            for (let i = 0; i < newHistory.length; i += 2) {
              // Keep the higher value between pairs to preserve spikes
              if (i + 1 < newHistory.length) {
                downsampled.push(newHistory[i].rate > newHistory[i + 1].rate ? newHistory[i] : newHistory[i + 1]);
              } else {
                downsampled.push(newHistory[i]);
              }
            }
            return downsampled;
          }
          return newHistory;
        });
      }

      // Clean up stale recentTotalXp entries
      setRecentTotalXp((prev) => {
        const cutoff = now - ROLLING_WINDOW_MS;
        const filtered = prev.filter((d) => d.time >= cutoff);
        // Only update if something changed to avoid unnecessary re-renders
        return filtered.length === prev.length ? prev : filtered;
      });

      // Clean up stale per-skill recentXp entries (prevents memory leak)
      setSkillXp((prev) => {
        const cutoff = now - ROLLING_WINDOW_MS;
        let hasChanges = false;
        const updated: Record<string, SkillXpData> = {};

        for (const [skill, data] of Object.entries(prev)) {
          const filteredRecent = data.recentXp.filter((d) => d.time >= cutoff);
          if (filteredRecent.length !== data.recentXp.length) {
            hasChanges = true;
            updated[skill] = { ...data, recentXp: filteredRecent };
          } else {
            updated[skill] = data;
          }
        }

        return hasChanges ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Track total accumulated XP in a ref so it persists across renders
  // but can be reset without re-creating the stream
  const totalAccumRef = React.useRef(0);

  // Main render stream - uses renderStream helper for proper 1080p/4K UI handling
  // Only depends on glapi - doesn't restart on reset
  React.useEffect(() => {
    let uistream: RenderStreamObject | null = null;
    let detector: XpDetector | null = null;
    let isMounted = true;

    const init = async () => {
      setLoadingStatus("Loading sprite cache...");
      const spritecache = new SpriteCache();
      await spritecache.downloadCacheData();

      if (!isMounted) return;

      setLoadingStatus("Initializing atlas tracker...");
      const atlas = new AtlasTracker(spritecache);
      detector = new XpDetector(atlas);
      detectorRef.current = detector;

      if (!isMounted) return;

      setLoadingStatus("Connecting to RS3...");
      setIsLoading(false);

      console.log("[XP Init] Starting render stream...", { ready: glapi.getRsReady(), isMounted });

      if (!isMounted) return;

      // DETECTION: Tight recordRenderCalls loop (same as old 100%-accurate code).
      // Every frame gets REAL TextureSnapshots with capture() — sprite 9278 is recognized
      // by hash, font characters identified immediately. No calibration needed.
      uistream = renderStream(glapi, (renders: patchrs.RenderInvocation[]) => {
        if (renders.length === 0 || !detector || !isMounted) return;

        const result = detector.detect(renders);
        if (!result) return;

        console.log(`[XP Drop] ${result.xpValue} xp, text="${result.xpText}", skills=${result.skills.map(s=>s.label).join(',')}`);

        const { xpValue, skill, skillSprite, dropType, skills, skillXp: xpAttribution, likelySource } = result;
        const now = Date.now();
        const elapsed = now - startTimeRef.current;

        totalAccumRef.current += xpValue;
        const currentTotal = totalAccumRef.current;
        setTotalXp(currentTotal);
        setTotalHistory((prev) => [...prev.slice(-100), { time: elapsed, value: currentTotal }]);
        setActionCount((prev) => prev + 1);

        setRecentTotalXp((prev) => {
          const cutoff = now - ROLLING_WINDOW_MS;
          const filtered = prev.filter((d) => d.time >= cutoff);
          return [...filtered, { time: now, xp: xpValue }];
        });

        const dropEntry: DropHistoryEntry = {
          id: dropIdRef.current++,
          timestamp: now,
          xpValue,
          dropType,
          skills: skills.map((s) => s.label),
          skillXp: xpAttribution.map((a) => ({ skill: a.skill.label, xp: a.xp })),
          likelySource,
        };
        setDropHistory((prev) => [dropEntry, ...prev.slice(0, MAX_DROP_HISTORY - 1)]);

        const bucketIndex = Math.floor(elapsed / BUCKET_DURATION_MS) + 1;
        setXpBuckets((prev) => {
          const buckets = [...prev];
          let bucket = buckets.find(b => b.bucketIndex === bucketIndex);
          if (!bucket) {
            bucket = {
              bucketIndex,
              startTime: (bucketIndex - 1) * BUCKET_DURATION_MS,
              skills: {},
              total: 0,
            };
            buckets.push(bucket);
            buckets.sort((a, b) => a.bucketIndex - b.bucketIndex);
          }
          xpAttribution.forEach((attr) => {
            bucket!.skills[attr.skill.label] = (bucket!.skills[attr.skill.label] || 0) + attr.xp;
          });
          bucket!.total += xpValue;
          return buckets;
        });

        if (xpAttribution.length > 0) {
          setSkillXp((prev) => {
            const updated = { ...prev };
            xpAttribution.forEach((attr) => {
              const existing = updated[attr.skill.label] ?? {
                total: 0,
                drops: 0,
                history: [],
                rateHistory: [],
                recentXp: [],
                icon: null,
              };
              const newRecentXp = [
                ...existing.recentXp.filter((d) => d.time >= now - ROLLING_WINDOW_MS),
                { time: now, xp: attr.xp },
              ];
              const rollingRate = calcRollingXpPerHour(newRecentXp, ROLLING_WINDOW_MS);

              updated[attr.skill.label] = {
                total: existing.total + attr.xp,
                drops: existing.drops + 1,
                history: [...existing.history.slice(-100), { time: elapsed, value: existing.total + attr.xp }],
                rateHistory: [...existing.rateHistory.slice(-100), { time: elapsed, value: rollingRate }],
                recentXp: newRecentXp,
                icon: existing.icon,
              };
            });
            return updated;
          });

          if (skill && skillSprite) {
            setSkillXp((prev) => {
              if (prev[skill.label]?.icon) return prev;
              const icon = captureSprite(skillSprite.sprite);
              if (!icon) return prev;
              return {
                ...prev,
                [skill.label]: { ...prev[skill.label], icon },
              };
            });
          }
        }
      });
    };

    init().catch(e => console.error("[XP Init] Error during initialization:", e));

    return () => {
      isMounted = false;
      if (uistream) {
        uistream.close();
      }
    };
  }, [glapi]);

  const reset = () => {
    const now = Date.now();
    setStartTime(now);
    startTimeRef.current = now;
    totalAccumRef.current = 0;
    setSkillXp({});
    setTotalXp(0);
    setTotalHistory([{ time: 0, value: 0 }]);
    setRecentTotalXp([]);
    setDropHistory([]);
    setActionCount(0);
    setExpandedSkill(null);
    setSparklineHistory([]);
    setXpBuckets([]);
    dropIdRef.current = 0;
  };

  const toggleDebugZone = React.useCallback(() => {
    if (!debugZoneRef.current) {
      debugZoneRef.current = new DebugZoneOverlay();
    }
    if (debugZoneVisible) {
      debugZoneRef.current.hide();
      setDebugZoneVisible(false);
    } else {
      debugZoneRef.current.show(debugZone);
      setDebugZoneVisible(true);
    }
    // Also update detector's zone filter
    if (detectorRef.current) {
      detectorRef.current.setDetectionZone(debugZoneVisible ? null : debugZone);
    }
  }, [debugZoneVisible, debugZone]);

  const updateDebugZone = React.useCallback((field: keyof DebugZone, value: number) => {
    setDebugZone(prev => {
      const updated = { ...prev, [field]: value };
      if (debugZoneRef.current && debugZoneVisible) {
        debugZoneRef.current.updateZone(updated);
      }
      return updated;
    });
  }, [debugZoneVisible]);

  // Update detector's zone filter when debug zone changes
  React.useEffect(() => {
    if (detectorRef.current) {
      detectorRef.current.setDetectionZone(debugZoneVisible ? debugZone : null);
    }
  }, [debugZoneVisible, debugZone]);

  const copyZoneCoords = React.useCallback(() => {
    const text = `Zone: x=${debugZone.x}, y=${debugZone.y}, w=${debugZone.width}, h=${debugZone.height}`;
    navigator.clipboard.writeText(text).then(() => {
      console.log("[DebugZone] Copied:", text);
    });
  }, [debugZone]);

  // Cleanup debug zone on unmount
  React.useEffect(() => {
    return () => {
      debugZoneRef.current?.dispose();
    };
  }, []);

  // Calculate rates
  const xpPerHour = calcXpPerHour(totalXp, elapsedMs);
  const rollingXpPerHour = calcRollingXpPerHour(recentTotalXp, ROLLING_WINDOW_MS);
  const avgTicksPerAction = actionCount > 0 && elapsedMs > 0 ? (elapsedMs / TICK_MS) / actionCount : 0;

  // Sort skills by XP - memoized to prevent infinite loops in useEffect
  const sortedSkills = React.useMemo(
    () => Object.entries(skillXp).sort((a, b) => b[1].total - a[1].total),
    [skillXp]
  );

  // Prepare skill bar chart data (colorVersion forces recalc on color change)
  const skillBarData = React.useMemo(() => sortedSkills.slice(0, 10).map(([name, data]) => ({
    name,
    xp: data.total,
    color: getSkillColor(name),
  })), [sortedSkills, colorVersion]);

  // XP Chart Overlay - compact by default, can expand
  const overlay = useXpChartOverlay({ enabled: true, defaultExpanded: false });

  // Overlay settings state
  const [showOverlaySettings, setShowOverlaySettings] = React.useState(false);

  // Get primary skill color (top skill by XP)
  const primarySkillColor = sortedSkills.length > 0 ? getSkillColor(sortedSkills[0][0]) : "#00ff88";

  // Update overlay when data changes - throttled to prevent excessive updates
  const lastOverlayUpdateRef = React.useRef(0);
  React.useEffect(() => {
    if (!overlay.isAvailable) return;

    // Throttle updates to max once per second
    const now = Date.now();
    if (now - lastOverlayUpdateRef.current < 1000) return;
    lastOverlayUpdateRef.current = now;

    // Prepare skill breakdown for overlay
    const skillBreakdown = sortedSkills.slice(0, 6).map(([name, data]) => ({
      name,
      xp: data.total,
      color: getSkillColor(name),
    }));

    // Downsample sparkline history to ~60 points for overlay display
    const maxOverlayPoints = 60;
    let sparklineData: number[];
    if (sparklineHistory.length <= maxOverlayPoints) {
      sparklineData = sparklineHistory.map(p => p.rate);
    } else {
      // Downsample by selecting evenly spaced points
      sparklineData = [];
      const step = sparklineHistory.length / maxOverlayPoints;
      for (let i = 0; i < maxOverlayPoints; i++) {
        const idx = Math.min(Math.floor(i * step), sparklineHistory.length - 1);
        sparklineData.push(sparklineHistory[idx].rate);
      }
      // Always include the last point
      sparklineData[sparklineData.length - 1] = sparklineHistory[sparklineHistory.length - 1].rate;
    }

    // Prepare per-skill rate history for expanded multi-line chart
    const skillRateHistory = sortedSkills.slice(0, 6).map(([name, data]) => ({
      name,
      color: getSkillColor(name),
      data: data.rateHistory.slice(-30), // Last 30 data points
    }));

    overlay.updateChart({
      totalXp,
      xpPerHour,
      rollingXpPerHour,
      elapsedMs,
      skillBreakdown,
      sparklineData,
      primarySkillColor,
      skillRateHistory,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay.isAvailable, sortedSkills, totalXp, xpPerHour, rollingXpPerHour, elapsedMs, sparklineHistory, primarySkillColor]);

  // Show loading screen
  if (isLoading) {
    return (
      <div style={{ ...styles.container, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "18px", color: "#00d4ff", marginBottom: "12px" }}>Loading XP Tracker...</div>
        <div style={{ fontSize: "12px", color: "#666" }}>{loadingStatus}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span>XP Tracker</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Expand/Compact toggle - always available */}
          <button
            style={{
              ...styles.button,
              backgroundColor: overlay.isExpanded ? "#00ff88" : "#1a1a3a",
              color: overlay.isExpanded ? "#000" : "#00ff88",
              padding: "4px 8px",
            }}
            onClick={overlay.toggleExpanded}
            title={overlay.isExpanded ? "Compact view" : "Expanded view with skills"}
          >
            {overlay.isExpanded ? "-" : "+"}
          </button>
          {/* Overlay controls - only when available */}
          {overlay.isAvailable && (
            <>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: overlay.isVisible ? "#00d4ff" : "#1a1a3a",
                  color: overlay.isVisible ? "#000" : "#00d4ff",
                }}
                onClick={overlay.toggle}
                title="Toggle XP overlay on game screen"
              >
                {overlay.isVisible ? "Hide Overlay" : "Show Overlay"}
              </button>
              <button
                style={{
                  ...styles.button,
                  backgroundColor: showOverlaySettings ? "#ffaa00" : "#1a1a3a",
                  color: showOverlaySettings ? "#000" : "#ffaa00",
                  padding: "4px 8px",
                }}
                onClick={() => setShowOverlaySettings(!showOverlaySettings)}
                title="Overlay position settings"
              >
                Pos
              </button>
            </>
          )}
          <button style={styles.button} onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Overlay Settings Panel - Visual Position Editor */}
      {showOverlaySettings && overlay.isAvailable && (
        <div style={{
          ...styles.card,
          marginBottom: "10px",
          border: "1px solid #ffaa00",
        }}>
          <div style={{ marginBottom: "8px", color: "#ffaa00", fontWeight: "bold" }}>
            Overlay Position
          </div>
          <OverlayPositionEditor
            positionX={overlay.position.x}
            positionY={overlay.position.y}
            onPositionChange={overlay.setPosition}
            screenWidth={overlay.uiBounds.width}
            screenHeight={overlay.uiBounds.height}
            overlayWidth={overlay.size.width}
            overlayHeight={overlay.size.height}
            isVisible={overlay.isVisible}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "10px" }}>
        <button
          style={activeTab === "overview" ? styles.tabButtonActive : styles.tabButton}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          style={activeTab === "skills" ? styles.tabButtonActive : styles.tabButton}
          onClick={() => setActiveTab("skills")}
        >
          Skills
        </button>
        <button
          style={activeTab === "drops" ? styles.tabButtonActive : styles.tabButton}
          onClick={() => setActiveTab("drops")}
        >
          Drops
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Session Overview */}
          <div style={styles.card}>
            <div style={styles.statRow}>
              <span style={styles.label}>Session</span>
              <span>{formatTime(elapsedMs)}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.label}>Actions</span>
              <span>{actionCount} ({avgTicksPerAction.toFixed(1)} ticks/action)</span>
            </div>
          </div>

          {/* Total XP with Graph */}
          <div style={styles.card}>
            <div style={styles.statRow}>
              <span style={styles.label}>Total XP</span>
              <span style={styles.xpValue}>{formatXp(totalXp)}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.label}>Session Rate</span>
              <span style={styles.xpRate}>{formatXpInt(xpPerHour)}/hr</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.label}>Rolling Rate (5m)</span>
              <span style={styles.rollingRate}>{formatXpInt(rollingXpPerHour)}/hr</span>
            </div>
            <div style={{ marginTop: "8px" }}>
              <MiniChart data={totalHistory} label="Total XP" color="#00ff88" />
            </div>
          </div>

          {/* XP Per Minute - Stacked Bar Chart (RuneMetrics style) */}
          <div style={{ ...styles.card, padding: "10px 8px" }}>
            <div style={styles.cardHeader}>
              <span style={styles.label}>XP Per Minute</span>
              <span style={{ fontSize: "11px", color: "#00ff88" }}>
                {formatXpInt(totalXp)} total
              </span>
            </div>
            <StackedBarChart
              buckets={xpBuckets}
              skills={sortedSkills.slice(0, 8).map(([name, data]) => ({
                name,
                color: getSkillColor(name),
                icon: data.icon,
              }))}
              width={380}
              height={200}
              maxBuckets={12}
            />
          </div>

          {/* XP Rate Over Time - Line Chart */}
          <div style={{ ...styles.card, padding: "10px 8px" }}>
            <div style={styles.cardHeader}>
              <span style={styles.label}>XP/hr Over Time (All Skills)</span>
            </div>
            <StackedAreaChart
              series={sortedSkills.slice(0, 8).map(([name, data]) => ({
                name,
                color: getSkillColor(name),
                data: data.rateHistory,
              }))}
              width={380}
              height={260}
              showLegend={true}
              maxDataPoints={60}
            />
          </div>

          {/* Skill Comparison Bar Chart */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.label}>Skill Breakdown</span>
              <span style={{ fontSize: "10px", color: "#555" }}>Click color to customize</span>
            </div>
            <SkillBarChart
              skills={skillBarData}
              onColorChange={() => setColorVersion(v => v + 1)}
            />
          </div>
        </>
      )}

      {activeTab === "skills" && (
        <div style={styles.card}>
          <div style={{ ...styles.label, marginBottom: "8px" }}>Skills ({sortedSkills.length})</div>
          {sortedSkills.length === 0 ? (
            <div style={{ color: "#444", padding: "8px", textAlign: "center" }}>
              Waiting for XP drops...
            </div>
          ) : (
            sortedSkills.map(([skill, data]) => {
              const skillRollingRate = calcRollingXpPerHour(data.recentXp, ROLLING_WINDOW_MS);
              return (
                <div key={skill}>
                  <div
                    style={styles.skillRow}
                    onClick={() => setExpandedSkill(expandedSkill === skill ? null : skill)}
                  >
                    {data.icon && (
                      <img src={data.icon} alt={skill} style={styles.skillIcon} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px" }}>{skill}</div>
                      <div style={{ fontSize: "10px", color: "#555" }}>{data.drops} drops</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={styles.xpValue}>{formatXp(data.total)}</div>
                      <div style={styles.xpRate}>{formatXpInt(calcXpPerHour(data.total, elapsedMs))}/hr</div>
                      {skillRollingRate > 0 && (
                        <div style={styles.rollingRate}>{formatXpInt(skillRollingRate)}/hr (5m)</div>
                      )}
                    </div>
                  </div>
                  {/* Expanded skill graph */}
                  {expandedSkill === skill && data.history.length > 1 && (
                    <div style={{ padding: "8px 0" }}>
                      <MiniChart
                        data={data.history}
                        label={`${skill} Total XP`}
                        color={getSkillColor(skill)}
                      />
                      {data.rateHistory.length > 1 && (
                        <div style={{ marginTop: "8px" }}>
                          <LineChart
                            data={data.rateHistory}
                            label={`${skill} XP/hr`}
                            color={getSkillColor(skill)}
                            showRate
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "drops" && (
        <div style={styles.card}>
          <div style={{ ...styles.label, marginBottom: "8px" }}>Recent Drops ({dropHistory.length})</div>
          {dropHistory.length === 0 ? (
            <div style={{ color: "#444", padding: "8px", textAlign: "center" }}>
              No drops recorded yet...
            </div>
          ) : (
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {dropHistory.map((drop) => (
                <div key={drop.id} style={styles.dropRow}>
                  <span style={styles.dropXp}>+{formatXp(drop.xpValue)}</span>
                  <span style={styles.dropType}>{getDropTypeLabel(drop.dropType)}</span>
                  <span style={styles.dropSkills}>
                    {drop.skillXp.map((s) => `${s.skill}: ${formatXp(s.xp)}`).join(", ")}
                  </span>
                  {drop.likelySource && (
                    <span style={styles.dropSource}>{drop.likelySource}</span>
                  )}
                  <span style={styles.dropTime}>{formatTimeShort(Date.now() - drop.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Debug Zone Panel */}
      <div style={{
        marginTop: 12,
        padding: 8,
        background: "rgba(0,0,0,0.3)",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.1)",
        fontSize: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: "#0f0" }}>Debug Zone</span>
          <button
            onClick={toggleDebugZone}
            style={{
              padding: "2px 8px",
              fontSize: 11,
              background: debugZoneVisible ? "#0a0" : "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            {debugZoneVisible ? "Hide" : "Show"}
          </button>
          <button
            onClick={copyZoneCoords}
            style={{
              padding: "2px 8px",
              fontSize: 11,
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            Copy
          </button>
          <button
            onClick={async () => {
              if (!glapi) return;
              console.log('[SpriteScanner] Starting scan — make sure an XP drop is visible...');
              const spritecache = new SpriteCache();
              await spritecache.downloadCacheData();
              await scanSprites(glapi, spritecache);
            }}
            style={{
              padding: "2px 8px",
              fontSize: 11,
              background: "#630",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            Scan Sprites
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {(["x", "y", "width", "height"] as const).map(field => (
            <label key={field} style={{ display: "flex", alignItems: "center", gap: 4, color: "#aaa" }}>
              <span style={{ width: 40, textAlign: "right" }}>{field}:</span>
              <input
                type="text"
                defaultValue={debugZone[field]}
                key={`${field}-${debugZone[field]}`}
                onBlur={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) updateDebugZone(field, v);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const v = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(v)) updateDebugZone(field, v);
                  }
                }}
                style={{
                  width: 60,
                  padding: "1px 4px",
                  fontSize: 11,
                  background: "#222",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: 2,
                }}
              />
            </label>
          ))}
        </div>
        <div style={{ marginTop: 4, color: "#666", fontSize: 10 }}>
          Zone: x={debugZone.x}, y={debugZone.y}, w={debugZone.width}, h={debugZone.height}
        </div>
      </div>
    </div>
  );
}

// Default skill colors - muted monotone palette for dark UI
const DEFAULT_SKILL_COLORS: Record<string, string> = {
  // Combat skills - warm reds/oranges
  Attack: "#e85d5d",
  Strength: "#5dcc5d",
  Defence: "#5d9ce8",
  Constitution: "#e89a5d",
  Ranged: "#8bc34a",
  Prayer: "#e8d85d",
  Magic: "#5dcce8",
  Necromancy: "#b06dd9",

  // Gathering skills - earthy tones
  Mining: "#a67c52",
  Fishing: "#5db8e8",
  Woodcutting: "#4d7a4d",
  Farming: "#7ba353",
  Hunter: "#9a7640",
  Divination: "#9b7ed9",
  Archaeology: "#c49a6c",

  // Artisan skills - muted warm tones
  Smithing: "#7a7a8a",
  Cooking: "#d98c5c",
  Firemaking: "#d96846",
  Runecrafting: "#d9a85c",
  Crafting: "#c9a37a",
  Fletching: "#5a9a5a",
  Herblore: "#5db35d",
  Construction: "#b87333",
  Invention: "#d9c35c",

  // Support skills - cool tones
  Agility: "#5a8ad9",
  Thieving: "#9a5a9a",
  Slayer: "#6a6a7a",
  Summoning: "#5aa8d9",
  Dungeoneering: "#d96a5a",
};

// LocalStorage key for user color preferences
const SKILL_COLORS_KEY = "xp-tracker-skill-colors";

// Load user color preferences from localStorage
function loadUserSkillColors(): Record<string, string> {
  try {
    const stored = localStorage.getItem(SKILL_COLORS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save a single skill color to localStorage
function saveSkillColor(skill: string, color: string): void {
  const colors = loadUserSkillColors();
  colors[skill] = color;
  localStorage.setItem(SKILL_COLORS_KEY, JSON.stringify(colors));
}

// Reset a skill color to default
function resetSkillColor(skill: string): void {
  const colors = loadUserSkillColors();
  delete colors[skill];
  localStorage.setItem(SKILL_COLORS_KEY, JSON.stringify(colors));
}

// Get color for a skill (user preference first, then default)
function getSkillColor(skill: string): string {
  const userColors = loadUserSkillColors();
  return userColors[skill] ?? DEFAULT_SKILL_COLORS[skill] ?? "#5de8a0";
}

// Clickable color indicator with color picker
function SkillColorPicker({
  skill,
  color,
  onColorChange,
}: {
  skill: string;
  color: string;
  onColorChange: (skill: string, color: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          width: "4px",
          height: "20px",
          backgroundColor: color,
          borderRadius: "2px",
          marginRight: "8px",
          cursor: "pointer",
        }}
        onClick={() => inputRef.current?.click()}
        title={`Click to change ${skill} color`}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onColorChange(skill, e.target.value)}
        onContextMenu={(e) => {
          e.preventDefault();
          resetSkillColor(skill);
          onColorChange(skill, DEFAULT_SKILL_COLORS[skill] ?? "#5de8a0");
        }}
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ============================================================================
// BOOTSTRAP
// ============================================================================
function start() {
  const api = getApi();
  (globalThis as any).native = api;

  ReactDOM.createRoot(document.getElementById("app")!).render(
    <Alt1ApiContext.Provider value={api}>
      <App />
    </Alt1ApiContext.Provider>
  );

  // F5 to refresh
  window.addEventListener("keydown", (e) => {
    if (e.key === "F5") window.location.reload();
  });
}

start();
