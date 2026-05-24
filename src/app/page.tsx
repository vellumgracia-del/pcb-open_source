"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useBoardStore } from "@/store/useBoardStore";
import { COMPONENT_LIBRARY, LibraryComponent } from "@/lib/componentLibrary";
import { LayerType } from "@/types/pcb";
import { runDRCCheck } from "@/lib/drcEngine";
import { exportGerber, exportBOM } from "@/lib/exportEngine";
import { 
  Cpu, 
  MousePointer, 
  Plus, 
  Trash2, 
  RotateCw, 
  Activity, 
  Layers, 
  FileText, 
  FolderOpen, 
  Check, 
  AlertCircle, 
  Code,
  Zap,
  Download,
  Info,
  Settings
} from "lucide-react";

// Dynamically import CanvasArea to prevent SSR window issues
const CanvasArea = dynamic<any>(() => import("@/components/CanvasArea"), {
  ssr: false,
});

export default function Home() {
  const {
    boardState,
    drcSettings,
    activeLayer,
    activeTool,
    selectedLibraryRef,
    selectedComponentId,
    selectedNetId,
    addComponent,
    removeComponent,
    updateComponentRotation,
    clearBoard,
    setBoardDimensions,
    updateDRCSettings,
    setActiveLayer,
    setActiveTool,
    setSelectedLibraryRef,
    setSelectedComponentId,
    setSelectedNetId,
    loadDemoBoard,
    setSimulatingNetState,
    removeNet,
    clearTraceSegments,
    removeTraceSegment,
    wireStartPin,
    setWireStartPin,
  } = useBoardStore();

  const [mode, setMode] = useState<"schematic" | "pcb">("schematic");
  const [boardWidth, setBoardWidth] = useState(boardState.width);
  const [boardHeight, setBoardHeight] = useState(boardState.height);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Simulation states
  const [simOpen, setSimOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simInterval, setSimInterval] = useState<NodeJS.Timeout | null>(null);
  const [simCode, setSimCode] = useState<string>(`// NodeMCU ESP32 IoT Test Logic
void setup() {
  pinMode(GPIO5, OUTPUT); // Connected to LED Anode
  pinMode(GPIO32, INPUT);  // SHT31 Temp Sensor
}

void loop() {
  // Toggle GPIO5 High and Low to blink the LED
  digitalWrite(GPIO5, HIGH);
  delay(1000);
  digitalWrite(GPIO5, LOW);
  delay(1000);
}`);

  // Avoid hydration mismatch and cleanup intervals
  useEffect(() => {
    setMounted(true);
    setBoardWidth(boardState.width);
    setBoardHeight(boardState.height);
    
    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [boardState.width, boardState.height, simInterval]);

  // Global keydown handler to support keyboard Delete / Backspace deletion of selected elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in text inputs or textareas
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedComponentId) {
          removeComponent(selectedComponentId);
          setSelectedComponentId(null);
        } else if (selectedNetId) {
          removeNet(selectedNetId);
          setSelectedNetId(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedComponentId, selectedNetId, removeComponent, removeNet, setSelectedComponentId, setSelectedNetId]);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setBoardWidth(val);
    if (val > 10) setBoardDimensions(val, boardState.height);
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setBoardHeight(val);
    if (val > 10) setBoardDimensions(boardState.width, val);
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090e] text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide">Loading Studio Workspace...</p>
        </div>
      </div>
    );
  }

  const selectedComponent = selectedComponentId 
    ? boardState.components[selectedComponentId] 
    : null;
  const libraryComponent = selectedComponent 
    ? COMPONENT_LIBRARY[selectedComponent.libraryRef] 
    : null;

  const drcViolations = runDRCCheck(boardState, drcSettings);

  return (
    <div className="flex h-screen flex-col bg-[#05070a] text-zinc-100 font-sans antialiased overflow-hidden">
      {/* 1. Header Studio */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/40 bg-[#080b11]/80 backdrop-blur-md px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white font-bold shadow-lg shadow-cyan-500/10">
            P
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              PCB STUDIO V2
            </h1>
            <p className="text-[9px] text-zinc-500 font-mono tracking-widest">WORKSPACE // OFFLINE_MODE</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center rounded-xl bg-[#0a0d16]/80 p-0.5 border border-zinc-800/40">
          <button
            onClick={() => setMode("schematic")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1 text-xs font-semibold transition-all ${
              mode === "schematic"
                ? "bg-[#0e1628] text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-950/20"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Schematic Capture
          </button>
          <button
            onClick={() => setMode("pcb")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1 text-xs font-semibold transition-all ${
              mode === "pcb"
                ? "bg-[#0e1628] text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-950/20"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            PCB Layout
          </button>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSimOpen(true);
              setSimLogs([
                "// Press 'Run Logic Simulation' to initiate testing...",
              ]);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-800/30 bg-emerald-950/20 hover:bg-emerald-950/40 hover:border-emerald-700/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 transition cursor-pointer shadow-lg shadow-emerald-950/10"
          >
            <Zap className="h-3.5 w-3.5 animate-pulse" />
            Pre-flight Sim
          </button>
          <button
            onClick={() => exportGerber(boardState, activeLayer)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-zinc-700/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            Gerber
          </button>
          <button
            onClick={() => exportBOM(boardState)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-zinc-700/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-yellow-500" />
            BOM CSV
          </button>

          <div className="h-5 w-px bg-zinc-800/40 mx-1" />

          <button
            onClick={loadDemoBoard}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-zinc-700/60 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition cursor-pointer"
          >
            <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
            Load Demo Board
          </button>
          <button
            onClick={clearBoard}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-red-950/20 hover:border-red-900/30 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 transition cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Board
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. Left Panel: Component Library */}
        <aside className="w-80 border-r border-zinc-800/40 bg-[#080a10] flex flex-col overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-zinc-800/40 bg-zinc-950/20">
            <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2 font-mono">COMPONENT CATALOG</h2>
            <div className="relative mb-2.5">
              <input
                type="text"
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3.5 py-1.5 pl-8 text-xs text-zinc-200 placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none transition-all font-sans"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs select-none">
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Horizontal Categories sliding pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1 custom-scrollbar scrollbar-none">
              {["all", "MCU", "Discrete", "Connector", "Passive"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-sm"
                      : "bg-zinc-950/30 border-zinc-850/50 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Component Catalog List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex flex-col gap-2.5">
              {(() => {
                const filtered = Object.entries(COMPONENT_LIBRARY).filter(([key, item]) => {
                  const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    key.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
                  return matchesSearch && matchesCategory;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-zinc-500 text-xs font-sans">
                      No components found matching current filters.
                    </div>
                  );
                }

                return filtered.map(([key, item]) => (
                  <div
                    key={key}
                    onClick={() => {
                      setActiveTool("component");
                      setSelectedLibraryRef(key);
                    }}
                    className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all duration-200 flex flex-col ${
                      selectedLibraryRef === key
                        ? "bg-[#0e1726]/40 border-cyan-500/50 shadow-md shadow-cyan-950/30"
                        : "bg-zinc-950/20 border-zinc-800/40 hover:border-zinc-700/60 hover:bg-zinc-900/10"
                    }`}
                  >
                    {/* Active glowing indicator */}
                    {selectedLibraryRef === key && (
                      <span className="absolute top-3.5 left-2 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
                    )}

                    <div className={`flex items-center justify-between mb-1.5 ${selectedLibraryRef === key ? "pl-2" : ""}`}>
                      <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-cyan-400 transition font-sans">
                        {item.name}
                      </span>
                      <span className="rounded bg-zinc-900 border border-zinc-800/60 px-1.5 py-0.5 text-[8px] text-zinc-400 uppercase font-mono">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mb-2 font-mono">
                      Footprint: {item.packageType}
                    </span>
                    <p className="text-[10px] text-zinc-400 leading-snug">
                      {item.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[9px] text-zinc-500">
                      <span>Pins: {item.pins.length}</span>
                      <span className="text-zinc-650 font-mono">{item.width}x{item.height} mm</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </aside>

        {/* 3. Center Area: Canvas Workspace */}
        <main className="flex-1 p-4 bg-[#05070a] flex flex-col overflow-hidden relative">
          {/* Floating Tools Dock */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#080b12]/90 backdrop-blur-md border border-zinc-800/80 rounded-2xl px-2.5 py-2 shadow-2xl shadow-black/50 transition-all duration-200">
            {(["select", "component", "wire", "trace", "delete"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setActiveTool(t);
                  if (t !== "component") setSelectedLibraryRef(null);
                }}
                title={`Tool: ${t.toUpperCase()}`}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer relative group ${
                  activeTool === t
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-md shadow-cyan-950/20"
                    : "bg-zinc-950/30 border-zinc-850/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 hover:bg-zinc-900/20"
                }`}
              >
                {t === "select" && <MousePointer className="h-4 w-4" />}
                {t === "component" && <Plus className="h-4 w-4" />}
                {t === "wire" && <Code className="h-4 w-4" />}
                {t === "trace" && <Activity className="h-4 w-4" />}
                {t === "delete" && <Trash2 className="h-4 w-4" />}
                
                {/* Floating Tool Name Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[8px] font-bold text-zinc-400 font-mono tracking-wider uppercase select-none transition-all duration-150 shadow-md pointer-events-none whitespace-nowrap z-50">
                  {t}
                </div>
              </button>
            ))}

            {/* Dynamic Placer Active Label */}
            {activeTool === "component" && selectedLibraryRef && (
              <>
                <div className="h-6 w-px bg-zinc-800/60 mx-2" />
                <div className="flex flex-col pr-2 animate-in fade-in slide-in-from-left-2 duration-150">
                  <span className="text-[7.5px] font-bold tracking-widest text-zinc-500 font-mono uppercase">PLACING_COMPONENT</span>
                  <span className="text-[10px] font-semibold text-cyan-400 max-w-[140px] truncate font-sans">
                    {COMPONENT_LIBRARY[selectedLibraryRef]?.name}
                  </span>
                </div>
              </>
            )}
          </div>
          
          <CanvasArea mode={mode} />
        </main>

        {/* 4. Right Panel: Properties & Design Rules */}
        <aside className="w-80 border-l border-zinc-800/40 bg-[#080a10] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {selectedComponent ? (
              // Component Properties Panel
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-1 font-mono">PROPERTIES</h2>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-cyan-400" />
                    {selectedComponent.libraryRef}
                  </h3>
                  <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">{selectedComponent.id}</span>
                </div>

                {/* Footprint Specifications */}
                <div className="rounded-xl border border-zinc-800/50 bg-[#0b0e16]/60 p-3.5 flex flex-col gap-2.5 shadow-md shadow-black/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-mono">Package Footprint</span>
                    <span className="font-semibold text-zinc-300 font-mono text-[11px]">{selectedComponent.packageType}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-mono">Layer Location</span>
                    <span className="font-semibold text-zinc-300 font-mono text-[11px]">{selectedComponent.layer}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-mono">Active Rotation</span>
                    <span className="font-semibold text-cyan-400 font-mono text-[11px]">{selectedComponent.rotation}°</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-mono">Position (X, Y)</span>
                    <span className="font-semibold text-zinc-300 font-mono text-[11px]">
                      {selectedComponent.position.x.toFixed(1)}, {selectedComponent.position.y.toFixed(1)} mm
                    </span>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex gap-2 font-sans">
                  <button
                    onClick={() => updateComponentRotation(selectedComponent.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-[#0c0f17] hover:bg-[#121622] hover:border-zinc-700/80 px-3 py-2 text-xs font-semibold transition cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-zinc-400" />
                    Rotate 90°
                  </button>
                  <button
                    onClick={() => removeComponent(selectedComponent.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-950/30 bg-red-950/10 hover:bg-red-950/20 hover:border-red-900/40 px-3 py-2 text-xs font-semibold text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>

                {/* Pins and Connections List */}
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2.5 font-mono">PINS & NETLIST ({selectedComponent.pins.length})</h3>
                  <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedComponent.pins.map((pin) => (
                      <div 
                        key={pin.pinId}
                        className="flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-950/15 p-2.5 text-xs hover:bg-zinc-900/10 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-5 rounded bg-zinc-900 border border-zinc-800/50 text-center text-[9px] font-bold text-zinc-500 font-mono">
                            {pin.pinId.replace("pin_", "").toUpperCase()}
                          </span>
                          <span className="font-semibold text-zinc-300 font-mono text-[10px]">{pin.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono rounded-lg px-2 py-0.5 border ${
                            pin.connectedNetId 
                              ? "bg-emerald-950/10 text-emerald-400 border-emerald-900/30" 
                              : "bg-zinc-900/30 text-zinc-500 border-zinc-800/30"
                          }`}>
                            {pin.connectedNetId 
                              ? boardState.nets[pin.connectedNetId]?.name || "Connected" 
                              : "UNCONNECTED"}
                          </span>

                          {wireStartPin?.compId === selectedComponent.id && wireStartPin?.pinId === pin.pinId ? (
                            <button
                              onClick={() => setWireStartPin(null)}
                              title="Batal hubungkan kabel"
                              className="flex items-center justify-center h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold animate-pulse cursor-pointer"
                            >
                              <Zap className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveTool("wire");
                                setWireStartPin({
                                  compId: selectedComponent.id,
                                  pinId: pin.pinId,
                                });
                              }}
                              title="Tarik kabel dari pin ini"
                              className="flex items-center justify-center h-6 w-6 rounded-lg border border-zinc-800/60 bg-[#0e1322] hover:bg-zinc-850 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer"
                            >
                              <Zap className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedNetId && boardState.nets[selectedNetId] ? (
              // Net / Wire Properties Panel
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-1 font-mono">NET PROPERTIES</h2>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 font-sans">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    {boardState.nets[selectedNetId].name}
                  </h3>
                  <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">{selectedNetId}</span>
                </div>

                <div className="rounded-xl border border-zinc-800/50 bg-[#0b0e16]/60 p-3.5 flex flex-col gap-2.5 shadow-md shadow-black/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-mono">Connected Pins</span>
                    <span className="font-semibold text-zinc-300 font-mono text-[11px]">{boardState.nets[selectedNetId].connectedPins.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-mono">Copper Segments</span>
                    <span className="font-semibold text-zinc-300 font-mono text-[11px]">{boardState.nets[selectedNetId].segments.length}</span>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex flex-col gap-2 font-sans">
                  {boardState.nets[selectedNetId].segments.length > 0 && (
                    <button
                      onClick={() => clearTraceSegments(selectedNetId)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-yellow-950/30 bg-yellow-950/10 hover:bg-yellow-950/20 hover:border-yellow-900/40 px-3 py-2 text-xs font-semibold text-yellow-400 transition cursor-pointer"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Clear Copper Traces
                    </button>
                  )}
                  <button
                    onClick={() => {
                      removeNet(selectedNetId);
                      setSelectedNetId(null);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-950/30 bg-red-950/10 hover:bg-red-950/20 hover:border-red-900/40 px-3 py-2 text-xs font-semibold text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Seluruh Kabel
                  </button>
                </div>

                {/* Pin Connections */}
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2.5 font-mono">CONNECTED PINS</h3>
                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {boardState.nets[selectedNetId].connectedPins.map((pinRef) => {
                      const [compId, pinId] = pinRef.split(":");
                      const comp = boardState.components[compId];
                      const pinLabel = comp?.pins.find(p => p.pinId === pinId)?.label || pinId;
                      return (
                        <div key={pinRef} className="flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-950/15 p-2.5 text-xs text-zinc-300 font-mono">
                          <span>{comp ? `${comp.libraryRef.split("_")[0]} (${pinLabel})` : pinRef}</span>
                          <span className="text-[9px] text-zinc-650 uppercase">{compId.split("_")[1] || compId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Segment List */}
                {boardState.nets[selectedNetId].segments.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-2.5 font-mono">COPPER TRACE SEGMENTS</h3>
                    <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {boardState.nets[selectedNetId].segments.map((seg, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-950/15 p-2.5 text-xs">
                          <div className="flex flex-col text-[10px] font-mono text-zinc-400 leading-tight">
                            <span>Seg #{idx + 1} ({seg.layer === "TopCopper" ? "Top" : "Bottom"})</span>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              ({seg.startX.toFixed(1)}, {seg.startY.toFixed(1)}) → ({seg.endX.toFixed(1)}, {seg.endY.toFixed(1)})
                            </span>
                          </div>
                          <button
                            onClick={() => removeTraceSegment(selectedNetId, idx)}
                            title="Delete this segment"
                            className="p-1 rounded-lg hover:bg-red-950/20 hover:text-red-400 text-zinc-500 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Board settings panel
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-1 font-mono">PROPERTIES</h2>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-cyan-400" />
                    Board Dimensions
                  </h3>
                </div>

                {/* Board Width/Height inputs */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">WIDTH (mm)</label>
                    <input
                      type="number"
                      value={boardWidth}
                      onChange={handleWidthChange}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-1.5 font-mono text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">HEIGHT (mm)</label>
                    <input
                      type="number"
                      value={boardHeight}
                      onChange={handleHeightChange}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-1.5 font-mono text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* DRC settings */}
                <div className="border-t border-zinc-800/40 pt-5">
                  <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-4 font-mono flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    DESIGN RULE CHECK (DRC)
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-zinc-500 font-mono uppercase">Min Trace Width (mm)</label>
                        <span className="text-[10px] text-cyan-400 font-mono">{drcSettings.minTraceWidth}</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="1.0"
                        step="0.05"
                        value={drcSettings.minTraceWidth}
                        onChange={(e) => updateDRCSettings({ minTraceWidth: parseFloat(e.target.value) })}
                        className="accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-zinc-500 font-mono uppercase">Min Clearance (mm)</label>
                        <span className="text-[10px] text-cyan-400 font-mono">{drcSettings.minClearance}</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="1.0"
                        step="0.05"
                        value={drcSettings.minClearance}
                        onChange={(e) => updateDRCSettings({ minClearance: parseFloat(e.target.value) })}
                        className="accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-zinc-500 font-mono uppercase">Analog-Digital Isolation (USP)</label>
                        <span className="text-[10px] text-emerald-400 font-mono">{drcSettings.analogDigitalIsolation}</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.0"
                        step="0.1"
                        value={drcSettings.analogDigitalIsolation}
                        onChange={(e) => updateDRCSettings({ analogDigitalIsolation: parseFloat(e.target.value) })}
                        className="accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* DRC Violations List */}
                <div className="border-t border-zinc-800/40 pt-5">
                  <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 mb-3 font-mono">
                    VIOLATIONS ({drcViolations.length})
                  </h3>
                  {drcViolations.length === 0 ? (
                    <div className="rounded-xl border border-emerald-950/40 bg-emerald-950/10 p-3.5 text-xs text-emerald-400 flex items-center gap-2 font-medium">
                      <Check className="h-4 w-4 flex-shrink-0" />
                      <span>All design rule checks passed!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                      {drcViolations.map((violation) => (
                        <div 
                          key={violation.id} 
                          className="rounded-xl border border-red-950/30 bg-red-950/15 p-3 text-[10.5px] text-red-400/90 leading-snug flex gap-2"
                        >
                          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
                          <span>{violation.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pre-flight info */}
                <div className="rounded-xl border border-zinc-800 bg-[#0e1322]/50 p-4 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold font-mono">
                    <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
                    PRE-FLIGHT ADVISORY
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    This studio implements real-time visual rule calculations. Placing digital lines too close to high-noise analog nodes automatically signals warnings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 5. Bottom Status Bar */}
      <footer className="flex h-10 items-center justify-between border-t border-zinc-800 bg-[#090d16] px-6 text-xs text-zinc-400">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/25" />
            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wide">STATUS // ONLINE</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Active Layer Indicator */}
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Layer:</span>
            <select
              value={activeLayer}
              onChange={(e) => setActiveLayer(e.target.value as LayerType)}
              className="bg-transparent text-zinc-300 font-semibold font-mono hover:text-cyan-400 cursor-pointer focus:outline-none"
            >
              <option value="TopCopper" className="bg-[#090d16] text-[#ef4444]">Top Copper (F.Cu)</option>
              <option value="BottomCopper" className="bg-[#090d16] text-[#3b82f6]">Bottom Copper (B.Cu)</option>
              <option value="Silkscreen" className="bg-[#090d16] text-[#22c55e]">Silkscreen (F.Silk)</option>
              <option value="Drill" className="bg-[#090d16] text-[#eab308]">Drill Holes</option>
            </select>
          </div>
        </div>

        {/* Metrics and Counts */}
        <div className="flex items-center gap-5 font-mono text-[10px]">
          <span>COMPONENTS: {Object.keys(boardState.components).length}</span>
          <span>NETS: {Object.keys(boardState.nets).length}</span>
          
          <div className="h-4 w-px bg-zinc-800" />

          {/* DRC indicator */}
          {drcViolations.length === 0 ? (
            <div className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
              <Check className="h-3.5 w-3.5" />
              DRC PASS
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400 font-semibold bg-red-950/20 border border-red-900/30 px-2 py-0.5 rounded">
              <AlertCircle className="h-3.5 w-3.5" />
              DRC: {drcViolations.length} ERRORS
            </div>
          )}
        </div>
      </footer>
      {/* 6. ESP32 Simulation Console Dialog */}
      {simOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-[#090d16] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-[#0e1422] p-4">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-semibold tracking-wider font-mono">
                  ESP32 PRE-FLIGHT LOGIC TESTER
                </h3>
              </div>
              <button 
                onClick={() => {
                  if (simInterval) {
                    clearInterval(simInterval);
                    setSimInterval(null);
                  }
                  setSimulatingNetState("net_sig_demo", false);
                  setSimulating(false);
                  setSimOpen(false);
                }}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold px-2 py-1 rounded hover:bg-zinc-800"
              >
                CLOSE
              </button>
            </div>

            {/* Modal Layout */}
            <div className="grid grid-cols-2 divide-x divide-zinc-800 flex-1 overflow-hidden h-[380px]">
              {/* Left Column: Mock C++ Script Editor */}
              <div className="p-4 flex flex-col gap-2 overflow-hidden">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                  <span>MOCK_SKETCH.ino</span>
                  <span className="text-emerald-500">C++ LIVE EDITOR</span>
                </div>
                <textarea
                  value={simCode}
                  onChange={(e) => setSimCode(e.target.value)}
                  disabled={simulating}
                  className="flex-1 rounded-xl bg-[#05070a] border border-zinc-900/60 p-4 font-mono text-[10.5px] text-zinc-300 focus:outline-none focus:border-zinc-800 resize-none leading-relaxed overflow-y-auto"
                />
              </div>

              {/* Right Column: Console Log */}
              <div className="p-4 flex flex-col gap-2 overflow-hidden">
                <div className="text-[10px] text-zinc-500 font-mono">
                  TERMINAL OUTPUT
                </div>
                <div className="flex-1 rounded-xl bg-black/80 border border-zinc-900/60 p-4 font-mono text-[10px] text-zinc-300 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
                  {simLogs.map((log, idx) => (
                    <div key={idx} className={
                      log.includes("[Simulation]") 
                        ? log.includes("HIGH") ? "text-emerald-400 font-bold" : "text-amber-500/80"
                        : log.includes("[DRC]") 
                          ? "text-cyan-400" 
                          : log.includes("[System]") 
                            ? "text-zinc-400" 
                            : "text-zinc-500"
                    }>
                      {log}
                    </div>
                  ))}
                  {simulating && (
                    <div className="text-emerald-400 flex items-center gap-1.5 font-bold animate-pulse text-[9.5px] mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>SIMULATOR ACTIVE // CANVAS RENDER PULSING LIVE</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-zinc-800 bg-[#0e1422] p-4 flex justify-between items-center">
              <span className="text-[10.5px] text-zinc-500 font-mono leading-snug max-w-[50%]">
                Look at the canvas LED component after clicking run!
              </span>
              
              <div className="flex gap-2">
                {simulating ? (
                  <button
                    onClick={() => {
                      if (simInterval) {
                        clearInterval(simInterval);
                        setSimInterval(null);
                      }
                      setSimulatingNetState("net_sig_demo", false);
                      setSimulating(false);
                      setSimLogs((prev) => [
                        ...prev,
                        "[System] Logic Simulator stopped by user. Pin logic restored to standard LOW.",
                      ]);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2.5 shadow-md shadow-red-600/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Stop Logic Simulation
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSimulating(true);
                      setSimLogs([
                        "[System] Initiating dynamic pre-flight logic compilation...",
                        "[System] Code validation successful. Setup() mappings registered.",
                        "[System] GPIO5 mapped to Board Net \"LED_Signal\".",
                        "[DRC] Running crosstalk, interference & trace isolation analysis...",
                        "[DRC] Clearance isolation check: 100% nominal (DRC PASS).",
                        "[Simulation] Booting emulator logic loop. Clock set to 1000ms cycles.",
                      ]);

                      // Create interval to toggle trace and LED blinking state
                      const interval = setInterval(() => {
                        const nextState = !useBoardStore.getState().simulatingNetStates["net_sig_demo"];
                        setSimulatingNetState("net_sig_demo", nextState);
                        
                        setSimLogs((prev) => [
                          ...prev.slice(-25), // prevent logs from overflowing too much
                          `[Simulation] GPIO5 changed to ${nextState ? "HIGH (3.3V)" : "LOW (0V)"}.`,
                          `[Simulation] LED Anode state: ${nextState ? "POWERED (LED BLINKING LIME GREEN)" : "DARK"}.`,
                        ]);
                      }, 1000);

                      setSimInterval(interval);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 shadow-md shadow-emerald-600/10 transition"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Run Logic Simulation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
