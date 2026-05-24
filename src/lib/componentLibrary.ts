import { ComponentPackage, PinDef } from "@/types/pcb";

export interface LibraryComponent {
  name: string;
  category: "MCU" | "Passive" | "Discrete" | "Connector";
  packageType: ComponentPackage;
  width: number; // Lebar fisik dalam mm
  height: number; // Tinggi fisik dalam mm
  pins: Omit<PinDef, "connectedNetId">[];
  color: string; // Warna khas visual
  description: string;
}

export const COMPONENT_LIBRARY: Record<string, LibraryComponent> = {
  "NodeMCU-ESP32": {
    name: "NodeMCU ESP32 DevKitC",
    category: "MCU",
    packageType: ComponentPackage.ESP32_WROOM_32,
    width: 28,
    height: 54,
    color: "#0f172a", // Darker slate
    description: "ESP32 DevKitC v4 with CP2102, 38 Pins",
    pins: [
      // Left side (19 pins)
      ...Array.from({ length: 19 }, (_, i) => {
        const pinLabels = [
          "3V3", "EN", "SENSOR_VP", "SENSOR_VN", "IO34", "IO35", "IO32", "IO33",
          "IO25", "IO26", "IO27", "IO14", "IO12", "GND", "IO13", "SD2", "SD3", "CMD", "VIN"
        ];
        return {
          pinId: `pin_l_${i + 1}`,
          label: pinLabels[i] || `L${i + 1}`,
          x: -13.5,
          y: -25 + i * 2.54, // standard 2.54mm pitch
        };
      }),
      // Right side (19 pins)
      ...Array.from({ length: 19 }, (_, i) => {
        const pinLabels = [
          "GND", "IO23", "IO22", "TXD0", "RXD0", "IO21", "GND", "IO19", "IO18",
          "IO5", "IO17", "IO16", "IO4", "IO0", "IO2", "IO15", "SD1", "SD0", "CLK"
        ];
        return {
          pinId: `pin_r_${i + 1}`,
          label: pinLabels[i] || `R${i + 1}`,
          x: 13.5,
          y: 25 - i * 2.54,
        };
      })
    ]
  },
  "SIM800L_RED": {
    name: "SIM800L GSM Module (Red)",
    category: "MCU",
    packageType: ComponentPackage.LORA_RFM95,
    width: 25,
    height: 23,
    color: "#991b1b", // Red module
    description: "GSM/GPRS Quad-band module, ditenagai langsung Li-Ion Baterai",
    pins: [
      { pinId: "VCC", label: "VCC", x: -12, y: -8 },
      { pinId: "RST", label: "RST", x: -12, y: -4 },
      { pinId: "RXD", label: "RXD", x: -12, y: 0 },
      { pinId: "TXD", label: "TXD", x: -12, y: 4 },
      { pinId: "GND", label: "GND", x: -12, y:  8 },
      { pinId: "RING", label: "RING", x: 12, y: -8 },
      { pinId: "DTR", label: "DTR", x: 12, y: -4 },
      { pinId: "NET", label: "NET", x: 12, y: 0 },
      { pinId: "MIC+", label: "MIC+", x: 12, y: 4 },
      { pinId: "MIC-", label: "MIC-", x: 12, y: 8 }
    ]
  },
  "SHT31_TEMP": {
    name: "SHT31 Temperature Sensor",
    category: "Discrete",
    packageType: ComponentPackage.SOIC_8,
    width: 12,
    height: 12,
    color: "#0369a1", // Sky Blue
    description: "SHT31 High-Precision Temp & Humidity Sensor (I2C)",
    pins: [
      { pinId: "VCC", label: "VCC", x: -5, y: -3 },
      { pinId: "GND", label: "GND", x: -5, y: 0 },
      { pinId: "SCL", label: "SCL", x: -5, y: 3 },
      { pinId: "SDA", label: "SDA", x: 5, y: -3 },
      { pinId: "ADR", label: "ADDR", x: 5, y: 0 },
      { pinId: "ALR", label: "ALERT", x: 5, y: 3 }
    ]
  },
  "NEO6M_GPS": {
    name: "NEO-6M GPS Module",
    category: "MCU",
    packageType: ComponentPackage.ESP8266_12E,
    width: 26,
    height: 26,
    color: "#065f46", // Dark green
    description: "Ublox NEO-6M GPS Module with UART interface",
    pins: [
      { pinId: "VCC", label: "VCC", x: -12, y: -6 },
      { pinId: "RX", label: "RX", x: -12, y: -2 },
      { pinId: "TX", label: "TX", x: -12, y: 2 },
      { pinId: "GND", label: "GND", x: -12, y: 6 },
      { pinId: "PPS", label: "PPS", x: 12, y: 0 }
    ]
  },
  "TP4056_CHARGER": {
    name: "TP4056 Type-C Charger",
    category: "Connector",
    packageType: ComponentPackage.USB_C_16P,
    width: 25,
    height: 19,
    color: "#1e3a8a", // Blue charger
    description: "1A Li-Ion Battery Charger with Type-C Port",
    pins: [
      { pinId: "IN+", label: "IN+", x: -12, y: -7 },
      { pinId: "IN-", label: "IN-", x: -12, y: 7 },
      { pinId: "BAT+", label: "BAT+", x: 12, y: -6 },
      { pinId: "BAT-", label: "BAT-", x: 12, y: -2 },
      { pinId: "OUT+", label: "OUT+", x: 12, y: 2 },
      { pinId: "OUT-", label: "OUT-", x: 12, y: 6 }
    ]
  },
  "BAT_18650_HOLDER": {
    name: "18650 Battery Holder",
    category: "Connector",
    packageType: ComponentPackage.RADIAL_5MM,
    width: 78,
    height: 20,
    color: "#27272a", // Charcoal black
    description: "1-Slot 18650 Lithium Battery Holder",
    pins: [
      { pinId: "BAT+", label: "BAT+", x: 37, y: 0 },
      { pinId: "BAT-", label: "BAT-", x: -37, y: 0 }
    ]
  },
  "ELCO_1000UF": {
    name: "Elco 1000uF 16V",
    category: "Passive",
    packageType: ComponentPackage.RADIAL_5MM,
    width: 10,
    height: 10,
    color: "#18181b", // Black cylinder
    description: "Electrolytic Capacitor 1000uF 10V/16V for GSM power stabilization",
    pins: [
      { pinId: "+", label: "+", x: -2.5, y: 0 },
      { pinId: "-", label: "-", x: 2.5, y: 0 }
    ]
  },
  "R_10K": {
    name: "Resistor 10kΩ 0805",
    category: "Passive",
    packageType: ComponentPackage.SMD_0805,
    width: 2.0,
    height: 1.25,
    color: "#3f3f46",
    description: "10k Ohm SMT Resistor for RX/TX GSM Logic Divider",
    pins: [
      { pinId: "1", label: "1", x: -0.9, y: 0 },
      { pinId: "2", label: "2", x: 0.9, y: 0 }
    ]
  },
  "R_20K": {
    name: "Resistor 20kΩ 0805",
    category: "Passive",
    packageType: ComponentPackage.SMD_0805,
    width: 2.0,
    height: 1.25,
    color: "#3f3f46",
    description: "20k Ohm SMT Resistor for RX/TX GSM Logic Divider",
    pins: [
      { pinId: "1", label: "1", x: -0.9, y: 0 },
      { pinId: "2", label: "2", x: 0.9, y: 0 }
    ]
  },
  "R_0805": {
    name: "Resistor 0805",
    category: "Passive",
    packageType: ComponentPackage.SMD_0805,
    width: 2.0,
    height: 1.25,
    color: "#52525b", // Neutral grey
    description: "Resistor SMT 0805 Package",
    pins: [
      { pinId: "1", label: "1", x: -0.9, y: 0 },
      { pinId: "2", label: "2", x: 0.9, y: 0 }
    ]
  },
  "C_0603": {
    name: "Capacitor 0603",
    category: "Passive",
    packageType: ComponentPackage.SMD_0603,
    width: 1.6,
    height: 0.8,
    color: "#b45309", // Clay brown
    description: "Capacitor SMT 0603 Package",
    pins: [
      { pinId: "1", label: "1", x: -0.7, y: 0 },
      { pinId: "2", label: "2", x: 0.7, y: 0 }
    ]
  },
  "LED_0805": {
    name: "LED Green 0805",
    category: "Discrete",
    packageType: ComponentPackage.SMD_0805,
    width: 2.0,
    height: 1.25,
    color: "#16a34a", // Vibrant Green
    description: "SMT LED Green 0805 Package",
    pins: [
      { pinId: "A", label: "A (Anode)", x: -0.9, y: 0 },
      { pinId: "K", label: "K (Cathode)", x: 0.9, y: 0 }
    ]
  },
  "JST_2PIN": {
    name: "JST XH 2-Pin",
    category: "Connector",
    packageType: ComponentPackage.JST_XH_2P,
    width: 7.4,
    height: 5.7,
    color: "#f1f5f9", // Crisp white/light grey
    description: "JST XH 2.50mm Pitch Header",
    pins: [
      { pinId: "1", label: "V+", x: -1.25, y: 0 },
      { pinId: "2", label: "GND", x: 1.25, y: 0 }
    ]
  },
  "USB_C_16P": {
    name: "USB-C Port 16-Pin",
    category: "Connector",
    packageType: ComponentPackage.USB_C_16P,
    width: 8.94,
    height: 7.3,
    color: "#3f3f46", // Dark metallic
    description: "USB Type-C SMT Receptacle",
    pins: [
      { pinId: "A1_B12", label: "GND", x: -3.2, y: 1.5 },
      { pinId: "A4_B9", label: "VBUS", x: -2.4, y: 1.5 },
      { pinId: "A5", label: "CC1", x: -1.6, y: 1.5 },
      { pinId: "A6", label: "Dp1", x: -0.8, y: 1.5 },
      { pinId: "A7", label: "Dn1", x: 0.0, y: 1.5 },
      { pinId: "A8", label: "SBU1", x: 0.8, y: 1.5 },
      { pinId: "B5", label: "CC2", x: 1.6, y: 1.5 },
      { pinId: "B6", label: "Dp2", x: 2.4, y: 1.5 },
      { pinId: "B7", label: "Dn2", x: 3.2, y: 1.5 }
    ]
  },
  "VIA": {
    name: "PCB Via Plated 0.6/0.3mm",
    category: "Discrete",
    packageType: ComponentPackage.RADIAL_5MM,
    width: 1.2,
    height: 1.2,
    color: "#b45309", // Copper color ring
    description: "Plated Through Hole Via (0.6mm pad, 0.3mm drill hole) for multilayer connections",
    pins: [
      { pinId: "1", label: "VIA", x: 0, y: 0 }
    ]
  },
  "MOUNTING_HOLE": {
    name: "Mounting Hole NPTH 3.2mm",
    category: "Discrete",
    packageType: ComponentPackage.RADIAL_5MM,
    width: 6.0,
    height: 6.0,
    color: "#1e293b", // dark slate
    description: "Non-Plated Through Hole (3.2mm drill, 6mm clearance ring) for M3 Screws",
    pins: [
      { pinId: "H", label: "HOLE", x: 0, y: 0 }
    ]
  },
  "ARDUINO_UNO_R3": {
    name: "Arduino Uno R3 Board",
    category: "MCU",
    packageType: ComponentPackage.ESP32_WROOM_32,
    width: 53.3,
    height: 68.6,
    color: "#1d4ed8", // Arduino Blue
    description: "Standard ATmega328P based 8-bit Microcontroller Board simulated in Wokwi",
    pins: [
      { pinId: "D0", label: "D0 / RX", x: -25, y: -28 },
      { pinId: "D1", label: "D1 / TX", x: -25, y: -25 },
      { pinId: "D2", label: "D2", x: -25, y: -22 },
      { pinId: "D3", label: "D3 / PWM", x: -25, y: -19 },
      { pinId: "D4", label: "D4", x: -25, y: -16 },
      { pinId: "D5", label: "D5 / PWM", x: -25, y: -13 },
      { pinId: "D6", label: "D6 / PWM", x: -25, y: -10 },
      { pinId: "D7", label: "D7", x: -25, y: -7 },
      { pinId: "D8", label: "D8", x: -25, y: -4 },
      { pinId: "D9", label: "D9 / PWM", x: -25, y: -1 },
      { pinId: "D10", label: "D10 / PWM", x: -25, y: 2 },
      { pinId: "D11", label: "D11 / PWM", x: -25, y: 5 },
      { pinId: "D12", label: "D12", x: -25, y: 8 },
      { pinId: "D13", label: "D13", x: -25, y: 11 },
      { pinId: "GND_D", label: "GND", x: -25, y: 14 },
      { pinId: "AREF", label: "AREF", x: -25, y: 17 },
      { pinId: "SDA_D", label: "SDA", x: -25, y: 20 },
      { pinId: "SCL_D", label: "SCL", x: -25, y: 23 },
      
      { pinId: "A0", label: "A0", x: 25, y: -20 },
      { pinId: "A1", label: "A1", x: 25, y: -17 },
      { pinId: "A2", label: "A2", x: 25, y: -14 },
      { pinId: "A3", label: "A3", x: 25, y: -11 },
      { pinId: "A4", label: "A4 / SDA", x: 25, y: -8 },
      { pinId: "A5", label: "A5 / SCL", x: 25, y: -5 },
      { pinId: "5V", label: "5V", x: 25, y: 1 },
      { pinId: "3V3", label: "3V3", x: 25, y: 4 },
      { pinId: "GND_A", label: "GND", x: 25, y: 7 },
      { pinId: "VIN", label: "VIN", x: 25, y: 10 },
      { pinId: "RST", label: "RESET", x: 25, y: 13 }
    ]
  },
  "RASPBERRY_PI_PICO": {
    name: "Raspberry Pi Pico",
    category: "MCU",
    packageType: ComponentPackage.DIP_40,
    width: 21.0,
    height: 51.0,
    color: "#0f766e", // RP Teal
    description: "RP2040 Dual-core ARM Cortex-M0+ 32-bit Microcontroller Board simulated in Wokwi",
    pins: [
      { pinId: "GP0", label: "GP0 / TX", x: -10, y: -24 },
      { pinId: "GP1", label: "GP1 / RX", x: -10, y: -21.5 },
      { pinId: "GND1", label: "GND", x: -10, y: -19 },
      { pinId: "GP2", label: "GP2", x: -10, y: -16.5 },
      { pinId: "GP3", label: "GP3", x: -10, y: -14 },
      { pinId: "GP4", label: "GP4", x: -10, y: -11.5 },
      { pinId: "GP5", label: "GP5", x: -10, y: -9 },
      { pinId: "GND2", label: "GND", x: -10, y: -6.5 },
      { pinId: "GP6", label: "GP6", x: -10, y: -4 },
      { pinId: "GP7", label: "GP7", x: -10, y: -1.5 },
      { pinId: "GP8", label: "GP8", x: -10, y: 1 },
      { pinId: "GP9", label: "GP9", x: -10, y: 3.5 },
      { pinId: "GND3", label: "GND", x: -10, y: 6 },
      { pinId: "GP10", label: "GP10", x: -10, y: 8.5 },
      { pinId: "GP11", label: "GP11", x: -10, y: 11 },
      { pinId: "GP12", label: "GP12", x: -10, y: 13.5 },
      { pinId: "GP13", label: "GP13", x: -10, y: 16 },
      { pinId: "GND4", label: "GND", x: -10, y: 18.5 },
      { pinId: "GP14", label: "GP14", x: -10, y: 21 },
      { pinId: "GP15", label: "GP15", x: -10, y: 23.5 },
      
      { pinId: "GP16", label: "GP16", x: 10, y: 23.5 },
      { pinId: "GP17", label: "GP17", x: 10, y: 21 },
      { pinId: "GND5", label: "GND", x: 10, y: 18.5 },
      { pinId: "GP18", label: "GP18", x: 10, y: 16 },
      { pinId: "GP19", label: "GP19", x: 10, y: 13.5 },
      { pinId: "GP20", label: "GP20", x: 10, y: 11 },
      { pinId: "GP21", label: "GP21", x: 10, y: 8.5 },
      { pinId: "GND6", label: "GND", x: 10, y: 6 },
      { pinId: "GP22", label: "GP22", x: 10, y: 3.5 },
      { pinId: "RUN", label: "RUN", x: 10, y: 1 },
      { pinId: "GP26", label: "GP26 / AD0", x: 10, y: -1.5 },
      { pinId: "GP27", label: "GP27 / AD1", x: 10, y: -4 },
      { pinId: "GND7", label: "AGND", x: 10, y: -6.5 },
      { pinId: "GP28", label: "GP28 / AD2", x: 10, y: -9 },
      { pinId: "VREF", label: "ADC_VREF", x: 10, y: -11.5 },
      { pinId: "3V3", label: "3V3_OUT", x: 10, y: -14 },
      { pinId: "3V3_EN", label: "3V3_EN", x: 10, y: -16.5 },
      { pinId: "GND8", label: "GND", x: 10, y: -19 },
      { pinId: "VSYS", label: "VSYS", x: 10, y: -21.5 },
      { pinId: "VBUS", label: "VBUS", x: 10, y: -24 }
    ]
  },
  "OLED_SSD1306": {
    name: "OLED SSD1306 Screen (I2C)",
    category: "Discrete",
    packageType: ComponentPackage.SOIC_8,
    width: 28.0,
    height: 28.0,
    color: "#27272a", // Charcoal Dark
    description: "0.96 inch 128x64 pixels monochromatic OLED screen simulated in Wokwi",
    pins: [
      { pinId: "GND", label: "GND", x: -9, y: -12 },
      { pinId: "VCC", label: "VCC", x: -3, y: -12 },
      { pinId: "SCL", label: "SCL", x: 3, y: -12 },
      { pinId: "SDA", label: "SDA", x: 9, y: -12 }
    ]
  },
  "DHT22_SENSOR": {
    name: "DHT22 Temperature & Humidity",
    category: "Discrete",
    packageType: ComponentPackage.RADIAL_5MM,
    width: 15.0,
    height: 20.0,
    color: "#bae6fd", // Light blue grill
    description: "High-precision digital air temperature and relative humidity sensor in Wokwi",
    pins: [
      { pinId: "VDD", label: "VDD", x: -4.5, y: 8 },
      { pinId: "DATA", label: "DATA", x: -1.5, y: 8 },
      { pinId: "NC", label: "NC (No Conn)", x: 1.5, y: 8 },
      { pinId: "GND", label: "GND", x: 4.5, y: 8 }
    ]
  },
  "SERVO_SG90": {
    name: "SG90 Micro Servo 9g",
    category: "Discrete",
    packageType: ComponentPackage.RADIAL_5MM,
    width: 23.0,
    height: 12.0,
    color: "#2563eb", // Servo Blue
    description: "Micro stepper / servo actuator controlled by PWM pin simulated in Wokwi",
    pins: [
      { pinId: "PWM", label: "PWM (Orange)", x: -6, y: 4 },
      { pinId: "VCC", label: "VCC (Red)", x: 0, y: 4 },
      { pinId: "GND", label: "GND (Brown)", x: 6, y: 4 }
    ]
  }
};
