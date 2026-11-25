<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'

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

// 64 位放在最前并作为主按钮：绝大多数电脑选它
const DOWNLOAD_BUTTONS = [
  { arch: 'Win64', label: '下载 64 位', primary: true },
  { arch: 'Win32', label: '32 位', primary: false },
  { arch: 'Arm64', label: 'ARM64', primary: false }
]

const downloadLinks = {
  haeduMirror: 'https://mirrors.ha.edu.cn/github-release/Alan-CRL/Inkeys/',
  pan123: 'https://www.123pan.com/s/duk9-n4dAd.html',
  githubRelease: 'https://github.com/Alan-CRL/Inkeys/releases',
  history: 'https://www.123pan.com/s/duk9-GJ9Ad.html',
  version: '/version/',
  tos: '/tos/zh-cn',
  tosService: '/tos/zh-cn#一、服务说明',
  license: 'https://github.com/Alan-CRL/Inkeys/blob/main/LICENSE',
  win7: '/win7'
}

const year = new Date().getFullYear()

// “谁可以使用”的提示（i）：悬停或聚焦时显示浮窗，不占页面布局
const showRiskNote = ref(false)
const tipX = ref(0)
let tipEl = null
const setTipEl = (el) => {
  tipEl = el
}

const openRiskNote = () => {
  // 浮窗相对整段文字定位：左边缘尽量对齐图标，放不下时向左收，不超出段落
  const lead = tipEl?.closest('.dl-lead')
  const box = tipEl?.querySelector('.dl-tip__box')
  if (lead && box) {
    const room = lead.clientWidth - box.offsetWidth
    const wanted = tipEl.getBoundingClientRect().left - lead.getBoundingClientRect().left - 16
    tipX.value = Math.max(0, Math.min(wanted, room))
  }
  showRiskNote.value = true
}

const closeRiskNote = () => {
  showRiskNote.value = false
}

// 触屏上没有“移开”，点到浮窗以外的地方时收起
const onDocPointerDown = (event) => {
  if (showRiskNote.value && tipEl && !tipEl.contains(event.target)) closeRiskNote()
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
  downloadErrorMessage.value = '下载没有开始，请换用下方的其他下载方式'
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

/*
 * 插图里的彩色墨迹（InkeysRenderer 渲染的图片）：进入视口后按时间从左到右显出一次（不读取滚动进度）。
 * static：服务端渲染、无 JS 或系统开启“减少动态效果”时直接显示画好的样子。
 * armed：已挂载、等待进入视口（墨迹隐藏）；play：开始显现。
 */
const galleries = reactive({ who: 'static', devices: 'static', inputs: 'static' })
const galleryEls = {}
const setGalleryEl = (key) => (el) => {
  if (el) galleryEls[key] = el
}
let galleryObserver = null

const armGalleries = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!('IntersectionObserver' in window)) return

  galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const key = entry.target.dataset.gallery
      if (key) galleries[key] = 'play'
      galleryObserver?.unobserve(entry.target)
    })
  }, { threshold: 0.35 })

  Object.entries(galleryEls).forEach(([key, el]) => {
    galleries[key] = 'armed'
    galleryObserver.observe(el)
  })
}

onMounted(async () => {
  armGalleries()
  document.addEventListener('pointerdown', onDocPointerDown)

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

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  galleryObserver?.disconnect()
  galleryObserver = null
})
</script>

<template>
  <div class="dl">
    <!-- ---------- 下载 ---------- -->
    <section class="dl-hero">
      <div class="dl-icon" role="img" aria-label="智绘教Inkeys 图标"></div>

      <h1 class="dl-title">智绘教Inkeys</h1>
      <p class="dl-version">
        <template v-if="releaseInfo.version">最新版本 {{ releaseInfo.version }}</template>
        <template v-else>&nbsp;</template>
      </p>

      <!-- 加载中 -->
      <div v-if="loading" class="dl-status">
        <span class="dl-spinner" aria-hidden="true"></span>
        <span>正在获取下载地址…</span>
      </div>

      <!-- 出错 -->
      <div v-else-if="hasError" class="dl-status dl-status--error">
        暂时无法获取下载地址，请使用下方的其他下载方式
      </div>

      <!-- 下载区域 -->
      <div v-else class="dl-ready">
        <div class="dl-buttons">
          <a
            v-for="item in DOWNLOAD_BUTTONS"
            :key="item.arch"
            :href="getPrimaryDownloadUrl(item.arch)"
            :download="getPrimaryDownloadName(item.arch)"
            :target="getPrimaryDownloadTarget(item.arch)"
            :rel="getPrimaryDownloadRel(item.arch)"
            class="nh3-btn no-icon"
            :class="item.primary ? 'nh3-btn-primary' : 'nh3-btn-secondary'"
            @click="handleDownload(item.arch, $event)"
          >
            {{ item.label }}
          </a>
        </div>
        <p class="dl-hint">不确定选哪个？大多数电脑选 64 位即可。</p>

        <p v-if="downloadErrorMessage" class="dl-status dl-status--error">
          {{ downloadErrorMessage }}
        </p>

        <!-- 动态显示的下载信息块 -->
        <div class="dl-info" :class="{ 'is-visible': showDownloadInfo }">
          <div class="dl-info__clip">
            <div class="dl-info__box">
              <div class="dl-info__head">
                <span class="dl-info__title">已开始下载</span>
                <button type="button" class="dl-info__close" aria-label="关闭" @click="closeInfo">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                </button>
              </div>
              <div class="dl-info__row">
                <span class="dl-info__label">文件</span>
                <span class="dl-info__value">{{ currentFileName }}</span>
              </div>
              <div class="dl-info__row">
                <span class="dl-info__label">SHA256</span>
                <span class="dl-info__value dl-info__hash">{{ displayHash }}</span>
                <!-- Aa 切换按钮 -->
                <button type="button" class="dl-info__case" title="切换大小写" @click="toggleCase">Aa</button>
              </div>
              <p v-if="currentSupplier" class="dl-info__supplier">{{ currentSupplier }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 其它下载方式：主链接 + 右侧箭头展开更多 -->
      <div class="dl-more">
        <div
          class="dl-drop"
          :class="{ 'is-open': openDropdown === 'download' }"
          @mouseleave="closeDropdown('download')"
        >
          <div class="dl-drop__split">
            <a :href="downloadLinks.haeduMirror" class="dl-drop__main no-icon" target="_blank" rel="noopener noreferrer">
              从河南省教育科研网镜像站下载
            </a>
            <button
              type="button"
              class="dl-drop__toggle"
              :aria-expanded="openDropdown === 'download'"
              aria-label="显示更多下载地址"
              @click.stop="toggleDropdown('download')"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
            </button>
          </div>
          <div class="dl-drop__menu">
            <a :href="downloadLinks.pan123" class="dl-drop__item no-icon" target="_blank" rel="noopener noreferrer">从 123 云盘下载</a>
            <a :href="downloadLinks.githubRelease" class="dl-drop__item no-icon" target="_blank" rel="noopener noreferrer">从 GitHub Release 下载</a>
          </div>
        </div>

        <div
          class="dl-drop"
          :class="{ 'is-open': openDropdown === 'history' }"
          @mouseleave="closeDropdown('history')"
        >
          <div class="dl-drop__split">
            <a :href="downloadLinks.version" class="dl-drop__main no-icon">更新日志</a>
            <button
              type="button"
              class="dl-drop__toggle"
              :aria-expanded="openDropdown === 'history'"
              aria-label="显示历史版本"
              @click.stop="toggleDropdown('history')"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
            </button>
          </div>
          <div class="dl-drop__menu">
            <a :href="downloadLinks.history" class="dl-drop__item no-icon" target="_blank" rel="noopener noreferrer">历史版本</a>
          </div>
        </div>
      </div>

      <!-- 使用条款、开源协议与版权 -->
      <div class="dl-legal">
        <p>
          下载前请阅读 <a :href="downloadLinks.tos" class="no-icon">智绘教Inkeys 使用条款</a>，下载并使用即表示你同意其中的全部内容。
        </p>
        <p>
          智绘教Inkeys 遵循 <a :href="downloadLinks.license" class="no-icon" target="_blank" rel="noopener noreferrer">GNU GPLv3</a> 开源协议<span class="dl-legal__sep" aria-hidden="true">·</span>Copyright © 2023–{{ year }} AlanCRL(陈润林) 工作室
        </p>
      </div>
    </section>

    <!-- ---------- 谁可以使用 ---------- -->
    <section class="dl-section" aria-labelledby="dl-who-title">
      <h2 id="dl-who-title" class="dl-h2">谁可以使用</h2>
      <!-- 提示图标与末尾几个字包在不换行的片段里，图标不会单独掉到下一行 -->
      <p class="dl-lead dl-lead--tip">
        任何人都可以免费使用：个人、学校、企业，用于学习、教学还是商业用途<span class="dl-nowrap">都可以。<span
          :ref="setTipEl"
          class="dl-tip"
          :class="{ 'is-open': showRiskNote }"
          @mouseenter="openRiskNote"
          @mouseleave="closeRiskNote"
          @focusin="openRiskNote"
          @focusout="closeRiskNote"
          @keydown.esc="closeRiskNote"
        ><button
            type="button"
            class="dl-i"
            :aria-expanded="showRiskNote"
            aria-describedby="dl-risk-note"
            aria-label="使用范围说明"
            @click="openRiskNote"
          ><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 7.2 V11.6 M8 4.4 V4.5" /></svg></button><span class="dl-tip__pop" :style="{ '--tip-x': tipX + 'px' }"><span id="dl-risk-note" class="dl-tip__box" role="tooltip">
            智绘教Inkeys 并非为特定行业或监管领域专门设计或认证。在高风险场景中使用前，请自行评估是否适用，并自行承担相应风险。详见<a :href="downloadLinks.tosService" class="no-icon">使用条款 · 服务说明</a>。
          </span></span></span></span>
      </p>

      <ul :ref="setGalleryEl('who')" class="dl-grid" data-gallery="who" :data-anim="galleries.who">
        <li class="dl-tile" style="--i: 0">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <circle class="dl-art" cx="42" cy="46" r="13" />
            <path class="dl-art" d="M16 102 Q16 72 42 72 Q68 72 68 102" />
            <rect class="dl-art" x="82" y="18" width="62" height="84" rx="4" />
            <path class="dl-art" d="M92 68 H134 M92 79 H134 M92 90 H118" />
            <image class="dl-ink dl-ink--light" href="/download/ink/person-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/person-dark.webp" width="160" height="120" />
          </svg>
          <h3 class="dl-tile__name">个人</h3>
          <p class="dl-tile__desc">自学、备考、记笔记</p>
        </li>
        <li class="dl-tile" style="--i: 1">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="18" y="14" width="124" height="74" rx="4" />
            <rect class="dl-art" x="58" y="88" width="44" height="5" rx="2.5" />
            <path class="dl-art" d="M42 88 L34 110 M118 88 L126 110" />
            <image class="dl-ink dl-ink--light" href="/download/ink/school-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/school-dark.webp" width="160" height="120" />
          </svg>
          <h3 class="dl-tile__name">教育</h3>
          <p class="dl-tile__desc">课堂教学、培训和讲座</p>
        </li>
        <li class="dl-tile" style="--i: 2">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <path class="dl-art" d="M12 106 H148" />
            <rect class="dl-art" x="20" y="26" width="46" height="80" rx="3" />
            <path class="dl-art" d="M29 36 H37 V44 H29 Z M49 36 H57 V44 H49 Z M29 52 H37 V60 H29 Z M49 52 H57 V60 H49 Z M29 68 H37 V76 H29 Z M49 68 H57 V76 H49 Z M38 106 V90 H48 V106" />
            <rect class="dl-art" x="82" y="82" width="12" height="24" rx="2" />
            <rect class="dl-art" x="100" y="68" width="12" height="38" rx="2" />
            <rect class="dl-art" x="118" y="52" width="12" height="54" rx="2" />
            <image class="dl-ink dl-ink--light" href="/download/ink/business-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/business-dark.webp" width="160" height="120" />
          </svg>
          <h3 class="dl-tile__name">企业与商业</h3>
          <p class="dl-tile__desc">会议、汇报和商业用途，同样免费</p>
        </li>
        <li class="dl-tile" style="--i: 3">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="18" y="16" width="124" height="80" rx="6" />
            <circle class="dl-art dl-art--dot" cx="30" cy="28" r="2.5" />
            <path class="dl-art" d="M37 28 H50 M30 86 H130" />
            <circle class="dl-art dl-art--solid" cx="62" cy="86" r="2.5" />
            <circle class="dl-art" cx="118" cy="58" r="14" />
            <circle class="dl-art" cx="118" cy="54" r="4.5" />
            <path class="dl-art" d="M109 68.5 Q110 61.5 118 61.5 Q126 61.5 127 68.5" />
            <image class="dl-ink dl-ink--light" href="/download/ink/live-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/live-dark.webp" width="160" height="120" />
          </svg>
          <h3 class="dl-tile__name">创作与直播</h3>
          <p class="dl-tile__desc">录课、直播和视频讲解</p>
        </li>
      </ul>
    </section>

    <!-- ---------- 什么设备可以使用 ---------- -->
    <section class="dl-section" aria-labelledby="dl-device-title">
      <h2 id="dl-device-title" class="dl-h2">在什么设备上使用</h2>
      <p class="dl-lead">
        Windows 8 及以上可直接使用；Windows 7 需要 SP1，并安装 KB2670838 更新（<a :href="downloadLinks.win7" class="no-icon">详细说明</a>）<span class="dl-legal__sep" aria-hidden="true">·</span>支持 x86、x64 和原生 ARM64
      </p>

      <ul :ref="setGalleryEl('devices')" class="dl-grid" data-gallery="devices" :data-anim="galleries.devices">
        <li class="dl-tile" style="--i: 0">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="12" y="8" width="96" height="62" rx="4" />
            <path class="dl-art" d="M52 70 V84 M68 70 V84 M40 84 H80" />
            <rect class="dl-art dl-art--solid" x="72" y="46" width="72" height="48" rx="4" />
            <path class="dl-art dl-art--solid" d="M62 94 H154 V97 Q154 103 148 103 H68 Q62 103 62 97 Z" />
            <path class="dl-art" d="M100 94 Q100 97 103 97 H113 Q116 97 116 94" />
            <image class="dl-ink dl-ink--light" href="/download/ink/computer-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/computer-dark.webp" width="160" height="120" />
          </svg>
          <h3 class="dl-tile__name">笔记本和台式电脑</h3>
          <p class="dl-tile__desc">搭配鼠标、触控板或数位板使用</p>
        </li>
        <li class="dl-tile" style="--i: 1">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="10" y="8" width="140" height="82" rx="4" />
            <rect class="dl-art" x="15" y="13" width="130" height="66" rx="1.5" />
            <circle class="dl-art dl-art--dot" cx="80" cy="84.5" r="1.2" />
            <path class="dl-art" d="M130 84.5 H140 M52 90 L44 107 M108 90 L116 107 M49 99 H111" />
            <circle class="dl-art" cx="44" cy="110" r="2.5" />
            <circle class="dl-art" cx="116" cy="110" r="2.5" />
            <image class="dl-ink dl-ink--light" href="/download/ink/panel-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/panel-dark.webp" width="160" height="120" />
          </svg>
          <h3 class="dl-tile__name">大屏一体机</h3>
          <p class="dl-tile__desc">教室和会议室里的触控大屏</p>
        </li>
        <li class="dl-tile" style="--i: 2">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="22" y="6" width="116" height="6" rx="3" />
            <path class="dl-art" d="M28 12 V74 H132 V12 M80 74 V79" />
            <circle class="dl-art" cx="80" cy="81" r="2" />
            <path class="dl-art" d="M38 26 H86 M38 40 H96 M38 52 H92 M38 64 H72" />
            <path class="dl-art dl-art--dash" d="M62 92 L30 76 M98 92 L130 76" />
            <rect class="dl-art dl-art--solid" x="54" y="92" width="52" height="20" rx="5" />
            <circle class="dl-art" cx="70" cy="102" r="6" />
            <circle class="dl-art" cx="70" cy="102" r="2.5" />
            <path class="dl-art" d="M86 98 H98 M86 102 H98 M86 106 H98 M62 112 V115 M98 112 V115" />
            <image class="dl-ink dl-ink--light" href="/download/ink/projector-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/projector-dark.webp" width="160" height="120" />
          </svg>
          <h3 class="dl-tile__name">投影仪</h3>
          <p class="dl-tile__desc">投到幕布或墙上，边讲边批注</p>
        </li>
        <li class="dl-tile" style="--i: 3">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="34" y="8" width="92" height="62" rx="5" />
            <rect class="dl-art" x="39" y="13" width="82" height="52" rx="1.5" />
            <path class="dl-art" d="M30 82 H130 L140 110 H20 Z M68 82 V78 M92 82 V78" />
            <path class="dl-art dl-art--keys" d="M35 89 H125 M33 95.5 H127" />
            <path class="dl-art" d="M31 102.5 H50 M56 102.5 H104 M110 102.5 H129" />
            <image class="dl-ink dl-ink--light" href="/download/ink/detachable-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/detachable-dark.webp" width="160" height="120" />
            <g transform="translate(100 50) rotate(45)">
              <path class="dl-art dl-art--solid" d="M0 0 L-3.5 -9 V-46 Q-3.5 -50 0 -50 Q3.5 -50 3.5 -46 V-9 Z" />
              <path class="dl-art" d="M-3.5 -9 H3.5 M0 -18 V-28" />
            </g>
          </svg>
          <h3 class="dl-tile__name">二合一平板</h3>
          <p class="dl-tile__desc">拆下键盘，直接用笔写</p>
        </li>
      </ul>

      <h3 class="dl-h3">用什么书写</h3>
      <p class="dl-lead">鼠标、手指、数位板和屏幕笔都可以。</p>

      <ul :ref="setGalleryEl('inputs')" class="dl-grid" data-gallery="inputs" :data-anim="galleries.inputs">
        <li class="dl-tile" style="--i: 0">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="98" y="50" width="38" height="58" rx="19" />
            <path class="dl-art" d="M98 74 H136 M117 50 V74 M117 50 C117 38 130 36 132 18" />
            <rect class="dl-art dl-art--solid" x="114.5" y="57" width="5" height="11" rx="2.5" />
            <image class="dl-ink dl-ink--light" href="/download/ink/mouse-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/mouse-dark.webp" width="160" height="120" />
            <path class="dl-art dl-art--solid" d="M78 84 V101 L82.5 97 L85.5 104 L88.5 102.7 L85.5 96 H91 Z" />
          </svg>
          <h3 class="dl-tile__name">鼠标</h3>
          <p class="dl-tile__desc">按住拖动就能写</p>
        </li>
        <li class="dl-tile" style="--i: 1">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <image class="dl-ink dl-ink--light" href="/download/ink/touch-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/touch-dark.webp" width="160" height="120" />
            <path class="dl-art dl-art--solid" d="M96 120 L88.5 102 L71.7 81.5 A5.5 5.5 0 0 1 80.3 74.5 L90 86.3 V50 A6 6 0 0 1 102 50 V68 A5.5 5.5 0 0 1 113 68 V71 A5.5 5.5 0 0 1 124 71 V75 A5.5 5.5 0 0 1 135 75 V98 Q135 110 128 120" />
            <path class="dl-art" d="M102 68 V82 M113 71 V84 M124 75 V86 M93 52 Q96 49 99 52" />
          </svg>
          <h3 class="dl-tile__name">触摸</h3>
          <p class="dl-tile__desc">手指直接在屏幕上写</p>
        </li>
        <li class="dl-tile" style="--i: 2">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="14" y="6" width="84" height="54" rx="4" />
            <path class="dl-art" d="M56 60 V68 M42 68 H70" />
            <rect class="dl-art dl-art--solid" x="48" y="76" width="102" height="38" rx="5" />
            <rect class="dl-art dl-art--dash" x="56" y="82" width="72" height="26" rx="2" />
            <circle class="dl-art" cx="139" cy="87" r="2" />
            <circle class="dl-art" cx="139" cy="95" r="2" />
            <circle class="dl-art" cx="139" cy="103" r="2" />
            <image class="dl-ink dl-ink--light" href="/download/ink/tablet-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/tablet-dark.webp" width="160" height="120" />
            <g transform="translate(96 98) rotate(40)">
              <path class="dl-art dl-art--solid" d="M0 0 L-3.5 -9 V-42 Q-3.5 -46 0 -46 Q3.5 -46 3.5 -42 V-9 Z" />
              <path class="dl-art" d="M-3.5 -9 H3.5 M0 -18 V-28" />
            </g>
          </svg>
          <h3 class="dl-tile__name">数位板</h3>
          <p class="dl-tile__desc">连上电脑就能写</p>
        </li>
        <li class="dl-tile" style="--i: 3">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="12" y="14" width="112" height="84" rx="6" />
            <rect class="dl-art" x="17" y="19" width="102" height="74" rx="2" />
            <image class="dl-ink dl-ink--light" href="/download/ink/pen-light.webp" width="160" height="120" />
            <image class="dl-ink dl-ink--dark" href="/download/ink/pen-dark.webp" width="160" height="120" />
            <g transform="translate(96 68) rotate(45)">
              <path class="dl-art dl-art--solid" d="M0 0 L-3.5 -9 V-50 Q-3.5 -54 0 -54 Q3.5 -54 3.5 -50 V-9 Z" />
              <path class="dl-art" d="M-3.5 -9 H3.5 M0 -18 V-28" />
            </g>
          </svg>
          <h3 class="dl-tile__name">屏幕笔</h3>
          <p class="dl-tile__desc">像在纸上一样书写</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<!-- 全局：下载页（frontmatter pageClass: download-home）自带标题，隐藏文档默认的面包屑、标题和字数信息 -->
<style>
.download-home .vp-breadcrumb,
.download-home .vp-doc-title,
.download-home .vp-doc-meta {
  display: none;
}

@keyframes dl-spin {
  to { transform: rotate(360deg); }
}
</style>

<!--
  选择器都带组件类名，scoped 后优先级高于 Plume 的 .vp-doc h1 / h2 / p / a / ul，
  因此不需要 !important。颜色全部取自 site.css 的 --nh3-* 令牌，深色模式随令牌切换。
-->
<style scoped>
.dl {
  /* 插图用色：线稿比分隔线深一档；只有墨迹是彩色的（与 UInk 主页一致） */
  --dl-stroke: #9a9a9a;

  container-type: inline-size;
  color: var(--nh3-text);
}

[data-theme='dark'] .dl {
  --dl-stroke: #6b6b6b;
}

/* ---------- 下载 ---------- */

.dl-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0 8px;
  text-align: center;
}

.dl-icon {
  width: 96px;
  height: 96px;
  background: url('/Inkeys.svg') center / contain no-repeat;
}

.dl-title {
  margin: 20px 0 0;
  padding: 0;
  border: 0;
  color: var(--nh3-text);
  font-size: clamp(32px, 6cqw, 44px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.dl-version {
  margin: 10px 0 0;
  color: var(--nh3-text3);
  font-size: 15px;
  line-height: 1.5;
}

.dl-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  margin: 28px 0 0;
  color: var(--nh3-text2);
  font-size: 14px;
}

.dl-status--error {
  color: #dc2626;
}

[data-theme='dark'] .dl-status--error {
  color: #f87171;
}

.dl-ready .dl-status--error {
  min-height: 0;
  margin-top: 12px;
}

.dl-spinner {
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 2px solid var(--nh3-line);
  border-top-color: var(--nh3-text);
  border-radius: 50%;
  animation: dl-spin 0.9s linear infinite;
}

.dl-ready {
  width: 100%;
  animation: dl-fade-in var(--nh3-dur-slow) var(--nh3-ease-out);
}

@keyframes dl-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.dl-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.dl-hint {
  margin: 14px 0 0;
  color: var(--nh3-text3);
  font-size: 13px;
  line-height: 1.6;
}

/* 下载详情：表面色圆角块，展开用 grid 行高过渡，0.4s 与脚本里的等待时间一致 */
.dl-info {
  display: grid;
  grid-template-rows: 0fr;
  /* 宽度要放得下一整行 64 位的 SHA256 */
  max-width: 720px;
  margin: 0 auto;
  opacity: 0;
  /* 收起时 visibility: hidden，里面的按钮不会被 Tab 选中；等收起动画结束再隐藏 */
  visibility: hidden;
  transition: grid-template-rows 0.4s var(--nh3-ease), opacity 0.4s var(--nh3-ease), margin-top 0.4s var(--nh3-ease), visibility 0s linear 0.4s;
}

.dl-info.is-visible {
  grid-template-rows: 1fr;
  margin-top: 20px;
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

.dl-info__clip {
  min-height: 0;
  overflow: hidden;
}

.dl-info__box {
  padding: 14px 18px 16px;
  border-radius: var(--nh3-r-media);
  background: var(--nh3-surface);
  color: var(--nh3-text2);
  font-size: 13px;
  line-height: 1.6;
  text-align: left;
}

.dl-info__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.dl-info__title {
  color: var(--nh3-text);
  font-size: 14px;
  font-weight: 600;
}

.dl-info__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: -6px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--nh3-text3);
  cursor: pointer;
  transition: color var(--nh3-dur) var(--nh3-ease), background-color var(--nh3-dur) var(--nh3-ease);
}

.dl-info__close:hover {
  background: var(--nh3-surface-hover);
  color: var(--nh3-text);
}

.dl-info__close svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.dl-info__row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dl-info__label {
  flex-shrink: 0;
  width: 52px;
  color: var(--nh3-text3);
}

.dl-info__value {
  min-width: 0;
  color: var(--nh3-text);
  word-break: break-all;
}

/* 窄屏放不下一行时折行，始终显示完整的校验值 */
.dl-info__hash {
  flex: 1;
  font-family: var(--vp-font-family-mono);
}

.dl-info__case {
  flex-shrink: 0;
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--nh3-r-pill);
  background: var(--nh3-surface-hover);
  color: var(--nh3-text2);
  font-size: 11px;
  cursor: pointer;
  transition: color var(--nh3-dur) var(--nh3-ease);
}

.dl-info__case:hover {
  color: var(--nh3-text);
}

.dl-info__supplier {
  margin: 6px 0 0;
  color: var(--nh3-text3);
}

/* 其它下载方式：与顶栏、首页同一类小号次要按钮，右侧箭头展开菜单 */
.dl-more {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 28px;
}

.dl-drop {
  position: relative;
}

.dl-drop__split {
  display: flex;
  align-items: stretch;
  height: 38px;
  border-radius: var(--nh3-r-pill);
  background: var(--nh3-surface);
  transition: background-color var(--nh3-dur) var(--nh3-ease);
}

.dl-drop__main,
.dl-drop__main:hover {
  display: inline-flex;
  align-items: center;
  padding: 0 6px 0 16px;
  color: var(--nh3-text2);
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  text-decoration: none;
  transition: color var(--nh3-dur) var(--nh3-ease);
}

.dl-drop__main:hover {
  color: var(--nh3-text);
}

.dl-drop__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  padding: 0 4px 0 0;
  border: 0;
  border-radius: 0 var(--nh3-r-pill) var(--nh3-r-pill) 0;
  background: transparent;
  color: var(--nh3-text3);
  cursor: pointer;
  transition: color var(--nh3-dur) var(--nh3-ease);
}

.dl-drop__toggle:hover {
  color: var(--nh3-text);
}

.dl-drop__toggle svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--nh3-dur) var(--nh3-ease);
}

.dl-drop__main:focus-visible,
.dl-drop__toggle:focus-visible,
.dl-drop__item:focus-visible,
.dl-i:focus-visible,
.dl-info__close:focus-visible,
.dl-info__case:focus-visible {
  outline: 2px solid var(--nh3-accent);
  outline-offset: 2px;
}

.dl-drop__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  min-width: 100%;
  box-sizing: border-box;
  padding: 6px;
  border-radius: var(--nh3-r-control);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 0 0 1px var(--nh3-line), 0 12px 32px rgba(0, 0, 0, 0.12);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur) var(--nh3-ease), visibility 0s linear var(--nh3-dur);
}

/* 菜单与按钮之间留了 6px，用伪元素补上悬停区域，鼠标移过去时菜单不会收起 */
.dl-drop__menu::before {
  position: absolute;
  top: -6px;
  right: 0;
  left: 0;
  height: 6px;
  content: '';
}

.dl-drop.is-open .dl-drop__menu {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}

.dl-drop.is-open .dl-drop__toggle svg {
  transform: rotate(180deg);
}

@media (hover: hover) and (pointer: fine) {
  .dl-drop:hover .dl-drop__split {
    background: var(--nh3-surface-hover);
  }

  .dl-drop:hover .dl-drop__menu {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition-delay: 0s;
  }

  .dl-drop:hover .dl-drop__toggle svg {
    transform: rotate(180deg);
  }
}

.dl-drop__item,
.dl-drop__item:hover {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--nh3-text2);
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  text-align: left;
  text-decoration: none;
  transition: color var(--nh3-dur) var(--nh3-ease), background-color var(--nh3-dur) var(--nh3-ease);
}

.dl-drop__item:hover {
  background: var(--nh3-surface);
  color: var(--nh3-text);
}

/* 条款、协议与版权：小号灰字，链接沿用正文的同色下划线 */
.dl-legal {
  margin-top: 32px;
  color: var(--nh3-text3);
  font-size: 13px;
  line-height: 1.8;
}

.dl-legal p {
  margin: 0;
  /* Plume 的 .vp-doc p 会直接设正文色，这里改回继承外层的浅灰 */
  color: inherit;
}

.dl-legal a,
.dl-lead a {
  color: var(--nh3-text2);
  font-weight: 400;
}

.dl-legal a:hover,
.dl-lead a:hover {
  color: var(--nh3-text);
}

.dl-legal__sep {
  margin: 0 8px;
}

/* ---------- 介绍段落 ---------- */

.dl-section {
  margin-top: 88px;
}

.dl-h2 {
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--nh3-text);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.3;
}

.dl-h3 {
  margin: 56px 0 0;
  padding: 0;
  border: 0;
  color: var(--nh3-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.dl-lead {
  margin: 12px 0 0;
  color: var(--nh3-text2);
  font-size: 16px;
  line-height: 1.8;
  text-wrap: pretty;
}

/* 提示（i）：行内的小圆钮，悬停或聚焦时在段落下方浮出说明 */
.dl-lead--tip {
  position: relative;
}

.dl-nowrap {
  white-space: nowrap;
}

.dl-i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--nh3-surface-hover);
  color: var(--nh3-text2);
  vertical-align: -3px;
  cursor: help;
  transition: color var(--nh3-dur) var(--nh3-ease), background-color var(--nh3-dur) var(--nh3-ease);
}

.dl-i svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
}

.dl-tip.is-open .dl-i {
  background: var(--nh3-text);
  color: var(--vp-c-bg);
}

/* 浮窗的定位层与段落同宽、紧贴段落下沿；上方的内边距让鼠标从图标移到浮窗时不会中途收起 */
.dl-tip__pop {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 10;
  display: block;
  padding-top: 8px;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur) var(--nh3-ease), visibility 0s linear var(--nh3-dur);
}

.dl-tip.is-open .dl-tip__pop {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}

.dl-tip__box {
  display: block;
  width: min(440px, 100%);
  box-sizing: border-box;
  margin-left: var(--tip-x, 0px);
  padding: 12px 16px;
  border-radius: var(--nh3-r-control);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 0 0 1px var(--nh3-line), 0 12px 32px rgba(0, 0, 0, 0.12);
  color: var(--nh3-text2);
  font-size: 14px;
  line-height: 1.8;
}

/* ---------- 插图卡片 ---------- */

.dl-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

@container (min-width: 720px) {
  .dl-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.dl-tile {
  margin: 0;
  padding: 16px 18px 20px;
  border-radius: 20px;
  background: var(--nh3-surface);
}

.dl-tile svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.dl-tile__name {
  margin: 10px 0 0;
  padding: 0;
  border: 0;
  color: var(--nh3-text);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.dl-tile__desc {
  margin: 4px 0 0;
  color: var(--nh3-text3);
  font-size: 13px;
  line-height: 1.6;
}

.dl-art {
  fill: none;
  stroke: var(--dl-stroke);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 鼠标、手指、笔身用卡片底色填充，盖住从下方经过的墨迹 */
.dl-art--solid {
  fill: var(--nh3-surface);
}

.dl-art--dash {
  stroke-dasharray: 3 4;
}

/* 圆点：实心的小标记（录制灯、指示灯） */
.dl-art--dot {
  fill: var(--dl-stroke);
}

/* 键盘的按键行 */
.dl-art--keys {
  stroke-dasharray: 5 3.2;
  stroke-linecap: butt;
}

/* 墨迹图：深浅各一套，随主题切换 */
.dl-ink--dark,
[data-theme='dark'] .dl-ink--light {
  display: none;
}

[data-theme='dark'] .dl-ink--dark {
  display: inline;
}

/* 墨迹显现：从左到右揭开；同时切换透明度，不支持 clip-path 的浏览器也能正常显示 */
.dl-grid[data-anim='armed'] .dl-ink {
  opacity: 0;
  clip-path: inset(0 100% 0 0);
}

.dl-grid[data-anim='play'] .dl-ink {
  opacity: 1;
  clip-path: inset(0 0 0 0);
  transition: clip-path 1100ms var(--nh3-ease-out) calc(var(--i, 0) * 120ms + 150ms), opacity 0s linear calc(var(--i, 0) * 120ms + 150ms);
}

@media (prefers-reduced-motion: reduce) {
  .dl-ready {
    animation: none;
  }

  .dl-info,
  .dl-tip__pop,
  .dl-drop__menu {
    transition: none;
  }
}
</style>
