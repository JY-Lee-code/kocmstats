import { ProcessedData, ResultData } from '../types';
import { normalizeTitle, formatNumber } from '../utils';
import * as XLSX from 'xlsx-js-style';

export const saveNaverResults = async (
  processedData: ProcessedData,
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'
): Promise<string | null> => {
  // 원본 데이터를 복사하여 수정
  const modifiedData = JSON.parse(JSON.stringify(resultData));
  
  // console.log('저장할 데이터:', processedData);
  // console.log('원본 결과 데이터:', resultData);
  
  // 네이버/카카오: 제목은 두 번째 행, 매출은 세 번째 행에 입력
  const resultTitleRow = modifiedData[1] as any[]; // 제목 행
  const resultRevenueRow = modifiedData[2] as any[]; // 매출 입력할 행
  
  // 모든 제목 셀을 0으로 초기화 (기타, 합계 제외)
  for (let j = 0; j < resultTitleRow.length; j++) {
    if (resultTitleRow[j] && resultTitleRow[j] !== '기타' && resultTitleRow[j] !== '합계') {
      resultRevenueRow[j] = 0;
    }
  }
  
  Object.entries(processedData.majorTitles).forEach(([title, revenue]) => {
    // console.log(`네이버 웹툰 매칭 시도: ${title} (${revenue})`);
    // 제목 행에서 해당 제목의 인덱스 찾기
    for (let j = 0; j < resultTitleRow.length; j++) {
      if (resultTitleRow[j]) {
        const normalizedOriginalTitle = normalizeTitle(String(resultTitleRow[j]), platform);
        if (normalizedOriginalTitle === title) {
          resultRevenueRow[j] = formatNumber(revenue);
          break;
        }
      }
    }
  });
  
  // 기타와 합계 금액을 기존 행에 입력
  for (let j = 0; j < resultTitleRow.length; j++) {
    if (resultTitleRow[j] === '기타') {
      resultRevenueRow[j] = formatNumber(processedData.etcTotal);
      // console.log(`✅ 네이버/카카오 기타 금액 입력: ${formatNumber(processedData.etcTotal)}`);
    } else if (resultTitleRow[j] === '합계') {
      resultRevenueRow[j] = formatNumber(processedData.total);
      // console.log(`✅ 네이버/카카오 합계 금액 입력: ${formatNumber(processedData.total)}`);
    }
  }

  // 기타 항목들을 세로로 배치 (기타 웹툰을 기타 소설 오른쪽에)
  let currentRow: number;
  
  currentRow = 5;
  
  // 기타 소설과 웹툰을 같은 행에 가로로 배치
  if (Object.keys(processedData.etcTitles).length > 0 || 
      (processedData.etcWebtoonTitles && Object.keys(processedData.etcWebtoonTitles).length > 0)) {
    
    // 헤더 행: 기타 소설과 웹툰을 같은 행에 배치
    const headerRow = ['기타 소설 매출'];
    if (processedData.etcWebtoonTitles && Object.keys(processedData.etcWebtoonTitles).length > 0) {
      headerRow.push('', '', '', '기타 웹툰 매출'); // 3개 빈 열로 떨어뜨리기
    }
    modifiedData[currentRow++] = headerRow;
    
    // 데이터 행들: 기타 소설과 웹툰을 같은 행에 배치 (매출 순으로 정렬)
    const sortedEtcTitles = Object.entries(processedData.etcTitles)
      .sort(([,a], [,b]) => b - a); // 매출 높은 순으로 정렬
    
    const sortedEtcWebtoonTitles = processedData.etcWebtoonTitles ? 
      Object.entries(processedData.etcWebtoonTitles)
        .sort(([,a], [,b]) => b - a) : []; // 매출 높은 순으로 정렬
    
    const maxLength = Math.max(sortedEtcTitles.length, sortedEtcWebtoonTitles.length);
    
    for (let i = 0; i < maxLength; i++) {
      const row = [];
      
      // 기타 소설 데이터
      if (i < sortedEtcTitles.length) {
        let [title, revenue] = sortedEtcTitles[i];
        title = processedData.titleMappings[title] || title;
        row.push(title, formatNumber(revenue));
      } else {
        row.push('', ''); // 빈 열
      }
      
      // 기타 웹툰 데이터 (기타 소설 오른쪽에)
      if (i < sortedEtcWebtoonTitles.length) {
        row.push('', ''); // 2개 빈 열로 떨어뜨리기
        let [title, revenue] = sortedEtcWebtoonTitles[i];
        title = processedData.webtoonTitleMappings?.[title] || title;
        row.push(title, formatNumber(revenue));
      }
      
      modifiedData[currentRow++] = row;
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
      
      if (cell && (cell.v !== undefined && cell.v !== null && cell.v !== '')) {
        // 데이터가 있는 셀에 테두리 적용
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
  
  // 워크시트의 최대 열 수만큼 너비 설정
  for (let C = range.s.c; C <= range.e.c; ++C) {
    worksheet['!cols'][C] = { width: 15 };
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // 한국 시간대 기준으로 타임스탬프 생성
  const now = new Date();
  const yesterday = new Date(now.getTime() + (9 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000)); // UTC+9 어제
  const timestamp = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `NaverDailyResult_${timestamp}.xlsx`;
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  if (window.electronAPI) {
    return await window.electronAPI.saveFile(excelBuffer, filename);
  }
  
  return null;
}; 