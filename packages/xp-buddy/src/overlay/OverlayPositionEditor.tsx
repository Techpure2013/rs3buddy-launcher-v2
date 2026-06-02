/**
 * OverlayPositionEditor - Visual drag-to-position editor for the XP overlay
 *
 * Displays a preview of the overlay position on a miniature game screen representation.
 * Users can drag the overlay box to reposition it with snap-to-edge functionality.
 */

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";

// Snap distance threshold in screen pixels
const SNAP_THRESHOLD = 15;

// Snap point types
type SnapType = "edge" | "center" | "quarter";

interface SnapPoint {
  position: number;
  type: SnapType;
  axis: "x" | "y";
  label: string;
}

interface ActiveSnap {
  x: SnapPoint | null;
  y: SnapPoint | null;
}

export interface OverlayPositionEditorProps {
  /** Current X position */
  positionX: number;
  /** Current Y position */
  positionY: number;
  /** Callback when position changes */
  onPositionChange: (x: number, y: number) => void;
  /** Screen/UI width */
  screenWidth?: number;
  /** Screen/UI height */
  screenHeight?: number;
  /** Overlay width */
  overlayWidth?: number;
  /** Overlay height */
  overlayHeight?: number;
  /** Whether the overlay is currently visible */
  isVisible?: boolean;
}

// Common game resolutions
const COMMON_RESOLUTIONS = [
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
  { label: "4K", width: 3840, height: 2160 },
  { label: "720p", width: 1280, height: 720 },
  { label: "900p", width: 1600, height: 900 },
];

const OverlayPositionEditor: React.FC<OverlayPositionEditorProps> = ({
  positionX,
  positionY,
  onPositionChange,
  screenWidth: rawScreenWidth = 1920,
  screenHeight: rawScreenHeight = 1080,
  overlayWidth: rawOverlayWidth = 280,
  overlayHeight: rawOverlayHeight = 200,
  isVisible = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [activeSnap, setActiveSnap] = useState<ActiveSnap>({ x: null, y: null });

  // Sanitize inputs - ensure valid screen dimensions
  const screenWidth = rawScreenWidth > 0 ? rawScreenWidth : 1920;
  const screenHeight = rawScreenHeight > 0 ? rawScreenHeight : 1080;
  const overlayWidth = rawOverlayWidth > 0 ? rawOverlayWidth : 200;
  const overlayHeight = rawOverlayHeight > 0 ? rawOverlayHeight : 100;

  // Detect if screen size seems wrong (e.g., 0x0 or very small)
  const screenSizeWarning = rawScreenWidth < 800 || rawScreenHeight < 600;

  // Calculate aspect ratio and preview dimensions
  const aspectRatio = screenWidth / screenHeight;
  const previewWidth = 320;
  const previewHeight = Math.round(previewWidth / aspectRatio);

  // Scale factors
  const scaleX = previewWidth / screenWidth;
  const scaleY = previewHeight / screenHeight;

  // Scaled overlay dimensions
  const scaledOverlayWidth = overlayWidth * scaleX;
  const scaledOverlayHeight = overlayHeight * scaleY;

  // Generate snap points based on screen dimensions and overlay size
  const snapPoints = useMemo((): SnapPoint[] => {
    const points: SnapPoint[] = [];

    // Edge snap points (X axis - left/right edges)
    points.push({ position: 10, type: "edge", axis: "x", label: "Left" });
    points.push({ position: screenWidth - overlayWidth - 10, type: "edge", axis: "x", label: "Right" });

    // Edge snap points (Y axis - top/bottom edges)
    points.push({ position: 10, type: "edge", axis: "y", label: "Top" });
    points.push({ position: screenHeight - overlayHeight - 10, type: "edge", axis: "y", label: "Bottom" });

    // Center snap points
    points.push({ position: (screenWidth - overlayWidth) / 2, type: "center", axis: "x", label: "Center" });
    points.push({ position: (screenHeight - overlayHeight) / 2, type: "center", axis: "y", label: "Center" });

    // Quarter snap points
    points.push({ position: screenWidth * 0.25 - overlayWidth / 2, type: "quarter", axis: "x", label: "25%" });
    points.push({ position: screenWidth * 0.75 - overlayWidth / 2, type: "quarter", axis: "x", label: "75%" });
    points.push({ position: screenHeight * 0.25 - overlayHeight / 2, type: "quarter", axis: "y", label: "25%" });
    points.push({ position: screenHeight * 0.75 - overlayHeight / 2, type: "quarter", axis: "y", label: "75%" });

    return points;
  }, [screenWidth, screenHeight, overlayWidth, overlayHeight]);

  // Find nearest snap point within threshold
  const findSnap = useCallback(
    (value: number, axis: "x" | "y"): SnapPoint | null => {
      if (!snapEnabled) return null;

      const axisPoints = snapPoints.filter((p) => p.axis === axis);
      let nearestSnap: SnapPoint | null = null;
      let nearestDistance = SNAP_THRESHOLD;

      for (const point of axisPoints) {
        const distance = Math.abs(value - point.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSnap = point;
        }
      }

      return nearestSnap;
    },
    [snapEnabled, snapPoints]
  );

  // Scaled position
  const scaledX = positionX * scaleX;
  const scaledY = positionY * scaleY;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate new position in preview coordinates
      let newScaledX = e.clientX - containerRect.left - dragOffset.x;
      let newScaledY = e.clientY - containerRect.top - dragOffset.y;

      // Clamp to preview bounds
      newScaledX = Math.max(0, Math.min(newScaledX, previewWidth - scaledOverlayWidth));
      newScaledY = Math.max(0, Math.min(newScaledY, previewHeight - scaledOverlayHeight));

      // Convert back to screen coordinates (no rounding for smooth movement)
      let newX = newScaledX / scaleX;
      let newY = newScaledY / scaleY;

      // Apply snap detection
      const snapX = findSnap(newX, "x");
      const snapY = findSnap(newY, "y");

      if (snapX) {
        newX = snapX.position;
      }
      if (snapY) {
        newY = snapY.position;
      }

      // Update active snap state for visual feedback
      setActiveSnap({ x: snapX, y: snapY });

      onPositionChange(newX, newY);
    },
    [isDragging, dragOffset, previewWidth, previewHeight, scaledOverlayWidth, scaledOverlayHeight, scaleX, scaleY, onPositionChange, findSnap]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveSnap({ x: null, y: null });
  }, []);

  // Add/remove global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Preset positions
  const presets = [
    { label: "TL", title: "Top Left", x: 10, y: 10 },
    { label: "TR", title: "Top Right", x: screenWidth - overlayWidth - 10, y: 10 },
    { label: "BL", title: "Bottom Left", x: 10, y: screenHeight - overlayHeight - 10 },
    { label: "BR", title: "Bottom Right", x: screenWidth - overlayWidth - 10, y: screenHeight - overlayHeight - 10 },
    { label: "C", title: "Center", x: (screenWidth - overlayWidth) / 2, y: (screenHeight - overlayHeight) / 2 },
  ];

  // Snap line color based on type
  const getSnapLineColor = (type: SnapType): string => {
    switch (type) {
      case "edge":
        return "rgba(100, 200, 255, 0.8)";
      case "center":
        return "rgba(255, 200, 100, 0.8)";
      case "quarter":
        return "rgba(150, 255, 150, 0.6)";
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    controls: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "11px",
    },
    snapToggle: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      color: "#888",
      cursor: "pointer",
    },
    checkbox: {
      cursor: "pointer",
    },
    resolution: {
      marginLeft: "auto",
      color: "#666",
    },
    preview: {
      width: previewWidth,
      height: previewHeight,
      position: "relative" as const,
      backgroundColor: "#0a0a1a",
      border: "1px solid #333",
      borderRadius: "6px",
      overflow: "hidden",
      cursor: isDragging ? "grabbing" : "default",
      userSelect: "none" as const,
    },
    overlayBox: {
      position: "absolute" as const,
      left: scaledX,
      top: scaledY,
      width: scaledOverlayWidth,
      height: scaledOverlayHeight,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      border: "2px solid #00d4ff",
      borderRadius: "4px",
      cursor: isDragging ? "grabbing" : "grab",
      display: "flex",
      flexDirection: "column" as const,
      padding: "4px",
      boxShadow: isDragging
        ? "0 0 15px rgba(0, 212, 255, 0.6)"
        : "0 2px 8px rgba(0, 0, 0, 0.5)",
    },
    overlayTitle: {
      color: "#00d4ff",
      fontSize: "7px",
      fontWeight: "bold",
    },
    overlayContent: {
      color: "#888",
      fontSize: "6px",
      marginTop: "2px",
    },
    positionIndicator: {
      position: "absolute" as const,
      bottom: "4px",
      right: "8px",
      fontSize: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "#666",
      padding: "2px 6px",
      borderRadius: "3px",
    },
    snapIndicator: {
      position: "absolute" as const,
      top: "4px",
      left: "8px",
      fontSize: "10px",
      backgroundColor: "rgba(100, 200, 255, 0.9)",
      color: "#000",
      padding: "2px 6px",
      borderRadius: "3px",
      fontWeight: "bold",
    },
    presets: {
      display: "flex",
      gap: "4px",
      justifyContent: "space-between",
    },
    presetButton: {
      flex: 1,
      padding: "6px 8px",
      fontSize: "11px",
      backgroundColor: "#1a1a3a",
      color: "#00d4ff",
      border: "1px solid #333",
      borderRadius: "4px",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      {/* Screen size warning */}
      {screenSizeWarning && (
        <div style={{
          backgroundColor: "rgba(255, 150, 50, 0.2)",
          border: "1px solid #ffaa00",
          borderRadius: "4px",
          padding: "6px 8px",
          marginBottom: "8px",
          fontSize: "11px",
          color: "#ffaa00",
        }}>
          Screen size not detected. Using default 1920x1080. Show the overlay on game first.
        </div>
      )}
      {/* Controls */}
      <div style={styles.controls}>
        <label style={styles.snapToggle}>
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => setSnapEnabled(e.target.checked)}
            style={styles.checkbox}
          />
          Snap
        </label>
        <span style={{
          ...styles.resolution,
          color: screenSizeWarning ? "#ffaa00" : "#666",
        }}>
          {screenWidth}x{screenHeight}
        </span>
      </div>

      {/* Preview Canvas */}
      <div ref={containerRef} style={styles.preview}>
        {/* Clean dark background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #0a0a1a 0%, #12122a 100%)",
          }}
        />

        {/* Active snap lines only (shown when snapping) */}
        {(activeSnap.x || activeSnap.y) && (
          <svg
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            width={previewWidth}
            height={previewHeight}
          >
            {activeSnap.x && (
              <line
                x1={(activeSnap.x.position + overlayWidth / 2) * scaleX}
                y1={0}
                x2={(activeSnap.x.position + overlayWidth / 2) * scaleX}
                y2={previewHeight}
                stroke={getSnapLineColor(activeSnap.x.type)}
                strokeWidth={2}
              />
            )}
            {activeSnap.y && (
              <line
                x1={0}
                y1={(activeSnap.y.position + overlayHeight / 2) * scaleY}
                x2={previewWidth}
                y2={(activeSnap.y.position + overlayHeight / 2) * scaleY}
                stroke={getSnapLineColor(activeSnap.y.type)}
                strokeWidth={2}
              />
            )}
          </svg>
        )}

        {/* Draggable Overlay Preview */}
        <div onMouseDown={handleMouseDown} style={styles.overlayBox}>
          <span style={styles.overlayTitle}>XP Tracker</span>
          <span style={styles.overlayContent}>
            {isVisible ? "Overlay visible" : "Drag to position"}
          </span>
        </div>

        {/* Position indicator */}
        <div style={styles.positionIndicator}>
          {Math.round(positionX)}, {Math.round(positionY)}
        </div>

        {/* Snap indicator */}
        {(activeSnap.x || activeSnap.y) && (
          <div style={styles.snapIndicator}>
            Snap: {[activeSnap.x?.label, activeSnap.y?.label].filter(Boolean).join(" + ")}
          </div>
        )}
      </div>

      {/* Preset Buttons */}
      <div style={styles.presets}>
        {presets.map((preset) => (
          <button
            key={preset.label}
            style={styles.presetButton}
            title={preset.title}
            onClick={() => onPositionChange(Math.round(preset.x), Math.round(preset.y))}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OverlayPositionEditor;
