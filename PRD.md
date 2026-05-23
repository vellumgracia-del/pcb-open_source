Product Requirements Document (PRD):
Web-Based Professional PCB Design
Studio V2
Status: Draft / Ready for AI Implementation
Target Tech Stack: Next.js, TypeScript, Firebase
Fokus: Zero-Hallucination Development (Spesifikasi ketat untuk LLM/AI)
1. Pendahuluan & Objektif
Aplikasi ini adalah platform perancangan Printed Circuit Board (PCB) berbasis web
(Cloud-Native) yang ditujukan untuk engineer, hobiis IoT, dan developer perangkat keras.
Tujuan utama PRD ini adalah memberikan panduan teknis yang sangat spesifik (opinionated)
agar agen AI atau code generator tidak menebak-nebak (halusinasi) terkait arsitektur, state
management, atau struktur data.

2. Tech Stack & Infrastruktur Sistem
AI DIWAJIBKAN menggunakan stack berikut tanpa deviasi, kecuali diinstruksikan sebaliknya:
● Frontend Framework: Next.js (App Router) dengan TypeScript.
● State Management: Zustand (untuk interaksi kanvas real-time berkinerja tinggi) dan
React Query (untuk sinkronisasi database).
● Backend & Database: Firebase Cloud Firestore (untuk penyimpanan objek PCB
real-time) dan Firebase Authentication.
● Rendering Engine (Kanvas): Konva.js atau HTML5 Canvas API murni untuk rendering
2D skematik dan layouting.
● Styling: Tailwind CSS.

3. Fitur Utama (Core Features)
Modul Spesifikasi Teknis Kriteria Penerimaan
(Acceptance Criteria)

Schematic Capture Kanvas berbasis grid
(snap-to-grid) untuk
menempatkan simbol
komponen. Setiap komponen
terhubung melalui sistem
Netlist.

Pengguna dapat men-drag
komponen dari library,
menghubungkan pin dengan
garis (wire), dan state
tersimpan sebagai Graph.

PCB Layout Editor Mode 2D top-down dengan
dukungan Multi-Layer (Top

Sistem mendeteksi Design
Rule Check (DRC) secara

Modul Spesifikasi Teknis Kriteria Penerimaan
(Acceptance Criteria)

Copper, Bottom Copper,
Silkscreen, Drill).

real-time (misal: jarak antar
trace terlalu dekat).

Gerber / BOM Export Fungsi ekspor JSON ke format
standar industri (RS-274X
Gerber) dan Bill of Materials
(CSV).

File yang diekspor dapat
langsung dikirim ke manufaktur
seperti JLCPCB.

4. Fitur Unik (Unique Selling Points / USP)
● IoT / ESP32 Pre-Flight Simulation: Integrasi lingkungan simulasi pada skematik.
Pengguna dapat menulis skrip C++ ringan untuk menguji logika pin (High/Low) pada
komponen ESP32 langsung di web sebelum mencetak PCB.
● Smart Trace Routing dengan Prediksi Noise Analog: Algoritma auto-routing yang
mengutamakan pemisahan jalur digital (misal: I2C/SPI) dengan jalur analog murni
(seperti sensor Soil Moisture, DHT22) untuk meminimalisir interferensi sinyal, sangat
cocok untuk project Smart Farming atau agro-sistem.
● PWA Offline-First Workspace: Dukungan Progressive Web App (PWA) di mana
pengguna dapat melanjutkan routing PCB saat offline; state disimpan di IndexedDB lokal
dan disinkronkan ke Firebase saat koneksi kembali. (Notifikasi download ditiadakan untuk
user experience yang lebih bersih).

5. Struktur Data Inti (Pencegahan Halusinasi AI)
Bagian ini adalah kontrak data. AI HARUS mengikuti skema TypeScript berikut untuk
memastikan integritas data antar komponen dan mencegah pembuatan properti imajiner saat
generate kode.
5.1. Skema Komponen (Node)
export type LayerType = 'TopCopper' | 'BottomCopper' | 'Silkscreen'
| 'Drill';
export interface PinDef {
pinId: string; // UUID unik pin
label: string; // Misal: "GND", "VCC", "GPIO5"
x: number;
y: number;
connectedNetId: string | null;
}

export interface ComponentNode {
id: string; // UUID Komponen
libraryRef: string; // Referensi ke library komponen baku (e.g.,
"ESP32-C3-WROOM")
position: { x: number; y: number };
rotation: number; // 0, 90, 180, 270
layer: LayerType;
packageType: ComponentPackage; // Tipe package fisik
pins: PinDef[];
}

5.2. Skema Netlist & Traces (Jalur Tembaga)
export interface TraceSegment {
startX: number;
startY: number;
endX: number;
endY: number;
width: number; // Lebar trace dalam mm/mil
layer: LayerType;
}
export interface Net {
id: string; // UUID Net (misal: Net "GND")
name: string; // Nama logic
segments: TraceSegment[];
connectedPins: string[]; // Kumpulan pinId yang saling terhubung
}
export interface BoardState {
boardId: string;
width: number;
height: number;
components: Record<string, ComponentNode>;
nets: Record<string, Net>;
}

5.3. Standar Format Komponen Fisik (Footprint Packages)
Sistem DIWAJIBKAN mendukung lebih dari 50 format footprint (package) fisik berikut secara
native agar library komponen siap pakai untuk produksi. Skema Enum ini akan mengunci AI dari
mengarang dimensi ukuran komponen yang tidak standar industri:
export enum ComponentPackage {
// === Surface Mount Technology (SMT) - Passives ===
SMD_0201 = "0201",
SMD_0402 = "0402",
SMD_0603 = "0603",
SMD_0805 = "0805",
SMD_1206 = "1206",
SMD_1210 = "1210",
SMD_1812 = "1812",
SMD_2010 = "2010",
SMD_2512 = "2512",
// === SMT - Diodes & Transistors ===
SOT_23 = "SOT-23",
SOT_23_5 = "SOT-23-5",
SOT_23_6 = "SOT-23-6",
SOT_89 = "SOT-89",
SOT_223 = "SOT-223",
SOT_323 = "SOT-323",
SOD_123 = "SOD-123",
SOD_323 = "SOD-323",
SOD_523 = "SOD-523",
SMA = "SMA (DO-214AC)",
SMB = "SMB (DO-214AA)",
SMC = "SMC (DO-214AB)",
DPAK = "TO-252 (DPAK)",
D2PAK = "TO-263 (D2PAK)",
// === SMT - Integrated Circuits (ICs) ===
SOIC_8 = "SOIC-8",
SOIC_14 = "SOIC-14",
SOIC_16 = "SOIC-16",
SOP_8 = "SOP-8",

SSOP_16 = "SSOP-16",
SSOP_28 = "SSOP-28",
TSSOP_14 = "TSSOP-14",
TSSOP_16 = "TSSOP-16",
MSOP_8 = "MSOP-8",
MSOP_10 = "MSOP-10",
QFP_32 = "QFP-32",
LQFP_48 = "LQFP-48",
LQFP_64 = "LQFP-64",
LQFP_100 = "LQFP-100",
TQFP_44 = "TQFP-44",
QFN_16 = "QFN-16",
QFN_32 = "QFN-32",
QFN_48 = "QFN-48",
DFN_8 = "DFN-8",
BGA_64 = "BGA-64",
WLCSP_16 = "WLCSP-16",
// === Through-Hole Technology (THT) ===
DIP_4 = "DIP-4",
DIP_8 = "DIP-8",
DIP_14 = "DIP-14",
DIP_16 = "DIP-16",
DIP_28 = "DIP-28",
SIP_3 = "SIP-3",
TO_92 = "TO-92",
TO_220 = "TO-220",
TO_247 = "TO-247",
AXIAL_0_3 = "AXIAL-0.3",
AXIAL_0_4 = "AXIAL-0.4",
RADIAL_5MM = "RADIAL-5MM",
// === Connectors & Headers ===
PIN_HEADER_2_54_1x2 = "PIN_HEADER_2.54_1x2",
PIN_HEADER_2_54_1x4 = "PIN_HEADER_2.54_1x4",
PIN_HEADER_2_54_2x4 = "PIN_HEADER_2.54_2x4",
JST_XH_2P = "JST_XH_2PIN",
JST_XH_3P = "JST_XH_3PIN",
JST_XH_4P = "JST_XH_4PIN",

TERMINAL_BLOCK_5_08_2P = "TERMINAL_BLOCK_5.08_2PIN",
USB_MICRO_B = "USB_MICRO_B_SMD",
USB_C_16P = "USB_TYPE_C_16PIN",
RJ45_MAGJACK = "RJ45_MAGJACK",
// === IoT & MCU Modules (Khusus) ===
ESP32_WROOM_32 = "ESP32-WROOM-32",
ESP32_WROVER_E = "ESP32-WROVER-E",
ESP32_C3_MINI = "ESP32-C3-MINI-1",
ESP8266_12E = "ESP-12E",
NRF24L01_SMD = "NRF24L01_SMD",
LORA_RFM95 = "RFM95_LORA"
}

5.4. Skema Aturan Design Rule Check (DRC) Spesifik
Sistem engine layout harus mengimplementasikan variabel batas toleransi berikut untuk validasi
real-time saat pengguna melakukan routing:
export interface DRCSettings {
minTraceWidth: number; // Minimum lebar trace (misal:
0.15mm / 6mil)
minClearance: number; // Jarak aman antar trace/pad
(misal: 0.15mm / 6mil)
minViaHoleSize: number; // Diameter lubang Via minimum
(misal: 0.3mm)
minViaDiameter: number; // Diameter luar cincin Via (misal:
0.6mm)
silkscreenClearance: number; // Jarak silkscreen ke pad tembaga
(hindari tumpang tindih)
// Fitur Khusus: Isolasi Sinyal (USP)
analogDigitalIsolation: number;// Clearance ekstra antara trace
Analog dan Digital (misal: 0.5mm minimum)
}