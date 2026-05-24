"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group } from "react-konva";
import { useBoardStore } from "@/store/useBoardStore";
import { COMPONENT_LIBRARY } from "@/lib/componentLibrary";
import { runDRCCheck } from "@/lib/drcEngine";
import Konva from "konva";

const SCALE = 6; // 1 mm = 6 px

export default function CanvasArea({ mode }: { mode: "schematic" | "pcb" }) {
  const {
    boardState,
    drcSettings,
    activeLayer,
    activeTool,
    selectedLibraryRef,
    selectedComponentId,
    selectedNetId,
    addComponent,
    updateComponentPosition,
    removeComponent,
    connectPins,
    addTraceSegment,
    setSelectedComponentId,
    setActiveTool,
    simulatingNetStates,
    removeNet,
    setSelectedNetId,
    removeTraceSegment,
    wireStartPin,
    setWireStartPin,
    updateNetBendStyle,
  } = useBoardStore();

  const drcViolations = runDRCCheck(boardState, drcSettings);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 50, y: 50 });
  
  // Track active connection creation
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Wire / Trace routing style state
  const [bendStyle, setBendStyle] = useState<'horizontal-first' | 'vertical-first' | 'straight'>('horizontal-first');

  // Spacebar toggle routing direction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (activeTool === "wire" || activeTool === "trace") {
          e.preventDefault();
          setBendStyle((prev) => {
            if (prev === "horizontal-first") return "vertical-first";
            if (prev === "vertical-first") return "straight";
            return "horizontal-first";
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool]);

  // Responsive canvas size
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Zooming handler
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const zoomFactor = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * zoomFactor : oldScale / zoomFactor;

    // Constrain zoom
    if (newScale < 0.2 || newScale > 10) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePos(newPos);
  };

  // Convert screen coordinates to Board coordinates (in mm)
  const getBoardCoords = (pointer: { x: number; y: number }) => {
    // Relative to the centered stage
    const boardX = (pointer.x - stagePos.x) / stageScale / SCALE;
    const boardY = (pointer.y - stagePos.y) / stageScale / SCALE;
    return { x: boardX, y: boardY };
  };

  const getWireStartPinCoords = () => {
    if (!wireStartPin) return null;
    const comp = boardState.components[wireStartPin.compId];
    if (!comp) return null;
    const template = COMPONENT_LIBRARY[comp.libraryRef];
    const pinTemplate = template?.pins.find((p) => p.pinId === wireStartPin.pinId);
    if (!pinTemplate) return null;

    // Calculate rotated pin position relative to component center
    const angleRad = (comp.rotation * Math.PI) / 180;
    const rx = pinTemplate.x * Math.cos(angleRad) - pinTemplate.y * Math.sin(angleRad);
    const ry = pinTemplate.x * Math.sin(angleRad) + pinTemplate.y * Math.cos(angleRad);

    return {
      x: (comp.position.x + rx) * SCALE,
      y: (comp.position.y + ry) * SCALE,
    };
  };

  const getCanvasCursorPos = () => {
    if (!cursorPos) return null;
    const boardCoords = getBoardCoords(cursorPos);
    return {
      x: boardCoords.x * SCALE,
      y: boardCoords.y * SCALE,
    };
  };

  // Handle click on canvas background
  const handleCanvasClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Check if clicking directly on the background
    const clickedOnBackground = e.target === stage || e.target.name() === "board-bg" || e.target.name() === "grid-lines";
    
    if (clickedOnBackground) {
      if (activeTool === "component" && selectedLibraryRef) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const coords = getBoardCoords(pointer);
          // Snap placement to 1mm grid
          const snappedX = Math.round(coords.x);
          const snappedY = Math.round(coords.y);
          
          addComponent(selectedLibraryRef, snappedX, snappedY);
          setActiveTool("select");
        }
      } else {
        setSelectedComponentId(null);
        setSelectedNetId(null);
        setWireStartPin(null);
      }
    }
  };

  // Grid sizing
  const gridSpacing = 5 * SCALE; // Grid lines every 5 mm
  const boardWidthPx = boardState.width * SCALE;
  const boardHeightPx = boardState.height * SCALE;

  // Render Nets (ratsnest + routed copper traces)
  const renderNets = () => {
    const elements: React.ReactNode[] = [];

    Object.keys(boardState.nets).forEach((netId) => {
      const net = boardState.nets[netId];
      const isSimActive = simulatingNetStates[netId] === true;
      const isNetSelected = selectedNetId === netId;
      
      // 1. Draw physical copper traces (Only in PCB Mode)
      if (mode === "pcb") {
        net.segments.forEach((seg, idx) => {
          let strokeColor = "#3b82f6"; // default bottom blue
          if (isSimActive) {
            strokeColor = "#22c55e"; // Glowing Neon Green
          } else if (isNetSelected) {
            strokeColor = "#06b6d4"; // Glowing Neon Cyan for selection
          } else if (seg.layer === "TopCopper") {
            strokeColor = "#ef4444"; // red top
          } else if (seg.layer === "Silkscreen") {
            strokeColor = "#22c55e"; // green silkscreen
          } else if (seg.layer === "Drill") {
            strokeColor = "#eab308"; // yellow drill
          }

          elements.push(
            <Line
              key={`trace_${netId}_${idx}`}
              points={[
                seg.startX * SCALE,
                seg.startY * SCALE,
                seg.endX * SCALE,
                seg.endY * SCALE,
              ]}
              stroke={strokeColor}
              strokeWidth={((isSimActive || isNetSelected) ? seg.width * 1.6 : seg.width) * SCALE}
              hitStrokeWidth={12} // Generous click boundary for easy editing
              lineCap="round"
              lineJoin="round"
              shadowBlur={isSimActive || isNetSelected ? 12 : 2}
              shadowColor={strokeColor}
              shadowOpacity={isSimActive || isNetSelected ? 0.9 : 0.4}
              opacity={activeLayer === seg.layer || isSimActive || isNetSelected ? 1 : 0.3}
              onClick={(e) => {
                e.cancelBubble = true; // Stop background canvas select click
                if (activeTool === "delete") {
                  removeTraceSegment(netId, idx);
                } else {
                  setSelectedNetId(netId);
                  setSelectedComponentId(null);
                }
              }}
            />
          );
        });
      }

      // 2. Draw logical connections (Ratsnest in PCB, Wires in Schematic)
      const pinCoords: { x: number; y: number }[] = [];
      net.connectedPins.forEach((pinRef) => {
        const [compId, pinId] = pinRef.split(":");
        const comp = boardState.components[compId];
        const template = comp ? COMPONENT_LIBRARY[comp.libraryRef] : null;
        const pinTemplate = template?.pins.find((p) => p.pinId === pinId);

        if (comp && pinTemplate) {
          // Calculate rotated pin position relative to component center
          const angleRad = (comp.rotation * Math.PI) / 180;
          const rx = pinTemplate.x * Math.cos(angleRad) - pinTemplate.y * Math.sin(angleRad);
          const ry = pinTemplate.x * Math.sin(angleRad) + pinTemplate.y * Math.cos(angleRad);

          pinCoords.push({
            x: (comp.position.x + rx) * SCALE,
            y: (comp.position.y + ry) * SCALE,
          });
        }
      });

      // Connect pin coordinates in a daisy chain
      for (let i = 0; i < pinCoords.length - 1; i++) {
        const hasSegments = net.segments.length > 0;
        
        // In PCB mode, hide ratsnest if already routed
        if (mode === "pcb" && hasSegments) continue;

        const isSelected = selectedNetId === netId;
        
        const x1 = pinCoords[i].x;
        const y1 = pinCoords[i].y;
        const x2 = pinCoords[i + 1].x;
        const y2 = pinCoords[i + 1].y;

        const currentBendStyle = net.bendStyle || (mode === "schematic" ? "horizontal-first" : "straight");

        let pts = [x1, y1, x2, y2];
        if (currentBendStyle === "horizontal-first") {
          pts = [x1, y1, x2, y1, x2, y2];
        } else if (currentBendStyle === "vertical-first") {
          pts = [x1, y1, x1, y2, x2, y2];
        }

        elements.push(
          <Line
            key={`rats_${netId}_${i}`}
            points={pts}
            stroke={
              isSimActive
                ? "#22c55e"
                : isSelected
                ? "#059669"
                : mode === "schematic"
                ? "#166534"
                : "#d97706"
            }
            strokeWidth={
              isSimActive
                ? 2.5
                : isSelected
                ? mode === "schematic"
                  ? 2.5
                  : 2
                : mode === "schematic"
                ? 1.5
                : 1
            }
            hitStrokeWidth={12} // Generous click boundary for easy editing
            dash={mode === "pcb" && !isSelected ? [4, 4] : undefined}
            shadowBlur={isSimActive || isSelected ? 8 : 0}
            shadowColor={isSimActive ? "#22c55e" : "#059669"}
            opacity={isSimActive || isSelected ? 1 : mode === "schematic" ? 0.75 : 0.35}
            onClick={(e) => {
              e.cancelBubble = true;
              if (activeTool === "delete") {
                removeNet(netId);
              } else {
                setSelectedNetId(netId);
                setSelectedComponentId(null);
              }
            }}
          />
        );
      }
    });

    return elements;
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 bg-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden flex shadow-inner"
    >
      {/* HUD Info bar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap max-w-[80%]">
        <div className="bg-white/95 border border-zinc-200/80 rounded-xl px-3.5 py-2 text-[10px] font-mono flex items-center gap-2 shadow-md text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>TOOL:</span>
          <span className="text-emerald-800 font-bold uppercase">{activeTool}</span>
        </div>
        {(activeTool === "wire" || activeTool === "trace") && (
          <div className="bg-white/95 border border-zinc-200/80 rounded-xl px-3.5 py-2 text-[10px] font-mono flex items-center gap-2 shadow-md text-zinc-650">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>BEND STYLE:</span>
            <span className="text-emerald-800 font-bold uppercase">{bendStyle.replace("-", " ")}</span>
            <span className="text-[9px] text-zinc-400 font-sans font-normal ml-1">(Press [Spacebar] to Toggle)</span>
          </div>
        )}
        {wireStartPin && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl px-3.5 py-2 text-[10px] font-mono flex items-center gap-2 shadow-md text-emerald-800">
            <span className="font-bold animate-pulse">CONNECTING PIN:</span>
            <span className="text-zinc-700">
              {boardState.components[wireStartPin.compId]?.libraryRef} ({wireStartPin.pinId})
            </span>
          </div>
        )}
      </div>

      {/* Main Konva Stage */}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        onMouseMove={(e) => {
          const stage = stageRef.current;
          if (!stage) return;
          const pointer = stage.getPointerPosition();
          if (pointer) {
            setCursorPos(pointer);
          }
        }}
        draggable={activeTool === "select"}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos(e.target.position());
          }
        }}
        className={
          activeTool === "select"
            ? "cursor-grab active:cursor-grabbing"
            : activeTool === "delete"
            ? "cursor-cell"
            : "cursor-crosshair"
        }
      >
        <Layer>
          {/* Infinite Grid Background (rendered within the board bounds) */}
          <Rect
            name="board-bg"
            x={0}
            y={0}
            width={boardWidthPx}
            height={boardHeightPx}
            fill={mode === "schematic" ? "#fdfdfd" : "#0b3c20"}
            stroke={mode === "schematic" ? "#cbd5e1" : "#d97706"}
            strokeWidth={mode === "schematic" ? 1.5 : 3}
            shadowColor={mode === "schematic" ? "#cbd5e1" : "#000000"}
            shadowBlur={mode === "schematic" ? 10 : 20}
            shadowOpacity={mode === "schematic" ? 0.3 : 0.4}
            cornerRadius={4}
          />

          {/* Grid lines inside PCB Board */}
          {Array.from({ length: Math.ceil(boardState.width / 5) }).map((_, i) => (
            <Line
              key={`grid_v_${i}`}
              name="grid-lines"
              points={[i * gridSpacing, 0, i * gridSpacing, boardHeightPx]}
              stroke={mode === "schematic" ? "#f1f5f9" : "#0f4c2c"}
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: Math.ceil(boardState.height / 5) }).map((_, i) => (
            <Line
              key={`grid_h_${i}`}
              name="grid-lines"
              points={[0, i * gridSpacing, boardWidthPx, i * gridSpacing]}
              stroke={mode === "schematic" ? "#f1f5f9" : "#0f4c2c"}
              strokeWidth={0.5}
            />
          ))}

          {/* Render nets (traces & ratsnest connection lines) */}
          {renderNets()}

          {/* Draw active connection wire from pin */}
          {(() => {
            const startCoords = getWireStartPinCoords();
            const curPos = getCanvasCursorPos();
            if (!startCoords || !curPos) return null;

            let pts = [startCoords.x, startCoords.y, curPos.x, curPos.y];
            if (bendStyle === "horizontal-first") {
              pts = [startCoords.x, startCoords.y, curPos.x, startCoords.y, curPos.x, curPos.y];
            } else if (bendStyle === "vertical-first") {
              pts = [startCoords.x, startCoords.y, startCoords.x, curPos.y, curPos.x, curPos.y];
            }

            return (
              <Line
                points={pts}
                stroke="#10b981"
                strokeWidth={1.5}
                dash={[5, 5]}
                shadowBlur={8}
                shadowColor="#10b981"
                shadowOpacity={0.8}
              />
            );
          })()}

          {/* Render DRC Violation Visual Hotspots */}
          {drcViolations.map((violation, idx) => {
            if (!violation.position) return null;
            const vx = violation.position.x * SCALE;
            const vy = violation.position.y * SCALE;

            return (
              <Group key={`violation_spot_${violation.id}_${idx}`} listening={false}>
                {/* Outer pulsing ring */}
                <Circle
                  x={vx}
                  y={vy}
                  radius={14}
                  fill="#ef4444"
                  opacity={0.3}
                  shadowColor="#ef4444"
                  shadowBlur={10}
                  shadowOpacity={0.8}
                />
                {/* Core alert pad */}
                <Circle
                  x={vx}
                  y={vy}
                  radius={6}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <Text
                  text="!"
                  x={vx - 3}
                  y={vy - 4.5}
                  width={6}
                  align="center"
                  fontSize={8}
                  fill="#ffffff"
                  fontStyle="bold"
                />
              </Group>
            );
          })}

          {/* Render components */}
          {Object.values(boardState.components).map((comp) => {
            const template = COMPONENT_LIBRARY[comp.libraryRef];
            if (!template) return null;

            const w = template.width * SCALE;
            const h = template.height * SCALE;
            const isSelected = selectedComponentId === comp.id;

            return (
              <Group
                key={comp.id}
                x={comp.position.x * SCALE}
                y={comp.position.y * SCALE}
                rotation={comp.rotation}
                offsetX={0}
                offsetY={0}
                draggable={activeTool === "select"}
                 onDragStart={() => {
                  setSelectedComponentId(comp.id);
                  setSelectedNetId(null);
                }}
                onDragEnd={(e) => {
                  // Convert dragged pixels back to board mm coordinates
                  const nx = e.target.x() / SCALE;
                  const ny = e.target.y() / SCALE;
                  
                  // Snap to 1mm grid
                  const snappedX = Math.round(nx);
                  const snappedY = Math.round(ny);
                  
                  updateComponentPosition(comp.id, snappedX, snappedY);
                  
                  // Force Konva node update
                  e.target.x(snappedX * SCALE);
                  e.target.y(snappedY * SCALE);
                }}
                onClick={(e) => {
                  e.cancelBubble = true; // prevent background trigger
                  if (activeTool === "delete") {
                    removeComponent(comp.id);
                    setSelectedComponentId(null);
                    setSelectedNetId(null);
                  } else {
                    setSelectedComponentId(comp.id);
                    setSelectedNetId(null);
                  }
                }}
              >
                {/* 1. Physical Footprint Shape Outline */}
                {/* 1. Footprint Shape Outline */}
                {comp.libraryRef === "VIA" ? (
                  mode === "schematic" ? (
                    <Circle
                      radius={3}
                      fill="#059669"
                      stroke={isSelected ? "#059669" : "#0f5132"}
                      strokeWidth={isSelected ? 1 : 0.5}
                      shadowBlur={isSelected ? 6 : 0}
                      shadowColor="#059669"
                    />
                  ) : (
                    <Group>
                      {/* Plated copper pad ring */}
                      <Circle
                        radius={w / 2}
                        fill="#b45309"
                        stroke={isSelected ? "#059669" : "#f59e0b"}
                        strokeWidth={isSelected ? 1.5 : 0.75}
                        shadowBlur={isSelected ? 10 : 2}
                        shadowColor={isSelected ? "#059669" : "#b45309"}
                      />
                      {/* Drill hole in center */}
                      <Circle
                        radius={(0.3 / 2) * SCALE}
                        fill="#090d16"
                      />
                    </Group>
                  )
                ) : comp.libraryRef === "MOUNTING_HOLE" ? (
                  mode === "schematic" ? (
                    <Group>
                      <Circle
                        radius={w / 2}
                        stroke={isSelected ? "#059669" : "#64748b"}
                        strokeWidth={isSelected ? 1.5 : 1}
                        dash={[3, 3]}
                      />
                      <Line
                        points={[0, -w / 2, 0, w / 2]}
                        stroke={isSelected ? "#059669" : "#64748b"}
                        strokeWidth={0.75}
                      />
                      <Line
                        points={[-w / 2, 0, w / 2, 0]}
                        stroke={isSelected ? "#059669" : "#64748b"}
                        strokeWidth={0.75}
                      />
                    </Group>
                  ) : (
                    <Group>
                      {/* Outer clearance circle */}
                      <Circle
                        radius={w / 2}
                        stroke={isSelected ? "#059669" : "#eab308"}
                        strokeWidth={isSelected ? 1.5 : 0.75}
                        dash={[4, 2]}
                        opacity={0.6}
                      />
                      {/* Inner mechanical drill hole */}
                      <Circle
                        radius={(3.2 / 2) * SCALE}
                        fill="#090d16"
                        stroke="#475569"
                        strokeWidth={1.5}
                      />
                    </Group>
                  )
                ) : (
                  <Rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    fill={mode === "schematic" ? "#ffffff" : template.color}
                    stroke={isSelected ? "#059669" : mode === "schematic" ? "#166534" : "#cbd5e1"}
                    strokeWidth={isSelected ? 2 : 1}
                    shadowColor={isSelected ? "#059669" : "#000000"}
                    shadowBlur={isSelected ? 10 : 4}
                    shadowOpacity={isSelected ? 0.6 : 0.3}
                    cornerRadius={mode === "schematic" ? 0 : 2}
                  />
                )}

                {/* Pulse LED glows when logic simulation turns on the connected net */}
                {(() => {
                  const isLED = comp.libraryRef.includes("LED");
                  const activeNetId = comp.pins.find(
                    (p) => p.connectedNetId && simulatingNetStates[p.connectedNetId]
                  )?.connectedNetId;
                  const isLEDPowerOn = isLED && activeNetId !== undefined;

                  return isLEDPowerOn ? (
                    <Circle
                      x={0}
                      y={0}
                      radius={template.width * SCALE * 0.4}
                      fill="#22c55e"
                      opacity={0.8}
                      shadowColor="#22c55e"
                      shadowBlur={18}
                      shadowOpacity={0.95}
                    />
                  ) : null;
                })()}

                {/* Pin Header / Silkscreen label */}
                {comp.libraryRef !== "VIA" && comp.libraryRef !== "MOUNTING_HOLE" && (
                  <Text
                    text={comp.libraryRef.split("_")[0]} // short name
                    x={-w / 2}
                    y={-h / 2 - 12}
                    width={w}
                    align="center"
                    fontSize={8}
                    fontFamily="monospace"
                    fill="#94a3b8"
                  />
                )}

                {/* 2. Pins / Pads rendering */}
                {comp.pins.map((pin) => {
                  const px = pin.x * SCALE;
                  const py = pin.y * SCALE;
                  const isPinConnected = pin.connectedNetId !== null;
                  const isPinSimActive = isPinConnected && simulatingNetStates[pin.connectedNetId!] === true;

                  return (
                    <Group key={pin.pinId}>
                      {/* Interactive click area pad */}
                      <Circle
                        x={px}
                        y={py}
                        radius={mode === "schematic" ? 2.2 : 3}
                        fill={
                          isPinSimActive 
                            ? "#22c55e" 
                            : mode === "schematic" 
                              ? "#38bdf8" 
                              : isPinConnected 
                                ? "#f59e0b" 
                                : "#d4d4d8"
                        }
                        stroke={mode === "schematic" ? "#0284c7" : activeLayer === "TopCopper" ? "#ef4444" : "#3b82f6"}
                        strokeWidth={mode === "schematic" ? 0.5 : 1}
                        shadowBlur={isPinSimActive ? 8 : 0}
                        shadowColor="#22c55e"
                        onClick={(e) => {
                          e.cancelBubble = true;
                          
                          if (activeTool === "delete") {
                            if (pin.connectedNetId) {
                              removeNet(pin.connectedNetId);
                              setSelectedNetId(null);
                            }
                          } else if (activeTool === "wire") {
                            // Wire Routing logic: click to connect
                            if (!wireStartPin) {
                              // Select start pin
                              setWireStartPin({
                                compId: comp.id,
                                pinId: pin.pinId,
                              });
                            } else {
                              // Connect start pin to current pin
                              if (wireStartPin.compId !== comp.id || wireStartPin.pinId !== pin.pinId) {
                                const netId = connectPins(
                                  wireStartPin.compId,
                                  wireStartPin.pinId,
                                  comp.id,
                                  pin.pinId
                                );
                                // Persist the bendStyle selected during interactive draw
                                updateNetBendStyle(netId, bendStyle);
                              }
                              setWireStartPin(null);
                            }
                          } else if (activeTool === "trace") {
                            // Copper trace routing: auto router
                            if (!wireStartPin) {
                              setWireStartPin({
                                compId: comp.id,
                                pinId: pin.pinId,
                              });
                            } else {
                              if (wireStartPin.compId !== comp.id || wireStartPin.pinId !== pin.pinId) {
                                // Add a physical trace connecting them
                                const startComp = boardState.components[wireStartPin.compId];
                                const startTemplate = startComp ? COMPONENT_LIBRARY[startComp.libraryRef] : null;
                                const startPinTemplate = startTemplate?.pins.find(p => p.pinId === wireStartPin.pinId);

                                if (startComp && startPinTemplate) {
                                  // calculate rotated starting coordinates
                                  const startAngleRad = (startComp.rotation * Math.PI) / 180;
                                  const srx = startPinTemplate.x * Math.cos(startAngleRad) - startPinTemplate.y * Math.sin(startAngleRad);
                                  const sry = startPinTemplate.x * Math.sin(startAngleRad) + startPinTemplate.y * Math.cos(startAngleRad);

                                  const startCoords = {
                                    x: startComp.position.x + srx,
                                    y: startComp.position.y + sry,
                                  };

                                  const endCoords = {
                                    x: comp.position.x + pin.x,
                                    y: comp.position.y + pin.y,
                                  };

                                  // Create logical net connection first
                                  const netId = connectPins(
                                    wireStartPin.compId,
                                    wireStartPin.pinId,
                                    comp.id,
                                    pin.pinId
                                  );

                                  // Update the net's bend style to keep it persistent
                                  updateNetBendStyle(netId, bendStyle);

                                  const traceWidth = activeLayer === "TopCopper" ? 0.3 : 0.25;

                                  if (bendStyle === "horizontal-first" && startCoords.x !== endCoords.x && startCoords.y !== endCoords.y) {
                                    // Add horizontal trace segment
                                    addTraceSegment(netId, {
                                      startX: startCoords.x,
                                      startY: startCoords.y,
                                      endX: endCoords.x,
                                      endY: startCoords.y,
                                      width: traceWidth,
                                      layer: activeLayer,
                                    });
                                    // Add vertical trace segment
                                    addTraceSegment(netId, {
                                      startX: endCoords.x,
                                      startY: startCoords.y,
                                      endX: endCoords.x,
                                      endY: endCoords.y,
                                      width: traceWidth,
                                      layer: activeLayer,
                                    });
                                  } else if (bendStyle === "vertical-first" && startCoords.x !== endCoords.x && startCoords.y !== endCoords.y) {
                                    // Add vertical trace segment
                                    addTraceSegment(netId, {
                                      startX: startCoords.x,
                                      startY: startCoords.y,
                                      endX: startCoords.x,
                                      endY: endCoords.y,
                                      width: traceWidth,
                                      layer: activeLayer,
                                    });
                                    // Add horizontal trace segment
                                    addTraceSegment(netId, {
                                      startX: startCoords.x,
                                      startY: endCoords.y,
                                      endX: endCoords.x,
                                      endY: endCoords.y,
                                      width: traceWidth,
                                      layer: activeLayer,
                                    });
                                  } else {
                                    // Straight/diagonal or collinear case
                                    addTraceSegment(netId, {
                                      startX: startCoords.x,
                                      startY: startCoords.y,
                                      endX: endCoords.x,
                                      endY: endCoords.y,
                                      width: traceWidth,
                                      layer: activeLayer,
                                    });
                                  }
                                }
                              }
                              setWireStartPin(null);
                            }
                          }
                        }}
                      />
                      {/* Little tooltip pin label */}
                      {comp.libraryRef !== "VIA" && comp.libraryRef !== "MOUNTING_HOLE" && (
                        <Text
                          text={pin.label}
                          x={px - 20}
                          y={py - 10}
                          width={40}
                          align="center"
                          fontSize={8}
                          fontStyle="bold"
                          fill={mode === "schematic" ? "#0f172a" : "#ffffff"}
                          fontFamily="sans-serif"
                          listening={false}
                        />
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Visual Workspace grid stats overlay bottom-left */}
      <div className="absolute bottom-4 left-4 bg-zinc-950/90 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-[10px] font-mono text-zinc-400 backdrop-blur shadow-md">
        SCALE: 1mm = {SCALE}px // BOARD: {boardState.width}x{boardState.height} mm
      </div>
    </div>
  );
}
