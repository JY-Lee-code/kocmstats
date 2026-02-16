import Papa from 'papaparse';
import { StatsData } from '../types';
import { normalizeTitle, addWithRounding } from '../utils';

export const loadKakaoStatsFile = async (filePath: string, platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'): Promise<StatsData[]> => {
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
  
  // 두 번째 행부터 데이터 처리 (첫 번째 행은 요약 행이므로 건너뛰기)
  const processedData = [];
  
  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    
    // 시리즈명에서 값 가져오기
    let rawSeriesName = row['시리즈 명'];
    
    // rawSeriesName이 undefined나 null인 경우 건너뛰기
    if (!rawSeriesName || typeof rawSeriesName !== 'string') {
      continue;
    }
    
    // =T("내용") 패턴 제거
    rawSeriesName = rawSeriesName.replace(/^=T\("([^"]*)"\)$/, '$1');
    // [e북], [단행본], [독점] 등 모든 대괄호 텍스트 제거
    rawSeriesName = rawSeriesName.replace(/\s*\[.*?\]/g, '');
    // (부제) 제거
    rawSeriesName = rawSeriesName.replace(/\s*\([^)]*\)$/, '');
    
    // 판매액 가져오기
    let revenue1 = parseFloat(row['총 판매금액(캐시)'] || '0') || 0;
    // -0을 0으로 변환
    if (Object.is(revenue1, -0)) revenue1 = 0;

    const revenue = revenue1;

    if (rawSeriesName && rawSeriesName.trim()) {
      const normalizedTitle = normalizeTitle(rawSeriesName.trim(), platform);
      // console.log(`rawTitle: ${rawSeriesName}, normalizedTitle: ${normalizedTitle}`);
      
      // 기존 데이터가 있으면 합산, 없으면 새로 추가
      const existingIndex = processedData.findIndex(item => item.normalizedTitle === normalizedTitle);
      if (existingIndex >= 0) {
        // 소수점 둘째자리까지 반올림하여 합산
        processedData[existingIndex].revenue = addWithRounding(processedData[existingIndex].revenue, revenue);
      } else {
        processedData.push({
          title: rawSeriesName.trim(),
          normalizedTitle: normalizedTitle,
          revenue: Math.round(revenue * 100) / 100, // 소수점 둘째자리까지 반올림
        });
      }
    }
  }
  
  // console.log('load data:', processedData);
  
  return processedData;
}; 