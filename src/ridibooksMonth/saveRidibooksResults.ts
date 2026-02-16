import * as XLSX from 'xlsx-js-style';
import { ProcessedData, ResultData } from '../types';
import { normalizeTitle, formatNumber } from '../utils';

export const saveRidibooksMonthResults = async (
  processedData: ProcessedData,
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'
): Promise<string | null> => {
  // 원본 데이터를 복사하여 수정
  const modifiedData = JSON.parse(JSON.stringify(resultData));
  
  // console.log('저장할 데이터:', processedData);
  // console.log('원본 결과 데이터:', resultData);
  
  // 리디북스 월간: 첫 번째 열에 소설 제목, 두 번째 열에 판매액, 세 번째 열에 정산액
  // 여섯 번째 열에 웹툰 제목, 그 다음 열에 판매액과 정산액
  
  // 모든 행을 순회하면서 제목이 있는 셀을 찾아서 매출 데이터 입력
  modifiedData.forEach((row: any, rowIndex: number) => {
    if (row && Array.isArray(row)) {
      // 소설 제목이 있는 경우 (첫 번째 열)
      if (row[0] && typeof row[0] === 'string' && row[0].trim() && 
          row[0] !== '소설' && row[0] !== '기타' && row[0] !== '합계') {
        const title = normalizeTitle(String(row[0]), platform);
        
        // 주요 소설 매칭
        if (processedData.majorTitles[title] !== undefined) {
          row[1] = formatNumber(processedData.majorTitles[title]); // 판매액
          if (processedData.majorTitlesIncome && processedData.majorTitlesIncome[title] !== undefined) {
            row[2] = formatNumber(processedData.majorTitlesIncome[title]); // 정산액
          } else {
            throw new Error(`제목 "${title}"의 정산액(income) 데이터가 없습니다.`);
          }
        }
      }
      
      // 웹툰 제목이 있는 경우 (여섯 번째 열)
      if (row[5] && typeof row[5] === 'string' && row[5].trim() && 
          row[5] !== '웹툰' && row[5] !== '기타' && row[5] !== '합계') {
        const title = normalizeTitle(String(row[5]), platform);
        
        // 주요 웹툰 매칭
        if (processedData.majorWebtoonTitles && processedData.majorWebtoonTitles[title] !== undefined) {
          row[6] = formatNumber(processedData.majorWebtoonTitles[title]); // 판매액
          if (processedData.majorWebtoonTitlesIncome && processedData.majorWebtoonTitlesIncome[title] !== undefined) {
            row[7] = formatNumber(processedData.majorWebtoonTitlesIncome[title]); // 정산액
          } else {
            throw new Error(`제목 "${title}"의 정산액(income) 데이터가 없습니다.`);
          }
        }
      }
      
      // 기타와 합계 처리
      if (row[0] === '기타') {
        row[1] = formatNumber(processedData.etcTotal); // 소설 기타 판매액
        row[2] = formatNumber(processedData.etcTotalIncome); // 소설 기타 정산액
      } else if (row[0] === '합계') {
        row[1] = formatNumber(processedData.total); // 소설 합계 판매액
        row[2] = formatNumber(processedData.totalIncome); // 소설 합계 정산액
      }
      
      if (row[5] === '기타') {
        row[6] = formatNumber(processedData.etcWebtoonTotal || 0); // 웹툰 기타 판매액
        row[7] = formatNumber(processedData.etcWebtoonTotalIncome || 0); // 웹툰 기타 정산액
      } else if (row[5] === '합계') {
        row[6] = formatNumber(processedData.totalWebtoon || 0); // 웹툰 합계 판매액
        row[7] = formatNumber(processedData.totalWebtoonIncome || 0); // 웹툰 합계 정산액
      }
    }
  });

  // 기타 항목들을 새로운 행에 추가
  // 실제 데이터가 있는 마지막 행을 찾아서 그 다음에 추가
  let currentRow = 0;
  
  // 실제 데이터가 있는 마지막 행 찾기
  for (let i = modifiedData.length - 1; i >= 0; i--) {
    const row = modifiedData[i];
    if (row && Array.isArray(row) && (
        (row[0] && typeof row[0] === 'string' && row[0].trim()) ||
        (row[5] && typeof row[5] === 'string' && row[5].trim())
    )) {
      currentRow = i + 1; // 데이터가 있는 마지막 행 다음부터 시작
      break;
    }
  }
  
  currentRow += 6;
  
  // 기타 소설과 웹툰을 새로운 행에 추가
  if (Object.keys(processedData.etcTitles).length > 0 || 
      (processedData.etcWebtoonTitles && Object.keys(processedData.etcWebtoonTitles).length > 0)) {
    
    // 헤더 행
    const headerRow = ['기타 소설', '', '', '', '', '기타 웹툰', '', ''];
    modifiedData[currentRow++] = headerRow;
    
    // 데이터 행들: 기타 소설과 웹툰을 같은 행에 배치 (매출 순으로 정렬)
    const sortedEtcTitles = Object.entries(processedData.etcTitles)
      .sort(([,a], [,b]) => b - a); // 매출 높은 순으로 정렬
    
    const sortedEtcWebtoonTitles = processedData.etcWebtoonTitles ? 
      Object.entries(processedData.etcWebtoonTitles)
        .sort(([,a], [,b]) => b - a) : []; // 매출 높은 순으로 정렬
    
    const maxLength = Math.max(sortedEtcTitles.length, sortedEtcWebtoonTitles.length);
    
    for (let i = 0; i < maxLength; i++) {
      const row = ['', '', '', '', '', '', '', '']; // 8개 열로 초기화
      
      // 기타 소설 데이터 (첫 번째 열에 제목, 두 번째와 세 번째 열에 매출)
      if (i < sortedEtcTitles.length) {
        let [title, revenue] = sortedEtcTitles[i];
        row[0] = processedData.titleMappings[title] || title;
        row[1] = formatNumber(revenue); // 판매액
        if (processedData.etcTitlesIncome && processedData.etcTitlesIncome[title] !== undefined) {
          row[2] = formatNumber(processedData.etcTitlesIncome[title]); // 정산액
        } else {
          throw new Error(`제목 "${title}"의 정산액(income) 데이터가 없습니다.`);
        }
      }
      
      // 기타 웹툰 데이터 (여섯 번째 열에 제목, 그 다음 열에 매출)
      if (i < sortedEtcWebtoonTitles.length) {
        let [title, revenue] = sortedEtcWebtoonTitles[i];
        row[5] = title = processedData.webtoonTitleMappings?.[title] || title;
        row[6] = formatNumber(revenue); // 판매액
        if (processedData.etcWebtoonTitlesIncome && processedData.etcWebtoonTitlesIncome[title] !== undefined) {
          row[7] = formatNumber(processedData.etcWebtoonTitlesIncome[title]); // 정산액
        } else {
          throw new Error(`제목 "${title}"의 정산액(income) 데이터가 없습니다.`);
        }
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
  
  // 제목 열들의 너비 조정
  if (!worksheet['!cols']) worksheet['!cols'] = [];
  
  // 첫 번째 열 (소설 제목) - 넓게
  worksheet['!cols'][0] = { width: 25 };
  
  // 여섯 번째 열 (웹툰 제목) - 넓게  
  worksheet['!cols'][5] = { width: 25 };
  
  // 숫자 열들은 적당한 너비
  worksheet['!cols'][1] = { width: 12 }; // 소설 판매액
  worksheet['!cols'][2] = { width: 12 }; // 소설 정산액
  worksheet['!cols'][6] = { width: 12 }; // 웹툰 판매액
  worksheet['!cols'][7] = { width: 12 }; // 웹툰 정산액
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // 한국 시간대 기준으로 타임스탬프 생성
  const now = new Date();
  const yesterday = new Date(now.getTime() + (9 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000)); // UTC+9 어제
  const timestamp = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `RidiMonthlyResult_${timestamp}.xlsx`;
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  if (window.electronAPI) {
    return await window.electronAPI.saveFile(excelBuffer, filename);
  }
  
  return null;
}; 