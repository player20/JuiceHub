// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import { Optional } from 'sequelize';
import { Column, DataType, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import {
  Authorization,
  LocalListAuthorization,
  LocalListVersion,
  LocalListVersionAuthorization,
  SendLocalList,
  SendLocalListAuthorization,
} from './Authorization';
import { Boot } from './Boot';
import { Certificate, InstalledCertificate } from './Certificate';
import { ChangeConfiguration } from './ChangeConfiguration';
import {
  ChargingNeeds,
  ChargingProfile,
  ChargingSchedule,
  CompositeSchedule,
  SalesTariff,
} from './ChargingProfile';
import {
  ChargingStation,
  ChargingStationNetworkProfile,
  Connector,
  Location,
  ServerNetworkProfile,
  SetNetworkProfile,
  StatusNotification,
} from './Location';
import { ChargingStationSecurityInfo } from './ChargingStationSecurityInfo';
import { ChargingStationSequence } from './ChargingStationSequence';
import {
  Component,
  EvseType,
  Variable,
  VariableAttribute,
  VariableCharacteristics,
  VariableStatus,
} from './DeviceModel';
import { ComponentVariable } from './DeviceModel/ComponentVariable';
import { EventData, VariableMonitoring, VariableMonitoringStatus } from './VariableMonitoring';
import {
  MeterValue,
  StartTransaction,
  StopTransaction,
  Transaction,
  TransactionEvent,
} from './TransactionEvent';
import { MessageInfo } from './MessageInfo';
import { OCPPMessage } from './OCPPMessage';
import { Reservation } from './Reservation';
import { SecurityEvent } from './SecurityEvent';
import { LatestStatusNotification } from './Location/LatestStatusNotification';
import { Subscription } from './Subscription';
import { Tariff } from './Tariff';
import { TenantPartner } from './TenantPartner';
import { ITenantDto, OCPIRegistration } from '@citrineos/base';

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum BillingStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
}

export enum DeploymentStrategy {
  SHARED = 'shared',
  DEDICATED_DB = 'dedicated-db',
  DEDICATED_INFRA = 'dedicated-infra',
}

export interface TenantFeatures {
  analytics: boolean;
  revenue: boolean;
  alerts: boolean;
  smartCharging: boolean;
  v2g: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export enum TenantAttributeProps {
  id = 'id',
  name = 'name',
  url = 'url',
  partyId = 'partyId',
  countryCode = 'countryCode',
  serverProfileOCPI = 'serverProfileOCPI',

  // Commercial Multi-Tenancy Fields
  contactEmail = 'contactEmail',
  subscriptionTier = 'subscriptionTier',
  billingStatus = 'billingStatus',
  deploymentStrategy = 'deploymentStrategy',

  // Quotas
  maxStations = 'maxStations',
  maxApiCallsPerHour = 'maxApiCallsPerHour',
  maxStorageGB = 'maxStorageGB',
  maxConcurrentSessions = 'maxConcurrentSessions',

  // Current Usage
  currentStationCount = 'currentStationCount',
  currentStorageUsedGB = 'currentStorageUsedGB',
  apiCallsToday = 'apiCallsToday',

  // Feature Flags
  features = 'features',

  // Billing Integration
  stripeCustomerId = 'stripeCustomerId',
  stripeSubscriptionId = 'stripeSubscriptionId',

  // Database Info (for dedicated-db strategy)
  databaseHost = 'databaseHost',
  databaseName = 'databaseName',
  databaseCredentialsSecretArn = 'databaseCredentialsSecretArn',

  // Timestamps
  lastBillingDate = 'lastBillingDate',
  subscriptionStartDate = 'subscriptionStartDate',
  subscriptionEndDate = 'subscriptionEndDate',
  trialEndDate = 'trialEndDate',
  deactivatedAt = 'deactivatedAt',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export interface TenantAttributes {
  [TenantAttributeProps.id]: string;
  [TenantAttributeProps.name]: string;
  [TenantAttributeProps.url]?: string;
  [TenantAttributeProps.partyId]?: string;
  [TenantAttributeProps.countryCode]?: string;
  [TenantAttributeProps.serverProfileOCPI]?: OCPIRegistration.ServerProfile | null;

  // Commercial Multi-Tenancy Fields
  [TenantAttributeProps.contactEmail]?: string;
  [TenantAttributeProps.subscriptionTier]: SubscriptionTier;
  [TenantAttributeProps.billingStatus]: BillingStatus;
  [TenantAttributeProps.deploymentStrategy]: DeploymentStrategy;

  // Quotas
  [TenantAttributeProps.maxStations]: number;
  [TenantAttributeProps.maxApiCallsPerHour]: number;
  [TenantAttributeProps.maxStorageGB]: number;
  [TenantAttributeProps.maxConcurrentSessions]: number;

  // Current Usage
  [TenantAttributeProps.currentStationCount]?: number;
  [TenantAttributeProps.currentStorageUsedGB]?: number;
  [TenantAttributeProps.apiCallsToday]?: number;

  // Feature Flags
  [TenantAttributeProps.features]: TenantFeatures;

  // Billing Integration
  [TenantAttributeProps.stripeCustomerId]?: string;
  [TenantAttributeProps.stripeSubscriptionId]?: string;

  // Database Info
  [TenantAttributeProps.databaseHost]?: string;
  [TenantAttributeProps.databaseName]?: string;
  [TenantAttributeProps.databaseCredentialsSecretArn]?: string;

  // Timestamps
  [TenantAttributeProps.lastBillingDate]?: Date;
  [TenantAttributeProps.subscriptionStartDate]?: Date;
  [TenantAttributeProps.subscriptionEndDate]?: Date;
  [TenantAttributeProps.trialEndDate]?: Date;
  [TenantAttributeProps.deactivatedAt]?: Date;
  [TenantAttributeProps.createdAt]: Date;
  [TenantAttributeProps.updatedAt]: Date;
}

export interface TenantCreationAttributes
  extends Optional<
    TenantAttributes,
    | TenantAttributeProps.url
    | TenantAttributeProps.partyId
    | TenantAttributeProps.countryCode
    | TenantAttributeProps.serverProfileOCPI
    | TenantAttributeProps.contactEmail
    | TenantAttributeProps.currentStationCount
    | TenantAttributeProps.currentStorageUsedGB
    | TenantAttributeProps.apiCallsToday
    | TenantAttributeProps.stripeCustomerId
    | TenantAttributeProps.stripeSubscriptionId
    | TenantAttributeProps.databaseHost
    | TenantAttributeProps.databaseName
    | TenantAttributeProps.databaseCredentialsSecretArn
    | TenantAttributeProps.lastBillingDate
    | TenantAttributeProps.subscriptionStartDate
    | TenantAttributeProps.subscriptionEndDate
    | TenantAttributeProps.trialEndDate
    | TenantAttributeProps.deactivatedAt
    | TenantAttributeProps.createdAt
    | TenantAttributeProps.updatedAt
  > {}

@Table
export class Tenant
  extends Model<TenantAttributes, TenantCreationAttributes>
  implements ITenantDto
{
  static readonly MODEL_NAME: string = 'Tenant';

  @PrimaryKey
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.STRING)
  declare url: string;

  @Column(DataType.STRING)
  declare partyId: string;

  @Column(DataType.STRING)
  declare countryCode: string;

  @Column(DataType.JSONB)
  declare serverProfileOCPI?: OCPIRegistration.ServerProfile | null;

  // Commercial Multi-Tenancy Fields
  @Column(DataType.STRING)
  declare contactEmail?: string;

  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionTier)),
    defaultValue: SubscriptionTier.FREE,
  })
  declare subscriptionTier: SubscriptionTier;

  @Column({
    type: DataType.ENUM(...Object.values(BillingStatus)),
    defaultValue: BillingStatus.ACTIVE,
  })
  declare billingStatus: BillingStatus;

  @Column({
    type: DataType.ENUM(...Object.values(DeploymentStrategy)),
    defaultValue: DeploymentStrategy.SHARED,
  })
  declare deploymentStrategy: DeploymentStrategy;

  // Quotas
  @Column({
    type: DataType.INTEGER,
    defaultValue: 5, // Free tier default
  })
  declare maxStations: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1000, // Free tier default
  })
  declare maxApiCallsPerHour: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 1.0, // Free tier default: 1 GB
  })
  declare maxStorageGB: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 10, // Free tier default
  })
  declare maxConcurrentSessions: number;

  // Current Usage
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  declare currentStationCount?: number;

  @Column({
    type: DataType.FLOAT,
    defaultValue: 0,
  })
  declare currentStorageUsedGB?: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  declare apiCallsToday?: number;

  // Feature Flags
  @Column({
    type: DataType.JSONB,
    defaultValue: {
      analytics: false,
      revenue: false,
      alerts: true,
      smartCharging: false,
      v2g: false,
      customBranding: false,
      prioritySupport: false,
    },
  })
  declare features: TenantFeatures;

  // Billing Integration
  @Column(DataType.STRING)
  declare stripeCustomerId?: string;

  @Column(DataType.STRING)
  declare stripeSubscriptionId?: string;

  // Database Info (for dedicated-db strategy)
  @Column(DataType.STRING)
  declare databaseHost?: string;

  @Column(DataType.STRING)
  declare databaseName?: string;

  @Column(DataType.STRING)
  declare databaseCredentialsSecretArn?: string;

  // Timestamps
  @Column(DataType.DATE)
  declare lastBillingDate?: Date;

  @Column(DataType.DATE)
  declare subscriptionStartDate?: Date;

  @Column(DataType.DATE)
  declare subscriptionEndDate?: Date;

  @Column(DataType.DATE)
  declare trialEndDate?: Date;

  @Column(DataType.DATE)
  declare deactivatedAt?: Date;

  /**
   * Relationships
   */

  @HasMany(() => TenantPartner)
  declare tenantPartners: TenantPartner[];

  @HasMany(() => Authorization)
  declare authorizations: Authorization[];

  @HasMany(() => Boot)
  declare boots: Boot[];

  @HasMany(() => Certificate)
  declare certificates: Certificate[];

  @HasMany(() => InstalledCertificate)
  declare installedCertificates: InstalledCertificate[];

  @HasMany(() => ChangeConfiguration)
  declare changeConfigurations: ChangeConfiguration[];

  @HasMany(() => ChargingNeeds)
  declare chargingNeeds: ChargingNeeds[];

  @HasMany(() => ChargingProfile)
  declare chargingProfiles: ChargingProfile[];

  @HasMany(() => ChargingSchedule)
  declare chargingSchedules: ChargingSchedule[];

  @HasMany(() => ChargingStation)
  declare chargingStations: ChargingStation[];

  @HasMany(() => ChargingStationNetworkProfile)
  declare chargingStationNetworkProfiles: ChargingStationNetworkProfile[];

  @HasMany(() => ChargingStationSecurityInfo)
  declare chargingStationSecurityInfos: ChargingStationSecurityInfo[];

  @HasMany(() => ChargingStationSequence)
  declare chargingStationSequences: ChargingStationSequence[];

  @HasMany(() => Component)
  declare components: Component[];

  @HasMany(() => ComponentVariable)
  declare componentVariables: ComponentVariable[];

  @HasMany(() => CompositeSchedule)
  declare compositeSchedules: CompositeSchedule[];

  @HasMany(() => Connector)
  declare connectors: Connector[];

  @HasMany(() => EvseType)
  declare evses: EvseType[];

  @HasMany(() => EventData)
  declare eventDatas: EventData[];

  @HasMany(() => Location)
  declare locations: Location[];

  @HasMany(() => MeterValue)
  declare meterValues: MeterValue[];

  @HasMany(() => MessageInfo)
  declare messageInfos: MessageInfo[];

  @HasMany(() => OCPPMessage)
  declare ocppMessages: OCPPMessage[];

  @HasMany(() => Reservation)
  declare reservations: Reservation[];

  @HasMany(() => SalesTariff)
  declare salesTariffs: SalesTariff[];

  @HasMany(() => SecurityEvent)
  declare securityEvents: SecurityEvent[];

  @HasMany(() => SetNetworkProfile)
  declare setNetworkProfiles: SetNetworkProfile[];

  @HasMany(() => ServerNetworkProfile)
  declare serverNetworkProfiles: ServerNetworkProfile[];

  @HasMany(() => Transaction)
  declare transactions: Transaction[];

  @HasMany(() => StartTransaction)
  declare startTransactions: StartTransaction[];

  @HasMany(() => StatusNotification)
  declare statusNotifications: StatusNotification[];

  @HasMany(() => StopTransaction)
  declare stopTransactions: StopTransaction[];

  @HasMany(() => LatestStatusNotification)
  declare latestStatusNotifications: LatestStatusNotification[];

  @HasMany(() => Subscription)
  declare subscriptions: Subscription[];

  @HasMany(() => TransactionEvent)
  declare transactionEvents: TransactionEvent[];

  @HasMany(() => Tariff)
  declare tariffs: Tariff[];

  @HasMany(() => VariableAttribute)
  declare variableAttributes: VariableAttribute[];

  @HasMany(() => VariableCharacteristics)
  declare variableCharacteristics: VariableCharacteristics[];

  @HasMany(() => VariableMonitoring)
  declare variableMonitorings: VariableMonitoring[];

  @HasMany(() => VariableMonitoringStatus)
  declare variableMonitoringStatuses: VariableMonitoringStatus[];

  @HasMany(() => VariableStatus)
  declare variableStatuses: VariableStatus[];

  @HasMany(() => Variable)
  declare variables: Variable[];

  @HasMany(() => LocalListAuthorization)
  declare localListAuthorizations: LocalListAuthorization[];

  @HasMany(() => LocalListVersion)
  declare localListVersions: LocalListVersion[];

  @HasMany(() => LocalListVersionAuthorization)
  declare localListVersionAuthorizations: LocalListVersionAuthorization[];

  @HasMany(() => SendLocalList)
  declare sendLocalLists: SendLocalList[];

  @HasMany(() => SendLocalListAuthorization)
  declare sendLocalListAuthorizations: SendLocalListAuthorization[];
}
