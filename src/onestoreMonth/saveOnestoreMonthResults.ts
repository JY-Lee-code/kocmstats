import * as XLSX from 'xlsx-js-style';
import { ProcessedData, ResultData } from '../types';
import { normalizeTitle, formatNumber } from '../utils';

export const saveOnestoreMonthResults = async (
  processedData: ProcessedData,
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly' | 'onestore-monthly'
): Promise<string | null> => {
  // 원본 데이터를 복사하여 수정
  const modifiedData = JSON.parse(JSON.stringify(resultData));

  // 주요 제목들 매칭하여 입력
  Object.entries(processedData.majorTitles).forEach(([title, revenue]) => {
    const income = processedData.majorTitlesIncome?.[title] || 0;

    // 제목 행에서 해당 제목의 인덱스 찾기
    for (let i = 2; i < modifiedData.length; i++) {
      if (modifiedData[i] && modifiedData[i][0]) {
        const originalTitle = String(modifiedData[i][0]);
        const normalizedOriginalTitle = normalizeTitle(originalTitle, platform);

        if (normalizedOriginalTitle === title) {
          modifiedData[i][1] = formatNumber(revenue); // 매출액
          modifiedData[i][2] = formatNumber(income); // 정산액
          break;
        }
      }
    }
  });

  // 기타와 합계 금액 입력
  for (let i = 2; i < modifiedData.length; i++) {
    if (modifiedData[i] && modifiedData[i][0]) {
      if (modifiedData[i][0] === '기타') {
        modifiedData[i][1] = formatNumber(processedData.etcTotal);
        modifiedData[i][2] = formatNumber(processedData.etcTotalIncome || 0);
      } else if (modifiedData[i][0] === '합계') {
        modifiedData[i][1] = formatNumber(processedData.total);
        modifiedData[i][2] = formatNumber(processedData.totalIncome || 0);
      }
    }
  }

  // 기타 항목들을 "합계" 뒤에 세로로 배치
  let currentRow = modifiedData.length;
  
  if (Object.keys(processedData.etcTitles).length > 0) {
    // 빈 행 추가
    modifiedData[currentRow++] = [];
    
    // 헤더 행
    modifiedData[currentRow++] = ['기타 매출'];

    // 데이터 행들 (매출 순으로 정렬)
    const sortedEtcTitles = Object.entries(processedData.etcTitles).sort(
      ([, a], [, b]) => b - a
    );

    for (const [title, revenue] of sortedEtcTitles) {
      const income = processedData.etcTitlesIncome?.[title] || 0;
      const displayTitle = processedData.titleMappings[title] || title;
      modifiedData[currentRow++] = [displayTitle, formatNumber(revenue), formatNumber(income)];
    }
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(modifiedData);

  // 데이터가 있는 모든 셀에 테두리 적용
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];

      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        if (!cell.s) cell.s = {};
        cell.s.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
  }

  // 모든 열의 너비를 15로 설정
  if (!worksheet['!cols']) worksheet['!cols'] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    worksheet['!cols'][C] = { width: 15 };
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // 한국 시간대 기준으로 타임스탬프 생성
  const now = new Date();
  const timestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 7)
    .replace(/-/g, '');
  const filename = `OnestoreMonthlyResult_${timestamp}.xlsx`;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  if (window.electronAPI) {
    return await window.electronAPI.saveFile(excelBuffer, filename);
  }

  return null;
};