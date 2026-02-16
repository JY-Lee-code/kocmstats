import { StatsData } from '../types';
import { normalizeTitle } from '../utils';
import * as XLSX from 'xlsx-js-style';

export const loadNaverStatsFile = async (filePath: string, platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'): Promise<StatsData[]> => {
  const buffer = await window.electronAPI.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  // 첫 번째 시트 읽기 - 헤더 없이 raw 데이터로 읽기
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const processedData = data.slice(0).map((row: any) => {
    if (Array.isArray(row) && row.length > 0 && row[0]) {
      let rawTitle = String(row[0]).trim();
      // [e북], [단행본], [독점] 등 모든 대괄호 텍스트 제거
      rawTitle = rawTitle.replace(/\s*\[.*?\]/g, '');
      // (부제) 제거
      rawTitle = rawTitle.replace(/\s*\([^)]*\)$/, '');
      const revenue = parseFloat(String(row[row.length - 1] || 0)) || 0; // 맨 마지막 열이 매출
      
      // "합계" 행인 경우 따로 저장
      if (rawTitle === '합계') {
        return null; // 처리 데이터에는 포함하지 않음
      }
      
      // 작품명 정리 함수
      const normalizedTitle = normalizeTitle(rawTitle, platform);
      
      return {
        title: rawTitle,
        normalizedTitle: normalizedTitle,
        revenue: revenue
      } as StatsData;
    }
    return null;
  }).filter((item): item is StatsData => item !== null);
  
  return processedData;
}; 