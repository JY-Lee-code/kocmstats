import { StatsData, ProcessedData, ResultData } from '../types';
import { normalizeTitle } from '../utils';

export const processNaverMonthData = (
  statsData: StatsData[],
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly' | 'kakao-monthly' | 'naver-monthly'
): ProcessedData => {
  // 결과 파일에서 주요 제목들 추출
  const majorTitles = new Set<string>();
  const titlesMapping = new Map<string, string>();

  // A열(첫 번째 열)에서 제목들 추출 (3번째 row부터)
  resultData.forEach((row: any, rowIndex: number) => {
    if (rowIndex >= 2 && row && Array.isArray(row) && row[0]) {
      const title = String(row[0]).trim();
      // "제목", "기타", "합계"는 제외
      if (title && title !== '제목' && title !== '기타' && title !== '합계') {
        const normalizedTitle = normalizeTitle(title, platform);
        majorTitles.add(normalizedTitle);
        titlesMapping.set(normalizedTitle, title);
      }
    }
  });

  const majorTitlesSums: { [title: string]: number } = {};
  const majorTitlesFee: { [title: string]: number } = {};
  const etcTitlesSums: { [title: string]: number } = {};
  const etcTitlesFee: { [title: string]: number } = {};
  let etcTotal = 0;
  let etcTotalFee = 0;
  let total = 0;
  let totalFee = 0;

  // 통계 데이터 처리
  statsData.forEach((row: any) => {
    if (!row.title) return;

    const title = normalizeTitle(row.title, platform);
    const revenue = row.revenue || 0;
    const fee = row.fee || 0;

    if (majorTitles.has(title)) {
      majorTitlesSums[title] = (majorTitlesSums[title] || 0) + revenue;
      majorTitlesFee[title] = (majorTitlesFee[title] || 0) + fee;
    } else {
      etcTitlesSums[title] = (etcTitlesSums[title] || 0) + revenue;
      etcTitlesFee[title] = (etcTitlesFee[title] || 0) + fee;
      
      if (!titlesMapping.has(title)) {
        titlesMapping.set(title, row.title);
      }
    }
  });

  // Round all values at the end
  Object.keys(majorTitlesSums).forEach(key => {
    majorTitlesSums[key] = Math.round(majorTitlesSums[key])
    total += majorTitlesSums[key]
  });
  Object.keys(majorTitlesFee).forEach(key => {
    majorTitlesFee[key] = Math.round(majorTitlesFee[key])
    totalFee += majorTitlesFee[key]
  });
  Object.keys(etcTitlesSums).forEach(key => {
    etcTitlesSums[key] = Math.round(etcTitlesSums[key])
    etcTotal += etcTitlesSums[key]
  });
  Object.keys(etcTitlesFee).forEach(key => {
    etcTitlesFee[key] = Math.round(etcTitlesFee[key])
    etcTotalFee += etcTitlesFee[key]
  });

  return {
    majorTitles: majorTitlesSums,
    etcTitles: etcTitlesSums,
    etcTotal: etcTotal,
    total: total,
    majorTitlesFee: majorTitlesFee,
    etcTitlesFee: etcTitlesFee,
    etcTotalFee: etcTotalFee,
    totalFee: totalFee,
    platform: platform,
    titleMappings: Object.fromEntries(titlesMapping)
  };
};