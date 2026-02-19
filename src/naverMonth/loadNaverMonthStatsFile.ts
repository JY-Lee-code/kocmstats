import * as XLSX from 'xlsx';
import { StatsData } from '../types';
import { normalizeTitle, addWithRounding } from '../utils';

export const loadNaverMonthStatsFile = async (
  filePath: string,
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly'
): Promise<StatsData[]> => {
  const buffer = await window.electronAPI.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const processedData: StatsData[] = [];

  // A열(0)에 제목, BO열(66)에 매출액, BN열(65)에 수수료
  // 5번째 row(index 4)부터 시작
  let rowIndex = 4; // 0-based index for row 5

  while (true) {
    const titleCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })]; // A열
    const revenueCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 66 })]; // BO열
    const feeCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 65 })]; // BN열

    // 제목이 없으면 종료
    if (!titleCell || !titleCell.v) {
      break;
    }

    let rawTitle = String(titleCell.v).trim();
    const revenue = revenueCell && typeof revenueCell.v === 'number' ? revenueCell.v : 0;
    const fee = feeCell && typeof feeCell.v === 'number' ? feeCell.v : 0;

    // "합계" 제목은 무시
    if (rawTitle && rawTitle !== '합계') {
      // [완결], [단행본], [연재] 등을 제거하고 정규화
      const normalizedTitle = normalizeTitle(rawTitle, platform);
      console.log(`${rawTitle} -> ${normalizedTitle}`)

      // 기존 데이터가 있으면 합산, 없으면 새로 추가
      const existingIndex = processedData.findIndex(
        item => item.normalizedTitle === normalizedTitle
      );

      if (existingIndex >= 0) {
        processedData[existingIndex].revenue = addWithRounding(
          processedData[existingIndex].revenue,
          revenue
        );
        processedData[existingIndex].fee = addWithRounding(
          processedData[existingIndex].fee || 0,
          fee
        );
      } else {
        processedData.push({
          title: rawTitle,
          normalizedTitle: normalizedTitle,
          revenue: Math.round(revenue * 100) / 100,
          fee: Math.round(fee * 100) / 100
        });
      }
    }

    rowIndex++;
  }

  return processedData;
};