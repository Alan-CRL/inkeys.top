# Design
最小修改现有 media/inkeys3-brush-showcase/handwriting-revision/final-v3/prepare_scene.py 的annotation路径与laser生成；必要时微调teaching_layout控制点。先保存原输入/来源证据/最终PNG作before版本。原生C++、已验证privateEXE不改，serial --skip-build capture-only重放dev和shape后严格合成。
发现stroke(...curve=True)当前忽略curve，直接把稀疏点列交给motion；加密折线并不能变成曲线。采用通过控制点的连续曲线或明确Bezier，闭合圈使用周期切线；再按弧长和8ms真实时序采样。curve=False的分式横线/括号/箭头尖保留明确折角，已有密采样圈只做适度连续化；V3字符路径不变。
激光从真实cube0..6与x+y+z=10的6交点用当前camera投影，保存理想轮廓与绘制路径。顺序M'(6,4,0),N'(4,6,0),P'(0,6,4),Q'(0,4,6),R'(4,0,6),S'(6,0,4)。只一条路径，低频轻微起伏+自然圆转角，允许起止小缺口/短重叠；避开现有标号，保留原蓝色d0截面参照。下方全部激光移除。保留已批准原生laser宽度与材质。