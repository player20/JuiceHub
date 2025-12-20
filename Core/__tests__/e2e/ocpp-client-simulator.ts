/**
 * Simple OCPP 2.0.1 Client Simulator for Testing
 *
 * This simulator can be used to test CitrineOS by sending OCPP messages.
 */

import WebSocket from 'ws';

interface OCPPMessage {
  action: string;
  payload: any;
}

class OCPPClientSimulator {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private readonly stationId: string;
  private readonly serverUrl: string;
  private readonly pendingRequests = new Map<string, (response: any) => void>();

  constructor(serverUrl: string, stationId: string) {
    this.serverUrl = serverUrl;
    this.stationId = stationId;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/${this.stationId}`;
      console.log(`Connecting to ${url}...`);

      this.ws = new WebSocket(url, ['ocpp2.0.1']);

      this.ws.on('open', () => {
        console.log(`Connected to CitrineOS as ${this.stationId}`);
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('Connection closed');
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      const [messageType, messageId, ...rest] = message;

      if (messageType === 3) {
        // Response to our request
        const callback = this.pendingRequests.get(messageId);
        if (callback) {
          callback(rest[0]); // payload
          this.pendingRequests.delete(messageId);
        }
      } else if (messageType === 2) {
        // Request from server (e.g., RemoteStartTransaction)
        const [action, payload] = rest;
        console.log(`Received request: ${action}`, payload);
        this.sendResponse(messageId, {});
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private sendResponse(messageId: string, payload: any): void {
    const message = [3, messageId, payload];
    this.ws?.send(JSON.stringify(message));
  }

  async sendMessage(action: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const msgId = (++this.messageId).toString();
      const message = [2, msgId, action, payload];

      this.pendingRequests.set(msgId, resolve);

      this.ws.send(JSON.stringify(message));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(msgId)) {
          this.pendingRequests.delete(msgId);
          reject(new Error(`Timeout waiting for response to ${action}`));
        }
      }, 30000);
    });
  }

  async bootNotification(): Promise<any> {
    console.log('Sending BootNotification...');
    return this.sendMessage('BootNotification', {
      chargingStation: {
        model: 'Simulator-V1',
        vendorName: 'JuiceNet-Test',
        serialNumber: `SIM-${this.stationId}`,
        firmwareVersion: '1.0.0',
      },
      reason: 'PowerUp',
    });
  }

  async statusNotification(status: string, evseId: number = 1, connectorId: number = 1): Promise<any> {
    console.log(`Sending StatusNotification: ${status}`);
    return this.sendMessage('StatusNotification', {
      timestamp: new Date().toISOString(),
      connectorStatus: status,
      evseId,
      connectorId,
    });
  }

  async authorize(idToken: string): Promise<any> {
    console.log(`Sending Authorize for token: ${idToken}`);
    return this.sendMessage('Authorize', {
      idToken: {
        idToken,
        type: 'ISO14443',
      },
    });
  }

  async startTransaction(idToken: string, transactionId: string): Promise<any> {
    console.log(`Starting transaction: ${transactionId}`);
    return this.sendMessage('TransactionEvent', {
      eventType: 'Started',
      timestamp: new Date().toISOString(),
      triggerReason: 'Authorized',
      seqNo: 0,
      transactionInfo: {
        transactionId,
      },
      evse: {
        id: 1,
        connectorId: 1,
      },
      idToken: {
        idToken,
        type: 'ISO14443',
      },
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: 0,
              context: 'Transaction.Begin',
              measurand: 'Energy.Active.Import.Register',
              unitOfMeasure: { unit: 'Wh' },
            },
          ],
        },
      ],
    });
  }

  async sendMeterValues(transactionId: string, power: number, energy: number, voltage: number, current: number): Promise<any> {
    return this.sendMessage('MeterValues', {
      evseId: 1,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: power,
              context: 'Sample.Periodic',
              measurand: 'Power.Active.Import',
              unitOfMeasure: { unit: 'W' },
            },
            {
              value: energy,
              context: 'Sample.Periodic',
              measurand: 'Energy.Active.Import.Register',
              unitOfMeasure: { unit: 'Wh' },
            },
            {
              value: voltage,
              context: 'Sample.Periodic',
              measurand: 'Voltage',
              unitOfMeasure: { unit: 'V' },
            },
            {
              value: current,
              context: 'Sample.Periodic',
              measurand: 'Current.Import',
              unitOfMeasure: { unit: 'A' },
            },
          ],
        },
      ],
    });
  }

  async stopTransaction(transactionId: string, finalEnergy: number): Promise<any> {
    console.log(`Stopping transaction: ${transactionId}`);
    return this.sendMessage('TransactionEvent', {
      eventType: 'Ended',
      timestamp: new Date().toISOString(),
      triggerReason: 'StopAuthorized',
      seqNo: 99,
      transactionInfo: {
        transactionId,
        stoppedReason: 'Local',
      },
      evse: {
        id: 1,
        connectorId: 1,
      },
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: finalEnergy,
              context: 'Transaction.End',
              measurand: 'Energy.Active.Import.Register',
              unitOfMeasure: { unit: 'Wh' },
            },
          ],
        },
      ],
    });
  }

  async simulateChargingSession(durationMinutes: number = 5): Promise<void> {
    console.log(`\n=== Simulating ${durationMinutes}-minute charging session ===\n`);

    // 1. Boot
    const bootResponse = await this.bootNotification();
    console.log('BootNotification response:', bootResponse);

    // 2. Status: Available
    await this.statusNotification('Available');

    // 3. Authorize
    const authResponse = await this.authorize('GUEST-TEST-001');
    console.log('Authorize response:', authResponse);

    if (authResponse.idTokenInfo.status !== 'Accepted') {
      console.error('Authorization failed!');
      return;
    }

    // 4. Start transaction
    const transactionId = `TXN-${Date.now()}`;
    await this.startTransaction('GUEST-TEST-001', transactionId);

    // 5. Status: Charging
    await this.statusNotification('Charging');

    // 6. Send meter values every minute
    const power = 7400; // 7.4 kW
    const voltage = 240;
    const current = 30.8;

    for (let minute = 1; minute <= durationMinutes; minute++) {
      const energy = (power * minute) / 60; // Wh
      console.log(`Minute ${minute}: ${power}W, ${energy.toFixed(0)}Wh`);

      await this.sendMeterValues(transactionId, power, energy, voltage, current);

      // Wait 1 minute (or 1 second in simulation)
      await this.wait(1000);
    }

    // 7. Stop transaction
    const finalEnergy = (power * durationMinutes) / 60;
    await this.stopTransaction(transactionId, finalEnergy);

    // 8. Status: Available
    await this.statusNotification('Available');

    console.log(`\n=== Session complete! Total energy: ${(finalEnergy / 1000).toFixed(2)} kWh ===\n`);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  disconnect(): void {
    this.ws?.close();
  }
}

// Main execution
async function main() {
  const serverUrl = process.env.OCPP_SERVER_URL || 'ws://localhost:8081';
  const stationId = process.env.STATION_ID || `TEST-STATION-${Date.now()}`;

  console.log('=== OCPP 2.0.1 Client Simulator ===');
  console.log(`Server: ${serverUrl}`);
  console.log(`Station ID: ${stationId}\n`);

  const simulator = new OCPPClientSimulator(serverUrl, stationId);

  try {
    await simulator.connect();
    await simulator.simulateChargingSession(5); // 5-minute session
  } catch (error) {
    console.error('Simulation error:', error);
    process.exit(1);
  } finally {
    simulator.disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { OCPPClientSimulator };
