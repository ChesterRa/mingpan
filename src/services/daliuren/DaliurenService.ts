/**
 * 大六壬服務
 * 
 * 提供大六壬排盤功能，輸出天地盤、四課、三傳
 * 
 * 參考來源：
 * - kentang2017/kinliuren (MIT License)
 * - 《大六壬大全》
 * - 《六壬粹言》
 */

import type {
  DaliurenInput,
  DaliurenResult,
  DaliurenServiceConfig,
  DaliurenTimeInput,
  TianGan,
  DiZhi,
} from './types';
import { Solar } from 'lunar-javascript';
import { TianDiPanCalculator } from './calculators/TianDiPanCalculator';
import { SiKeCalculator } from './calculators/SiKeCalculator';
import { SanChuanCalculator } from './calculators/SanChuanCalculator';
import { ShenShaCalculator } from './calculators/ShenShaCalculator';
import { DAY_NIGHT_MAP, normalizeJieQiName } from './data/constants';

export class DaliurenService {
  private config: DaliurenServiceConfig;
  
  constructor(config: DaliurenServiceConfig = {}) {
    this.config = config;
  }
  
  /**
   * 由公曆時間起課（推薦入口）
   *
   * 節氣、農曆月、日干支、時干支均由曆法自動推得，
   * 避免調用方（如 LLM）手工推算干支而出錯。
   * 輸入為北京時間（入口層已完成時區歸一化）。
   *
   * 干支口徑與六爻一致：採用 lunar-javascript EightChar 的日柱/時柱。
   */
  calculateFromTime(input: DaliurenTimeInput): DaliurenResult {
    const solar = Solar.fromYmdHms(
      input.year, input.month, input.day,
      input.hour, input.minute ?? 0, 0
    );
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    eightChar.setSect(1); // 子初换日，全项目统一口径

    // 最近一個節氣（含中氣，月將表按「中氣+下一節」配對，等效中氣換將）
    const prevJieQi = lunar.getPrevJieQi();
    const jieqi = normalizeJieQiName(prevJieQi ? prevJieQi.getName() : '冬至');

    // 農曆月（閏月歸前月，僅用於展示）
    let lunarMonth = lunar.getMonth();
    if (lunarMonth < 0) {
      lunarMonth = -lunarMonth;
    }

    return this.calculate({
      jieqi,
      lunarMonth,
      dayGanZhi: eightChar.getDay(),
      hourGanZhi: eightChar.getTime(),
    });
  }

  /**
   * 計算大六壬盤
   */
  calculate(input: DaliurenInput): DaliurenResult {
    const { jieqi, lunarMonth, dayGanZhi, hourGanZhi } = input;
    
    // 解析干支
    const dayGan = dayGanZhi[0] as TianGan;
    const dayZhi = dayGanZhi[1] as DiZhi;
    const hourZhi = hourGanZhi[1] as DiZhi;
    
    // 1. 計算天地盤
    const tianDiPan = TianDiPanCalculator.calculate(jieqi, hourZhi, dayGan);
    
    // 2. 計算四課
    const siKe = SiKeCalculator.calculate(dayGan, dayZhi, tianDiPan);
    
    // 3. 計算三傳
    const sanChuan = SanChuanCalculator.calculate(siKe, tianDiPan, dayGanZhi, hourZhi);
    
    // 4. 計算神煞
    const shenSha = ShenShaCalculator.calculate(dayGanZhi);
    
    // 5. 確定晝夜
    const dayNight = DAY_NIGHT_MAP[hourZhi];
    
    // 構建結果
    return {
      basicInfo: {
        jieqi,
        lunarMonth: this.formatLunarMonth(lunarMonth),
        dayGanZhi,
        hourGanZhi,
        dayNight,
      },
      tianDiPan,
      siKe,
      sanChuan,
      shenSha,
    };
  }
  
  /**
   * 格式化農曆月份
   */
  private formatLunarMonth(month: number): string {
    const monthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    return monthNames[month - 1] + '月';
  }
}
