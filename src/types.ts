export type LogicEngine = 'TITAN_SORT_PRO' | 'SHADOW' | 'XQUANTUM_RISE' | 'AUTO_APEX';

export interface IssueItem {
  issueNumber: string;
  number: number;
  colour: string;
  premium?: string;
  openTime?: string;
}

export interface PredictionResult {
  period: string;
  number: number;
  bs: 'BIG' | 'SMALL';
  colour: 'GREEN' | 'RED' | 'VIOLET';
  confidence: number;
  engine: LogicEngine;
  level: number; // 1, 2, or 3
  isLocked: boolean;
  lockTimestamp: number;
  algorithmNote: string;
  lastResultStatus?: 'WIN' | 'PENDING' | 'LOSS';
  streakWins?: number;
  accuracyRate?: number;
  quantumWaveEntropy?: string;
  levelWinLabel?: string;
}

export interface VIPKey {
  key: string;
  label: string;
  createdAt: number;
  expiresAt: number; // timestamp or -1 for lifetime
  isRevoked: boolean;
}

export interface AppSettings {
  appName: string; // Dynamic HUD/App Title (e.g. "ORANGE APEX UI")
  logoUrl: string; // Dynamic Photo/Logo Image URL
  logicEnabled: boolean; // Master toggle: All user prediction logic ON / OFF
  logicDisabledMessage: string; // Notification when logic is OFF
  gameIframeUrl: string;
  apiEndpoint30s: string;
  apiEndpoint1m: string;
  activeApi: '30S' | '1M' | 'CUSTOM';
  customApiUrl: string;
  activeEngine: LogicEngine;
  syncIntervalMs: number;
  telegramUrl: string;
  maxLevelClamp: number; // default 3
  adminPasswordHash: string; // 'abirta009'
  soundEnabled: boolean;
}

export interface GlobalServerConfig {
  appName?: string;
  logoUrl?: string;
  logicEnabled?: boolean;
  logicDisabledMessage?: string;
  activeApi?: '30S' | '1M' | 'CUSTOM';
  activeEngine?: LogicEngine;
  updatedAt?: number;
}
