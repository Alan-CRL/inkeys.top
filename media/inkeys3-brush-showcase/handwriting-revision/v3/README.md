# V3 板书字形方向草稿

本轮按用户要求直接绘制中心线，**没有进行原生构建或导出**。这是字形、重复写法和笔记节奏的候选草稿，不是最终Inkeys墨迹效果，也不是采集真人字迹。V1、V2和既有整图全部保留。

## 查看文件

- `build/handwriting-v3-draft-preview.png`：1040×1420，32px左右课堂短笔记、21px检查条、重复字符与实际像素放大。
- `build/handwriting-v3-draft-master.png`：2080×2840。
- `build/handwriting-v2-v3-common-preview.png` / `handwriting-v2-v3-common-master.png`：同尺度V2/V3对照。两列均使用相同直接绘制器；主样27px、检查条21px，不能误称左边原生右边草稿。
- `build/detail-numbers.png`、`detail-capitals.png`、`detail-roots.png`、`detail-notes.png`：从已完成草稿像素裁切放大，没有另外重写一组更漂亮的字。
- `data/draft-scene.json`：全部笔画路线、结构variant、每次落位和8ms采样，供确认后转换为原生输入。

## 这轮实际改了什么

根号作为整体连续手势重新设计：短入口钩、下探、陡升和延长的略弯顶横连在同一条路线中；四种构型的入口、下探深度、上升位置、转折和横画斜率不同。横画长度依照实际被开方数位置计算，并留出适量伸出，不以固定宽度数学字符代替。测试包含√3、√3、18√2、3√2。

数字3明显改变上下瓣比例、左侧开口及腰部回转；2的上弧、下行和底横不同；0/6的闭合与回转位置、7的横画和下行、8的交叉和闭合路线分别设计。E/F有真实略弯竖画和不同横画长短方向，M/N峰谷和斜段路线变化，O保留略不闭合的收笔。没有依赖逐字随机抖动或只改变缩放/旋转。

`math_paths.py`负责数学笔势；`english_paths.py`保留V2的by/symmetry连笔方向，并新增hence、therefore、the、section、is、regular的词组路线。普通排版字体只用于中文标题/说明，不用于红色墨迹。

课堂测试为MN²=3²+3²=18、OM=ON=MN、by symmetry、hence MN=3√2、therefore the section is regular、P=18√2。角度按立方体语境修正为∠MON=60°和∠SMN=120°，没有采用错误的MON120°。另加入88检查。

## 重建

```powershell
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/handwriting-revision/v3/build_draft.py
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/handwriting-revision/v3/build_comparison.py
```

两个脚本均只写本V3目录。对照脚本只读加载V2路径，不调用其main，也不修改V2输入或原生来源。所有放大图由已经绘好的像素裁切，未调用图像生成、字体描边、GUI或MSBuild。

## 检查边界

- 195条独立路径带有8ms采样；保存的是预览坐标，母版比例2。
- 3有4种、2/0/6/8/M/N各3种或更多，E/F/7/O均有至少2种规范化结构；字形差异记录在路径本身。
- 四种根号均连续，顶横结束位置超过实际数字结束位置。
- 数学式及60°/120°语义已核对，普通尺寸与放大图已视觉检查。
- 旧44个冻结文件和V2冻结文件应由任务检查复核哈希，不修改任何旧交付。

样式仍需用户确认。本轮不据此替换整图，也不制作后续构造图、激光、点阵或工具栏。
