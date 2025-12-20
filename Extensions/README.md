# JuiceNet Protocol Extensions

Comprehensive extensions for CitrineOS to provide full OCPP 2.0.1 / OCPI 2.2.1 data capture with Guest/Host views.

## Architecture

```
juicenet-extensions/
├── database/           # Schema extensions for OCPI and derived metrics
├── services/           # Calculation modules (CO₂, miles, revenue)
├── ui-components/      # Guest/Host view React components
└── config/             # Configuration for extensions
```

## Features

### 1. Full Protocol Data Capture
- **OCPP 2.0.1**: All message types captured (BootNotification, MeterValues, TransactionEvent, etc.)
- **OCPI 2.2.1**: Sessions, CDRs, Locations, Tariffs, Commands, Tokens

### 2. Real-Time Guest View
- Live kWh consumption, charging speed, estimated miles added
- CO₂ savings calculation
- Battery percentage and time remaining
- Fault notifications

### 3. Real-Time Host View
- Energy flow monitoring
- Revenue tracking
- Performance metrics
- Remote controls (pause/restart)

### 4. Post-Session Summaries
- Detailed CDRs with cost breakdowns
- Environmental impact (CO₂ saved)
- Performance analytics

### 5. Error Reporting
- OCPP error codes with industry standards
- ELK Stack integration for log aggregation
- Exportable reports (CSV/PDF)

## Installation

See individual component READMEs for setup instructions.

