# Microsoft Office 如何启用和正常播放 Flash 控件

<ArticleMetadata />

::: tip 提示
本文章同步发布在 CSDN 上，作者均为 AlanCRL。
:::

对于新安装的 Office 默认是不支持启用 Flash 组件的，Flash 组件会无法播放或者黑屏。

本片文章就带你解决这个问题，相关资料都在下方连接内。前提概要，教程对应的版本是 mso16，即 Office 2016 及更新版本，以及 365 等。

### 步骤一
你需要给你的电脑安装 Adobe Flash Player，注意不是 **Flash中心**（如果安装了请先卸载）。如果你已经安装了，或者正确安装了其他版本的 Flash Player（例如 Clean Flash Player 等），可以进入步骤二。

前往官网下载 Flash，你需要安装 ActiveX 和 PPAPI 版本。  

---

打开网址：[点击此处](https://www.flash.cn/download-wins)
注意：**请先看完下方图例，再下载！！！**

![在这里插入图片描述](/tutorial/ppt-flash/1.png)
(神的，官网也能这么流氓！)

**下滑后**，下载前两个并安装。
![在这里插入图片描述](/tutorial/ppt-flash/2.png)
安装完成后，请关闭你的 Office（如果 Office 打开）。

### 步骤二
导入秘制的 REG 注册表文件。
先下载压缩包：[123盘-已经设置免登录不限速](https://www.123912.com/s/duk9-wkQAd)

打开压缩包，依次**将三个都**合入注册表。

![在这里插入图片描述](/tutorial/ppt-flash/3.png)
 ### 大功告成
 重启你的 Office ，你应该会看到如下提示：
 ![在这里插入图片描述](/tutorial/ppt-flash/4.png)
勾上“我可以识别此内容。运行播放” 并点击继续。

![在这里插入图片描述](/tutorial/ppt-flash/5.png)
太好了，Flash 动起来了！

---

接下来就可以正常使用了！

### 附录
小伙伴可能对 reg 的内容不放心，在此提供预览。

![在这里插入图片描述](/tutorial/ppt-flash/6.png)
![在这里插入图片描述](/tutorial/ppt-flash/7.png)
![在这里插入图片描述](/tutorial/ppt-flash/8.png)
点个赞再走吧~