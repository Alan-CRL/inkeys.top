<script setup>
import { ref, onMounted, computed } from 'vue'

// 定义响应式数据
const loading = ref(true)
const hasError = ref(false)
const links = ref({
  version: '',
  win32: '',
  win64: '',
  arm64: '',
  "win32 name": '',
  "win64 name": '',
  "arm64 name": '',
  "win32 sha256": '',
  "win64 sha256": '',
  "arm64 sha256": ''
})

// 控制下载详情块的状态
const showDownloadInfo = ref(false)
const currentFileName = ref('')
const currentHash = ref('')
const isUpperCase = ref(false) // 默认为小写

// 你的版本 JSON 地址
const VERSION_JSON_URL = 'https://1709404.v.123pan.cn/1709404/Inkeys/Version/website_version.json'

// 计算属性：根据开关显示大写或小写
const displayHash = computed(() => {
  if (!currentHash.value) return ''
  return isUpperCase.value 
    ? currentHash.value.toUpperCase() 
    : currentHash.value.toLowerCase()
})

// 点击下载按钮的处理函数
const handleDownload = async (url, nameKey, hashKey) => {
  if (!url) return
  
  // 如果当前详情框已经是打开状态，需要实现“先关闭旧的，再打开新的”动画效果
  if (showDownloadInfo.value) {
    showDownloadInfo.value = false
    // 等待 CSS transition 动画结束 (0.4s)
    await new Promise(resolve => setTimeout(resolve, 400))
  }

  // 1. 设置文件名 (直接从 JSON 对应字段获取)
  currentFileName.value = links.value[nameKey] || 'Inkeys-setup'
  
  // 2. 设置 Hash 值
  currentHash.value = links.value[hashKey] || 'SHA256 not available'
  
  // 3. 重置大小写为默认（小写）
  isUpperCase.value = false
  
  // 4. 展开信息块
  // 使用 requestAnimationFrame 确保 Vue 已经处理完 false 状态
  requestAnimationFrame(() => {
    showDownloadInfo.value = true
  })
}

// 关闭信息块
const closeInfo = () => {
  showDownloadInfo.value = false
}

// 切换大小写
const toggleCase = () => {
  isUpperCase.value = !isUpperCase.value
}

onMounted(async () => {
  try {
    const timestamp = new Date().getTime()
    const url = `${VERSION_JSON_URL}?t=${timestamp}`

    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP status: ${response.status}`)

    const data = await response.json()

    if (data.win32 && data.win64 && data.arm64) {
      links.value = data
      
      // 为了避免闪一下，保留一点时间展示“解析中”
      setTimeout(() => {
        loading.value = false
      }, 500)
    } else {
      throw new Error('JSON 缺少必要字段')
    }
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
      <p class="version-text">{{ links.version }}</p>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">解析下载地址中...</div>
      </div>

      <!-- 出错 -->
      <div v-else-if="hasError" class="error-msg">
        解析失败，请尝试访问下方 云盘 或 Github Release
      </div>

      <!-- 下载区域 -->
      <div v-else>
        <!-- 下载按钮组 -->
        <div class="download-group">
          <!-- 
            注意：
            1. 移除了 target="_blank"，避免闪烁新标签页。
            2. download 属性直接绑定 JSON 中的 name 字段。
            3. @click 触发动画逻辑。
          -->
          <a
            :href="links.win32"
            class="inkeys-download-btn"
            :download="links['win32 name']"
            @click="handleDownload(links.win32, 'win32 name', 'win32 sha256')"
          >
            下载 32位
          </a>
          <a
            :href="links.win64"
            class="inkeys-download-btn"
            :download="links['win64 name']"
            @click="handleDownload(links.win64, 'win64 name', 'win64 sha256')"
          >
            下载 64位
          </a>
          <a
            :href="links.arm64"
            class="inkeys-download-btn"
            :download="links['arm64 name']"
            @click="handleDownload(links.arm64, 'arm64 name', 'arm64 sha256')"
          >
            下载 Arm64
          </a>
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
            </div>
          </div>
        </div>
      </div>

      <!-- 其它下载方式 -->
      <div class="link-group">
        <a
          href="https://www.123pan.com/s/duk9-n4dAd.html"
          class="link-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          云盘下载
        </a>
        <span class="divider">|</span>
        <a
          href="https://github.com/Alan-CRL/Inkeys/releases"
          class="link-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          Github Release
        </a>
        <span class="divider">|</span>
        <a
          href="https://www.123pan.com/s/duk9-GJ9Ad.html"
          class="link-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          历史版本
        </a>
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

.file-name-row, .hash-row {
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
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}

.link-item {
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s;
}

.link-item:hover {
  color: var(--vp-c-brand);
  text-decoration: underline;
}

.divider {
  color: var(--vp-c-divider);
  font-size: 0.8rem;
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