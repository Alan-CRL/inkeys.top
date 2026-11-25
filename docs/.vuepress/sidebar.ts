export const downloadSidebar = [
    { text: '下载', link: '/download' },
    { text: '使用条款', link: '/tos', badge: { text: '新', type: 'danger' } },
    {
        // 带 items 的项会被 Plume 单独分成一组，与上面两项之间留出分组间距（同版本侧栏）。
        items: [
            { text: 'Inkeys3', link: '/version/inkeys3' },
            { text: '更新日志', link: '/version/', badge: { text: '新', type: 'tip' } },
        ],
    },
]

export const versionSidebar = [
    { text: '更新日志', link: '/version/' },
    {   
        text: 'Inkeys3', 
        link: '/version/inkeys3',
        badge: { text: '新', type: 'tip' },
        items: [
            { text: 'PPT演示助手 3', link: '/version/introduction/pptcom3' },
            { text: '兼容性调整', link: '/version/introduction/win7' },
        ], 
    },
    { text: '碎碎念', link: '/jabber' },
]

export const tutorialSidebar = [
  {
    text: '知识库',
    link: '/tutorial/tutorial',
    items: [
        { text: '修复 Ppt COM 注册损坏', link: '/tutorial/ppt-com' },
        { text: '修复 Ppt COM 权限问题', link: '/tutorial/ppt-admin' },
        { text: 'Office 启用 Flash 控件', link: '/tutorial/ppt-flash' },
    ],
  },
  {
    text: 'PptxVideoProcessing',
    link: '/tutorial/pptx-video-processing',
  },
]

// ---------- 繁體中文 / English ----------
// 条目链接都指向同一语言的页面：没有译文的页面由 i18n/mirror.ts 生成镜像（简体原文 + 暂未翻译提示），
// 访客点进去后界面语言不变。

export const zhTWDownloadSidebar = [
    { text: '下載', link: '/zh-tw/download' },
    { text: '使用條款', link: '/zh-tw/tos', badge: { text: '新', type: 'danger' } },
    {
        // 与简体中文下载侧栏相同：带 items 的项单独成组，与上面两项之间留出分组间距。
        items: [
            { text: 'Inkeys3', link: '/zh-tw/version/inkeys3' },
            { text: '更新日誌', link: '/zh-tw/version/', badge: { text: '新', type: 'tip' } },
        ],
    },
]

export const enUSDownloadSidebar = [
    { text: 'Download', link: '/en-us/download' },
    { text: 'Terms of Use', link: '/en-us/tos', badge: { text: 'New', type: 'danger' } },
    {
        items: [
            { text: 'Inkeys3', link: '/en-us/version/inkeys3' },
            { text: 'Changelog', link: '/en-us/version/', badge: { text: 'New', type: 'tip' } },
        ],
    },
]

export const zhTWVersionSidebar = [
    { text: '更新日誌', link: '/zh-tw/version/' },
    {
        text: 'Inkeys3',
        link: '/zh-tw/version/inkeys3',
        badge: { text: '新', type: 'tip' },
        items: [
            { text: 'PPT簡報小幫手 3', link: '/zh-tw/version/introduction/pptcom3' },
            { text: '相容性調整', link: '/zh-tw/version/introduction/win7' },
        ],
    },
    { text: '碎碎念', link: '/zh-tw/jabber' },
]

export const enUSVersionSidebar = [
    { text: 'Changelog', link: '/en-us/version/' },
    {
        text: 'Inkeys3',
        link: '/en-us/version/inkeys3',
        badge: { text: 'New', type: 'tip' },
        items: [
            { text: 'PPT Presentation Helper 3', link: '/en-us/version/introduction/pptcom3' },
            { text: 'Compatibility changes', link: '/en-us/version/introduction/win7' },
        ],
    },
    { text: 'Ramblings', link: '/en-us/jabber' },
]

// UInk 1.1 规范侧栏（繁中 / 英文）：只有概览页有译文，其余条目是镜像页。
// 结构与顺序需与 plume.config.ts 里简体中文的规范侧栏一致。
export const zhTWStandardSidebar = [
    { text: '概覽', link: '/zh-tw/standard/' },
    {
        text: '開始',
        items: [
            { text: '規範介紹', link: '/zh-tw/standard/intro' },
            { text: '快速開始', link: '/zh-tw/standard/quick-start' },
            { text: '分級與認證', link: '/zh-tw/standard/levels' },
            { text: '相容與回退', link: '/zh-tw/standard/compatibility' },
        ],
    },
    {
        text: '檔案',
        items: [
            { text: '墨跡主檔案', link: '/zh-tw/standard/file/main' },
            { text: '儲存、追加與復原', link: '/zh-tw/standard/incremental' },
            { text: '資源包', link: '/zh-tw/standard/file/extra' },
        ],
    },
    {
        text: '區塊規範',
        items: [
            { text: 'Header 區塊', link: '/zh-tw/standard/blocks/header' },
            { text: 'Header Extension 區塊', link: '/zh-tw/standard/blocks/headerExtension' },
            { text: 'Device 結構', link: '/zh-tw/standard/blocks/device' },
            { text: 'Canvas 區塊', link: '/zh-tw/standard/blocks/canvas' },
            { text: 'Ink 區塊', link: '/zh-tw/standard/blocks/ink' },
            { text: 'Shape 區塊', link: '/zh-tw/standard/blocks/shape' },
            { text: 'Media 區塊', link: '/zh-tw/standard/blocks/media' },
            { text: 'Clear 區塊', link: '/zh-tw/standard/blocks/clear' },
        ],
    },
    {
        text: '公用結構',
        items: [
            { text: 'Color Map', link: '/zh-tw/standard/common/color' },
            { text: '筆尖與端帽', link: '/zh-tw/standard/common/nib' },
        ],
    },
    {
        text: '附錄',
        items: [
            { text: '區塊類型與編碼', link: '/zh-tw/standard/type' },
            { text: '圖形預設登錄表', link: '/zh-tw/standard/appendix/shape-presets' },
            { text: '實作一致性與範例', link: '/zh-tw/standard/conformance' },
            { text: '版本與變更', link: '/zh-tw/standard/version' },
            { text: '術語表', link: '/zh-tw/standard/glossary' },
        ],
    },
]

export const enUSStandardSidebar = [
    { text: 'Overview', link: '/en-us/standard/' },
    {
        text: 'Getting Started',
        items: [
            { text: 'Introduction', link: '/en-us/standard/intro' },
            { text: 'Quick Start', link: '/en-us/standard/quick-start' },
            { text: 'Levels and Certification', link: '/en-us/standard/levels' },
            { text: 'Compatibility and Fallback', link: '/en-us/standard/compatibility' },
        ],
    },
    {
        text: 'Files',
        items: [
            { text: 'Main Ink File', link: '/en-us/standard/file/main' },
            { text: 'Saving, Appending and Recovery', link: '/en-us/standard/incremental' },
            { text: 'Resource Package', link: '/en-us/standard/file/extra' },
        ],
    },
    {
        text: 'Blocks',
        items: [
            { text: 'Header Block', link: '/en-us/standard/blocks/header' },
            { text: 'Header Extension Block', link: '/en-us/standard/blocks/headerExtension' },
            { text: 'Device Structure', link: '/en-us/standard/blocks/device' },
            { text: 'Canvas Block', link: '/en-us/standard/blocks/canvas' },
            { text: 'Ink Block', link: '/en-us/standard/blocks/ink' },
            { text: 'Shape Block', link: '/en-us/standard/blocks/shape' },
            { text: 'Media Block', link: '/en-us/standard/blocks/media' },
            { text: 'Clear Block', link: '/en-us/standard/blocks/clear' },
        ],
    },
    {
        text: 'Common Structures',
        items: [
            { text: 'Color Map', link: '/en-us/standard/common/color' },
            { text: 'Nibs and Caps', link: '/en-us/standard/common/nib' },
        ],
    },
    {
        text: 'Appendix',
        items: [
            { text: 'Block Types and Encoding', link: '/en-us/standard/type' },
            { text: 'Shape Preset Registry', link: '/en-us/standard/appendix/shape-presets' },
            { text: 'Conformance and Samples', link: '/en-us/standard/conformance' },
            { text: 'Versions and Changes', link: '/en-us/standard/version' },
            { text: 'Glossary', link: '/en-us/standard/glossary' },
        ],
    },
]

export const zhTWTutorialSidebar = [
  {
    text: '知識庫',
    link: '/zh-tw/tutorial/tutorial',
    items: [
        { text: '修復 PPT COM 註冊損壞', link: '/zh-tw/tutorial/ppt-com' },
        { text: '修復 PPT COM 權限問題', link: '/zh-tw/tutorial/ppt-admin' },
        { text: 'Office 啟用 Flash 控制項', link: '/zh-tw/tutorial/ppt-flash' },
    ],
  },
  {
    text: 'PptxVideoProcessing',
    link: '/zh-tw/tutorial/pptx-video-processing',
  },
]

export const enUSTutorialSidebar = [
  {
    text: 'Knowledge Base',
    link: '/en-us/tutorial/tutorial',
    items: [
        { text: 'Fix broken PPT COM registration', link: '/en-us/tutorial/ppt-com' },
        { text: 'Fix PPT COM permission issues', link: '/en-us/tutorial/ppt-admin' },
        { text: 'Enable Flash controls in Office', link: '/en-us/tutorial/ppt-flash' },
    ],
  },
  {
    text: 'PptxVideoProcessing',
    link: '/en-us/tutorial/pptx-video-processing',
  },
]
