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

// “谁可以使用”的提示（i）是否展开
const showRiskNote = ref(false)

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
 * 插图里的彩色墨迹：进入视口后按时间画出一次（不读取滚动进度）。
 * static：服务端渲染、无 JS 或系统开启“减少动态效果”时直接显示画好的样子。
 * armed：已挂载、等待进入视口（墨迹隐藏）；play：开始绘制。
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
      <p class="dl-lead">
        任何人都可以免费使用：个人、学校、企业，用于学习、教学还是商业用途都可以。<button
          type="button"
          class="dl-i"
          :aria-expanded="showRiskNote"
          aria-controls="dl-risk-note"
          aria-label="使用范围说明"
          @click="showRiskNote = !showRiskNote"
        >i</button>
      </p>

      <div id="dl-risk-note" class="dl-note" :class="{ 'is-open': showRiskNote }">
        <div class="dl-note__clip">
          <p class="dl-note__box">
            智绘教Inkeys 并非为特定行业或监管领域专门设计或认证。在航空航天、医疗等高风险场景中使用前，请自行评估是否适用，并自行承担相应风险。详见<a :href="downloadLinks.tosService" class="no-icon">使用条款 · 服务说明</a>。
          </p>
        </div>
      </div>

      <ul :ref="setGalleryEl('who')" class="dl-grid" data-gallery="who" :data-anim="galleries.who">
        <li class="dl-tile" style="--i: 0">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <circle class="dl-art" cx="80" cy="44" r="14" />
            <path class="dl-art" d="M50 100 Q50 72 80 72 Q110 72 110 100" />
            <path class="dl-ink dl-ink--blue" pathLength="1" d="M110 40 L118 48 L132 28" />
          </svg>
          <h3 class="dl-tile__name">个人</h3>
          <p class="dl-tile__desc">自学、记笔记，也适合直播和创作</p>
        </li>
        <li class="dl-tile" style="--i: 1">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="22" y="20" width="116" height="74" rx="4" />
            <path class="dl-art" d="M44 94 L38 110 M116 94 L122 110" />
            <path class="dl-ink dl-ink--green" pathLength="1" d="M38 44 L46 56 L54 44 M46 56 V68 M62 54 H74 M62 60 H74 M84 44 L100 68 M100 44 L84 68 M106 40 Q110 34 114 40 L106 48 H115" />
            <path class="dl-ink dl-ink--red" pathLength="1" d="M36 80 Q80 74 122 78" />
          </svg>
          <h3 class="dl-tile__name">教育</h3>
          <p class="dl-tile__desc">课堂教学、培训和讲座</p>
        </li>
        <li class="dl-tile" style="--i: 2">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <path class="dl-ink dl-ink--highlighter" pathLength="1" d="M52 55 H108" />
            <rect class="dl-art" x="46" y="16" width="68" height="94" rx="3" />
            <path class="dl-art" d="M58 30 H70 V40 H58 Z M74 30 H86 V40 H74 Z M90 30 H102 V40 H90 Z M58 50 H70 V60 H58 Z M74 50 H86 V60 H74 Z M90 50 H102 V60 H90 Z M58 70 H70 V80 H58 Z M90 70 H102 V80 H90 Z M74 110 V92 H86 V110" />
          </svg>
          <h3 class="dl-tile__name">企业</h3>
          <p class="dl-tile__desc">会议、汇报和内部培训</p>
        </li>
        <li class="dl-tile" style="--i: 3">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <path class="dl-art" d="M28 20 V100 H136" />
            <path class="dl-art" d="M44 100 V76 H58 V100 M68 100 V64 H82 V100 M92 100 V52 H106 V100 M116 100 V38 H130 V100" />
            <path class="dl-ink dl-ink--red" pathLength="1" d="M40 70 Q66 64 84 46 Q102 28 128 22 M118 18 L128 22 L122 31" />
          </svg>
          <h3 class="dl-tile__name">商业</h3>
          <p class="dl-tile__desc">可以用于商业用途，同样免费</p>
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
            <rect class="dl-art" x="30" y="20" width="100" height="66" rx="5" />
            <path class="dl-art" d="M18 90 H142 L136 100 H24 Z" />
            <path class="dl-ink dl-ink--blue" pathLength="1" d="M44 64 C52 40 64 40 64 56 C64 70 78 70 84 54 C88 44 98 44 104 58" />
            <path class="dl-ink dl-ink--green dl-ink--thin" pathLength="1" d="M44 76 Q80 72 114 75" />
          </svg>
          <h3 class="dl-tile__name">笔记本电脑</h3>
          <p class="dl-tile__desc">随身携带，打开就能写</p>
        </li>
        <li class="dl-tile" style="--i: 1">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="34" y="12" width="92" height="66" rx="6" />
            <path class="dl-art" d="M30 90 H130 L126 104 H34 Z M44 97 H116" />
            <path class="dl-ink dl-ink--red" pathLength="1" d="M58 46 C58 32 100 30 104 44 C107 56 66 62 60 50 C58 44 66 38 76 37" />
          </svg>
          <h3 class="dl-tile__name">二合一平板</h3>
          <p class="dl-tile__desc">拆下键盘，直接用笔写</p>
        </li>
        <li class="dl-tile" style="--i: 2">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="12" y="12" width="136" height="78" rx="4" />
            <path class="dl-art" d="M60 90 L54 110 M100 90 L106 110 M46 110 H64 M96 110 H114" />
            <path class="dl-ink dl-ink--blue" pathLength="1" d="M28 50 C34 32 44 32 44 46 C44 60 56 60 60 44 C64 30 74 32 76 46 C78 58 88 58 92 44" />
            <path class="dl-ink dl-ink--green" pathLength="1" d="M26 72 Q70 66 98 70" />
            <path class="dl-ink dl-ink--red" pathLength="1" d="M106 42 L114 52 L130 30" />
          </svg>
          <h3 class="dl-tile__name">一体机</h3>
          <p class="dl-tile__desc">教室和会议室里的触控大屏</p>
        </li>
        <li class="dl-tile" style="--i: 3">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <path class="dl-ink dl-ink--highlighter" pathLength="1" d="M42 50 H104" />
            <rect class="dl-art" x="30" y="14" width="100" height="68" rx="4" />
            <path class="dl-art" d="M44 36 H112 M44 50 H104 M44 64 H88 M80 82 V98 M58 102 H102" />
          </svg>
          <h3 class="dl-tile__name">台式电脑</h3>
          <p class="dl-tile__desc">搭配鼠标或数位板使用</p>
        </li>
      </ul>

      <h3 class="dl-h3">用什么书写</h3>
      <p class="dl-lead">鼠标、手指、数位板和屏幕笔都可以。</p>

      <ul :ref="setGalleryEl('inputs')" class="dl-grid" data-gallery="inputs" :data-anim="galleries.inputs">
        <li class="dl-tile" style="--i: 0">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <path class="dl-ink dl-ink--blue" pathLength="1" d="M20 94 C30 62 50 60 54 78 C58 94 74 92 84 66" />
            <rect class="dl-art dl-art--solid" x="96" y="48" width="36" height="56" rx="18" />
            <path class="dl-art" d="M114 48 V66 M114 48 C114 36 126 34 128 18" />
          </svg>
          <h3 class="dl-tile__name">鼠标</h3>
          <p class="dl-tile__desc">按住拖动就能写</p>
        </li>
        <li class="dl-tile" style="--i: 1">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <path class="dl-ink dl-ink--green" pathLength="1" d="M24 74 C38 42 58 40 62 60 C66 80 86 78 106 46" />
            <path class="dl-art dl-art--solid" d="M96 120 V58 Q96 44 108 44 Q120 44 120 58 V120" />
            <path class="dl-art" d="M102 56 Q108 50 114 56" />
          </svg>
          <h3 class="dl-tile__name">触摸</h3>
          <p class="dl-tile__desc">手指直接在屏幕上写</p>
        </li>
        <li class="dl-tile" style="--i: 2">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="16" y="44" width="128" height="66" rx="8" />
            <rect class="dl-art dl-art--dash" x="34" y="54" width="92" height="46" rx="3" />
            <path class="dl-ink dl-ink--red" pathLength="1" d="M42 90 C52 72 62 70 66 82 C70 94 80 88 87 62" />
            <path class="dl-art dl-art--solid" d="M126 10 L134 18 L94 58 L86 62 L90 54 Z" />
          </svg>
          <h3 class="dl-tile__name">数位板</h3>
          <p class="dl-tile__desc">连上电脑就能写</p>
        </li>
        <li class="dl-tile" style="--i: 3">
          <svg viewBox="0 0 160 120" aria-hidden="true">
            <rect class="dl-art" x="14" y="16" width="108" height="82" rx="5" />
            <path class="dl-ink dl-ink--blue" pathLength="1" d="M28 72 C36 46 48 46 50 60 C52 74 66 74 70 58 C74 46 86 50 95 74" />
            <path class="dl-art dl-art--solid" d="M138 22 L146 30 L104 72 L95 76 L98 67 Z" />
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
  --dl-ink-blue: #2563eb;
  --dl-ink-red: #e5484d;
  --dl-ink-green: #2f9e44;
  --dl-ink-yellow: #ffd43b;

  container-type: inline-size;
  color: var(--nh3-text);
}

[data-theme='dark'] .dl {
  --dl-stroke: #6b6b6b;
  --dl-ink-blue: #5b8cff;
  --dl-ink-red: #ff6b70;
  --dl-ink-green: #4cc265;
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
  max-width: 560px;
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

.dl-info__hash {
  flex: 1;
  overflow: hidden;
  font-family: var(--vp-font-family-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
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
.dl-note a,
.dl-lead a {
  color: var(--nh3-text2);
  font-weight: 400;
}

.dl-legal a:hover,
.dl-note a:hover,
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

/* 提示按钮（i）：与文字同高的小圆圈 */
.dl-i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 6px;
  padding: 0;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  background: transparent;
  color: var(--nh3-text3);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12px;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  vertical-align: -3px;
  cursor: pointer;
  transition: color var(--nh3-dur) var(--nh3-ease), background-color var(--nh3-dur) var(--nh3-ease);
}

.dl-i:hover,
.dl-i[aria-expanded='true'] {
  color: var(--nh3-text);
}

.dl-note {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition: grid-template-rows var(--nh3-dur-slow) var(--nh3-ease), opacity var(--nh3-dur-slow) var(--nh3-ease), margin-top var(--nh3-dur-slow) var(--nh3-ease), visibility 0s linear var(--nh3-dur-slow);
}

.dl-note.is-open {
  grid-template-rows: 1fr;
  margin-top: 16px;
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

.dl-note__clip {
  min-height: 0;
  overflow: hidden;
}

.dl-note__box {
  margin: 0;
  padding: 14px 18px;
  border-radius: var(--nh3-r-media);
  background: var(--nh3-surface);
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

.dl-ink {
  fill: none;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dl-ink--thin {
  stroke-width: 2.4;
}

.dl-ink--blue {
  stroke: var(--dl-ink-blue);
}

.dl-ink--red {
  stroke: var(--dl-ink-red);
}

.dl-ink--green {
  stroke: var(--dl-ink-green);
}

/* 荧光笔：平头、半透明，压在线稿下面 */
.dl-ink--highlighter {
  stroke: var(--dl-ink-yellow);
  stroke-width: 11;
  stroke-linecap: butt;
  opacity: 0.45;
}

/*
 * 墨迹绘制：pathLength=1，用虚线偏移画出整条路径。
 * 隐藏时同时把透明度设为 0，避免圆头端点在长度为 0 时留下一个点。
 */
.dl-grid[data-anim] .dl-ink {
  stroke-dasharray: 1 2;
}

.dl-grid[data-anim='armed'] .dl-ink {
  stroke-dashoffset: 1;
  opacity: 0;
}

.dl-grid[data-anim='play'] .dl-ink {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 900ms var(--nh3-ease-out) calc(var(--i, 0) * 120ms + 150ms), opacity 0s linear calc(var(--i, 0) * 120ms + 150ms);
}

.dl-grid[data-anim='play'] .dl-ink--highlighter {
  opacity: 0.45;
}

@media (prefers-reduced-motion: reduce) {
  .dl-ready {
    animation: none;
  }

  .dl-info,
  .dl-note,
  .dl-drop__menu {
    transition: none;
  }
}
</style>
