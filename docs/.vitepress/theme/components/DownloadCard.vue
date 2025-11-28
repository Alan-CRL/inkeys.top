<script setup>
import { ref, onMounted } from 'vue'

// 定义响应式数据
const loading = ref(true)
const hasError = ref(false)
const links = ref({
  win32: '',
  win64: '',
  arm64: ''
})

// 你的版本 JSON 地址
const VERSION_JSON_URL = 'https://1709404.v.123pan.cn/1709404/Inkeys/Version/website_version.json'

onMounted(async () => {
  try {
    const response = await fetch(VERSION_JSON_URL)
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
      <h1 class="title">下载 智绘教Inkeys</h1>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">解析下载地址中...</div>
      </div>

      <!-- 出错 -->
      <div v-else-if="hasError" class="error-msg">
        解析失败，请尝试直接访问下方云盘或 Github。
      </div>

      <!-- 下载按钮 -->
      <div v-else class="download-group">
        <!-- 新页面打开并下载：target="_blank" + download -->
        <a
          :href="links.win32"
          class="inkeys-download-btn"
          target="_blank"
          rel="noopener noreferrer"
          download="Inkeys-win32.exe"
        >
          下载 32位
        </a>
        <a
          :href="links.win64"
          class="inkeys-download-btn"
          target="_blank"
          rel="noopener noreferrer"
          download="Inkeys-win64.exe"
        >
          下载 64位
        </a>
        <a
          :href="links.arm64"
          class="inkeys-download-btn"
          target="_blank"
          rel="noopener noreferrer"
          download="Inkeys-arm64.exe"
        >
          下载 Arm64
        </a>
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

<!-- 全局动画 keyframes，避免被 scoped 处理出问题 -->
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
  margin-bottom: 2rem;
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--vp-c-text-1);
  border: none;
  line-height: 1.2;
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
  margin-bottom: 2rem;
  flex-wrap: wrap;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.inkeys-download-btn:visited {
  color: #ffffff;
}

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

/* 其它链接区域 */
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