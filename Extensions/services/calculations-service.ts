/**
 * JuiceNet Calculations Service
 * 
 * Computes derived metrics for charging sessions:
 * - CO₂ savings based on grid carbon intensity
 * - Miles added based on vehicle efficiency
 * - Revenue and cost calculations
 * - Efficiency and performance metrics
 * 
 * Integrates with CitrineOS OCPP data and external APIs
 */

import { Pool } from 'pg';

// ============================================
// Configuration & Constants
// ============================================

interface CalculationsConfig {
  // Default vehicle efficiency (miles per kWh) - typical EV average
  defaultVehicleEfficiency: number; // 3.5 mi/kWh for average EV
  
  // Grid carbon intensity sources
  gridCarbonApiUrl?: string; // e.g., WattTime, ElectricityMaps API
  defaultGridCarbonIntensity: number; // g CO2/kWh fallback (US average ~390)
  
  // CO₂ equivalence factors
  co2PerTree: number; // kg CO2 absorbed per tree per year (~21kg)
  
  // Cost/Revenue
  defaultCostPerKwh: number; // USD per kWh for host revenue
  defaultProfitMargin: number; // Percentage markup
  
  // Database connection
  databaseUrl: string;
}

const DEFAULT_CONFIG: CalculationsConfig = {
  defaultVehicleEfficiency: 3.5, // miles/kWh
  defaultGridCarbonIntensity: 390, // g CO2/kWh (US average)
  co2PerTree: 21, // kg CO2/year
  defaultCostPerKwh: 0.15, // $0.15/kWh
  defaultProfitMargin: 20, // 20% markup
  databaseUrl: process.env.DATABASE_URL || 'postgresql://citrine:password@localhost:5432/citrine',
};

// ============================================
// External API Integrations
// ============================================

/**
 * Fetch real-time grid carbon intensity
 * Integrates with WattTime, ElectricityMaps, or similar services
 */
async function fetchGridCarbonIntensity(
  latitude: number,
  longitude: number,
  config: CalculationsConfig
): Promise<number> {
  // TODO: Integrate with real API when credentials available
  // Example: WattTime API for marginal emissions
  // const response = await fetch(`${config.gridCarbonApiUrl}/marginal`, {
  //   headers: { 'Authorization': `Bearer ${API_KEY}` },
  //   body: JSON.stringify({ latitude, longitude })
  // });
  
  // For now, return default based on US average
  // Could enhance with regional averages from static data
  return config.defaultGridCarbonIntensity;
}

/**
 * Estimate vehicle efficiency from make/model
 * Can integrate with EPA API or vehicle database
 */
function getVehicleEfficiency(vehicleMake?: string, vehicleModel?: string): number {
  // TODO: Integrate with vehicle database
  // Example efficiencies:
  // Tesla Model 3: 4.1 mi/kWh
  // Nissan Leaf: 3.5 mi/kWh
  // Chevy Bolt: 3.9 mi/kWh
  // Ford F-150 Lightning: 2.0 mi/kWh
  
  // Static lookup table (extend as needed)
  const vehicleEfficiencies: Record<string, number> = {
    'Tesla Model 3': 4.1,
    'Tesla Model Y': 3.8,
    'Nissan Leaf': 3.5,
    'Chevrolet Bolt': 3.9,
    'Ford F-150 Lightning': 2.0,
    'Hyundai Ioniq 5': 3.7,
    'Volkswagen ID.4': 3.3,
  };
  
  const key = `${vehicleMake} ${vehicleModel}`.trim();
  return vehicleEfficiencies[key] || DEFAULT_CONFIG.defaultVehicleEfficiency;
}

// ============================================
// Core Calculation Functions
// ============================================

interface MeterValue {
  value: number;
  unit: string;
  measurand: string;
  phase?: string;
  context?: string;
}

interface SessionData {
  transactionId: number;
  totalKwhDelivered: number;
  durationSeconds: number;
  locationLatitude?: number;
  locationLongitude?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  batteryCapacityKwh?: number;
  batteryStartPercent?: number;
  costPerKwh?: number;
  profitMarginPercent?: number;
  meterValues: MeterValue[];
}

/**
 * Calculate CO₂ savings compared to gasoline vehicle
 */
async function calculateCO2Savings(
  kwhDelivered: number,
  latitude?: number,
  longitude?: number,
  config: CalculationsConfig = DEFAULT_CONFIG
): Promise<{
  co2SavedKg: number;
  gridCarbonIntensity: number;
  equivalentTreesPlanted: number;
}> {
  // Get grid carbon intensity
  const gridCarbon = latitude && longitude
    ? await fetchGridCarbonIntensity(latitude, longitude, config)
    : config.defaultGridCarbonIntensity;
  
  // CO₂ from grid electricity (kg)
  const co2FromGrid = (kwhDelivered * gridCarbon) / 1000; // Convert g to kg
  
  // CO₂ from equivalent gasoline vehicle
  // Avg gas car: 24 MPG, 8,887 g CO2/gallon
  // Avg EV: 3.5 mi/kWh
  const milesFromEV = kwhDelivered * 3.5;
  const gallonsGas = milesFromEV / 24;
  const co2FromGas = (gallonsGas * 8887) / 1000; // kg CO2
  
  // Net savings
  const co2SavedKg = co2FromGas - co2FromGrid;
  
  // Tree equivalence (trees planted for one year)
  const equivalentTreesPlanted = co2SavedKg / config.co2PerTree;
  
  return {
    co2SavedKg: Math.max(0, co2SavedKg),
    gridCarbonIntensity: gridCarbon,
    equivalentTreesPlanted: Math.max(0, equivalentTreesPlanted),
  };
}

/**
 * Calculate estimated miles added
 */
function calculateMilesAdded(
  kwhDelivered: number,
  vehicleMake?: string,
  vehicleModel?: string
): { estimatedMilesAdded: number; vehicleEfficiency: number } {
  const efficiency = getVehicleEfficiency(vehicleMake, vehicleModel);
  const estimatedMilesAdded = kwhDelivered * efficiency;
  
  return {
    estimatedMilesAdded,
    vehicleEfficiency: efficiency,
  };
}

/**
 * Calculate revenue and cost metrics
 */
function calculateFinancials(
  kwhDelivered: number,
  costPerKwh?: number,
  profitMargin?: number
): {
  revenueGenerated: number;
  costPerKwh: number;
  profitMarginPercent: number;
  totalCost: number;
} {
  const cost = costPerKwh || DEFAULT_CONFIG.defaultCostPerKwh;
  const margin = profitMargin || DEFAULT_CONFIG.defaultProfitMargin;
  
  const revenueGenerated = kwhDelivered * cost * (1 + margin / 100);
  const totalCost = kwhDelivered * cost;
  
  return {
    revenueGenerated,
    costPerKwh: cost,
    profitMarginPercent: margin,
    totalCost,
  };
}

/**
 * Calculate efficiency and performance metrics
 */
function calculatePerformance(
  kwhDelivered: number,
  durationSeconds: number,
  chargerRatedPowerKw: number,
  meterValues: MeterValue[]
): {
  averageChargingSpeedKw: number;
  peakChargingSpeedKw: number;
  efficiencyPercent: number;
  utilizationPercent: number;
} {
  // Average charging speed
  const durationHours = durationSeconds / 3600;
  const averageChargingSpeedKw = durationHours > 0 ? kwhDelivered / durationHours : 0;
  
  // Peak charging speed from meter values
  const powerReadings = meterValues
    .filter(mv => mv.measurand === 'Power.Active.Import' && mv.unit === 'kW')
    .map(mv => mv.value);
  const peakChargingSpeedKw = powerReadings.length > 0 ? Math.max(...powerReadings) : averageChargingSpeedKw;
  
  // Efficiency: delivered vs. theoretical maximum
  const theoreticalMax = chargerRatedPowerKw * durationHours;
  const efficiencyPercent = theoreticalMax > 0 ? (kwhDelivered / theoreticalMax) * 100 : 0;
  
  // Utilization: actual average vs. rated capacity
  const utilizationPercent = chargerRatedPowerKw > 0 ? (averageChargingSpeedKw / chargerRatedPowerKw) * 100 : 0;
  
  return {
    averageChargingSpeedKw,
    peakChargingSpeedKw,
    efficiencyPercent: Math.min(100, efficiencyPercent),
    utilizationPercent: Math.min(100, utilizationPercent),
  };
}

/**
 * Calculate battery state estimates
 */
function calculateBatteryState(
  kwhDelivered: number,
  batteryCapacityKwh?: number,
  batteryStartPercent?: number
): {
  batteryEndPercent?: number;
  batteryChargeAdded?: number;
} {
  if (!batteryCapacityKwh) {
    return {}; // Can't estimate without capacity
  }
  
  const batteryChargeAdded = (kwhDelivered / batteryCapacityKwh) * 100;
  const batteryEndPercent = batteryStartPercent 
    ? Math.min(100, batteryStartPercent + batteryChargeAdded)
    : undefined;
  
  return {
    batteryEndPercent,
    batteryChargeAdded,
  };
}

// ============================================
// Database Integration
// ============================================

class CalculationsService {
  private pool: Pool;
  private config: CalculationsConfig;
  
  constructor(config: Partial<CalculationsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pool = new Pool({
      connectionString: this.config.databaseUrl,
    });
  }
  
  /**
   * Process a completed transaction and compute all metrics
   */
  async processCompletedSession(transactionId: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Fetch transaction data
      const { rows: [transaction] } = await client.query(`
        SELECT 
          t.*,
          l.coordinates,
          cs."chargePointVendor",
          cs."chargePointModel"
        FROM "Transactions" t
        LEFT JOIN "Locations" l ON t."locationId" = l.id
        LEFT JOIN "ChargingStations" cs ON t."stationId" = cs.id
        WHERE t.id = $1
      `, [transactionId]);
      
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }
      
      const kwhDelivered = parseFloat(transaction.totalKwh || 0);
      const durationSeconds = transaction.timeSpentCharging || 0;
      
      // Extract coordinates
      let latitude, longitude;
      if (transaction.coordinates) {
        const coords = transaction.coordinates.coordinates; // PostGIS format
        [longitude, latitude] = coords;
      }
      
      // Fetch meter values
      const { rows: meterValues } = await client.query(`
        SELECT "sampledValue", timestamp
        FROM "MeterValues"
        WHERE "transactionDatabaseId" = $1
        ORDER BY timestamp
      `, [transactionId]);
      
      const parsedMeterValues: MeterValue[] = meterValues.flatMap(mv => 
        Array.isArray(mv.sampledValue) ? mv.sampledValue : [mv.sampledValue]
      );
      
      // Calculate all metrics
      const co2Metrics = await calculateCO2Savings(kwhDelivered, latitude, longitude, this.config);
      const milesMetrics = calculateMilesAdded(kwhDelivered); // TODO: Get vehicle info from auth/token
      const financialMetrics = calculateFinancials(kwhDelivered, transaction.costPerKwh);
      const performanceMetrics = calculatePerformance(kwhDelivered, durationSeconds, 7.2, parsedMeterValues); // TODO: Get rated power
      const batteryMetrics = calculateBatteryState(kwhDelivered); // TODO: Get battery info from ISO 15118
      
      // Insert into SessionMetrics table
      await client.query(`
        INSERT INTO "SessionMetrics" (
          "transactionId",
          "totalKwhDelivered",
          "averageChargingSpeedKw",
          "peakChargingSpeedKw",
          "efficiencyPercent",
          "co2SavedKg",
          "gridCarbonIntensityGco2Kwh",
          "equivalentTreesPlanted",
          "estimatedMilesAdded",
          "vehicleEfficiencyMilesPerKwh",
          "batteryEndPercent",
          "revenueGenerated",
          "costPerKwh",
          "profitMarginPercent",
          "utilizationPercent"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT ("transactionId") DO UPDATE SET
          "totalKwhDelivered" = EXCLUDED."totalKwhDelivered",
          "averageChargingSpeedKw" = EXCLUDED."averageChargingSpeedKw",
          "peakChargingSpeedKw" = EXCLUDED."peakChargingSpeedKw",
          "efficiencyPercent" = EXCLUDED."efficiencyPercent",
          "co2SavedKg" = EXCLUDED."co2SavedKg",
          "gridCarbonIntensityGco2Kwh" = EXCLUDED."gridCarbonIntensityGco2Kwh",
          "equivalentTreesPlanted" = EXCLUDED."equivalentTreesPlanted",
          "estimatedMilesAdded" = EXCLUDED."estimatedMilesAdded",
          "vehicleEfficiencyMilesPerKwh" = EXCLUDED."vehicleEfficiencyMilesPerKwh",
          "batteryEndPercent" = EXCLUDED."batteryEndPercent",
          "revenueGenerated" = EXCLUDED."revenueGenerated",
          "costPerKwh" = EXCLUDED."costPerKwh",
          "profitMarginPercent" = EXCLUDED."profitMarginPercent",
          "utilizationPercent" = EXCLUDED."utilizationPercent",
          "updatedAt" = NOW()
      `, [
        transactionId,
        kwhDelivered,
        performanceMetrics.averageChargingSpeedKw,
        performanceMetrics.peakChargingSpeedKw,
        performanceMetrics.efficiencyPercent,
        co2Metrics.co2SavedKg,
        co2Metrics.gridCarbonIntensity,
        co2Metrics.equivalentTreesPlanted,
        milesMetrics.estimatedMilesAdded,
        milesMetrics.vehicleEfficiency,
        batteryMetrics.batteryEndPercent,
        financialMetrics.revenueGenerated,
        financialMetrics.costPerKwh,
        financialMetrics.profitMarginPercent,
        performanceMetrics.utilizationPercent,
      ]);
      
      console.log(`✅ Processed metrics for transaction ${transactionId}`);
    } finally {
      client.release();
    }
  }
  
  /**
   * Update live session state from MeterValues message
   */
  async updateLiveSessionState(transactionId: number, meterValue: any): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const sampledValues: MeterValue[] = Array.isArray(meterValue.sampledValue) 
        ? meterValue.sampledValue 
        : [meterValue.sampledValue];
      
      // Extract current power and energy
      const powerValue = sampledValues.find(sv => sv.measurand === 'Power.Active.Import');
      const energyValue = sampledValues.find(sv => sv.measurand === 'Energy.Active.Import.Register');
      
      const currentPowerKw = powerValue ? parseFloat(powerValue.value) : null;
      const currentKwhSession = energyValue ? parseFloat(energyValue.value) : null;
      
      // Quick CO₂ and miles estimates
      const co2Estimate = currentKwhSession ? (await calculateCO2Savings(currentKwhSession)).co2SavedKg : null;
      const milesEstimate = currentKwhSession ? calculateMilesAdded(currentKwhSession).estimatedMilesAdded : null;
      
      // Update live state
      await client.query(`
        INSERT INTO "LiveSessionState" (
          "transactionId",
          "isCharging",
          "currentPowerKw",
          "currentKwhSession",
          "currentChargingSpeedKw",
          "lastMeterValueTimestamp",
          "currentMilesAdded",
          "currentCo2SavedKg",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT ("transactionId") DO UPDATE SET
          "isCharging" = EXCLUDED."isCharging",
          "currentPowerKw" = EXCLUDED."currentPowerKw",
          "currentKwhSession" = EXCLUDED."currentKwhSession",
          "currentChargingSpeedKw" = EXCLUDED."currentChargingSpeedKw",
          "lastMeterValueTimestamp" = EXCLUDED."lastMeterValueTimestamp",
          "currentMilesAdded" = EXCLUDED."currentMilesAdded",
          "currentCo2SavedKg" = EXCLUDED."currentCo2SavedKg",
          "updatedAt" = NOW()
      `, [
        transactionId,
        currentPowerKw && currentPowerKw > 0.1, // Charging if power > 100W
        currentPowerKw,
        currentKwhSession,
        currentPowerKw, // Current speed = current power
        new Date(),
        milesEstimate,
        co2Estimate,
      ]);
    } finally {
      client.release();
    }
  }
  
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ============================================
// Export
// ============================================

export {
  CalculationsService,
  CalculationsConfig,
  calculateCO2Savings,
  calculateMilesAdded,
  calculateFinancials,
  calculatePerformance,
  calculateBatteryState,
};

export default CalculationsService;
