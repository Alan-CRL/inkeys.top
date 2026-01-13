---
title: PPT演示助手 3
---

<script setup>
import Swiper from 'vuepress-theme-plume/features/Swiper.vue'
</script>

全新的 **PPT演示助手 3** 已经上线，本次更新使得COM注册损坏的设备也可以成功联动。提升兼容性的同时健壮了代码，适用于更多极端的场景。

## 重点升级

- [x] 识别COM注册损坏的PPT。
- [x] 动态切换，优先绑定最上层的放映窗口。

<ArtPlayer
  src="https://vip.123pan.cn/1709404/transcode/version-introduction-pptcom3-1%20%282%29.m3u8?extParams=m3u8&resolutions=480p&suffix=mp4&from=transcode"
  type="m3u8"
  :autoplay="true"
  :loop="true"
  :muted="true"
  :fullscreen="true"
  :fullscreenWeb="true"
  :hotkey="true"
  :isLive="true"
  :quality="[
    {
      html: '1080P',
      url: 'https://vip.123pan.cn/1709404/transcode/version-introduction-pptcom3-1%20%282%29.m3u8?extParams=m3u8&resolutions=1080p&suffix=mp4&from=transcode',
    },
    {
      html: '720P',
      url: 'https://vip.123pan.cn/1709404/transcode/version-introduction-pptcom3-1%20%282%29.m3u8?extParams=m3u8&resolutions=720p&suffix=mp4&from=transcode',
    },
    {
      default: true,
      html: '480P',
      url: 'https://vip.123pan.cn/1709404/transcode/version-introduction-pptcom3-1%20%282%29.m3u8?extParams=m3u8&resolutions=480p&suffix=mp4&from=transcode',
    },
  ]"
  style="width: 100%; aspect-ratio: 16 / 9;"
/>

- [x] 兼容至 **Microsoft PowerPoint 2007** 和 **Kingsoft WPS 2013**。

<Swiper :items="['/pptcom3/1.png', '/pptcom3/2.png']" effect="flip" />

- [x] 升级为轮询和事件注册双模式，应对COM损坏严重无法注册事件的情况。

## 其他升级

- [x] 在 WPS 未勾选“兼容第三方系统和软件”的时候连接到 WPS
- [ ] 支持高权限读取到低权限（例如管理员下的 Inkeys 可以读取到普通用户权限的 Powerpoint）

## 技术交流
相信许多开发者朋友对我的解决方案感兴趣，或者其他朋友们好奇我的开发经历。所以接下来我将按照时间顺序，讲述这次的开发过程。

本次更新的开发周期约为 60 小时，过程极为曲折。（毕竟我本以为也就 10 小时顶天了，没想到问题一个接一个）如果您想要借鉴，请遵守 **GNU General Public License v3.0 开源协议** 和 **智绘教Inkeys 使用条款**，尊重他人劳动成果，在您的开源 README 中添加 智绘教Inkeys 的引用标识，并添加 Copyright 标识。否则，具体后果见使用条款。

原先的联动设计是 Inkeys 1 时期（大概 202304）的时候搞出来的。代码还算健壮，并在后期修修补补，得到了不错的体验。

Inkeys 2 时期，我专项突破了超级置顶、UI3、绘图模块3等，是我的代码水平得到了提高。近期我观察到许多用户还是被 PptCom 的问题所困扰，并且其他家开源批注软件也没有更好的方案。（请注意，智绘教拥有便携性定位，所以 VSTO 的方案并非最优解）刚好 202507 我深入学习了 C#，所以经过我对 C# COM 开发的研究，发现似乎真的可以解决这个难题。

### 早期阶段

说干就干，第一个问题是绑定 PptCom 的问题。一个方案是使用 Running Object Table 进行查找，还有就是通过 WM_GETOBJECT 消息来获取 COM 对象。ROT 的问题是权限隔离，就和先前用的 GetActiveObject 问题一样。只不过 ROT 可以在对应注册表损坏的情况下自己找到你想要的。而 GETOBJECT 那边一点进度都没有，根本没有成功过。（Beta 测试时期，我又试了一遍，但似乎 PowerPoint 不理我）所以我最终使用 ROT。

ROT 的目标被设置为 PowerPoint.Application 的经典 GUID 和含有类似 .pptx 后缀的十多种放映后缀名的匹配项。（得益于一般 Ppt 会把完整路径名称的 COM 也注册在 ROT 里面）不过由于 KWpp.Application 的 GUID 在不同版本之间都在变，所以 WPS 就没法这样搞。

然后是引入的优先级概念，我将有效优先级分为3个等级。有 Application 和 ActivePersentation 的为 1，有 SlideShowWindow 的为 2，而放映窗口激活或者是焦点的为 3。这里出现了一个问题，就是WPP在非全屏放映下，SlideShowWindow.HWND 的窗口并非焦点窗口，焦点窗口是 WPS 主窗的框架。我打算识别是否为父子窗口，不行。识别为所有者窗口？不行。后面发现都不是同一进程的（一个是 WPP 的，一个是 WPS 的）。于是我改了一下，也就是放映是 WPS 的，前台焦点只要是 WPS 就把优先级设为 3。有人就要问了，那么对应 WPS 多开的情况下，你怎么确定哪一个是真正的焦点放映窗口呢？很简单，妙就妙在还有个 ActivePersentation 的比较，如果当前不是了，就说明前台在别的放映窗口，重新绑定就是。

插一嘴，为啥有了放映窗口激活状态的检查，还需要这个焦点检查？答案是 WPS 的非全屏放映在任何是焦点的时候都是 false。还记得我自己判断焦点的时候遇到的问题吗？当然，WPS 自己都没发现这是个问题，还是想当然认为 SlideShowWindow.HWND 是焦点的时候就激活了，没想到无论用户点哪里，激活的焦点都是 WPS 的框架和里面一个类名是 Rendering 的窗口，而不是真正的一个类名是 qt 开头的窗口。(当然测试环境是 2025冬季更新 的版本)

悄悄告诉你，先别急，WPS 挖的坑不知这一个。

优先级判断写好了，那么动态绑定就迎刃而解了。只要有其他的目标比我当前绑定的这个目标的优先级更高，那么我就解除绑定，然后绑定那个新的。简单来说，动态绑定的逻辑分为两种：
- 优先级比较
- ActivePersentation 比较

然后我意识到事件注册来获取页数太脆弱，虽然我之前也写了每3秒没有事件激活的时候，就轮询一下。毕竟这种回调很不靠谱。（就像微信支付SDK让你绝对不要根据支付成功的消息返回来评判用户是否成功支付，一定要自己去查询支付状态）于是我加强了这个逻辑，在事件注册失败的时候，选择500ms轮询一次，而不是3秒。这个决策是在后面过程中认为是十分正确的。

### Alpha 阶段

这部分开发大约用了 10 小时，我自己跑了一下，看起来非常完美，于是我开启了 Alpha 测试。先给我自己打造了一些不光是 COM 注册表内容损坏的场景，还有本地文件损坏导致 COM 注册损坏的环境。然后绷不住了，根本用不了。

一番捣鼓发现，这个 ROT 获取到的对象，虽然的确是用 Reflection 拿到的 Application，但是和 Microsoft.Interop.PowerPoint.Application 的 TypeID/GUID 不匹配，完全没法早期绑定。通常是混装 WPS 和 PowerPoint 导致的。这使我恍然大悟，之前研究怎么修复注册表来修复 COM 一直毫无进展，而后面研究出的全部卸载重装的方案却有效果，就是因为文件遭到了损坏。而且经过我的研究，并不是说类似文件相互覆盖杂糅的这些损坏，而是注册表中对应的本地dll位置发生了变化，然后某一方修改不彻底。（不用猜了，就是这个 WPS，由于注册修改不完全，和位数问题）这些设备只要没有按照正确顺序安装它们，并勾选兼容第三方的系统和软件，那么多半 COM 就会坏掉。

于是我成功模拟出了一种环境A，wps32 和 mso64 的组合。在这个环境下，智绘教20250830a 表现为 win32 版本可以正确识别二者，而 win64 版本啥都识别不到。然后我卸载 mso64，装上 mso32，结果一切正常了，果然是一些 dll 的问题。在装 mso32 之前，我恢复之前的注册表或者使用 mso 的自我修复，都没效果，看来确实是这样。这个场景确实是由于 WPS 勾选了兼容第三方系统和软件，并且把自身伪装成 Microsoft PowerPoint 并且位数不一样所致。

回归正题，我发现 .NET framework 4.0 引入了一个非常好的 com 利器，也就是 dynamic 来动态调用这些方法和属性。于是我把 ROT 改为获取RCW 并全部存为 dynamic，过程中还有可能转为 object 使用。

噩梦开始，dynamic 完全就是和它名字一样，就是个边用边包装。首先可能目标属性某些不存在，或者是拒绝访问。我搭建的3组测试环境各种问题频出。所以我花了 15 个小时一直在加 try-catch。并且一会这个 dynamic 又失效了，一会那个属性突然挂了，真的让人抓狂。因为他是 dynamic，它喵的给他绑的啥都会自己变。例如 SlideShowWindow 绑好后结束放映再开始放映，这个有时候会失效，有时候变成其他的了。而原来 Interop包 的那个会自动重定向就很方便。于是我给 SlideShowWindow 加了个动态检查和重绑。问题总算好一些了。

问题接踵而至，SlideShowWindow 的 HWND 死活没法用 dynamic 的 .HWND 得到，而 Width 之类的就可以。我尝试使用反射获取，不行。然后费了好大劲去查文档，写了个 IDispatch 去扫了一遍，发现 HWND 的 ID 是 2010 就是躺在那里，但是就是死活拿不到。后面发现是被保护的 Protected Properties。不过我就纳闷了，Width 也是一样保护的，为啥别人就行呢？（后面 Beta 测试的时候又发现 Width 也不行了）我写了个简单早期绑定接口，只拿这个 2010，结果会错位，拿到的是 2001 的 Active 属性的。于是我补齐了 2001-2010 的这些。结果前面有个 Application，类型又不对了，气死我了。写了个 Accessible 拿 HWND，不理我。后面想到自己原来是写 Win32 的，直接匹配标题和窗口位置唯一确定，问题解决了。

更严重的问题，这个 RCW 我 . 一下访问一个属性，就给我引用计数加个一，结束的时候GC不能很快回收，即使是你自己搁那疯狂 GC.Collect() 也不行，毕竟是 RCW 自己的引用计数。这个不清空完 PowerPoint 就一直死在后台，并且一定时间内无法打开当前文件。（com 正常情况下是不会出现这个情况的，只是后台会一直留着）我索性使用 FinalReleaseObject，无济于事。发现中间有个 SlideShowWindow.View.SlideIndex，中间还有个引用计数，ActivePersentation 判断那里也会有新的引用计数，还有 ROT 循环那里等。于是我又疯狂加 ReleaseObject，结果问题越来越多。这玩意我把它比做进阶版的cpp指针，首先你增加多少个引用计数，就得精准减少多少个。如果你少减少了，那么最终 PowerPoint 就会一直死那。如果多减少了，这个 RCW 就会提前自动销毁，直接殃及其他正在用这个 RCW 的功能。还有一个就是指针中经典的指针赋值的所有权转让问题了，这种地方需要仔细思考是否需要释放。还好我早年间在 cpp 写原始指针，而不是过早为了方便就用 shared_ptr和 CComPtr 之类的，不然今天这问题很容易买下隐患。

### Beta 阶段

终于问题不多了，（真的吗？）开始 Beta 测试了。

第一个问题是 WPS 返回的 SlideShowWindow 尺寸完全是按照幻灯片来的，4:3 的 PPT 在16:9 的屏幕下放映，返回的是 4:3 的。而 PowerPoint 那边是窗口大小。好不容易想到解决办法了，还记得 WPS 非全屏放映时有个 WPS 的边框吗？没错就是它，又给我一棒。最后改了个标题匹配，仅此而已，如果多个符合，就索性没有 HWND 了毕竟匹配准最重要。cpp 那边这种情况就不设置焦点了。

然后发现 WPS2019 根本就不返回 SlideShowWindow 里面的任何属性（除了View），导致我那个 SlideShowWindow 监测一直说这个不是有效的，就一直失败。刚好获取当前页数就是在 View，改了下检测逻辑。当然这都是故意把 COM 损坏下的极端环境。

然后是 WPS2013 的 Application.Name 返回 Microsoft PowerPoint，笑死我了。导致 HWND 的标题匹配直接失效，但是我想不修了，反正早期的 WPS 用 Activate() 也能让它自己置顶。WPS2007 问题更多，例如可以获取到总页数，但是获取不到当前页，索性不管了。别人 mso2007 都正常的很，连事件都可以正常注册，还是在 Win7 RTM 的环境下。

后面遇到个小概率突然崩的情况，原来是在进入放映的过程中，一瞬间 ActionPersentation 属性会失效，访问就 catch。原来没有是 Interop包 有个等待。于是我加了个重试逻辑，总算解决了。最后我还特地回去测了环境A，完全没问题。

### 完美阶段

最后，很高兴我终于解决了这个问题！这一切都是值得的，使我对这一技术栈又有了新的理解，并且积累了更加丰富的经验。

有人会问我为啥不用 ai 直接帮我写？当然，期间我尝试使用 Gimini 3 pro gpt5.2 claude4.5 分别来帮我找错，肯定是有帮助的，不过感觉很浪费时间，甚至在难题上完全乱说话，每次回答给出的方案都不一样，并且都不能解决问题。所以我认为，现阶段这些ai还是适合给你打打杂，例如写个方法模板，查查文档之类的，编码还得靠自己，就像林大佬说的：“不能让 AI 带着跑，而是带着 AI 跑才能正常开发”。

## 相关代码
<https://github.com/Alan-CRL/Inkeys/blob/main/PptCOM/PptCOM.cs>  

---

最后，感谢您能阅读到最后！