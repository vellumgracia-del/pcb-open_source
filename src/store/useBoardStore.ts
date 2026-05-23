import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BoardState, ComponentNode, DRCSettings, LayerType, Net, PinDef, TraceSegment } from "@/types/pcb";
import { COMPONENT_LIBRARY } from "@/lib/componentLibrary";

// Helper function to generate UUIDs
const uuid = () => Math.random().toString(36).substring(2, 9);

interface BoardStore {
  boardState: BoardState;
  drcSettings: DRCSettings;
  activeLayer: LayerType;
  activeTool: "select" | "component" | "wire" | "trace" | "delete";
  selectedLibraryRef: string | null;
  selectedComponentId: string | null;
  selectedNetId: string | null;
  simulatingNetStates: Record<string, boolean>; // Logic high/low states for active nets
  wireStartPin: { compId: string; pinId: string } | null; // central wire drawing state

  // Actions
  addComponent: (libraryRef: string, x: number, y: number) => void;
  updateComponentPosition: (id: string, x: number, y: number) => void;
  updateComponentRotation: (id: string) => void;
  removeComponent: (id: string) => void;
  connectPins: (compAId: string, pinAId: string, compBId: string, pinBId: string) => string;
  addTraceSegment: (netId: string, segment: TraceSegment) => void;
  clearTraceSegments: (netId: string) => void;
  clearBoard: () => void;
  setBoardDimensions: (width: number, height: number) => void;
  updateDRCSettings: (settings: Partial<DRCSettings>) => void;
  setActiveLayer: (layer: LayerType) => void;
  setActiveTool: (tool: "select" | "component" | "wire" | "trace" | "delete") => void;
  setSelectedLibraryRef: (ref: string | null) => void;
  setSelectedComponentId: (id: string | null) => void;
  setSelectedNetId: (id: string | null) => void;
  setWireStartPin: (pin: { compId: string; pinId: string } | null) => void;
  setSimulatingNetState: (netId: string, state: boolean) => void;
  removeNet: (netId: string) => void; // <-- Add this!
  removeTraceSegment: (netId: string, segmentIndex: number) => void;
  loadDemoBoard: () => void;
}

const DEFAULT_DRC: DRCSettings = {
  minTraceWidth: 0.15,
  minClearance: 0.15,
  minViaHoleSize: 0.3,
  minViaDiameter: 0.6,
  silkscreenClearance: 0.2,
  analogDigitalIsolation: 0.5,
};

export const useBoardStore = create<BoardStore>()(
  persist(
    (set, get) => ({
      boardState: {
        boardId: "default-board",
        width: 120, // 120 mm
        height: 80, // 80 mm
        components: {},
        nets: {},
      },
      drcSettings: DEFAULT_DRC,
      activeLayer: "TopCopper",
      activeTool: "select",
      selectedLibraryRef: null,
      selectedComponentId: null,
      selectedNetId: null,
      simulatingNetStates: {},
      wireStartPin: null,

      addComponent: (libraryRef, x, y) => {
        const template = COMPONENT_LIBRARY[libraryRef];
        if (!template) return;

        const id = `comp_${uuid()}`;
        const newPins: PinDef[] = template.pins.map((pin) => ({
          ...pin,
          connectedNetId: null,
        }));

        const newComponent: ComponentNode = {
          id,
          libraryRef,
          position: { x, y },
          rotation: 0,
          layer: "TopCopper",
          packageType: template.packageType,
          pins: newPins,
        };

        set((state) => ({
          boardState: {
            ...state.boardState,
            components: {
              ...state.boardState.components,
              [id]: newComponent,
            },
          },
        }));
      },

      updateComponentPosition: (id, x, y) => {
        set((state) => {
          const comp = state.boardState.components[id];
          if (!comp) return state;

          return {
            boardState: {
              ...state.boardState,
              components: {
                ...state.boardState.components,
                [id]: {
                  ...comp,
                  position: { x, y },
                },
              },
            },
          };
        });
      },

      updateComponentRotation: (id) => {
        set((state) => {
          const comp = state.boardState.components[id];
          if (!comp) return state;

          return {
            boardState: {
              ...state.boardState,
              components: {
                ...state.boardState.components,
                [id]: {
                  ...comp,
                  rotation: (comp.rotation + 90) % 360,
                },
              },
            },
          };
        });
      },

      removeComponent: (id) => {
        set((state) => {
          const { [id]: removed, ...remainingComponents } = state.boardState.components;
          
          // Clean up nets containing references to deleted component's pins
          const updatedNets = { ...state.boardState.nets };
          Object.keys(updatedNets).forEach((netId) => {
            const net = updatedNets[netId];
            const remainingPins = net.connectedPins.filter(
              (pinRef) => !pinRef.startsWith(`${id}:`)
            );
            if (remainingPins.length === 0) {
              delete updatedNets[netId];
            } else {
              updatedNets[netId] = {
                ...net,
                connectedPins: remainingPins,
              };
            }
          });

          return {
            selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
            boardState: {
              ...state.boardState,
              components: remainingComponents,
              nets: updatedNets,
            },
          };
        });
      },

      connectPins: (compAId, pinAId, compBId, pinBId) => {
        const state = get();
        const pinRefA = `${compAId}:${pinAId}`;
        const pinRefB = `${compBId}:${pinBId}`;

        // Find if either pin is already part of a net
        let targetNetId = "";
        let targetNetName = "";

        const compA = state.boardState.components[compAId];
        const compB = state.boardState.components[compBId];
        const pinA = compA?.pins.find((p) => p.pinId === pinAId);
        const pinB = compB?.pins.find((p) => p.pinId === pinBId);

        if (pinA?.connectedNetId) {
          targetNetId = pinA.connectedNetId;
        } else if (pinB?.connectedNetId) {
          targetNetId = pinB.connectedNetId;
        } else {
          targetNetId = `net_${uuid()}`;
          targetNetName = `Net_${Object.keys(state.boardState.nets).length + 1}`;
        }

        set((state) => {
          const nets = { ...state.boardState.nets };
          const components = { ...state.boardState.components };

          // Create or update Net
          if (!nets[targetNetId]) {
            nets[targetNetId] = {
              id: targetNetId,
              name: targetNetName,
              segments: [],
              connectedPins: [],
            };
          }

          const net = nets[targetNetId];
          const pinsToAdd = [pinRefA, pinRefB].filter((ref) => !net.connectedPins.includes(ref));
          
          nets[targetNetId] = {
            ...net,
            connectedPins: [...net.connectedPins, ...pinsToAdd],
          };

          // Update components pin connection status
          if (components[compAId]) {
            components[compAId] = {
              ...components[compAId],
              pins: components[compAId].pins.map((p) =>
                p.pinId === pinAId ? { ...p, connectedNetId: targetNetId } : p
              ),
            };
          }

          if (components[compBId]) {
            components[compBId] = {
              ...components[compBId],
              pins: components[compBId].pins.map((p) =>
                p.pinId === pinBId ? { ...p, connectedNetId: targetNetId } : p
              ),
            };
          }

          return {
            boardState: {
              ...state.boardState,
              components,
              nets,
            },
          };
        });

        return targetNetId;
      },

      addTraceSegment: (netId, segment) => {
        set((state) => {
          const net = state.boardState.nets[netId];
          if (!net) return state;

          return {
            boardState: {
              ...state.boardState,
              nets: {
                ...state.boardState.nets,
                [netId]: {
                  ...net,
                  segments: [...net.segments, segment],
                },
              },
            },
          };
        });
      },

      clearTraceSegments: (netId) => {
        set((state) => {
          const net = state.boardState.nets[netId];
          if (!net) return state;

          return {
            boardState: {
              ...state.boardState,
              nets: {
                ...state.boardState.nets,
                [netId]: {
                  ...net,
                  segments: [],
                },
              },
            },
          };
        });
      },

      clearBoard: () => {
        set((state) => ({
          selectedComponentId: null,
          selectedNetId: null,
          wireStartPin: null,
          boardState: {
            ...state.boardState,
            components: {},
            nets: {},
          },
        }));
      },

      setBoardDimensions: (width, height) => {
        set((state) => ({
          boardState: {
            ...state.boardState,
            width,
            height,
          },
        }));
      },

      updateDRCSettings: (settings) => {
        set((state) => ({
          drcSettings: {
            ...state.drcSettings,
            ...settings,
          },
        }));
      },

      setActiveLayer: (layer) => set({ activeLayer: layer }),
      setActiveTool: (tool) => set({ activeTool: tool }),
      setSelectedLibraryRef: (ref) => set({ selectedLibraryRef: ref }),
      setSelectedComponentId: (id) => set({ selectedComponentId: id }),
      setSelectedNetId: (id) => set({ selectedNetId: id }),
      setWireStartPin: (pin) => set({ wireStartPin: pin }),
      setSimulatingNetState: (netId, state) => {
        set((s) => ({
          simulatingNetStates: {
            ...s.simulatingNetStates,
            [netId]: state,
          },
        }));
      },

      removeNet: (netId) => {
        set((state) => {
          const { [netId]: removed, ...remainingNets } = state.boardState.nets;
          
          // Reset connectedNetId to null for all component pins connected to this net
          const updatedComponents = { ...state.boardState.components };
          Object.keys(updatedComponents).forEach((compId) => {
            updatedComponents[compId] = {
              ...updatedComponents[compId],
              pins: updatedComponents[compId].pins.map((p) =>
                p.connectedNetId === netId ? { ...p, connectedNetId: null } : p
              ),
            };
          });

          return {
            selectedNetId: state.selectedNetId === netId ? null : state.selectedNetId,
            boardState: {
              ...state.boardState,
              components: updatedComponents,
              nets: remainingNets,
            },
          };
        });
      },

      removeTraceSegment: (netId, segmentIndex) => {
        set((state) => {
          const net = state.boardState.nets[netId];
          if (!net) return state;

          const updatedSegments = net.segments.filter((_, idx) => idx !== segmentIndex);

          return {
            boardState: {
              ...state.boardState,
              nets: {
                ...state.boardState.nets,
                [netId]: {
                  ...net,
                  segments: updatedSegments,
                },
              },
            },
          };
        });
      },

      loadDemoBoard: () => {
        const u1Id = `comp_esp32_demo`;
        const j1Id = `comp_jst_demo`;
        const r1Id = `comp_res_demo`;
        const led1Id = `comp_led_demo`;

        const u1Template = COMPONENT_LIBRARY["NodeMCU-ESP32"];
        const j1Template = COMPONENT_LIBRARY["JST_2PIN"];
        const r1Template = COMPONENT_LIBRARY["R_0805"];
        const led1Template = COMPONENT_LIBRARY["LED_0805"];

        // 1. Components
        const components: Record<string, ComponentNode> = {
          [u1Id]: {
            id: u1Id,
            libraryRef: "NodeMCU-ESP32",
            position: { x: 60, y: 40 },
            rotation: 0,
            layer: "TopCopper",
            packageType: u1Template.packageType,
            pins: u1Template.pins.map((p) => ({ ...p, connectedNetId: null })),
          },
          [j1Id]: {
            id: j1Id,
            libraryRef: "JST_2PIN",
            position: { x: 15, y: 20 },
            rotation: 90,
            layer: "TopCopper",
            packageType: j1Template.packageType,
            pins: j1Template.pins.map((p) => ({ ...p, connectedNetId: null })),
          },
          [r1Id]: {
            id: r1Id,
            libraryRef: "R_0805",
            position: { x: 30, y: 55 },
            rotation: 0,
            layer: "TopCopper",
            packageType: r1Template.packageType,
            pins: r1Template.pins.map((p) => ({ ...p, connectedNetId: null })),
          },
          [led1Id]: {
            id: led1Id,
            libraryRef: "LED_0805",
            position: { x: 15, y: 55 },
            rotation: 180,
            layer: "TopCopper",
            packageType: led1Template.packageType,
            pins: led1Template.pins.map((p) => ({ ...p, connectedNetId: null })),
          },
        };

        // 2. Nets (Connections)
        const netGNDId = "net_gnd_demo";
        const netVCCId = "net_3v3_demo";
        const netSignalId = "net_sig_demo";

        const nets: Record<string, Net> = {
          [netGNDId]: {
            id: netGNDId,
            name: "GND",
            segments: [
              { startX: 15, startY: 21.25, endX: 15, endY: 54.1, width: 0.25, layer: "TopCopper" },
              { startX: 15, startY: 54.1, endX: 51, endY: 28.13, width: 0.25, layer: "TopCopper" }, // Conns to ESP32 GND
            ],
            connectedPins: [`${j1Id}:2`, `${led1Id}:K`, `${u1Id}:pin_l_14`],
          },
          [netVCCId]: {
            id: netVCCId,
            name: "3V3",
            segments: [
              { startX: 15, startY: 18.75, endX: 51, endY: 12.0, width: 0.3, layer: "TopCopper" },
            ],
            connectedPins: [`${j1Id}:1`, `${u1Id}:pin_l_1`],
          },
          [netSignalId]: {
            id: netSignalId,
            name: "LED_Signal",
            segments: [
              { startX: 69, startY: 21.87, endX: 30.9, endY: 55, width: 0.2, layer: "TopCopper" },
              { startX: 29.1, startY: 55, endX: 15.9, endY: 55, width: 0.2, layer: "TopCopper" },
            ],
            connectedPins: [`${u1Id}:pin_r_15`, `${r1Id}:2`, `${r1Id}:1`, `${led1Id}:A`],
          },
        };

        // Map the connected nets to components pins
        Object.keys(nets).forEach((netId) => {
          const net = nets[netId];
          net.connectedPins.forEach((pinRef) => {
            const [compId, pinId] = pinRef.split(":");
            if (components[compId]) {
              components[compId].pins = components[compId].pins.map((p) =>
                p.pinId === pinId ? { ...p, connectedNetId: netId } : p
              );
            }
          });
        });

        set((state) => ({
          selectedComponentId: null,
          selectedNetId: null,
          wireStartPin: null,
          boardState: {
            ...state.boardState,
            components,
            nets,
          },
        }));
      },
    }),
    {
      name: "pcb-board-storage",
      partialize: (state) => ({
        boardState: state.boardState,
        drcSettings: state.drcSettings,
      }),
    }
  )
);
