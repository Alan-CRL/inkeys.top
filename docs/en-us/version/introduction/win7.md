---
title: Inkeys3 compatibility
---

Inkeys3 has a new interface and drawing engine that rely on newer graphics components in Windows (Direct2D 1.1). Because of this, the minimum requirement has moved from Windows 7 in Inkeys2 to Windows 7 SP1 with the KB2670838 update installed. So that Inkeys doesn't fail to start after an upgrade, Windows 7 PCs that don't meet these requirements are not updated to Inkeys3 automatically.

## System requirements

- Windows 8 and later: nothing extra to do, it works right away.
- Windows 7: Service Pack 1 (SP1) and the KB2670838 update must be installed.

## What is KB2670838?

KB2670838 is a platform update Microsoft released for Windows 7 SP1. It adds the graphics components Inkeys3 needs and changes nothing else on your system. See [Microsoft's article](https://support.microsoft.com/en-us/help/2670838) for details.

::: tip How to check whether KB2670838 is installed
1. Press Win + R, type `powershell` and press Enter.
2. Type `get-hotfix -id KB2670838` and press Enter.
3. If you see output like the following, it is installed.

| Source | Description | HotFixID | InstalledBy | InstalledOn |
| :- | :- | :- | :- | :- |
| &lt;any value&gt; | Update | **KB2670838** | &lt;any value&gt; | &lt;any value&gt; |

:::

## Install KB2670838

1. Open the download page on Microsoft's website and pick the file that matches your system: `x64` for 64-bit, `x86` for 32-bit. (To check, right-click "Computer", then choose "Properties" and look at "System type".)
2. Double-click the downloaded `.msu` file, follow the prompts, then restart your PC.

<div class="doc-actions">
  <a class="nh3-btn nh3-btn-primary no-icon" href="https://www.microsoft.com/en-us/download/details.aspx?id=36805" target="_blank" rel="noopener noreferrer">Download from Microsoft</a>
  <a class="nh3-btn nh3-btn-secondary no-icon" href="https://www.123912.com/s/duk9-58EAd" target="_blank" rel="noopener noreferrer">Cloud drive backup</a>
</div>

Windows 7 supports this update's signature out of the box, so you don't need to install any SHA-2 updates first.

::: warning Laptops with dual graphics
On a few laptops with both Intel and AMD graphics, this update can cause a blue screen or a black screen. This is a known issue acknowledged by Microsoft. If it happens, install Microsoft's fix [KB2834140](https://www.catalog.update.microsoft.com/Search.aspx?q=KB2834140) and update your graphics drivers from your PC manufacturer's website.
:::

## If the update won't install

**"The update is not applicable to your computer"**

- SP1 isn't installed yet: install SP1 first.
- The file doesn't match your system type: use the other file.
- It's already installed: check as described above; there's no need to install it again.

**Error 0x80070422 or "the service cannot be started"**

The Windows Update service has been disabled, which is common on trimmed-down systems or ones tweaked by "optimizer" tools. Open Services (press Win + R and type `services.msc`), set the startup type of Windows Update to Manual and start it, then install the update again. You can change it back afterwards.

**Other errors**

The system's update components may be damaged. Run Microsoft's System Update Readiness Tool ([KB947821](https://www.catalog.update.microsoft.com/Search.aspx?q=KB947821)) to repair them, then try again. If it still won't install, let us know in the [community](/en-us/community).

## SP1 not installed?

Install [Windows 7 Service Pack 1](https://www.catalog.update.microsoft.com/Search.aspx?q=KB976932) through Windows Update or from Microsoft's website first, then install KB2670838.

---

::: tip Miscellaneous
Builds of Inkeys3 test modules ([#](https://www.123912.com/s/duk9-L8EAd))  
:::
