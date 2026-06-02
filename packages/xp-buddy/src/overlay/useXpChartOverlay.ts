/**
 * React hook for XP Chart Overlay with compact/expanded modes
 */

import React from "react";
import { XpChartOverlay, getXpChartOverlay, setUIScaleState, getUIScaleInfo, ChartData } from "./XpChartOverlay";
import { renderCompactOverlay, renderExpandedOverlay, SkillSeries, ChartConfig, SkillRateHistory, SkillData } from "./ChartRenderer";
import * as patchrs from "../util/patchrs_napi";

// Convert hex color to RGBA tuple (0-1 range)
function hexToRgba(hex: string): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
      1.0
    ];
  }
  return [0, 0.83, 1, 1]; // Default cyan (#00d4ff)
}

/**
 * Get ImageData from canvas at device pixel ratio
 */
function getCanvasImageData(canvas: HTMLCanvasElement, width: number, height: number): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new ImageData(width, height);
  }
  // Get at canvas resolution (which may be scaled by DPR)
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export interface UseXpChartOverlayOptions {
  enabled?: boolean;
  initialX?: number;
  initialY?: number;
  defaultExpanded?: boolean;
}

export interface UseXpChartOverlayReturn {
  // Overlay state
  isAvailable: boolean;
  isVisible: boolean;
  isExpanded: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  uiBounds: { width: number; height: number };

  // Methods
  show: () => void;
  hide: () => void;
  toggle: () => void;
  toggleExpanded: () => void;
  setPosition: (x: number, y: number) => void;
  updateChart: (data: XpChartData) => void;

  // Drag handling
  isDragging: boolean;
  startDrag: (clientX: number, clientY: number) => void;
  updateDrag: (clientX: number, clientY: number) => void;
  endDrag: () => void;
}

export interface XpChartData {
  totalXp: number;
  xpPerHour: number;
  rollingXpPerHour: number;
  elapsedMs: number;
  skillBreakdown: { name: string; xp: number; color: string }[];
  sparklineData: number[]; // Array of XP/hr values over time
  primarySkillColor?: string;
  // Per-skill rate history for expanded multi-line chart
  skillRateHistory?: { name: string; color: string; data: { time: number; value: number }[] }[];
}

/**
 * Hook for managing XP chart overlay with compact/expanded modes
 */
export function useXpChartOverlay(
  options: UseXpChartOverlayOptions = {}
): UseXpChartOverlayReturn {
  const {
    enabled = true,
    defaultExpanded = false,
  } = options;

  const overlayRef = React.useRef<XpChartOverlay | null>(null);
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [position, setPositionState] = React.useState({ x: 50, y: 50 });
  const [size, setSize] = React.useState({ width: 200, height: 48 });
  const [uiBounds, setUIBounds] = React.useState({ width: 1920, height: 1080 });

  // Drag state
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Last chart data for updates
  const lastDataRef = React.useRef<XpChartData | null>(null);

  // Detect UI scale from game
  const detectUIScale = React.useCallback(async () => {
    try {
      if (!patchrs.native) return;

      const frames = await patchrs.native.recordRenderCalls({
        maxframes: 1,
        features: ["texturesnapshot"],
        framebufferId: 0,
      });

      const viewport = frames.find(f => f.viewport)?.viewport;
      if (viewport) {
        const isScaled = viewport.width > 2560;

        setUIScaleState({
          isScaled,
          uiWidth: isScaled ? 1920 : viewport.width,
          uiHeight: isScaled ? 1080 : viewport.height,
          screenWidth: viewport.width,
          screenHeight: viewport.height,
          scaleX: isScaled ? viewport.width / 1920 : 1,
          scaleY: isScaled ? viewport.height / 1080 : 1,
          scalingTextureId: 0,
        });

        setUIBounds({
          width: isScaled ? 1920 : viewport.width,
          height: isScaled ? 1080 : viewport.height,
        });

        if (overlayRef.current) {
          overlayRef.current.handleResolutionChange(getUIScaleInfo());
        }
      }
    } catch (e) {
      console.warn("[useXpChartOverlay] Failed to detect UI scale:", e);
    }
  }, []);

  // Initialize overlay
  React.useEffect(() => {
    if (!enabled) return;

    const initOverlay = async () => {
      try {
        if (!patchrs.native) {
          console.warn("[useXpChartOverlay] Native addon not available");
          return;
        }

        overlayRef.current = getXpChartOverlay();
        setIsAvailable(true);

        const pos = overlayRef.current.getPosition();
        setPositionState(pos);

        const sz = overlayRef.current.getSize();
        setSize(sz);

        const bounds = overlayRef.current.getUIBounds();
        setUIBounds(bounds);

        await detectUIScale();
      } catch (e) {
        console.error("[useXpChartOverlay] Failed to initialize:", e);
      }
    };

    initOverlay();

    return () => {
      if (overlayRef.current) {
        overlayRef.current.dispose();
      }
    };
  }, [enabled, detectUIScale]);

  // Render the overlay based on current mode
  const renderOverlay = React.useCallback((data: XpChartData, expanded: boolean) => {
    if (expanded) {
      // Expanded view with skill breakdown
      const skillsWithRate = data.skillBreakdown.map(s => ({
        ...s,
        xpPerHour: data.elapsedMs > 0 ? (s.xp / data.elapsedMs) * 3600000 : 0,
      }));

      return renderExpandedOverlay(
        data.totalXp,
        data.xpPerHour,
        data.rollingXpPerHour,
        data.elapsedMs,
        skillsWithRate,
        data.sparklineData
      );
    } else {
      // Compact view
      return renderCompactOverlay(
        data.xpPerHour,
        data.elapsedMs,
        data.sparklineData,
        data.primarySkillColor ?? "#00d4ff"
      );
    }
  }, []);

  // Show overlay - uses pure GL rendering (compact) or canvas texture (expanded)
  const show = React.useCallback(() => {
    if (!overlayRef.current) return;

    const data = lastDataRef.current;

    // If expanded with skill rate history, use canvas-rendered multi-line chart
    if (isExpanded && data?.skillRateHistory && data.skillRateHistory.length > 0) {
      // Build skill breakdown with xpPerHour for the expanded overlay
      const skillsWithRate: SkillData[] = data.skillBreakdown.map(s => ({
        ...s,
        xpPerHour: data.elapsedMs > 0 ? (s.xp / data.elapsedMs) * 3600000 : 0,
      }));

      // Render canvas-based multi-line chart
      const { canvas, width, height } = renderExpandedOverlay(
        data.totalXp,
        data.xpPerHour,
        data.rollingXpPerHour,
        data.elapsedMs,
        skillsWithRate,
        data.sparklineData,
        {},
        data.skillRateHistory
      );

      // Get ImageData from rendered canvas
      const expandedImageData = getCanvasImageData(canvas, width, height);

      const chartData: ChartData = {
        dataPoints: data.sparklineData.length > 0 ? data.sparklineData : [data.xpPerHour || 0],
        lineColor: hexToRgba(data.primarySkillColor ?? "#00d4ff"),
        width: canvas.width,  // Use canvas resolution (may be scaled by DPR)
        height: canvas.height,
        xpPerHour: data.xpPerHour ?? 0,
        elapsedMs: data.elapsedMs ?? 0,
        expandedImageData,
      };

      overlayRef.current.showChart(chartData).catch(e => {
        console.error("[useXpChartOverlay] Failed to show expanded overlay:", e);
      });
      setIsVisible(true);
      setSize({ width, height });
    } else {
      // Compact mode: use shader-based sparkline
      const chartWidth = isExpanded ? 320 : 200;
      const chartHeight = isExpanded ? 180 : 126;

      const chartData: ChartData = {
        dataPoints: data?.sparklineData?.length ? data.sparklineData : [data?.xpPerHour || 0],
        lineColor: hexToRgba(data?.primarySkillColor ?? "#00d4ff"),
        width: chartWidth,
        height: chartHeight,
        xpPerHour: data?.xpPerHour ?? 0,
        elapsedMs: data?.elapsedMs ?? 0,
      };

      overlayRef.current.showChart(chartData).catch(e => {
        console.error("[useXpChartOverlay] Failed to show overlay:", e);
      });
      setIsVisible(true);
      setSize({ width: chartData.width, height: chartData.height });
    }
  }, [isExpanded]);

  // Hide overlay
  const hide = React.useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.hide();
    }
    setIsVisible(false);
  }, []);

  // Toggle overlay visibility
  const toggle = React.useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  // Toggle expanded/compact mode
  const toggleExpanded = React.useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // Re-render overlay with new mode if visible
    if (isVisible && overlayRef.current && lastDataRef.current) {
      const data = lastDataRef.current;

      // If expanding with skill rate history, use canvas-rendered multi-line chart
      if (newExpanded && data.skillRateHistory && data.skillRateHistory.length > 0) {
        const skillsWithRate: SkillData[] = data.skillBreakdown.map(s => ({
          ...s,
          xpPerHour: data.elapsedMs > 0 ? (s.xp / data.elapsedMs) * 3600000 : 0,
        }));

        const { canvas, width, height } = renderExpandedOverlay(
          data.totalXp,
          data.xpPerHour,
          data.rollingXpPerHour,
          data.elapsedMs,
          skillsWithRate,
          data.sparklineData,
          {},
          data.skillRateHistory
        );

        const expandedImageData = getCanvasImageData(canvas, width, height);

        const chartData: ChartData = {
          dataPoints: data.sparklineData.length > 0 ? data.sparklineData : [data.xpPerHour || 0],
          lineColor: hexToRgba(data.primarySkillColor ?? "#00d4ff"),
          width: canvas.width,
          height: canvas.height,
          xpPerHour: data.xpPerHour ?? 0,
          elapsedMs: data.elapsedMs ?? 0,
          expandedImageData,
        };

        overlayRef.current.showChart(chartData).catch(e => {
          console.error("[useXpChartOverlay] Failed to update to expanded mode:", e);
        });
        setSize({ width, height });
      } else {
        // Compact mode: shader-based sparkline
        const chartWidth = newExpanded ? 320 : 200;
        const chartHeight = newExpanded ? 180 : 126;

        const chartData: ChartData = {
          dataPoints: data.sparklineData.length > 0 ? data.sparklineData : [data.xpPerHour || 0],
          lineColor: hexToRgba(data.primarySkillColor ?? "#00d4ff"),
          width: chartWidth,
          height: chartHeight,
          xpPerHour: data.xpPerHour ?? 0,
          elapsedMs: data.elapsedMs ?? 0,
        };
        overlayRef.current.showChart(chartData).catch(e => {
          console.error("[useXpChartOverlay] Failed to update overlay mode:", e);
        });
        setSize({ width: chartData.width, height: chartData.height });
      }
    }
  }, [isExpanded, isVisible]);

  // Set position
  const setPosition = React.useCallback((x: number, y: number) => {
    if (overlayRef.current) {
      overlayRef.current.setPosition(x, y);
      setPositionState({ x, y });
    }
  }, []);

  // Update chart data - uses pure GL rendering (compact) or canvas texture (expanded)
  const updateChart = React.useCallback((data: XpChartData) => {
    lastDataRef.current = data;

    if (!isVisible || !overlayRef.current) return;

    // If expanded with skill rate history, use canvas-rendered multi-line chart
    if (isExpanded && data.skillRateHistory && data.skillRateHistory.length > 0) {
      const skillsWithRate: SkillData[] = data.skillBreakdown.map(s => ({
        ...s,
        xpPerHour: data.elapsedMs > 0 ? (s.xp / data.elapsedMs) * 3600000 : 0,
      }));

      const { canvas, width, height } = renderExpandedOverlay(
        data.totalXp,
        data.xpPerHour,
        data.rollingXpPerHour,
        data.elapsedMs,
        skillsWithRate,
        data.sparklineData,
        {},
        data.skillRateHistory
      );

      const expandedImageData = getCanvasImageData(canvas, width, height);

      const chartData: ChartData = {
        dataPoints: data.sparklineData.length > 0 ? data.sparklineData : [data.xpPerHour || 0],
        lineColor: hexToRgba(data.primarySkillColor ?? "#00d4ff"),
        width: canvas.width,
        height: canvas.height,
        xpPerHour: data.xpPerHour ?? 0,
        elapsedMs: data.elapsedMs ?? 0,
        expandedImageData,
      };

      overlayRef.current.updateChart(chartData).catch(e => {
        console.error("[useXpChartOverlay] Failed to update expanded overlay:", e);
      });

      setSize(prev => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
    } else {
      // Compact mode: shader-based sparkline
      const chartWidth = isExpanded ? 320 : 200;
      const chartHeight = isExpanded ? 180 : 126;

      const chartData: ChartData = {
        dataPoints: data.sparklineData.length > 0 ? data.sparklineData : [data.xpPerHour || 0],
        lineColor: hexToRgba(data.primarySkillColor ?? "#00d4ff"),
        width: chartWidth,
        height: chartHeight,
        xpPerHour: data.xpPerHour ?? 0,
        elapsedMs: data.elapsedMs ?? 0,
      };

      overlayRef.current.updateChart(chartData).catch(e => {
        console.error("[useXpChartOverlay] Failed to update overlay:", e);
      });

      setSize(prev => {
        if (prev.width === chartData.width && prev.height === chartData.height) {
          return prev;
        }
        return { width: chartData.width, height: chartData.height };
      });
    }
  }, [isVisible, isExpanded]);

  // Drag handling
  const startDrag = React.useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  const updateDrag = React.useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const newX = dragStartRef.current.posX + deltaX;
    const newY = dragStartRef.current.posY + deltaY;

    setPosition(newX, newY);
  }, [isDragging, setPosition]);

  const endDrag = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    isAvailable,
    isVisible,
    isExpanded,
    position,
    size,
    uiBounds,
    show,
    hide,
    toggle,
    toggleExpanded,
    setPosition,
    updateChart,
    isDragging,
    startDrag,
    updateDrag,
    endDrag,
  };
}

// Re-export types from ChartRenderer for convenience
export type { SkillSeries, ChartConfig, SkillRateHistory } from "./ChartRenderer";
