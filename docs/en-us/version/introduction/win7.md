---
title: Inkeys3 compatibility changes
---

Inkeys3 introduces a new interface and drawing library and uses features from Direct2D 1.1 (D2D1.1). The newer D2D1.1 draws faster and supports richer effects, but it also raises the minimum system version.  
Inkeys2 supports Windows 7 RTM, while Inkeys3 requires Windows 7 SP1 or later. A small number of Windows 7 users may be unable to start Inkeys after upgrading, so automatic updates are blocked for them.  

---
  
::: tip Release status
[Inkeys3 Canary `20261014a`](../inkeys3) is out. It is an early development build and is not recommended for everyday use.  

Inkeys3 LTS has not been released yet. The latest LTS release is Inkeys2 [`20261019a`](/en-us/version/changelog/20261019a) (in Chinese).  
:::

## System requirements

Inkeys3 requires Windows 7 SP1 or later.  
- On Windows 8 **and** later, there is nothing to worry about: you can use Inkeys3 right away.  
- On Windows 7, you need Windows 7 Service Pack 1 with the KB2670838 update installed.

### What is the KB2670838 update?
The KB2670838 update adds some system components, including the D2D1.1 components Inkeys3 needs. Installing it only fills in missing system components and changes nothing else.  
See the [details of this update](https://support.microsoft.com/en-us/help/2670838). 

Please note: according to Microsoft, some computers may crash after installing this update. Read the **details** first and make sure your hardware is supported.  

::: tip How do I check whether KB2670838 is installed?
1. Press Win + R, type `powershell` and press Enter to open PowerShell  
2. Type `get-hotfix -id KB2670838` and press Enter  
3. If you see output like the following, KB2670838 is installed

| Source | Description | HotFixID | InstalledBy | InstalledOn |
| :- | :- | :- | :- | :- |
| &lt;any value&gt; | Update | **KB2670838** | &lt;any value&gt; | &lt;any value&gt; |

:::

### I'm on Windows 7 SP1. How do I install the update?
[Download the update package](https://www.microsoft.com/en-us/download/details.aspx?id=36805) (.msu file), then open it to install.  

[Cloud drive backup](https://www.123912.com/s/duk9-58EAd)  


### Older versions?
If Windows 7 Service Pack 1 is not installed, update your system to SP1 first.  

---

::: tip Miscellaneous
Builds of Inkeys3 test modules ([#](https://www.123912.com/s/duk9-L8EAd))  
:::
