import Papa from 'papaparse';
import { StatsData } from '../types';
import { normalizeTitle, addWithRounding } from '../utils';

export const loadRidibooksMonthStatsFile = async (filePath: string, platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'): Promise<StatsData[]> => {
  const csvData = await window.electronAPI.readFile(filePath);
  const csvText = new TextDecoder('utf-8').decode(csvData);
  
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });
  
  if (parseResult.errors.length > 0) {
    console.warn('CSV 파싱 경고:', parseResult.errors);
  }
  
  const csvRows = parseResult.data as any[];
  
  if (csvRows.length === 0) {
    throw new Error('CSV 파일이 비어있거나 잘못된 형식입니다.');
  }
  
  // console.log('CSV 헤더들:', Object.keys(csvRows[0]));
  // console.log('첫 번째 행:', csvRows[0]);
  // console.log('데이터 길이:', csvRows.length);
  
  // 두 번째 행부터 데이터 처리 (첫 번째 행은 요약 행이므로 건너뛰기)
  const processedData = [];
  
  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    
    // 시리즈명에서 값 가져오기
    let rawSeriesName = row['시리즈명'];
    // =T("내용") 패턴 제거
    rawSeriesName = rawSeriesName.replace(/^=T\("([^"]*)"\)$/, '$1');
    // [e북], [단행본], [독점] 등 모든 대괄호 텍스트 제거
    rawSeriesName = rawSeriesName.replace(/\s*\[.*?\]/g, '');
    // (부제) 제거
    rawSeriesName = rawSeriesName.replace(/\s*\([^)]*\)$/, '');

    // console.log(`행 ${i} rawSeriesName:`, rawSeriesName);
    
    // 판매액 가져오기
    let revenue1 = parseFloat(row['일반 판매액'] || '0') || 0;
    let revenue2 = parseFloat(row['일반 취소액'] || '0') || 0;
    let revenue3 = parseFloat(row['앱마켓 정산대상액'] || '0') || 0;
    let revenue4 = parseFloat(row['앱마켓 취소액'] || '0') || 0;

    let income = parseFloat(row['정산액'] || '0') || 0;
    
    // // -0을 0으로 변환
    if (Object.is(revenue1, -0)) revenue1 = 0;
    if (Object.is(revenue2, -0)) revenue2 = 0;
    if (Object.is(revenue3, -0)) revenue1 = 0;
    if (Object.is(revenue4, -0)) revenue2 = 0;
    if (Object.is(income, -0)) income = 0;

    // const revenue = addWithRounding(revenue1, revenue2);\
    const revenue = addWithRounding(addWithRounding(addWithRounding(revenue1, revenue2), revenue3), revenue4);

    // 카테고리1 가져오기 및 웹툰 여부 판단
    let category1 = row['카테고리1'] || '';
    category1 = category1.replace(/^=T\("([^"]*)"\)$/, '$1');

    // console.log(`행 ${i} category1:`, category1);
    const isWebtoon = category1.includes('웹툰') || category1.includes('만화');
    
    if (rawSeriesName && rawSeriesName.trim()) {
      const normalizedTitle = normalizeTitle(rawSeriesName.trim(), platform);
      // console.log(`rawTitle: ${rawSeriesName}, normalizedTitle: ${normalizedTitle}`);
      
      // 기존 데이터가 있으면 합산, 없으면 새로 추가
      const existingIndex = processedData.findIndex(item => item.normalizedTitle === normalizedTitle && item.isWebtoon === isWebtoon);

      if (existingIndex >= 0) {
        // 소수점 둘째자리까지 반올림하여 합산
        processedData[existingIndex].revenue = addWithRounding(processedData[existingIndex].revenue, revenue);
        processedData[existingIndex].income = addWithRounding(processedData[existingIndex].income, income);
      } else {
        processedData.push({
          title: rawSeriesName.trim(),
          normalizedTitle: normalizedTitle,
          revenue: Math.round(revenue * 100) / 100, // 소수점 둘째자리까지 반올림
          income: Math.round(income * 100) / 100, // 소수점 둘째자리까지 반올림
          isWebtoon: isWebtoon
        });
      }
    }
  }
  
  // console.log('load data:', processedData);
  
  return processedData;
}; 