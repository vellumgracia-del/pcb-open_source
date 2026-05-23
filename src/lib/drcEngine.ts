import { BoardState, DRCSettings } from "@/types/pcb";
import { COMPONENT_LIBRARY } from "./componentLibrary";

export interface DRCViolation {
  id: string;
  type: "COLLISION" | "OUT_OF_BOUNDS" | "ISOLATION_VIOLATION" | "CLEARANCE_VIOLATION";
  message: string;
  position?: { x: number; y: number };
}

export function runDRCCheck(board: BoardState, settings: DRCSettings): DRCViolation[] {
  const violations: DRCViolation[] = [];

  // Helper to get component width & height considering rotation
  const getCompBounds = (compId: string) => {
    const comp = board.components[compId];
    if (!comp) return null;
    const template = COMPONENT_LIBRARY[comp.libraryRef];
    if (!template) return null;

    // Swap dimensions if rotated 90 or 270 degrees
    const isRotated = comp.rotation === 90 || comp.rotation === 270;
    const w = isRotated ? template.height : template.width;
    const h = isRotated ? template.width : template.height;

    return {
      id: compId,
      name: template.name,
      x: comp.position.x,
      y: comp.position.y,
      w,
      h,
      left: comp.position.x - w / 2,
      right: comp.position.x + w / 2,
      top: comp.position.y - h / 2,
      bottom: comp.position.y + h / 2,
    };
  };

  const compBoundsList = Object.keys(board.components)
    .map(getCompBounds)
    .filter(Boolean) as NonNullable<ReturnType<typeof getCompBounds>>[];

  // 1. Boundary Check (Out of Bounds)
  compBoundsList.forEach((bounds) => {
    if (
      bounds.left < 0 ||
      bounds.right > board.width ||
      bounds.top < 0 ||
      bounds.bottom > board.height
    ) {
      violations.push({
        id: `bounds_${bounds.id}`,
        type: "OUT_OF_BOUNDS",
        message: `Component "${bounds.name}" (${bounds.id}) is out of board boundaries.`,
        position: { x: bounds.x, y: bounds.y },
      });
    }
  });

  // 2. Component-to-Component Clearance Check (Collision)
  for (let i = 0; i < compBoundsList.length; i++) {
    for (let j = i + 1; j < compBoundsList.length; j++) {
      const a = compBoundsList[i];
      const b = compBoundsList[j];

      // Add minClearance boundary
      const clearance = settings.minClearance;
      const overlapsX = a.left - clearance < b.right && a.right + clearance > b.left;
      const overlapsY = a.top - clearance < b.bottom && a.bottom + clearance > b.top;

      if (overlapsX && overlapsY) {
        violations.push({
          id: `collision_${a.id}_${b.id}`,
          type: "COLLISION",
          message: `Spacing violation between "${a.name}" and "${b.name}" (less than ${clearance}mm clearance).`,
          position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        });
      }
    }
  }

  // 3. Analog-Digital Signal Isolation Check (USP!)
  const isAnalogNet = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes("analog") || lower.includes("sig") || lower.includes("sensor");
  };

  const isDigitalNet = (name: string) => {
    const lower = name.toLowerCase();
    return (
      lower.includes("tx") ||
      lower.includes("rx") ||
      lower.includes("clk") ||
      lower.includes("sd") ||
      lower.includes("sda") ||
      lower.includes("scl") ||
      lower.includes("i2c") ||
      lower.includes("spi")
    );
  };

  const nets = Object.values(board.nets);
  for (let i = 0; i < nets.length; i++) {
    for (let j = i + 1; j < nets.length; j++) {
      const netA = nets[i];
      const netB = nets[j];

      const isAAnalog = isAnalogNet(netA.name);
      const isBDigital = isDigitalNet(netB.name);
      const isADigital = isDigitalNet(netA.name);
      const isBAnalog = isAnalogNet(netB.name);

      const isIsolationRequired = (isAAnalog && isBDigital) || (isADigital && isBAnalog);

      if (isIsolationRequired) {
        // Compare trace segments of both nets
        netA.segments.forEach((segA) => {
          netB.segments.forEach((segB) => {
            // Check distance between segment centers for quick calculation
            const centerA = { x: (segA.startX + segA.endX) / 2, y: (segA.startY + segA.endY) / 2 };
            const centerB = { x: (segB.startX + segB.endX) / 2, y: (segB.startY + segB.endY) / 2 };

            const dx = centerA.x - centerB.x;
            const dy = centerA.y - centerB.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const requiredDist = settings.analogDigitalIsolation;
            if (distance < requiredDist) {
              violations.push({
                id: `isolation_${netA.id}_${netB.id}`,
                type: "ISOLATION_VIOLATION",
                message: `Analog Net "${netA.name}" is too close to Digital Net "${netB.name}" (${distance.toFixed(2)}mm found, min ${requiredDist}mm required).`,
                position: { x: (centerA.x + centerB.x) / 2, y: (centerA.y + centerB.y) / 2 },
              });
            }
          });
        });
      }
    }
  }

  return violations;
}
