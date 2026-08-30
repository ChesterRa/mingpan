/**
 * 北京墙钟时间载体（wall-clock carrier）
 *
 * 约定：凡在内部承载「北京墙钟时间」的 Date 对象，一律以 Date.UTC(...) 构造、
 * 以 getUTC*() 读取。这样的 Date 只是一个「分量容器」，其本地时区解释被完全
 * 绕开——在任何宿主时区（含 Cloudflare Workers 恒为 UTC 的运行时）读写都
 * 得到同一组北京墙钟分量。
 *
 * 背景：此前依赖入口处 process.env.TZ = 'Asia/Shanghai' 保证本地构造与本地
 * 读取配对一致；Workers 等运行时无法设置 TZ，故全面改为 UTC 载体约定。
 */

export interface WallParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second?: number;
}

/** 读取载体的北京墙钟分量 */
function wallParts(date: Date): WallParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

/**
 * 当前时刻的北京墙钟分量（用于「now」语义）
 * 真实时刻（UTC 瞬间）+8h 后取 UTC 分量，即北京墙钟
 */
export function nowBeijingParts(): WallParts {
  return wallParts(new Date(Date.now() + 8 * 3600 * 1000));
}

