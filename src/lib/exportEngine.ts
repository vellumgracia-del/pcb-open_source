import { BoardState } from "@/types/pcb";
import { COMPONENT_LIBRARY } from "./componentLibrary";

// Helper to trigger a browser file download
function downloadFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 1. Generate Gerber File (RS-274X Mock Format)
export function exportGerber(board: BoardState, layer: string) {
  let content = `G04 Gerber Exported by PCB Studio V2*\n`;
  content += `G04 Layer: ${layer}*\n`;
  content += `%FSLAX34Y34*%\n`; // Coordinate format: absolute, 3 integer, 4 decimal
  content += `%MOMM*%\n`; // Millimeter units
  content += `%LPD*%\n`; // Layer polarity dark
  
  // Define standard apertures
  content += `%ADD10C,0.150*%\n`; // Trace width D10
  content += `%ADD11C,0.600*%\n`; // Pad diameter D11

  // Trace rendering output
  content += `G54D10*\n`; // Select trace aperture
  Object.values(board.nets).forEach((net) => {
    net.segments
      .filter((seg) => seg.layer === layer)
      .forEach((seg) => {
        // Convert to absolute integer steps (3.4)
        const sx = Math.round(seg.startX * 10000);
        const sy = Math.round(seg.startY * 10000);
        const ex = Math.round(seg.endX * 10000);
        const ey = Math.round(seg.endY * 10000);

        content += `X${sx}Y${sy}D02*\n`; // Move to start
        content += `X${ex}Y${ey}D01*\n`; // Interpolate (draw) to end
      });
  });

  // Pads rendering output
  content += `G54D11*\n`; // Select pad aperture
  Object.values(board.components).forEach((comp) => {
    if (comp.layer === layer) {
      comp.pins.forEach((pin) => {
        // Calculate pad absolute location
        const angleRad = (comp.rotation * Math.PI) / 180;
        const rx = pin.x * Math.cos(angleRad) - pin.y * Math.sin(angleRad);
        const ry = pin.x * Math.sin(angleRad) + pin.y * Math.cos(angleRad);
        
        const px = Math.round((comp.position.x + rx) * 10000);
        const py = Math.round((comp.position.y + ry) * 10000);

        content += `X${px}Y${py}D03*\n`; // Flash pad aperture
      });
    }
  });

  content += `M02*\n`; // End of program

  downloadFile(`${board.boardId}_${layer}.gbr`, content, "text/plain");
}

// 2. Generate Bill of Materials (BOM) CSV File
export function exportBOM(board: BoardState) {
  // Aggregate components by library reference
  const boms: Record<string, { ref: string; pkg: string; desc: string; quantity: number; designators: string[] }> = {};

  Object.values(board.components).forEach((comp) => {
    const template = COMPONENT_LIBRARY[comp.libraryRef];
    const desc = template ? template.description : "Standard Component";
    
    if (!boms[comp.libraryRef]) {
      boms[comp.libraryRef] = {
        ref: comp.libraryRef,
        pkg: comp.packageType,
        desc,
        quantity: 0,
        designators: [],
      };
    }

    boms[comp.libraryRef].quantity += 1;
    // Format designator (e.g. U1, R1, J1 etc.)
    let prefix = "U";
    if (comp.libraryRef.startsWith("R_")) prefix = "R";
    else if (comp.libraryRef.startsWith("C_")) prefix = "C";
    else if (comp.libraryRef.startsWith("LED_")) prefix = "LED";
    else if (comp.libraryRef.startsWith("JST_")) prefix = "J";

    const index = Object.values(board.components).filter(c => c.libraryRef === comp.libraryRef).findIndex(c => c.id === comp.id) + 1;
    boms[comp.libraryRef].designators.push(`${prefix}${index}`);
  });

  // Create CSV String
  let csv = `"Comment","Designator","Footprint","Description","Quantity"\n`;
  Object.values(boms).forEach((item) => {
    csv += `"${item.ref}","${item.designators.join(", ")}","${item.pkg}","${item.desc}",${item.quantity}\n`;
  });

  downloadFile(`${board.boardId}_BOM.csv`, csv, "text/csv");
}
