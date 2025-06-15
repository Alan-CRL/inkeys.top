# Microsoft Office/PowerPoint 无法以普通用户权限运行的解决方案

::: tip 提示
本文章同步发布在 CSDN 上，作者均为 AlanCRL。
:::

## 前言
这些程序运行时就以管理员权限运行了，并且没有兼容性选项卡，接下来教你如何通过修改注册表取消 Office 默认以管理员身份运行。

## 步骤
### Win+R 输入 `regedit`
### 打开路径一
打开 `HKEY_CURRENT_USER\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers` 看看有没有相关程序，如果有则删除。

![在这里插入图片描述](/tutorial/ppt-admin/1.png)

### 打开路径二
打开 `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers` 看看有没有相关程序，如果有则删除。
![在这里插入图片描述](/tutorial/ppt-admin/2.png)

### 最后
重启计算机就可以了。

## 附件
如果您使用的是 WPS，原理一样。也是在这两个目录中看看有没有包含 ksolaunch.exe 的项，如果有请删除就可以了。