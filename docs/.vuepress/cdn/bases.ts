// public 资源的远程地址，按优先级排列。每一项后面直接接 public 内的相对路径，
// 例如 `${ASSET_BASES[0]}/new-index3/s1/whiteboard-light.gif`。
// 新增地址（如 S3）只需在这里追加一行，目录结构须与 public 一致。
// 本地 public 永远是最后一级，不写在列表里。
export const ASSET_BASES = [
  'https://1709404.cdn.123clouddisk.com/1709404/Inkeys/Website/public',
  'https://1709404.cdn.123clouddisk.cn/1709404/Inkeys/Website/public',
]

// 判断某个地址是否可用时请求的文件，必须同时存在于 public 和每个远程地址。
export const PROBE_PATH = '/Inkeys.svg'
