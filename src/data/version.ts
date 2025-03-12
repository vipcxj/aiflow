/**
 * 比较两个版本字符串的大小
 * @param version1 第一个版本字符串，格式为 "x.y.z"
 * @param version2 第二个版本字符串，格式为 "x.y.z"
 * @returns 如果 version1 > version2 返回 1，如果 version1 < version2 返回 -1，如果相等返回 0
 */
export function compareVersions(version1: string, version2: string): number {
  // 处理空字符串或无效输入
  if (!version1 && !version2) return 0;
  if (!version1) return -1;
  if (!version2) return 1;

  // 将版本字符串拆分为数字数组
  const parts1 = version1.split('.').map(Number);
  const parts2 = version2.split('.').map(Number);

  // 确保两个数组长度相同（填充0）
  const maxLength = Math.max(parts1.length, parts2.length);
  while (parts1.length < maxLength) parts1.push(0);
  while (parts2.length < maxLength) parts2.push(0);

  // 依次比较每个部分
  for (let i = 0; i < maxLength; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }

  // 所有部分都相等
  return 0;
}

/**
 * 检查版本1是否大于版本2
 */
export function isVersionGreaterThan(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) > 0;
}

/**
 * 检查版本1是否小于版本2
 */
export function isVersionLessThan(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) < 0;
}

/**
 * 检查版本1是否等于版本2
 */
export function isVersionEqual(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) === 0;
}

/**
 * 检查版本1是否大于等于版本2
 */
export function isVersionGreaterThanOrEqual(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) >= 0;
}

/**
 * 检查版本1是否小于等于版本2
 */
export function isVersionLessThanOrEqual(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) <= 0;
}

/**
 * 获取多个版本中的最大版本
 */
export function getMaxVersion(versions: string[]): string | null {
  if (!versions || versions.length === 0) return null;
  
  return versions.reduce((max, current) => {
    return isVersionGreaterThan(current, max) ? current : max;
  }, versions[0]);
}

/**
 * 获取多个版本中的最小版本
 */
export function getMinVersion(versions: string[]): string | null {
  if (!versions || versions.length === 0) return null;
  
  return versions.reduce((min, current) => {
    return isVersionLessThan(current, min) ? current : min;
  }, versions[0]);
}