import { BaziResult } from '../services/bazi/types';
import { ZiweiResult, PALACE_NAMES, CompleteMutagenInfo } from '../services/ziwei/types';
import { FortuneQuery } from '../shared/types';
import { Lunar, Solar } from 'lunar-javascript';

export type FortuneTextOptions = {
  detail?: 'simple' | 'standard' | 'detailed';
  includePersonal?: boolean;
  includeLocation?: boolean;
};

export type ZiweiTimeContext = {
  decade?: { palaceName?: string; startAge?: number; endAge?: number; branch?: string; index?: number; palaceIndex?: number };
  yearly?: { year?: number; stem?: string; branch?: string; palaceName?: string; palaceIndex?: number };
  monthly?: { lunarLabel?: string; palaceName?: string; palaceIndex?: number };
  daily?: { date?: string; palaceName?: string; palaceIndex?: number };
};

const LUNAR_MONTH_NAMES: Record<number, string> = {
  1: '正月', 2: '二月', 3: '三月', 4: '四月', 5: '五月', 6: '六月',
  7: '七月', 8: '八月', 9: '九月', 10: '十月', 11: '冬月', 12: '臘月'
};

const HOUR_TO_SHICHEN: Record<number, string> = {
  23: '子時', 0: '子時', 1: '丑時', 2: '丑時', 3: '寅時', 4: '寅時',
  5: '卯時', 6: '卯時', 7: '辰時', 8: '辰時', 9: '巳時', 10: '巳時',
  11: '午時', 12: '午時', 13: '未時', 14: '未時', 15: '申時', 16: '申時',
  17: '酉時', 18: '酉時', 19: '戌時', 20: '戌時', 21: '亥時', 22: '亥時'
};

function getLunarDayName(day: number): string {
  const DAYS1 = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十'];
  const DAYS2 = ['十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  const DAYS3 = ['廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  if (day <= 10) return DAYS1[day - 1];
  if (day <= 20) return DAYS2[day - 11];
  return DAYS3[day - 21];
}

function formatLunarBirthday(birthDate: Date): string {
  try {
    const solar = Solar.fromYmd(birthDate.getUTCFullYear(), birthDate.getUTCMonth() + 1, birthDate.getUTCDate());
    const lunar = solar.getLunar();
    
    const yearGanzhi = lunar.getYearInGanZhi();
    const lunarMonth = lunar.getMonth();
    const lunarDay = lunar.getDay();
    const isLeapMonth = lunar.getMonth() < 0;
    
    const monthName = LUNAR_MONTH_NAMES[Math.abs(lunarMonth)] || `${Math.abs(lunarMonth)}月`;
    const leapPrefix = isLeapMonth ? '閏' : '';
    const dayName = getLunarDayName(lunarDay);
    const shichen = HOUR_TO_SHICHEN[birthDate.getUTCHours()] || '未知時';
    
    return `${yearGanzhi}年${leapPrefix}${monthName}${dayName}${shichen}`;
  } catch (e) {
    return '';
  }
}

export function renderFortuneText(
  params: {
    query: FortuneQuery;
    bazi?: BaziResult | null;
    ziwei?: ZiweiResult | null;
    subjectName?: string;
  },
  options: FortuneTextOptions = { detail: 'standard', includePersonal: false, includeLocation: false }
): string {
  const { query, bazi, ziwei, subjectName } = params;
  const name = options.includePersonal ? (subjectName || '命主') : '命主';
  const timeRange = query.when?.range || '一生';
  const aspect = (query.what?.aspect as string) || '綜合運勢';

  const lines: string[] = [];
  lines.push('【命理資訊（標準化文本）】');
  lines.push(`${name} - ${timeRange} - 主題：${aspect}`);
  lines.push('');

  // 八字
  if (bazi?.chart) {
    lines.push('◆ 八字四柱');
    const pillars = [
      { key: 'year', label: '年柱' },
      { key: 'month', label: '月柱' },
      { key: 'day', label: '日柱' },
      { key: 'hour', label: '時柱' },
    ] as const;
    for (const p of pillars) {
      const pillar: any = (bazi.chart as any)[p.key];
      if (pillar) {
        const hidden = (pillar.hiddenStems || []).map((hs: any) => hs.stem).join('、');
        lines.push(`${p.label}：${pillar.stem}${pillar.branch}${hidden ? `（藏干：${hidden}）` : ''}`);
      }
    }
    if (bazi.basic?.tenGods?.length) {
      const top5 = bazi.basic.tenGods
        .slice()
        .sort((a: any, b: any) => (b.strength ?? 0) - (a.strength ?? 0))
        .slice(0, 5)
        .map((tg: any) => `${tg.name}@${tg.position}`)
        .join('、');
      if (top5) lines.push(`十神摘要：${top5}`);
    }
    lines.push('');
  }

  // 紫微
  if (ziwei?.palaces?.length) {
    lines.push('◆ 紫微概要');
    const palaces: any[] = (ziwei as any).palaces;
    const ming = palaces.find(p => p?.name === '命宮' || p?.name === '命宫') || palaces[0];
    if (ming) {
      const majorStars = (ming.majorStars || []).map((s: any) => s.name).join('、');
      lines.push(`命宮：${ming.earthlyBranch}（主星：${majorStars}）`);
      const idx = palaces.indexOf(ming);
      if (idx >= 0) {
        const tri = [ (idx + 4) % 12, (idx + 7) % 12, (idx + 10) % 12 ];
        lines.push('三方四正：');
        for (const i of tri) {
          const pz = palaces[i];
          const stars = (pz?.majorStars || []).map((s: any) => s.name).join('、');
          lines.push(`- ${pz?.name}（${pz?.earthlyBranch}）：${stars}`);
        }
      }
    }
    lines.push('');
  }

  lines.push('—— 由 BaziWei 專業計算生成');
  return lines.join('\n');
}
/**
 * 八字基礎排盤文本
 *
 * 產品定位：只輸出確定且權威且 AI 不易獲知的量——
 * 由節氣/曆法推得的四柱干支、旬空、公農曆對照。
 * 十神、藏干、五行、格局、用神、神煞等分析層無權威口徑，由 AI 依盤自行解讀。
 */
export function renderBaziText(
  params: { 
    bazi: BaziResult; 
    subjectName?: string; 
    gender?: 'male' | 'female';
    birthDate?: Date;
    trueSolarTime?: Date;
  },
  options: FortuneTextOptions = { detail: 'standard', includePersonal: false, includeLocation: false }
): string {
  const { bazi, subjectName, gender, birthDate, trueSolarTime } = params;
  const genderText = gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  const dt = birthDate || (bazi as any)?.birthInfo?.solar;
  // 入参为北京墙钟载体（Date.UTC 构造），一律 getUTC* 读取
  const fmt = (d?: Date) => {
    if (!d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  };

  const lines: string[] = [];
  const chart: any = (bazi as any).chart || {};
  const basic: any = (bazi as any).basic || {};

  lines.push('=== 命主資料 ===');
  if (options.includePersonal && subjectName) {
    lines.push(`姓名：${subjectName}`);
  }
  lines.push(`性別：${genderText}`);
  if (dt) {
    lines.push(`公曆：${fmt(dt)}`);
    if (trueSolarTime) {
      lines.push(`真太陽時：${fmt(trueSolarTime)}（按經度校正，四柱以此排盤）`);
    }
    const lunarBirthday = formatLunarBirthday(trueSolarTime || dt);
    if (lunarBirthday) lines.push(`農曆：${lunarBirthday}`);
  }

  if (chart.year && chart.month && chart.day && chart.hour) {
    lines.push('');
    lines.push('=== 八字命盤 ===');
    const p2n = (p: any) => p.naYin ? `（${p.naYin}）` : '';
    lines.push(
      `年柱：${chart.year.stem}${chart.year.branch}${p2n(chart.year)}` +
      `  月柱：${chart.month.stem}${chart.month.branch}${p2n(chart.month)}` +
      `  日柱：${chart.day.stem}${chart.day.branch}${p2n(chart.day)}` +
      `  時柱：${chart.hour.stem}${chart.hour.branch}${p2n(chart.hour)}`
    );
    const dayVoid = (chart.day?.voidBranches || []).join('');
    if (dayVoid) lines.push(`日柱旬空：${dayVoid}`);
    const gong: string[] = [];
    if (basic.mingGong) gong.push(`命宮：${basic.mingGong}`);
    if (basic.taiYuan) gong.push(`胎元：${basic.taiYuan}`);
    if (gong.length) lines.push(gong.join('　'));

    // 天干十神（對日主，查表即得的確定性關係）
    const tenGods: any[] = (bazi as any).basic?.tenGods || [];
    const stemTG = tenGods.filter((t: any) => !String(t.name).includes('hidden'));
    if (stemTG.length === 3) {
      const shortPos = (p: string) => p.replace('柱', '');
      lines.push(`天干十神：${stemTG.map((t: any) => `${shortPos(t.position)}干${t.element || ''}=${t.name}`).join('　')}`);
    }

    // 藏干十神（合併標注：每支藏干逐個標十神，※為本氣；均為確定性查表）
    const POS = ['年', '月', '日', '時'];
    const pillars = [chart.year, chart.month, chart.day, chart.hour];
    const hiddenTGMap = new Map<string, Map<string, string>>();
    for (const tg of ((bazi as any).basic?.tenGods || [])) {
      if (String(tg.name).includes('hidden)')) {
        const pos = String(tg.position).replace('柱', '');
        if (!hiddenTGMap.has(pos)) hiddenTGMap.set(pos, new Map());
        if (tg.stem) hiddenTGMap.get(pos)!.set(tg.stem, String(tg.name).replace('(hidden)', ''));
      }
    }
    const hiddenLine = pillars
      .map((p: any, i: number) => {
        const labels = (p?.hiddenStems || []).map((h: any) => {
          const tgName = hiddenTGMap.get(POS[i])?.get(h.stem);
          return h.isMain ? `${h.stem}${tgName ?? ''}※` : `${h.stem}${tgName ?? ''}`;
        }).join(' ');
        return labels ? `${POS[i]}${p.branch}[${labels}]` : '';
      })
      .filter(Boolean)
      .join('　');
    if (hiddenLine) lines.push(`藏干十神（※本氣）：${hiddenLine}`);

    // 十二長生（自坐：各柱天干對自身地支的長生階段，確定性查表）
    const growthLine = pillars
      .map((p: any, i: number) => (p?.selfSitting ? `${POS[i]}${p.selfSitting}` : ''))
      .filter(Boolean)
      .join('　');
    if (growthLine) lines.push(`十二長生（自坐）：${growthLine}`);


  }

  return lines.join('\n');
}

export function renderZiweiText(
  params: { 
    ziwei: ZiweiResult; 
    subjectName?: string;
    gender?: 'male' | 'female';
    birthDate?: Date;
    timeContext?: ZiweiTimeContext;
    mutagen?: CompleteMutagenInfo; // 可選：覆蓋使用UI計算的四化（包含流月/流日/流時）
  },
  options: FortuneTextOptions = { detail: 'standard', includePersonal: false, includeLocation: false }
): string {
  const { ziwei, subjectName, gender, birthDate, timeContext, mutagen } = params;
  const genderText = gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  // 入参为北京墙钟载体（Date.UTC 构造），一律 getUTC* 读取
  const fmt = (d?: Date) => {
    if (!d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  };
  const palaces: any[] = (ziwei as any).palaces || [];
  // 更嚴格的命宮識別：優先中文「命宮/命宫」，再回退到英文Life
  const ming = palaces.find(p => p?.name === '命宮' || p?.name === '命宫')
    || palaces.find(p => p?.name === 'Life Palace' || p?.name === 'Life')
    || palaces[0];
  const bodyPalace = palaces.find(p => p?.isBodyPalace);

  const brightnessMark = (b?: string) => {
    if (!b) return '';
    const m = b.toLowerCase();
    if (b === '庙' || b === '廟') return '廟';
    if (b === '旺') return '旺';
    if (b === '得') return '得';
    if (b === '利') return '利';
    if (b === '平') return '平';
    if (b === '不') return '不';
    if (b === '陷') return '陷';
    if (m === 'temple') return '廟';
    if (m === 'prosperous') return '旺';
    if (m === 'gain') return '得';
    if (m === 'benefit') return '利';
    if (m === 'unfavorable') return '不';
    if (m === 'fallen') return '陷';
    return '';
  };

  const lines: string[] = [];
  lines.push('=== 命主資料 ===');
  if (subjectName) {
    lines.push(`姓名：${subjectName}`);
  }
  lines.push(`性別：${genderText}`);
  if (birthDate) {
    lines.push(`公曆：${fmt(birthDate)}`);
    const lunarBirthday = formatLunarBirthday(birthDate);
    if (lunarBirthday) {
      lines.push(`農曆：${lunarBirthday}`);
    }
  }
  lines.push('');

  lines.push('=== 紫微命盘 ===');
  if (ming) {
    // 僅對主星標註亮度；輔星不標註
    const majors = (ming.majorStars || []) as any[];
    const minors = (ming.minorStars || []) as any[];
    const majorList = majors.map(s => `${s.name}${brightnessMark(s.brightness) ? `(${brightnessMark(s.brightness)})` : ''}`);
    const minorList = minors.slice(0, 6).map(s => s.name);
    const starList = [...majorList, ...minorList]
      .join('、')
      .replace(/、\s*$/, '');
    const hb = `${ming.heavenlyStem || ''}${ming.earthlyBranch || ''}`.trim();
    const starsText = starList || '無主星';
    lines.push(`本命命宮 ${hb}：${starsText}`.trim());
  }
  lines.push(`本命身宮：${bodyPalace?.name || '命宮'}`);

  // 五行局/命主/身主（確定性查表：命宮干支納音定局、命宮支定命主、年支定身主）
  const ziweiBasic: any = (ziwei as any).basicInfo || {};
  const furniture: string[] = [];
  if (ziweiBasic.fiveElement) furniture.push(`五行局：${ziweiBasic.fiveElement}`);
  if (ziweiBasic.soul) furniture.push(`命主：${ziweiBasic.soul}`);
  if (ziweiBasic.body) furniture.push(`身主：${ziweiBasic.body}`);
  if (furniture.length) lines.push(furniture.join('　'));

  if (timeContext?.decade && (timeContext.decade.palaceName || (timeContext.decade.startAge && timeContext.decade.endAge))) {
    const ageStr = (timeContext.decade.startAge && timeContext.decade.endAge)
      ? `（${timeContext.decade.startAge}-${timeContext.decade.endAge}岁）` : '';
    lines.push(`分析目標大限命宮宮位：${timeContext.decade.palaceName || '未知'}${ageStr}`);
  }
  if (timeContext?.yearly && (timeContext.yearly.year || timeContext.yearly.stem || timeContext.yearly.branch)) {
    const y = timeContext.yearly.year ? `（${timeContext.yearly.year}年）` : '';
    lines.push(`分析目標流年命宮宮位：${timeContext.yearly.palaceName || '未知'}${y}`);
  }
  if (timeContext?.monthly && (timeContext.monthly.lunarLabel || timeContext.monthly.palaceName)) {
    const suffix = timeContext.monthly.lunarLabel ? `（農曆${timeContext.monthly.lunarLabel}）` : '';
    lines.push(`分析目標流月命宮宮位：${timeContext.monthly.palaceName || '未知'}${suffix}`);
  }
  if (timeContext?.daily && (timeContext.daily.date || timeContext.daily.palaceName)) {
    const suffix = timeContext.daily.date ? `（公曆${timeContext.daily.date}）` : '';
    lines.push(`分析目標流日命宮宮位：${timeContext.daily.palaceName || '未知'}${suffix}`);
  }

  // 十二宮位：standard 和 detailed 模式都輸出完整宮位資訊
  // MCP命理工具需要完整的十二宮位作為基本資訊
  if (options.detail === 'standard' || options.detail === 'detailed') {
    // 十二宮位（按需求格式輸出：干支 本命<宮> 目標大限為X 目標流年為Y 目標流月為Z 目標流日為W（a-b歲） [身]：星曜列表）
    try {
      lines.push('');
      lines.push('十二宮位：');

      // 準備相對映射工具（對齊AI日曆邏輯：以PALACE_NAMES旋轉）
      const monthlyMingIndex = timeContext?.monthly?.palaceIndex;
      const dailyMingIndex = timeContext?.daily?.palaceIndex;
      const decadeMingIndex = timeContext?.decade?.palaceIndex ?? timeContext?.decade?.index;
      const yearlyMingIndex = timeContext?.yearly?.palaceIndex;

      const normalizeForText = (base: string): string => {
        // 將交友映射為僕役，其餘保持原樣；去掉尾部的「宮」字（命宮保留原樣）
        let name = base === '交友' ? '僕役' : base;
        if (name.endsWith('宮') && name !== '命宮') name = name.slice(0, -1);
        return name;
      };

      const relNameByIndex = (palaceIndex: number, mingIndex?: number): string | undefined => {
        if (mingIndex === undefined || mingIndex === null) return undefined;
        const i = (palaceIndex - mingIndex + 12) % 12;
        const raw = PALACE_NAMES[i] || '';
        return normalizeForText(raw);
      };

      // 以文本規範的順序輸出：命宮→兄弟→夫妻→子女→財帛→疾厄→遷移→僕役→官祿→田宅→福德→父母
      const TEXT_ORDER = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'];

      // iztro 已配置為 zh-TW，輸出繁體中文，與 PALACE_NAMES 一致
      // 僅需處理「僕役↔交友」的別名映射
      const resolvePalace = (label: string) => {
        if (label === '僕役') {
          // 僕役宮在 iztro 中名為「交友」
          return palaces.find(pp => pp?.name === '僕役' || pp?.name === '交友') as any;
        }
        return palaces.find(pp => pp?.name === label) as any;
      };

      for (const label of TEXT_ORDER) {
        const p = resolvePalace(label);
        if (!p) continue;
        const hb = `${p.heavenlyStem || ''}${p.earthlyBranch || ''}`.trim();
        // 星曜：主星（帶亮度）+ 少量輔星（不標註亮度）
        const major = (p.majorStars || []).map((s: any) => `${s.name}${brightnessMark(s.brightness) ? `(${brightnessMark(s.brightness)})` : ''}`);
        const minor = (p.minorStars || []).slice(0, 5).map((s: any) => s.name);
        const starsJoined = [...major, ...minor].join('、') || '無主星';

        // 動態宮位名稱
        const idx = p.index ?? 0;
        const decadeName = relNameByIndex(idx, decadeMingIndex) ? `目標大限為${relNameByIndex(idx, decadeMingIndex)}` : '';
        const yearlyName = relNameByIndex(idx, yearlyMingIndex) ? `目標流年為${relNameByIndex(idx, yearlyMingIndex)}` : '';
        const monthlyName = relNameByIndex(idx, monthlyMingIndex) ? `目標流月為${relNameByIndex(idx, monthlyMingIndex)}` : '';
        const dailyName = relNameByIndex(idx, dailyMingIndex) ? `目標流日為${relNameByIndex(idx, dailyMingIndex)}` : '';

        // 大限年齡區間（虛歲）
        // 大限年齡：若缺失，根據decades補全
        let age = '';
        if (p.decadeInfo && p.decadeInfo.startAge && p.decadeInfo.endAge) {
          age = `（${p.decadeInfo.startAge}-${p.decadeInfo.endAge}歲）`;
        } else if ((ziwei as any).decades?.length) {
          const dec = (ziwei as any).decades.find((d: any) => d.palaceIndex === (p.index ?? 0));
          if (dec?.startAge && dec?.endAge) {
            age = `（${dec.startAge}-${dec.endAge}歲）`;
          }
        }
        const bodyMark = p.isBodyPalace ? ' [身]' : '';
        const parts = [
          hb,
          `本命${label}`,
          decadeName,
          yearlyName,
          monthlyName,
          dailyName,
          age
        ].filter(Boolean).join(' ');
        lines.push(`${parts}${bodyMark}：${starsJoined}`.trim());
      }
    } catch {}

    // 四化
    // 只有在明確指定對應時間範圍時才顯示對應的四化
    // 本命四化始終顯示；大限/流年/流月/流日四化僅在有對應 timeContext 時顯示
    try {
      // 優先使用外部覆蓋的mutagen（包含月/日/時），否則使用ziwei內置
      const m = (mutagen as any) || ((ziwei as any).mutagenInfo as any);
      if (m) {
        const fmtLine = (label: string, info?: any) => {
          if (!info) return '';
          const parts: string[] = [];
          if (info.lu) parts.push(`化祿-${info.lu}`);
          if (info.quan) parts.push(`化權-${info.quan}`);
          if (info.ke) parts.push(`化科-${info.ke}`);
          if (info.ji) parts.push(`化忌-${info.ji}`);
          return parts.length ? `${label}：${parts.join(' ')}` : '';
        };

        const lines4: string[] = [];
        // 本命四化始終顯示
        const l1 = fmtLine('本命四化', m.natal);
        if (l1) lines4.push(l1);
        // 只有在有大限 timeContext 時才顯示大限四化
        if (timeContext?.decade) {
          const l2 = fmtLine('大限四化', m.decadal);
          if (l2) lines4.push(l2);
        }
        // 只有在有流年 timeContext 時才顯示流年四化
        if (timeContext?.yearly) {
          const l3 = fmtLine('流年四化', m.yearly);
          if (l3) lines4.push(l3);
        }
        // 只有在有流月 timeContext 時才顯示流月四化
        if (timeContext?.monthly) {
          const l4 = fmtLine('流月四化', m.monthly);
          if (l4) lines4.push(l4);
        }
        // 只有在有流日 timeContext 時才顯示流日四化
        if (timeContext?.daily) {
          const l5 = fmtLine('流日四化', m.daily);
          if (l5) lines4.push(l5);
        }
        if (lines4.length) {
          lines.push('');
          lines.push('四化系統：');
          for (const l of lines4) lines.push(l);
        }
      }
    } catch {}
  }

  lines.push('');
  return lines.join('\n');
}
