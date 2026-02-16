import * as XLSX from 'xlsx-js-style';
import { ProcessedData, ResultData } from '../types';
import { normalizeTitle, formatNumber } from '../utils';

export const saveRidibooksResults = async (
  processedData: ProcessedData,
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'
): Promise<string | null> => {
  // 원본 데이터를 복사하여 수정
  const modifiedData = JSON.parse(JSON.stringify(resultData));
  
  // console.log('저장할 데이터:', processedData);
  // console.log('원본 결과 데이터:', resultData);
  
    // 리디북스: 제목은 행1, 매출은 행2-7에 입력
  const novelTitleRow = modifiedData[1] as any[]; // 제목 행
  const novelRevenueRow = modifiedData[2] as any[]; // 소설 매출 행
  const webtoonTitleRow = modifiedData[9] as any[]; // 웹툰 제목 행
  const webtoonRevenueRow = modifiedData[10] as any[]; // 웹툰 매출 행

  // 소설 제목들 처리
  // 모든 제목 셀을 0으로 초기화 (기타, 합계 제외)
  for (let j = 0; j < novelTitleRow.length; j++) {
    if (novelTitleRow[j] && novelTitleRow[j] !== '기타' && novelTitleRow[j] !== '합계') {
      novelRevenueRow[j] = 0;
    }
  }
   if (processedData.majorWebtoonTitles) {
     for (let j = 0; j < webtoonTitleRow.length; j++) {
       if (webtoonTitleRow[j] && webtoonTitleRow[j] !== '기타' && webtoonTitleRow[j] !== '합계') {
         webtoonRevenueRow[j] = 0;
       }
     }
   }
   
  //  console.log('=== 리디북스 소설 매칭 시작 ===');
  //  console.log('처리할 소설 제목들:', Object.keys(processedData.majorTitles));
  //  console.log('결과 파일 제목 행:', novelTitleRow);
   
   Object.entries(processedData.majorTitles).forEach(([title, revenue]) => {
    //  console.log(`\n리디북스 소설 매칭 시도: ${title} (${revenue})`);
     let matched = false;
     
     // 제목 행에서 해당 제목의 인덱스 찾기
     for (let j = 0; j < novelTitleRow.length; j++) {
       if (novelTitleRow[j]) {
         const originalTitle = String(novelTitleRow[j]);
         const normalizedOriginalTitle = normalizeTitle(originalTitle, platform);
        //  console.log(`  열 ${j}: 원본="${originalTitle}", 정규화="${normalizedOriginalTitle}" vs 찾는제목="${title}"`);
         
         if (normalizedOriginalTitle === title) {
           novelRevenueRow[j] = formatNumber(revenue);
          //  console.log(`✅ 매칭 성공: ${title} → ${originalTitle} → 열 ${j}에 ${formatNumber(revenue)} 입력`);
           matched = true;
           break;
         }
       }
     }
     
    //  if (!matched) {
    //    console.log(`❌ 매칭 실패: ${title}을 찾을 수 없음`);
    //  }
   });

   // 웹툰 제목들 처리
   if (processedData.majorWebtoonTitles) {
     Object.entries(processedData.majorWebtoonTitles).forEach(([title, revenue]) => {
      //  console.log(`리디북스 웹툰 매칭 시도: ${title} (${revenue})`);
       // 제목 행에서 해당 제목의 인덱스 찾기
       for (let j = 0; j < webtoonTitleRow.length; j++) {
         if (webtoonTitleRow[j]) {
           const normalizedOriginalTitle = normalizeTitle(String(webtoonTitleRow[j]), platform);
           if (normalizedOriginalTitle === title) {
             webtoonRevenueRow[j] = formatNumber(revenue);
            //  console.log(`✅ 웹툰 매칭 성공: ${title} → ${webtoonTitleRow[j]} → 열 ${j}에 ${formatNumber(revenue)} 입력`);
             break;
           }
         }
       }
     });
   }
   
   // 기타와 합계 금액을 기존 행에 입력
   // 소설 행에서 "기타"와 "합계" 찾기
   for (let j = 0; j < novelTitleRow.length; j++) {
     if (novelTitleRow[j] === '기타') {
       novelRevenueRow[j] = formatNumber(processedData.etcTotal);
      //  console.log(`✅ 소설 기타 금액 입력: ${formatNumber(processedData.etcTotal)}`);
     } else if (novelTitleRow[j] === '합계') {
       novelRevenueRow[j] = formatNumber(processedData.total);
      //  console.log(`✅ 소설 합계 금액 입력: ${formatNumber(processedData.total)}`);
     }
   }
   
   // 웹툰 행에서 "기타"와 "합계" 찾기
   if (processedData.majorWebtoonTitles) {
     for (let j = 0; j < webtoonTitleRow.length; j++) {
       if (webtoonTitleRow[j] === '기타') {
         webtoonRevenueRow[j] = formatNumber(processedData.etcWebtoonTotal || 0);
        //  console.log(`✅ 웹툰 기타 금액 입력: ${formatNumber(processedData.etcWebtoonTotal || 0)}`);
       } else if (webtoonTitleRow[j] === '합계') {
         webtoonRevenueRow[j] = formatNumber(processedData.totalWebtoon || 0);
        //  console.log(`✅ 웹툰 합계 금액 입력: ${formatNumber(processedData.totalWebtoon || 0)}`);
       }
     }
   }

  // 기타 항목들을 세로로 배치 (기타 웹툰을 기타 소설 오른쪽에)
  let currentRow: number;
  
  // 리디북스: 기존 데이터 맨 끝에 추가
  currentRow = 13;
  
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
  const filename = `RidiDailyResult_${timestamp}.xlsx`;
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  if (window.electronAPI) {
    return await window.electronAPI.saveFile(excelBuffer, filename);
  }
  
  return null;
}; 