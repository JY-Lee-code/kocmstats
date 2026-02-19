import * as XLSX from 'xlsx';
import { StatsData } from '../types';
import { normalizeTitle, addWithRounding } from '../utils';

export const loadOnestoreMonthStatsFile = async (
  filePath: string,
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'
): Promise<StatsData[]> => {
  const buffer = await window.electronAPI.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const processedData: StatsData[] = [];

  // F열(5)에 제목, AC~AG열(28~32)의 합이 매출액, AM열(38)이 정산액
  // 3번째 row(index 2)부터 시작
  let rowIndex = 2; // 0-based index for row 3

  while (true) {
    const titleCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 5 })]; // F열

    // 제목이 없으면 종료
    if (!titleCell || !titleCell.v) {
      break;
    }

    let rawTitle = String(titleCell.v).trim();
    
    // AC~AG열(28~32)의 합계 계산
    let revenue = 0;
    for (let col = 28; col <= 32; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: col })];
      if (cell && typeof cell.v === 'number') {
        revenue = addWithRounding(revenue, cell.v);
      }
    }

    // AM열(38)에서 정산액
    const settlementCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 38 })]; // AM열
    const settlement = settlementCell && typeof settlementCell.v === 'number' ? settlementCell.v : 0;

    if (rawTitle) {
      // [완결], [단행본], [연재] 등을 제거하고 정규화
      const normalizedTitle = normalizeTitle(rawTitle, platform);

      // 기존 데이터가 있으면 합산, 없으면 새로 추가
      const existingIndex = processedData.findIndex(
        item => item.normalizedTitle === normalizedTitle
      );

      if (existingIndex >= 0) {
        processedData[existingIndex].revenue = addWithRounding(
          processedData[existingIndex].revenue,
          revenue
        );
        processedData[existingIndex].income = addWithRounding(
          processedData[existingIndex].income || 0,
          settlement
        );
      } else {
        processedData.push({
          title: rawTitle,
          normalizedTitle: normalizedTitle,
          revenue: Math.round(revenue * 100) / 100,
          income: Math.round(settlement * 100) / 100
        });
      }
    }

    rowIndex++;
  }

  return processedData;
};