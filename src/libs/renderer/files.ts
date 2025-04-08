/**
 * 文件URL的内存映射
 */

interface FileMap {
  [id: string]: string;
}

const MAP: FileMap = {};

/**
 * 获取文件URL
 * @param id 文件ID
 * @returns 文件URL或undefined
 */
export function get(id: string): string | undefined {
  return MAP[id];
}

/**
 * 设置文件URL
 * @param id 文件ID
 * @param url 文件URL
 */
export function set(id: string, url: string): void {
  MAP[id] = url;
}
