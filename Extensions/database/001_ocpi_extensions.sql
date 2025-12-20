-- OCPI 2.2.1 Extensions for JuiceNet
-- Extends CitrineOS schema with OCPI-specific tables and derived metrics

-- ============================================
-- OCPI Sessions (Enhanced session tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS "OcpiSessions" (
    id SERIAL PRIMARY KEY,
    "sessionId" VARCHAR(255) UNIQUE NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "partyId" VARCHAR(3) NOT NULL,
    "transactionId" INTEGER REFERENCES "Transactions"(id) ON DELETE CASCADE,
    "locationId" INTEGER REFERENCES "Locations"(id),
    "evseUid" VARCHAR(48),
    "connectorId" INTEGER REFERENCES "Connectors"(id),
    "startDateTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "lastUpdated" TIMESTAMP WITH TIME ZONE NOT NULL,
    "kwhTotal" NUMERIC(10, 3),
    "authId" VARCHAR(36),
    "authReference" VARCHAR(255),
    "authMethod" VARCHAR(50),
    "cdrTokenUid" VARCHAR(36),
    "meterId" VARCHAR(255),
    "currency" VARCHAR(3) DEFAULT 'USD',
    "chargingPeriods" JSONB, -- Array of charging periods with dimensions
    "totalCostExclVat" NUMERIC(10, 2),
    "totalCostInclVat" NUMERIC(10, 2),
    "status" VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, INVALID, PENDING
    "parkingRestrictions" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ocpi_sessions_transaction ON "OcpiSessions"("transactionId");
CREATE INDEX idx_ocpi_sessions_status ON "OcpiSessions"("status");

-- ============================================
-- OCPI Charge Detail Records (CDRs)
-- ============================================
CREATE TABLE IF NOT EXISTS "OcpiCDRs" (
    id SERIAL PRIMARY KEY,
    "cdrId" VARCHAR(255) UNIQUE NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "partyId" VARCHAR(3) NOT NULL,
    "sessionId" INTEGER REFERENCES "OcpiSessions"(id),
    "startDateTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endDateTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "durationSeconds" INTEGER,
    "authId" VARCHAR(36),
    "authReference" VARCHAR(255),
    "authMethod" VARCHAR(50),
    "locationId" INTEGER REFERENCES "Locations"(id),
    "evseUid" VARCHAR(48),
    "connectorId" INTEGER REFERENCES "Connectors"(id),
    "meterId" VARCHAR(255),
    "energyMeteringCapability" VARCHAR(50),
    "currency" VARCHAR(3) DEFAULT 'USD',
    "tariffs" JSONB, -- Array of tariff IDs and details
    "chargingPeriods" JSONB, -- Detailed billing periods
    "signedData" JSONB, -- For legal compliance (format, public key, signed values)
    "totalCostExclVat" NUMERIC(10, 2),
    "totalCostInclVat" NUMERIC(10, 2),
    "totalFixedCost" NUMERIC(10, 2),
    "totalEnergyCost" NUMERIC(10, 2),
    "totalTimeCost" NUMERIC(10, 2),
    "totalParkingCost" NUMERIC(10, 2),
    "totalReservationCost" NUMERIC(10, 2),
    "totalEnergyKwh" NUMERIC(10, 3),
    "totalParkingTimeSeconds" INTEGER,
    "invoiceReferenceId" VARCHAR(255),
    "credit" BOOLEAN DEFAULT FALSE,
    "lastUpdated" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ocpi_cdrs_session ON "OcpiCDRs"("sessionId");
CREATE INDEX idx_ocpi_cdrs_datetime ON "OcpiCDRs"("startDateTime", "endDateTime");

-- ============================================
-- Derived Metrics (Environmental & Performance)
-- ============================================
CREATE TABLE IF NOT EXISTS "SessionMetrics" (
    id SERIAL PRIMARY KEY,
    "transactionId" INTEGER UNIQUE REFERENCES "Transactions"(id) ON DELETE CASCADE,
    "sessionId" INTEGER REFERENCES "OcpiSessions"(id),
    
    -- Energy & Efficiency
    "totalKwhDelivered" NUMERIC(10, 3),
    "averageChargingSpeedKw" NUMERIC(8, 2),
    "peakChargingSpeedKw" NUMERIC(8, 2),
    "efficiencyPercent" NUMERIC(5, 2), -- Delivered vs. capacity
    
    -- Environmental Impact
    "co2SavedKg" NUMERIC(10, 3), -- Calculated based on grid mix
    "gridCarbonIntensityGco2Kwh" NUMERIC(8, 2), -- g CO2/kWh from grid API
    "equivalentTreesPlanted" NUMERIC(8, 2),
    
    -- Vehicle Estimates (if available)
    "estimatedMilesAdded" NUMERIC(8, 2), -- Based on vehicle efficiency
    "vehicleEfficiencyMilesPerKwh" NUMERIC(5, 2), -- e.g., 3.5 mi/kWh
    "batteryStartPercent" NUMERIC(5, 2),
    "batteryEndPercent" NUMERIC(5, 2),
    "batteryCapacityKwh" NUMERIC(6, 2),
    
    -- Financial
    "revenueGenerated" NUMERIC(10, 2),
    "costPerKwh" NUMERIC(6, 4),
    "profitMarginPercent" NUMERIC(5, 2),
    
    -- Performance
    "uptimeSeconds" INTEGER, -- Time connector was charging
    "downtimeSeconds" INTEGER, -- Time idle during session
    "utilizationPercent" NUMERIC(5, 2),
    
    -- Quality Metrics
    "averageVoltage" NUMERIC(7, 2),
    "averageCurrent" NUMERIC(7, 2),
    "powerFactorAverage" NUMERIC(4, 3),
    "temperatureMax" NUMERIC(5, 2),
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_session_metrics_transaction ON "SessionMetrics"("transactionId");

-- ============================================
-- Real-Time Session State (for live views)
-- ============================================
CREATE TABLE IF NOT EXISTS "LiveSessionState" (
    id SERIAL PRIMARY KEY,
    "transactionId" INTEGER UNIQUE REFERENCES "Transactions"(id) ON DELETE CASCADE,
    "sessionId" INTEGER REFERENCES "OcpiSessions"(id),
    
    -- Current State
    "isCharging" BOOLEAN DEFAULT FALSE,
    "currentPowerKw" NUMERIC(8, 2),
    "currentKwhSession" NUMERIC(10, 3),
    "currentChargingSpeedKw" NUMERIC(8, 2),
    "lastMeterValueTimestamp" TIMESTAMP WITH TIME ZONE,
    
    -- Real-Time Estimates
    "estimatedTimeRemainingMinutes" INTEGER,
    "estimatedEndTime" TIMESTAMP WITH TIME ZONE,
    "currentBatteryPercent" NUMERIC(5, 2),
    "currentMilesAdded" NUMERIC(8, 2),
    "currentCo2SavedKg" NUMERIC(8, 3),
    "currentCostAccrued" NUMERIC(10, 2),
    
    -- Connection Quality
    "signalStrengthPercent" NUMERIC(5, 2),
    "connectionStability" VARCHAR(20), -- EXCELLENT, GOOD, FAIR, POOR
    "lastHeartbeat" TIMESTAMP WITH TIME ZONE,
    
    -- Alerts & Events
    "activeAlerts" JSONB, -- Array of current alerts/warnings
    "lastEventType" VARCHAR(50),
    "lastEventTimestamp" TIMESTAMP WITH TIME ZONE,
    
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_live_session_transaction ON "LiveSessionState"("transactionId");
CREATE INDEX idx_live_session_charging ON "LiveSessionState"("isCharging");

-- ============================================
-- Error Log (Enhanced OCPP error tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS "OcppErrorLog" (
    id SERIAL PRIMARY KEY,
    "stationId" VARCHAR(36) REFERENCES "ChargingStations"(id),
    "connectorId" INTEGER REFERENCES "Connectors"(id),
    "transactionId" INTEGER REFERENCES "Transactions"(id),
    
    -- Error Details
    "errorCode" VARCHAR(50) NOT NULL, -- OCPP error codes
    "errorDescription" TEXT,
    "vendorErrorCode" VARCHAR(50),
    "vendorErrorDescription" TEXT,
    
    -- Context
    "messageType" VARCHAR(50), -- e.g., StatusNotification, MeterValues
    "severity" VARCHAR(20) DEFAULT 'ERROR', -- INFO, WARNING, ERROR, CRITICAL
    "errorCategory" VARCHAR(50), -- e.g., COMMUNICATION, HARDWARE, SOFTWARE
    
    -- Resolution
    "resolved" BOOLEAN DEFAULT FALSE,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "resolvedBy" VARCHAR(255),
    
    -- Metadata
    "occuredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "rawPayload" JSONB, -- Full OCPP message for debugging
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_error_log_station ON "OcppErrorLog"("stationId");
CREATE INDEX idx_error_log_severity ON "OcppErrorLog"("severity");
CREATE INDEX idx_error_log_resolved ON "OcppErrorLog"("resolved");
CREATE INDEX idx_error_log_occurred ON "OcppErrorLog"("occuredAt");

-- ============================================
-- Offline Queue (for disconnected chargers)
-- ============================================
CREATE TABLE IF NOT EXISTS "OfflineMessageQueue" (
    id SERIAL PRIMARY KEY,
    "stationId" VARCHAR(36) REFERENCES "ChargingStations"(id),
    "messageType" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    "attempts" INTEGER DEFAULT 0,
    "maxAttempts" INTEGER DEFAULT 3,
    "status" VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED
    "lastAttemptAt" TIMESTAMP WITH TIME ZONE,
    "sentAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "expiresAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_offline_queue_station ON "OfflineMessageQueue"("stationId");
CREATE INDEX idx_offline_queue_status ON "OfflineMessageQueue"("status");
CREATE INDEX idx_offline_queue_priority ON "OfflineMessageQueue"("priority", "createdAt");

-- ============================================
-- Views for Common Queries
-- ============================================

-- Active Sessions with Live Metrics
CREATE OR REPLACE VIEW "ActiveSessionsView" AS
SELECT 
    t.id AS transaction_id,
    t."transactionId",
    t."startTime",
    t."totalKwh",
    t."totalCost",
    cs.id AS station_id,
    cs."chargePointVendor",
    cs."chargePointModel",
    l.id AS location_id,
    l.name AS location_name,
    l.address,
    l.city,
    lss."isCharging",
    lss."currentPowerKw",
    lss."currentKwhSession",
    lss."estimatedTimeRemainingMinutes",
    lss."currentBatteryPercent",
    lss."currentMilesAdded",
    lss."currentCo2SavedKg",
    lss."currentCostAccrued",
    sm."averageChargingSpeedKw",
    sm."co2SavedKg",
    sm."estimatedMilesAdded"
FROM "Transactions" t
LEFT JOIN "ChargingStations" cs ON t."stationId" = cs.id
LEFT JOIN "Locations" l ON t."locationId" = l.id
LEFT JOIN "LiveSessionState" lss ON t.id = lss."transactionId"
LEFT JOIN "SessionMetrics" sm ON t.id = sm."transactionId"
WHERE t."isActive" = TRUE;

-- Session Summary (Post-Session)
CREATE OR REPLACE VIEW "SessionSummaryView" AS
SELECT 
    t.id AS transaction_id,
    t."transactionId",
    t."startTime",
    t."endTime",
    EXTRACT(EPOCH FROM (t."endTime" - t."startTime")) / 60 AS duration_minutes,
    t."totalKwh",
    t."totalCost",
    t."stoppedReason",
    cs.id AS station_id,
    cs."chargePointVendor" AS charger_vendor,
    l.name AS location_name,
    l.address || ', ' || l.city || ', ' || l.state AS full_address,
    sm."co2SavedKg",
    sm."estimatedMilesAdded",
    sm."averageChargingSpeedKw",
    sm."efficiencyPercent",
    sm."revenueGenerated",
    cdr."totalCostExclVat",
    cdr."totalCostInclVat"
FROM "Transactions" t
LEFT JOIN "ChargingStations" cs ON t."stationId" = cs.id
LEFT JOIN "Locations" l ON t."locationId" = l.id
LEFT JOIN "SessionMetrics" sm ON t.id = sm."transactionId"
LEFT JOIN "OcpiSessions" os ON t.id = os."transactionId"
LEFT JOIN "OcpiCDRs" cdr ON os.id = cdr."sessionId"
WHERE t."isActive" = FALSE;

COMMENT ON TABLE "OcpiSessions" IS 'OCPI 2.2.1 Sessions module - tracks active/completed charging sessions';
COMMENT ON TABLE "OcpiCDRs" IS 'OCPI 2.2.1 Charge Detail Records - final billing records';
COMMENT ON TABLE "SessionMetrics" IS 'Derived metrics: environmental impact, efficiency, revenue';
COMMENT ON TABLE "LiveSessionState" IS 'Real-time state for active sessions - updated every MeterValues message';
COMMENT ON TABLE "OcppErrorLog" IS 'Enhanced error logging with OCPP error codes and resolution tracking';
COMMENT ON TABLE "OfflineMessageQueue" IS 'Message queue for offline chargers - ensures reliable delivery';

