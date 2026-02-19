import * as XLSX from 'xlsx-js-style';
import { StatsData, ResultData, ProcessedData } from './types';
import { loadRidibooksStatsFile, processRidibooksData, saveRidibooksResults } from './ridibooks';
import { loadNaverStatsFile, processNaverData, saveNaverResults } from './naver';
import { loadRidibooksMonthStatsFile, processRidibooksMonthData, saveRidibooksMonthResults } from './ridibooksMonth';
import { loadKakaoStatsFile, processKakaoData, saveKakaoResults } from './kakao';
import { loadKakaoMonthStatsFile, processKakaoMonthData, saveKakaoMonthResults } from './kakaoMonth';
import { loadNaverMonthStatsFile, processNaverMonthData, saveNaverMonthResults } from './naverMonth';
import { loadOnestoreMonthStatsFile, processOnestoreMonthData, saveOnestoreMonthResults } from './onestoreMonth';

export const loadStatsFile = async (filePath: string, platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'): Promise<StatsData[]> => {
  if (platform === 'ridibooks') {
    return loadRidibooksStatsFile(filePath, platform);
  } else if (platform === 'ridibooks-monthly') {
    return loadRidibooksMonthStatsFile(filePath, platform);
  } else if (platform === 'kakao') {
    return loadKakaoStatsFile(filePath, platform);
  } else if (platform === 'kakao-monthly') {
    return loadKakaoMonthStatsFile(filePath, platform);
  } else if (platform === 'naver-monthly') {
    return loadNaverMonthStatsFile(filePath, platform);
  } else if (platform === 'onestore-monthly') {
    return loadOnestoreMonthStatsFile(filePath, platform);
  } else {
    return loadNaverStatsFile(filePath, platform);
  }
};

export const loadResultFile = async (filePath: string, platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'): Promise<ResultData[]> => {
  const buffer = await window.electronAPI.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
};

export const processData = (
  statsData: StatsData[],
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'
): ProcessedData => {
  if (platform === 'ridibooks') {
    return processRidibooksData(statsData, resultData, platform);
  } else if (platform === 'ridibooks-monthly') {
    return processRidibooksMonthData(statsData, resultData, platform);
  } else if (platform === 'kakao') {
    return processKakaoData(statsData, resultData, platform);
  } else if (platform === 'kakao-monthly') {
    return processKakaoMonthData(statsData, resultData, platform);
  } else if (platform === 'naver-monthly') {
    return processNaverMonthData(statsData, resultData, platform);
  } else if (platform === 'onestore-monthly') {
    return processOnestoreMonthData(statsData, resultData, platform);
  } else {
    return processNaverData(statsData, resultData, platform);
  }
};

export const saveResults = async (
  processedData: ProcessedData,
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'
): Promise<string | null> => {
  if (platform === 'ridibooks') {
    return saveRidibooksResults(processedData, resultData, platform);
  } else if (platform === 'ridibooks-monthly') {
    return saveRidibooksMonthResults(processedData, resultData, platform);
  } else if (platform === 'kakao') {
    return saveKakaoResults(processedData, resultData, platform);
  } else if (platform === 'kakao-monthly') {
    return saveKakaoMonthResults(processedData, resultData, platform);
  } else if (platform === 'naver-monthly') {
    return saveNaverMonthResults(processedData, resultData, platform);
  } else if (platform === 'onestore-monthly') {
    return saveOnestoreMonthResults(processedData, resultData, platform);
  } else {
    return saveNaverResults(processedData, resultData, platform);
  }
};
