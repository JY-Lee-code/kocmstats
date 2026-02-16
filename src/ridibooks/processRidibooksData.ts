import { StatsData, ProcessedData, ResultData } from '../types';
import { normalizeTitle, addWithRounding } from '../utils';

export const processRidibooksData = (
  statsData: StatsData[],
  resultData: ResultData[],
  platform: 'naver' | 'kakao' | 'ridibooks' | 'ridibooks-monthly'
): ProcessedData => {
  // 결과 파일에서 주요 제목들 추출 (소설/웹툰 별도 관리)
  const majorNovelTitles = new Set<string>();
  const majorWebtoonTitles = new Set<string>();
  const novelTitlesMapping = new Map<string, string>(); // 정리된 제목 → 원본 제목 (주요 + 기타)
  const webtoonTitlesMapping = new Map<string, string>(); // 정리된 제목 → 원본 제목 (주요 + 기타)
  
  // 리디북스: 소설(row 1)과 웹툰(row 9) 제목들 추출
  // console.log('리디북스 resultData:', resultData);
  // console.log('resultData 길이:', resultData.length);
  
  // 소설 제목들 (row 1)
  const novelTitleRow = resultData[1];
  if (novelTitleRow && Array.isArray(novelTitleRow)) {
    novelTitleRow.forEach((title: any, index: number) => {
      if (title && typeof title === 'string' && title.trim() &&
          title !== '리디북스' && title !== '기타' && title !== '합계') {
        const originalTitle = title.trim();
        const normalizedTitle = normalizeTitle(originalTitle, platform);
        majorNovelTitles.add(normalizedTitle);
        novelTitlesMapping.set(normalizedTitle, originalTitle);
      }
    });
  }
  
  // 웹툰 제목들 (row 9)
  const webtoonTitleRow = resultData[9];
  if (webtoonTitleRow && Array.isArray(webtoonTitleRow)) {
    webtoonTitleRow.forEach((title: any, index: number) => {
      if (title && typeof title === 'string' && title.trim() &&
          title !== '웹툰' && title !== '기타' && title !== '합계') {
        const originalTitle = title.trim();
        const normalizedTitle = normalizeTitle(originalTitle, platform);
        majorWebtoonTitles.add(normalizedTitle);
        webtoonTitlesMapping.set(normalizedTitle, originalTitle);
      }
    });
  }

  // console.log('주요 소설 제목들:', Array.from(majorNovelTitles));
  // console.log('주요 웹툰 제목들:', Array.from(majorWebtoonTitles));

  const majorNovelTitlesSums: { [title: string]: number } = {};
  const majorWebtoonTitlesSums: { [title: string]: number } = {};
  const etcTitlesSums: { [title: string]: number } = {};
  const etcWebtoonTitlesSums: { [title: string]: number } = {};
  let etcTotal = 0;
  let etcWebtoonTotal = 0;
  let total = 0;
  let webtoonTotal = 0;

  // 통계 데이터 처리 - 정리된 제목으로 합산
  statsData.forEach((row: any) => {
    if (!row.title) return;

    const title = normalizeTitle(row.title, platform);
    const revenue = row.revenue || 0;
    const isWebtoon = row.isWebtoon || false; // 리디북스에서만 사용

    // 리디북스: 소설/웹툰 별도 처리 (CSV의 isWebtoon 플래그 사용)
    if (isWebtoon && majorWebtoonTitles.has(title)) {
      majorWebtoonTitlesSums[title] = addWithRounding(majorWebtoonTitlesSums[title] || 0, revenue);
      // console.log(`✅ 웹툰 매칭: ${title} → (+${revenue})`);
      webtoonTotal = addWithRounding(webtoonTotal, revenue);
    } else if (!isWebtoon && majorNovelTitles.has(title)) {
      majorNovelTitlesSums[title] = addWithRounding(majorNovelTitlesSums[title] || 0, revenue);
      // console.log(`✅ 소설 매칭: ${title} → (+${revenue})`);
      total = addWithRounding(total, revenue);
      // console.log(`title: ${title}, revenue: ${revenue}, total: ${total}`);
    } else {
      // 기타로 분류
      if (isWebtoon) {
        etcWebtoonTitlesSums[title] = addWithRounding(etcWebtoonTitlesSums[title] || 0, revenue);
        etcWebtoonTotal = addWithRounding(etcWebtoonTotal, revenue);
        webtoonTotal = addWithRounding(webtoonTotal, revenue);
        // 기타 웹툰 mapping에 저장
        if (!webtoonTitlesMapping.has(title)) {
          webtoonTitlesMapping.set(title, row.title);
        }
        // console.log(`📦 웹툰 기타: ${title} (+${revenue})`);
      } else {
        etcTitlesSums[title] = addWithRounding(etcTitlesSums[title] || 0, revenue);
        etcTotal = addWithRounding(etcTotal, revenue);
        total = addWithRounding(total, revenue);
        // 기타 소설 mapping에 저장
        if (!novelTitlesMapping.has(title)) {
          novelTitlesMapping.set(title, row.title);
        }
        // console.log(`📦 소설 기타: ${title} (+${revenue})`);
      }
    }
  });
  
  // console.log('주요 소설 제목 합계:', majorNovelTitlesSums);
  // console.log('주요 웹툰 제목 합계:', majorWebtoonTitlesSums);
  // console.log('기타 소설 제목별 합계:', etcTitlesSums);
  // console.log('기타 웹툰 제목별 합계:', etcWebtoonTitlesSums);
  // console.log('기타 소설 총합:', etcTotal);
  // console.log('기타 웹툰 총합:', etcWebtoonTotal);
  // console.log('전체 소설 총합:', total);
  // console.log('전체 웹툰 총합:', webtoonTotal);

  const result = {
    majorTitles: majorNovelTitlesSums,
    majorWebtoonTitles: majorWebtoonTitlesSums,
    etcTitles: etcTitlesSums,
    etcWebtoonTitles: etcWebtoonTitlesSums,
    etcTotal: etcTotal,
    etcWebtoonTotal: etcWebtoonTotal,
    total: total,
    totalWebtoon: webtoonTotal,
    platform: platform,
    titleMappings: Object.fromEntries(novelTitlesMapping),
    webtoonTitleMappings: Object.fromEntries(webtoonTitlesMapping),
  };
  
  // console.log('처리 결과:', result);
  return result;
}; 