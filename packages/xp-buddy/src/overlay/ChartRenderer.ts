/**
 * Chart Renderer - Renders XP overlays to canvas for GL overlay
 * Supports compact view with sparkline and expanded view with skill breakdown
 */

export interface DataPoint {
  time: number;
  value: number;
}

export interface SkillSeries {
  name: string;
  color: string;
  data: DataPoint[];
}

export interface ChartConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  fontFamily?: string;
  fontSize?: number;
  padding?: number;
  showLegend?: boolean;
  title?: string;
}

export interface SkillData {
  name: string;
  xp: number;
  xpPerHour: number;
  color: string;
}

const DEFAULT_CONFIG: Required<ChartConfig> = {
  width: 320,
  height: 200,
  backgroundColor: "rgba(0, 0, 0, 0.85)",
  textColor: "#ffffff",
  gridColor: "#333333",
  fontFamily: "'Segoe UI', 'Arial', sans-serif",
  fontSize: 14,
  padding: 12,
  showLegend: true,
  title: "XP Tracker",
};

/**
 * Format XP value for display
 */
function formatXp(xp: number): string {
  if (xp >= 1000000) return (xp / 1000000).toFixed(1) + "M";
  if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
  return Math.round(xp).toLocaleString();
}

/**
 * Format XP rate - large number with commas
 */
function formatRateLarge(xp: number): string {
  return Math.round(xp).toLocaleString();
}

/**
 * Format XP rate compact
 */
function formatRate(xp: number): string {
  if (xp >= 1000000) return (xp / 1000000).toFixed(2) + "M/hr";
  if (xp >= 1000) return Math.round(xp / 1000).toLocaleString() + "K/hr";
  return Math.round(xp).toLocaleString() + "/hr";
}

/**
 * Format session time
 */
function formatTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Get device pixel ratio
 */
function getDPR(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Draw rounded rectangle
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw clean line chart with smooth curves (like RS player count chart)
 */
function drawLineChart(
  ctx: CanvasRenderingContext2D,
  data: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  showDots: boolean = true,
  showYAxis: boolean = false,
  fontFamily: string = "'Segoe UI', Arial, sans-serif",
  showFill: boolean = true
): void {
  if (data.length < 2) return;

  // Enable antialiasing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const minVal = Math.min(...data) * 0.9; // Add 10% padding below
  const maxVal = Math.max(...data) * 1.05; // Add 5% padding above
  const range = maxVal - minVal || 1;

  const leftPadding = showYAxis ? 35 : 0;
  const chartWidth = width - leftPadding;
  const chartX = x + leftPadding;

  // Draw Y-axis labels if enabled
  if (showYAxis && height > 40) {
    ctx.fillStyle = "#666";
    ctx.font = `10px ${fontFamily}`;
    ctx.textAlign = "right";

    // Draw 3 labels: top, middle, bottom
    const labels = [maxVal, (maxVal + minVal) / 2, minVal];
    labels.forEach((val, i) => {
      const labelY = y + (i / 2) * height;
      ctx.fillText(formatRate(val).replace("/hr", ""), chartX - 5, labelY + 3);

      // Draw subtle grid line
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(chartX, labelY);
      ctx.lineTo(chartX + chartWidth, labelY);
      ctx.stroke();
    });
  }

  // Calculate points
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    const px = chartX + (i / (data.length - 1)) * chartWidth;
    const py = y + height - ((data[i] - minVal) / range) * height;
    points.push({ x: px, y: py });
  }

  // Helper to draw smooth curve through points using cardinal spline
  const drawSmoothLine = (close: boolean = false) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      // Just two points - draw straight line
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      // Use quadratic curves for smoothing
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];

        // Control point is midpoint
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;

        if (i === 0) {
          // First segment - line to midpoint
          ctx.lineTo(midX, midY);
        } else {
          // Curve to midpoint using previous point as control
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
      }
      // Final segment to last point
      const lastPoint = points[points.length - 1];
      const secondLast = points[points.length - 2];
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, lastPoint.x, lastPoint.y);
    }

    if (close) {
      // Close path for fill
      ctx.lineTo(chartX + chartWidth, y + height);
      ctx.lineTo(chartX, y + height);
      ctx.closePath();
    }
  };

  // Draw gradient fill under the line
  if (showFill) {
    drawSmoothLine(true);
    const gradient = ctx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, color + "40"); // 25% opacity at top
    gradient.addColorStop(1, color + "08"); // 3% opacity at bottom
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Draw the line
  drawSmoothLine(false);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Draw dots at data points
  if (showDots && data.length <= 30) {
    for (const point of points) {
      // Outer circle (colored)
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner circle (white)
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
  }
}

/**
 * Draw simple sparkline (for compact view)
 */
function drawSparkline(
  ctx: CanvasRenderingContext2D,
  data: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  drawLineChart(ctx, data, x, y, width, height, color, false, false);
}

/**
 * Render COMPACT overlay - XP/hr with sparkline (like RuneLite)
 */
export function renderCompactOverlay(
  xpPerHour: number,
  elapsedMs: number,
  sparklineData: number[],
  primarySkillColor: string = "#00ff88",
  config: ChartConfig = {}
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const width = 220;
  const height = 56;
  const dpr = getDPR();

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext("2d", { alpha: true })!;
  ctx.scale(dpr, dpr);

  const fontFamily = config.fontFamily ?? DEFAULT_CONFIG.fontFamily;
  const pad = 10;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw filled rounded rectangle background
  roundedRect(ctx, 0, 0, width, height, 8);
  ctx.fillStyle = "rgba(50, 50, 55, 0.95)";
  ctx.fill();

  // Draw border on top
  roundedRect(ctx, 1, 1, width - 2, height - 2, 7);
  ctx.strokeStyle = primarySkillColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Sparkline graph - right side (draw first so text overlaps if needed)
  const graphWidth = 70;
  const graphHeight = height - 16;
  const graphX = width - graphWidth - 8;
  const graphY = 8;

  // Graph background
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  roundedRect(ctx, graphX, graphY, graphWidth, graphHeight, 4);
  ctx.fill();

  // Draw sparkline or placeholder
  if (sparklineData.length >= 2) {
    drawSparkline(ctx, sparklineData, graphX + 3, graphY + 3, graphWidth - 6, graphHeight - 6, primarySkillColor);
  } else {
    // Draw a flat line placeholder
    ctx.strokeStyle = primarySkillColor + "60";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const midY = graphY + graphHeight / 2;
    ctx.moveTo(graphX + 6, midY);
    ctx.lineTo(graphX + graphWidth - 6, midY);
    ctx.stroke();
  }

  // XP/hr value - large text
  const xpDisplay = xpPerHour > 0 ? formatRateLarge(xpPerHour) : "--";
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 20px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(xpDisplay, pad, 24);

  // "xp/hr" label - same line, smaller
  if (xpPerHour > 0) {
    ctx.fillStyle = primarySkillColor;
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.font = `bold 20px ${fontFamily}`;
    const xpTextWidth = ctx.measureText(xpDisplay).width;
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.fillText("xp/hr", pad + xpTextWidth + 4, 24);
  } else {
    ctx.fillStyle = "#888";
    ctx.font = `12px ${fontFamily}`;
    ctx.fillText("waiting...", pad, 24);
  }

  // Session time - bottom left
  ctx.fillStyle = "#888";
  ctx.font = `12px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(formatTime(elapsedMs), pad, height - 10);

  return { canvas, width, height };
}

// Per-skill rate history type for multi-line charts
export interface SkillRateHistory {
  name: string;
  color: string;
  data: { time: number; value: number }[];
}

/**
 * Draw multi-line chart with multiple skill series
 */
function drawMultiLineChart(
  ctx: CanvasRenderingContext2D,
  series: SkillRateHistory[],
  x: number,
  y: number,
  width: number,
  height: number,
  fontFamily: string
): void {
  if (series.length === 0) return;

  // Find all time points and value range
  let minTime = Infinity, maxTime = -Infinity;
  let maxVal = 0;

  for (const s of series) {
    for (const pt of s.data) {
      if (pt.time < minTime) minTime = pt.time;
      if (pt.time > maxTime) maxTime = pt.time;
      if (pt.value > maxVal) maxVal = pt.value;
    }
  }

  if (maxTime <= minTime || maxVal === 0) return;

  const timeRange = maxTime - minTime;
  const niceMax = maxVal * 1.1;

  // Draw Y-axis labels
  ctx.fillStyle = "#666";
  ctx.font = `9px ${fontFamily}`;
  ctx.textAlign = "right";

  const yLabels = [niceMax, niceMax / 2, 0];
  for (let i = 0; i < yLabels.length; i++) {
    const labelY = y + (i / 2) * height;
    ctx.fillText(formatRate(yLabels[i]).replace("/hr", ""), x - 4, labelY + 3);

    // Grid line
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, labelY);
    ctx.lineTo(x + width, labelY);
    ctx.stroke();
  }

  // Draw each series
  for (const s of series) {
    if (s.data.length < 2) continue;

    // Calculate points
    const points: { x: number; y: number }[] = [];
    for (const pt of s.data) {
      const px = x + ((pt.time - minTime) / timeRange) * width;
      const py = y + height - (pt.value / niceMax) * height;
      points.push({ x: px, y: py });
    }

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Draw dots if not too many points
    if (points.length <= 20) {
      for (const pt of points) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1a2e";
        ctx.fill();
      }
    }
  }

  // Draw X-axis time labels
  ctx.fillStyle = "#666";
  ctx.font = `9px ${fontFamily}`;
  ctx.textAlign = "center";

  const numLabels = Math.min(5, Math.floor(width / 50));
  for (let i = 0; i < numLabels; i++) {
    const t = minTime + (i / (numLabels - 1)) * timeRange;
    const labelX = x + (i / (numLabels - 1)) * width;
    const totalSec = Math.floor(t / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const label = min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
    ctx.fillText(label, labelX, y + height + 12);
  }
}

/**
 * Render EXPANDED overlay - Full stats with skill breakdown and multi-line chart
 */
export function renderExpandedOverlay(
  totalXp: number,
  xpPerHour: number,
  rollingXpPerHour: number,
  elapsedMs: number,
  skillBreakdown: SkillData[],
  sparklineData: number[],
  config: ChartConfig = {},
  skillRateHistory?: SkillRateHistory[]
): { canvas: HTMLCanvasElement; width: number; height: number } {
  // Calculate height based on skills - larger chart area
  const numSkills = Math.min(skillBreakdown.length, 6);
  const hasMultiLineData = skillRateHistory && skillRateHistory.length > 0 && skillRateHistory.some(s => s.data.length >= 2);
  const graphHeight = hasMultiLineData ? 120 : 50; // Larger graph for multi-line
  const baseHeight = 100; // Header + main stats
  const skillRowHeight = 24;
  const height = baseHeight + graphHeight + 20 + numSkills * skillRowHeight;
  const width = hasMultiLineData ? 320 : 260;

  const dpr = getDPR();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext("2d", { alpha: true })!;
  ctx.scale(dpr, dpr);

  const fontFamily = config.fontFamily ?? DEFAULT_CONFIG.fontFamily;
  const pad = 8;

  // Draw background
  roundedRect(ctx, 0, 0, width, height, 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "#00d4ff";
  ctx.lineWidth = 2;
  ctx.stroke();

  let y = pad;

  // === HEADER ROW ===
  // XP/hr - Large and prominent on left
  ctx.fillStyle = "#00ff88";
  ctx.font = `bold 20px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(formatRateLarge(xpPerHour), pad, y + 18);

  // "xp/hr" label
  ctx.fillStyle = "#00ff88";
  ctx.font = `bold 12px ${fontFamily}`;
  const rateText = ctx.measureText(formatRateLarge(xpPerHour));
  ctx.fillText("xp/hr", pad + rateText.width + 4, y + 18);

  // Session time on right
  ctx.fillStyle = "#aaaaaa";
  ctx.font = `13px ${fontFamily}`;
  ctx.textAlign = "right";
  ctx.fillText(formatTime(elapsedMs), width - pad, y + 18);

  y += 28;

  // === CHART AREA ===
  const chartLeftPad = hasMultiLineData ? 45 : pad; // More space for Y-axis labels
  const graphWidth = width - chartLeftPad - pad;
  const graphY = y;
  const actualGraphHeight = graphHeight - (hasMultiLineData ? 20 : 8); // Room for X-axis labels

  // Graph background
  ctx.fillStyle = "rgba(26, 26, 46, 0.95)";
  roundedRect(ctx, pad, graphY - 2, width - pad * 2, actualGraphHeight + (hasMultiLineData ? 18 : 4), 4);
  ctx.fill();

  // Draw multi-line chart if we have per-skill data
  if (hasMultiLineData && skillRateHistory) {
    drawMultiLineChart(ctx, skillRateHistory, chartLeftPad, graphY, graphWidth, actualGraphHeight, fontFamily);

    // Draw legend below chart
    const legendY = graphY + actualGraphHeight + 2;
    let legendX = chartLeftPad;
    ctx.font = `9px ${fontFamily}`;
    for (const s of skillRateHistory.slice(0, 4)) {
      // Color box
      ctx.fillStyle = s.color;
      ctx.fillRect(legendX, legendY, 8, 8);
      // Label
      ctx.fillStyle = "#888";
      ctx.textAlign = "left";
      const labelWidth = ctx.measureText(s.name).width;
      ctx.fillText(s.name, legendX + 10, legendY + 7);
      legendX += 10 + labelWidth + 12;
      if (legendX > width - 50) break;
    }
  } else if (sparklineData.length >= 2) {
    // Fallback to sparkline
    drawSparkline(ctx, sparklineData, chartLeftPad, graphY, graphWidth, actualGraphHeight, "#00ff88");
  } else {
    // No data yet message
    ctx.fillStyle = "#555";
    ctx.font = `11px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText("Collecting data...", width / 2, graphY + actualGraphHeight / 2 + 4);
  }

  y += graphHeight;

  // === STATS ROW ===
  // Total XP on left
  ctx.fillStyle = "#888888";
  ctx.font = `11px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("Total:", pad, y + 4);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 13px ${fontFamily}`;
  ctx.fillText(formatXp(totalXp), pad + 35, y + 4);

  // 5min rate on right
  if (rollingXpPerHour > 0) {
    ctx.fillStyle = "#888888";
    ctx.font = `11px ${fontFamily}`;
    ctx.textAlign = "right";
    ctx.fillText("5min:", width - pad - 60, y + 4);
    ctx.fillStyle = "#ffcc00";
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.fillText(formatRate(rollingXpPerHour), width - pad, y + 4);
  }

  y += 16;

  // === DIVIDER ===
  if (numSkills > 0) {
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
    y += 8;
  }

  // === SKILL BREAKDOWN ===
  const topSkills = skillBreakdown.slice(0, 6);
  for (const skill of topSkills) {
    // Color indicator
    ctx.fillStyle = skill.color;
    roundedRect(ctx, pad, y + 3, 3, 14, 1);
    ctx.fill();

    // Skill name
    ctx.fillStyle = "#cccccc";
    ctx.font = `12px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.fillText(skill.name, pad + 10, y + 14);

    // XP gained
    ctx.fillStyle = "#00ff88";
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(formatXp(skill.xp), width / 2 + 10, y + 14);

    // XP/hr for this skill
    if (skill.xpPerHour > 0) {
      ctx.fillStyle = "#888888";
      ctx.font = `11px ${fontFamily}`;
      ctx.textAlign = "right";
      ctx.fillText(formatRate(skill.xpPerHour), width - pad, y + 14);
    }

    y += skillRowHeight;
  }

  return { canvas, width, height };
}

/**
 * Render XP stats panel - wrapper for backwards compatibility
 * Uses expanded view by default
 */
export function renderXpStatsPanel(
  totalXp: number,
  xpPerHour: number,
  rollingXpPerHour: number,
  elapsedMs: number,
  skillBreakdown: SkillData[],
  config: ChartConfig = {},
  sparklineData: number[] = []
): { canvas: HTMLCanvasElement; width: number; height: number } {
  return renderExpandedOverlay(
    totalXp,
    xpPerHour,
    rollingXpPerHour,
    elapsedMs,
    skillBreakdown,
    sparklineData,
    config
  );
}

/**
 * Render XP rate chart - backwards compat
 */
export function renderXpRateChart(
  series: SkillSeries[],
  config: ChartConfig = {}
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const totalXp = series.reduce((sum, s) => {
    const lastVal = s.data[s.data.length - 1]?.value ?? 0;
    return sum + lastVal;
  }, 0);

  const skillBreakdown = series.map(s => {
    const lastRate = s.data[s.data.length - 1]?.value ?? 0;
    return {
      name: s.name,
      xp: 0,
      xpPerHour: lastRate,
      color: s.color,
    };
  }).filter(s => s.xpPerHour > 0);

  return renderExpandedOverlay(0, totalXp, 0, 0, skillBreakdown, [], config);
}

/**
 * Render XP summary - backwards compat
 */
export function renderXpSummary(
  totalXp: number,
  xpPerHour: number,
  rollingXpPerHour: number,
  elapsedMs: number,
  skillBreakdown: { name: string; xp: number; color: string }[],
  config: ChartConfig = {},
  sparklineData: number[] = []
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const skillsWithRate = skillBreakdown.map(s => ({
    ...s,
    xpPerHour: elapsedMs > 0 ? (s.xp / elapsedMs) * 3600000 : 0,
  }));

  return renderExpandedOverlay(
    totalXp,
    xpPerHour,
    rollingXpPerHour,
    elapsedMs,
    skillsWithRate,
    sparklineData,
    config
  );
}
