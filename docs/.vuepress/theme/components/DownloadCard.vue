<script setup>
import { ref, onMounted, computed } from 'vue'

// 定义响应式数据
const loading = ref(true)
const hasError = ref(false)
const releaseInfo = ref({
  version: '',
  channels: [],
  properties: {
    Win32: { name: '', sha256: '' },
    Win64: { name: '', sha256: '' },
    Arm64: { name: '', sha256: '' }
  }
})

// 控制下载详情块的状态
const showDownloadInfo = ref(false)
const currentFileName = ref('')
const currentHash = ref('')
const currentSupplier = ref('')
const isUpperCase = ref(false) // 默认为小写
const downloadErrorMessage = ref('')

// 你的版本 JSON 地址
const VERSION_JSON_URLS = [
  '/Inkeys/Version/website_version_2.json',
  '//home.alan-crl.top/Inkeys/Version/website_version_2.json',
  'https://1709404.cdn.123clouddisk.com/1709404/Inkeys/Version/website_version_2.json'
]

const ARCHITECTURES = ['Win32', 'Win64', 'Arm64']

const downloadLinks = {
  cquMirror: 'https://mirrors.cqu.edu.cn/github-release/Alan-CRL/Inkeys/',
  pan123: 'https://www.123pan.com/s/duk9-n4dAd.html',
  githubRelease: 'https://github.com/Alan-CRL/Inkeys/releases',
  history: 'https://www.123pan.com/s/duk9-GJ9Ad.html',
  version: '/version/'
}

const openDropdown = ref(null)

const getText = (value) => {
  return typeof value === 'string' ? value.trim() : ''
}

const getNewTab = (channel) => {
  return channel?.NewTab === true || channel?.newTab === true || channel?.newtab === true
}

const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

const normalizeReleaseInfo = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('JSON 格式无效')
  }

  const rawChannels = Array.isArray(data.Channels) ? data.Channels : []
  const channels = rawChannels.map((channel) => {
    const links = {}
    ARCHITECTURES.forEach((arch) => {
      links[arch] = getText(channel?.[arch]?.Link)
    })

    return {
      supplier: getText(channel?.Supplier),
      newTab: getNewTab(channel),
      links
    }
  }).filter((channel) => ARCHITECTURES.some((arch) => channel.links[arch]))

  const properties = {}
  ARCHITECTURES.forEach((arch) => {
    const item = data.Properties?.[arch] || {}
    properties[arch] = {
      name: getText(item.Name) || `Inkeys-${arch}`,
      sha256: getText(item.Sha256) || 'SHA256 not available'
    }
  })

  if (!channels.length) {
    throw new Error('JSON 缺少可用下载通道')
  }

  ARCHITECTURES.forEach((arch) => {
    if (!channels.some((channel) => channel.links[arch])) {
      throw new Error(`JSON 缺少 ${arch} 下载地址`)
    }
  })

  const version = [getText(data.Version), getText(data.Channel)].filter(Boolean).join(' ')
  if (!version) {
    throw new Error('JSON 缺少版本信息')
  }

  return {
    version,
    channels,
    properties
  }
}

const fetchReleaseInfo = async () => {
  const timestamp = new Date().getTime()

  for (const baseUrl of VERSION_JSON_URLS) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}?t=${timestamp}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP status: ${response.status}`)

      return normalizeReleaseInfo(await response.json())
    } catch (e) {
      console.warn(`解析版本 JSON 失败：${baseUrl}`, e)
    }
  }

  throw new Error('所有版本 JSON 地址均解析失败')
}

// 计算属性：根据开关显示大写或小写
const displayHash = computed(() => {
  if (!currentHash.value) return ''
  return isUpperCase.value 
    ? currentHash.value.toUpperCase() 
    : currentHash.value.toLowerCase()
})

const prepareInfoPanel = async () => {
  // 如果当前详情框已经是打开状态，需要实现“先关闭旧的，再打开新的”动画效果
  if (showDownloadInfo.value) {
    showDownloadInfo.value = false
    // 等待 CSS transition 动画结束 (0.4s)
    await new Promise(resolve => setTimeout(resolve, 400))
  }
}

const checkDownloadLink = async (url) => {
  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD', cache: 'no-store' }, 5000)
    if (response.ok || response.type === 'opaque') return true
  } catch (e) {
    // 继续尝试 no-cors，用于无法暴露 CORS 响应头的下载站点
  }

  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }, 5000)
    return response.ok || response.type === 'opaque'
  } catch (e) {
    return false
  }
}

const openDownloadTab = () => {
  const tab = window.open('', '_blank')
  if (tab) {
    tab.opener = null
  }
  return tab
}

const closeDownloadTab = (tab) => {
  if (tab && !tab.closed) {
    tab.close()
  }
}

const getPrimaryChannel = (arch) => {
  return releaseInfo.value.channels.find((channel) => channel.links[arch])
}

const getFileName = (arch) => {
  return releaseInfo.value.properties[arch]?.name || `Inkeys-${arch}`
}

const getPrimaryDownloadUrl = (arch) => {
  return getPrimaryChannel(arch)?.links[arch] || null
}

const getPrimaryDownloadName = (arch) => {
  const channel = getPrimaryChannel(arch)
  return channel && !channel.newTab ? getFileName(arch) : null
}

const getPrimaryDownloadTarget = (arch) => {
  return getPrimaryChannel(arch)?.newTab ? '_blank' : null
}

const getPrimaryDownloadRel = (arch) => {
  return getPrimaryChannel(arch)?.newTab ? 'noopener noreferrer' : null
}

const triggerDownload = (url, newTab, tab, fileName) => {
  if (newTab) {
    if (tab && !tab.closed) {
      tab.location.href = url
      return
    }

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    return
  }

  closeDownloadTab(tab)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

const showDownloadDetails = async (channel, property, fileName) => {
  await prepareInfoPanel()

  // 1. 设置文件名 (直接从 JSON 对应字段获取)
  currentFileName.value = fileName

  // 2. 设置 Hash 值
  currentHash.value = property.sha256 || 'SHA256 not available'

  // 3. 设置下载通道说明
  currentSupplier.value = channel.supplier || ''

  // 4. 重置大小写为默认（小写）
  isUpperCase.value = false

  // 5. 展开信息块
  // 使用 requestAnimationFrame 确保 Vue 已经处理完 false 状态
  requestAnimationFrame(() => {
    showDownloadInfo.value = true
  })
}

// 点击下载按钮的处理函数
const handleDownload = async (arch, event) => {
  const property = releaseInfo.value.properties[arch] || {}
  const fileName = getFileName(arch)
  const primaryChannel = getPrimaryChannel(arch)

  downloadErrorMessage.value = ''

  if (primaryChannel && !primaryChannel.newTab && primaryChannel.links[arch]) {
    await showDownloadDetails(primaryChannel, property, fileName)
    return
  }

  event?.preventDefault()
  let downloadTab = null

  for (const channel of releaseInfo.value.channels) {
    const url = channel.links[arch]
    if (!url) continue

    if (channel.newTab && !downloadTab) {
      downloadTab = openDownloadTab()
    }

    const canDownload = await checkDownloadLink(url)
    if (!canDownload) continue

    await showDownloadDetails(channel, property, fileName)

    triggerDownload(url, channel.newTab, downloadTab, fileName)
    return
  }

  closeDownloadTab(downloadTab)
  showDownloadInfo.value = false
  currentSupplier.value = ''
  downloadErrorMessage.value = '下载失败，请尝试访问下方更多下载地址'
}

// 关闭信息块
const closeInfo = () => {
  showDownloadInfo.value = false
}

// 切换大小写
const toggleCase = () => {
  isUpperCase.value = !isUpperCase.value
}

const toggleDropdown = (name) => {
  openDropdown.value = openDropdown.value === name ? null : name
}

const closeDropdown = (name) => {
  if (openDropdown.value === name) {
    openDropdown.value = null
  }
}

onMounted(async () => {
  try {
    releaseInfo.value = await fetchReleaseInfo()

    // 为了避免闪一下，保留一点时间展示“解析中”
    setTimeout(() => {
      loading.value = false
    }, 500)
  } catch (e) {
    console.error(e)
    loading.value = false
    hasError.value = true
  }
})
</script>

<template>
  <div class="download-wrapper">
    <div class="card-container">
      <!-- 图标 -->
      <img src="/Inkeys.svg" alt="Inkeys Logo" class="app-icon" />

      <!-- 标题 -->
      <h1 class="title">智绘教Inkeys</h1>

      <!-- 版本 -->
      <p class="version-text">{{ releaseInfo.version }}</p>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">解析下载地址中...</div>
      </div>

      <!-- 出错 -->
      <div v-else-if="hasError" class="error-msg">
        解析失败，请尝试访问下方更多下载地址
      </div>

      <!-- 下载区域 -->
      <div v-else>
        <!-- 下载按钮组 -->
        <div class="download-group">
          <a
            :href="getPrimaryDownloadUrl('Win32')"
            :download="getPrimaryDownloadName('Win32')"
            :target="getPrimaryDownloadTarget('Win32')"
            :rel="getPrimaryDownloadRel('Win32')"
            class="inkeys-download-btn"
            @click="handleDownload('Win32', $event)"
          >
            下载 32位
          </a>
          <a
            :href="getPrimaryDownloadUrl('Win64')"
            :download="getPrimaryDownloadName('Win64')"
            :target="getPrimaryDownloadTarget('Win64')"
            :rel="getPrimaryDownloadRel('Win64')"
            class="inkeys-download-btn"
            @click="handleDownload('Win64', $event)"
          >
            下载 64位
          </a>
          <a
            :href="getPrimaryDownloadUrl('Arm64')"
            :download="getPrimaryDownloadName('Arm64')"
            :target="getPrimaryDownloadTarget('Arm64')"
            :rel="getPrimaryDownloadRel('Arm64')"
            class="inkeys-download-btn"
            @click="handleDownload('Arm64', $event)"
          >
            下载 Arm64
          </a>
        </div>

        <div v-if="downloadErrorMessage" class="download-error-msg">
          {{ downloadErrorMessage }}
        </div>

        <!-- 动态显示的下载信息块 -->
        <div class="download-info-wrapper" :class="{ 'is-visible': showDownloadInfo }">
          <div class="download-info-inner">
            <!-- 头部：提示语 + 关闭按钮 -->
            <div class="info-header">
              <span class="info-title">成功开始下载</span>
              <span class="close-icon" @click="closeInfo">×</span>
            </div>
            
            <!-- 内容框 -->
            <div class="info-box">
              <div class="file-name-row">
                <span class="label">文件：</span>
                <span class="value">{{ currentFileName }}</span>
              </div>
              <div class="hash-row">
                <div class="hash-text-group">
                  <span class="label">SHA256：</span>
                  <span class="hash-value">{{ displayHash }}</span>
                </div>
                <!-- Aa 切换按钮 -->
                <button class="case-toggle-btn" @click="toggleCase" title="切换大小写">
                  Aa
                </button>
              </div>
              <div v-if="currentSupplier" class="supplier-row">
                <span class="supplier-value">{{ currentSupplier }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 其它下载方式 -->
      <div class="link-group">
        <div
          class="link-dropdown link-dropdown-download"
          :class="{ 'is-open': openDropdown === 'download' }"
          @mouseleave="closeDropdown('download')"
        >
          <div class="split-link">
            <a
              :href="downloadLinks.cquMirror"
              class="link-main"
              target="_blank"
              rel="noopener noreferrer"
            >
              通过 重庆大学开源软件镜像站 下载
            </a>
            <button
              type="button"
              class="dropdown-toggle"
              :aria-expanded="openDropdown === 'download'"
              aria-label="显示更多下载地址"
              @click.stop="toggleDropdown('download')"
            >
              <span class="dropdown-arrow"></span>
            </button>
          </div>
          <div class="dropdown-menu">
            <a
              :href="downloadLinks.pan123"
              class="dropdown-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              通过 123云盘 下载
            </a>
            <a
              :href="downloadLinks.githubRelease"
              class="dropdown-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              通过 Github Release 下载
            </a>
          </div>
        </div>

        <div
          class="link-dropdown link-dropdown-history"
          :class="{ 'is-open': openDropdown === 'history' }"
          @mouseleave="closeDropdown('history')"
        >
          <div class="split-link">
            <a
              :href="downloadLinks.version"
              class="link-main"
            >
              更新日志
            </a>
            <button
              type="button"
              class="dropdown-toggle"
              :aria-expanded="openDropdown === 'history'"
              aria-label="显示历史版本"
              @click.stop="toggleDropdown('history')"
            >
              <span class="dropdown-arrow"></span>
            </button>
          </div>
          <div class="dropdown-menu">
            <a
              :href="downloadLinks.history"
              class="dropdown-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              历史版本
            </a>
          </div>
        </div>
      </div>

      <!-- 使用条款与系统要求 -->
      <div class="footer-info">
        <p>
          下载并使用软件则表示您同意我们的
          <a href="/tos/zh-cn" class="text-link">智绘教Inkeys 使用条款</a>
        </p>
        <p class="sys-req">
          支持 <strong>Windows 7</strong> (RTM, 即原版 sp0) <strong>及</strong>以上系统，支持
          <strong>x86/x64/Arm64</strong> 架构。
        </p>
      </div>
    </div>
  </div>
</template>

<!-- 全局动画 keyframes -->
<style>
@keyframes inkeys-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

<style scoped>
.download-wrapper {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.card-container {
  text-align: center;
  background: var(--vp-c-bg-soft);
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  max-width: 800px;
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  /* 确保内部动画不溢出 */
  overflow: hidden; 
}

.app-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem auto;
  display: block;
  object-fit: contain;
}

.title {
  margin-top: 0;
  margin-bottom: 0.2rem;
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--vp-c-text-1);
  border: none;
  line-height: 1.2;
}
.version-text {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.0rem;
  color: var(--vp-c-text-3);
}

/* 加载动画区域 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 80px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--vp-c-divider);
  border-top: 4px solid var(--vp-c-brand);
  border-radius: 50%;
  margin-bottom: 1rem;
  display: inline-block;
  animation: inkeys-spin 1s linear infinite !important;
  will-change: transform;
}

.loading-text {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

/* 下载按钮组 */
.download-group {
  display: flex;
  justify-content: center;
  gap: 1rem;
  /* 减少下边距，因为下面可能会出现详情块 */
  margin-bottom: 1rem; 
  flex-wrap: wrap;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 下载按钮样式 */
.inkeys-download-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  line-height: 1.4;
  border: 0;
  border-radius: 8px;
  min-width: 120px;
  cursor: pointer;

  text-decoration: none;
  color: #ffffff;
  background-color: var(--vp-c-brand);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  transition: filter 0.2s ease, transform 0.1s ease;
}

.inkeys-download-btn:visited { color: #ffffff; }
.inkeys-download-btn:hover {
  color: #ffffff;
  filter: brightness(1.1);
}
.inkeys-download-btn:active {
  color: #ffffff;
  filter: brightness(0.9);
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.download-error-msg {
  color: #dc2626;
  margin: -0.25rem 0 1rem;
  font-size: 0.9rem;
}

/* --- 新增：下载详情块样式 --- */
.download-info-wrapper {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  /* 0.4s 的过渡时间，与 JS 中的 setTimeout(400) 配合 */
  transition: max-height 0.4s ease-in-out, opacity 0.4s ease-in-out, margin-bottom 0.4s ease;
  margin-bottom: 0;
  text-align: left; /* 内部左对齐 */
}

.download-info-wrapper.is-visible {
  max-height: 200px; /* 足够容纳内容的高度 */
  opacity: 1;
  margin-bottom: 1.5rem;
}

.download-info-inner {
  /* 限制宽度与下方的分割线接近 */
  width: 100%; 
  /* 左右 Padding 保持与外层一致或略微收缩 */
  padding: 0 0.5rem; 
  box-sizing: border-box;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0 4px; /* 微调对齐 */
}

.info-title {
  color: var(--vp-c-text-1); /* 深色正文颜色 */
  font-weight: 600;
  font-size: 0.95rem;
}

.close-icon {
  font-size: 1.2rem;
  line-height: 1;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: color 0.2s;
  user-select: none;
}
.close-icon:hover {
  color: var(--vp-c-text-1);
}

.info-box {
  background-color: var(--vp-c-bg-alt); /* 浅灰色背景或暗黑模式下的对应色 */
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2); /* 灰色字体 */
}

.file-name-row, .hash-row, .supplier-row {
  display: flex;
  align-items: center;
  line-height: 1.6;
}

.file-name-row {
  margin-bottom: 4px;
  word-break: break-all;
}

.hash-row {
  display: flex;
  justify-content: space-between; /* Hash文字在左，按钮在右 */
  align-items: center;
  gap: 8px;
}

.supplier-row {
  margin-top: 4px;
}

.hash-text-group {
  display: flex;
  overflow: hidden;
}

.hash-value {
  font-family: var(--vp-font-family-mono); /* 等宽字体显示Hash */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.label {
  flex-shrink: 0;
  font-weight: 500;
  margin-right: 4px;
}

.value {
  font-weight: 400;
}

.supplier-value {
  color: var(--vp-c-text-3);
}

/* Aa 切换按钮 */
.case-toggle-btn {
  background: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.7rem;
  padding: 1px 6px;
  line-height: 1.4;
  transition: all 0.2s;
  flex-shrink: 0; /* 防止被挤压 */
}

.case-toggle-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background-color: var(--vp-c-bg);
}

/* --- 其它链接区域 --- */
.link-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
}

.link-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 3px;
  border: 1px solid transparent;
  border-radius: 10px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.link-dropdown:hover,
.link-dropdown.is-open {
  border-color: var(--vp-c-divider);
  background-color: var(--vp-c-bg);
}

.link-dropdown-download {
  min-width: 280px;
}

.link-dropdown-history {
  min-width: 140px;
}

.split-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.link-dropdown:hover .split-link,
.link-dropdown.is-open .split-link {
  background-color: var(--vp-c-bg-soft);
}

.link-main {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 7px 10px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.link-main:visited {
  color: var(--vp-c-text-2);
}

.link-main:hover {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.dropdown-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-height: 36px;
  padding: 0;
  border: 0;
  border-radius: 0 8px 8px 0;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.dropdown-toggle:hover {
  color: var(--vp-c-brand);
  background-color: var(--vp-c-bg-soft);
}

.dropdown-arrow {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  transition: transform 0.2s ease;
}

.link-dropdown:hover .dropdown-arrow,
.link-dropdown.is-open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 3px;
  right: 3px;
  z-index: 10;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-6px);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  pointer-events: none;
  transition: max-height 0.24s ease, opacity 0.2s ease, transform 0.2s ease;
}

.link-dropdown:hover .dropdown-menu,
.link-dropdown.is-open .dropdown-menu {
  max-height: 120px;
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 7px 10px;
  color: var(--vp-c-text-2);
  text-align: left;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.dropdown-item:visited {
  color: var(--vp-c-text-2);
}

.dropdown-item:hover {
  color: var(--vp-c-brand);
  background-color: var(--vp-c-bg-soft);
  text-decoration: none;
}

.dropdown-item + .dropdown-item {
  border-top: 1px solid var(--vp-c-divider);
}

@media (max-width: 640px) {
  .link-group {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .link-dropdown {
    width: 100%;
    max-width: 320px;
  }

  .split-link {
    min-width: 0;
  }

  .link-main {
    flex: 1;
    white-space: normal;
  }
}

/* 底部说明 */
.footer-info {
  margin-top: 2rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  line-height: 1.6;
}

.footer-info p {
  margin: 0.2rem 0;
}

.text-link {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.text-link:hover {
  text-decoration: underline;
}

.sys-req strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

/* 错误提示 */
.error-msg {
  color: #dc2626;
  margin-bottom: 2rem;
}
</style>
