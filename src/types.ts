export interface RevenueData {
  title: string;
  revenue: number;
  [key: string]: any;
}

export interface ProcessedData {
  majorTitles: { [title: string]: number };
  majorWebtoonTitles?: { [title: string]: number };
  etcTitles: { [title: string]: number };
  etcWebtoonTitles?: { [title: string]: number };
  etcTotal: number;
  etcWebtoonTotal?: number;
  total: number; // 전체 소설 합산액 (주요 + 기타)
  totalWebtoon?: number; // 전체 웹툰 합산액 (주요 + 기타)
  // 리디북스 월간용 income 필드들
  majorTitlesIncome?: { [title: string]: number };
  majorWebtoonTitlesIncome?: { [title: string]: number };
  etcTitlesIncome?: { [title: string]: number };
  etcWebtoonTitlesIncome?: { [title: string]: number };
  etcTotalIncome?: number;
  etcWebtoonTotalIncome?: number;
  totalIncome?: number;
  totalWebtoonIncome?: number;
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly';
  // 정규화된 제목 → 원본 제목 매핑
  titleMappings: { [normalizedTitle: string]: string };
  webtoonTitleMappings?: { [normalizedTitle: string]: string };

}

export interface StatsData {
  title: string;
  normalizedTitle: string;
  revenue: number;
  income?: number;
  isWebtoon?: boolean;
  [key: string]: any;
}

export interface ResultData {
  [key: string]: any;
}

export interface ElectronAPI {
  selectFile: () => Promise<string | null>;
  saveFile: (data: any, filename: string) => Promise<string | null>;
  readFile: (filePath: string) => Promise<Buffer>;
  writeFile: (filePath: string, data: Buffer) => Promise<boolean>;
  openFile: (filePath: string) => Promise<boolean>;
  handleFileDrop: (filePath: string, type: 'stats' | 'result') => Promise<{ success: boolean; filePath: string }>;
  saveTempFile: (data: Uint8Array, filename: string) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 