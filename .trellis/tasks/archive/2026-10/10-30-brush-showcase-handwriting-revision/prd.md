# 教学展示图书写与讲解修订

用户已批准本轮方案。沿用原展示图任务授权；首个交付门是原生书写小样，用户确认后才替换整图。

## 本轮要求
- 字迹像成熟教师手写：稳定比例/倾斜、明确 E/F/M/N/4/7/根号折角，圆弧保留自然形态；不用字体轮廓冒充手写。
- 模拟真实落笔/行笔/转角减速/停笔/Up/笔间间隔。修正导出器每笔最后move+0.1ms立即Up、统一55ms收笔、无停顿的问题。不能靠关闭生产软笔算法或后期修图掩盖。
- 先出 E/F/根号/数字/长横线/公式原生小样，对比旧输入并验证速度、笔宽和停笔，交付后等待确认。
- 后续整图：保留上方d=0立方体，下方改为9<k<12的非正则六边形、大辅助等边三角形和三个待扣除小三角形，解释 S=sqrt(3)/2[k²-3(k-6)²]。
- 激光加粗、沿一个待扣除小三角形周长绕两次，略错位，不再内部涂抹。
- 点阵增强可见性并采用与下图等边三角形构造匹配的错行三角点阵；不为贴点扭曲上方立方体。
- 主栏使用真实合并模式 SetSelectAndClickThroughMode(0)，不出现Select(Clear)/Click-through，保持en-US红色软笔/Undo可用/实体底贴任务栏。
- 本轮小样阶段不执行后续整图变更。保护已交付背景/PDF/草稿/原生成品及其可重建来源。无GUI、无发布、无commit/push。

## 验收
- [ ] 小样来自真实Draw3，不是Pillow模拟墨迹；字形尖角与停笔改善可见。
- [ ] 常规笔画无普遍长尖尾；转角不会因人为速度跳变异常变细；长直段粗细自然稳定。
- [ ] 时间单调，匀时间采样，记录实际移动与抬笔间隔；原生源修改按字节恢复。
- [ ] 旧交付及所有来源保持原样，交付小样后等用户确认。
## User rejected V1 style; V2 natural handwriting required
User inspected native V1 sample and says it resembles a formal typeface and repeated letters are identical. Motion/Up fixes are retained but typography is NOT approved. Continue small-sample work, not full-scene.

- Author per-occurrence structural variants and natural pen routes (openings/bowls/stem curves/bar lengths and angles/joins/start-stop locations). Variation must survive normalization; translations/scales/rotations alone are insufficient.
- Maintain one experienced teacher's hand: coherent word rhythm and line drift, uneven but readable math spacing, selective real connected English stroke groups. Avoid both regular typeface tracking and uncorrelated noisy jitter.
- Contextual tempo and pauses, retaining smooth8ms inputs and real idle semantics. No return to ubiquitous pointed tails.
- V2 sample compares overregular V1 with natural V2; include repeated letters/digits and short continuous mathematical notes, actual-size and enlarged native pixels.
- Preserve V1 snapshot and44originalfrozen files. Final style remains user approval gate even if mathematical/timing checks pass.
## V3 user direction (current turn)
User wants much stronger visible change than V1→V2, especially actual internal digit/capital/radical routes. Current explicit request is DIRECT-RENDERED SHAPE DRAFT only; do not spend time rebuilding native engine or retuning thickness. Preserve native-ready centerlines/motion route for later, but clearly label current V3 preview as a directly rendered draft, not native output.

Reference: C:/Users/alan-/AppData/Local/Temp/codex-clipboard-c372353e-9448-4ead-b457-2d25b34ee8cb.png. Use its visual direction, do not trace/clone it; formalV3 should be more natural. One mature teacher, slightly neater than ordinary messy classroom notes. Strong non-affine structural differences in333/222,0/6/7/8 andE/F/M/N/O. Roots highestpriority: short entryhook/downstroke, steep continuous ascent, naturallyextended slopedbar, varying proportions/spaces/terminal; no standardmathfont/staticSVG substitute. Natural corner transitions, no ruler-like geometry and no arbitrarynoise.

Keep V2 accepted English connectedgesture direction, add hence and therefore the section is regular. Tests include MN²=3²+3²=18; OM=ON=MN; MN=3sqrt2; P=18sqrt2; angles. Correction: in this cube task MON=60deg; use MON=60deg andSMN=120deg rather than wrong MON120. Repetition333222;EEFFMNMN;006677ss; roots sqrt3/sqrt3/18sqrt2/3sqrt2; also test88 due explicit requirement.

Output overallV3 board, same-scale commonV2/V3 comparisons, number/capital/root enlargedACTUALdraftpixelcrops (no redraw), short differences. Save under isolated handwriting-revision/v3/; preserve all V1/V2/native/oldscene artifacts. No nativebuild/UI/whole-scene changes this turn. Style gate still userapproval.
## V3 text approved; next gate is right-hand geometry draft
User explicitly approved V3 text. This turn ONLY direct-render right-side diagram draft and in-context preview, then stop for user confirmation; native rendering/final composition next turn after approval.

Upper: retain exact central-section cube at d=0, standard ABCD/EFGH and midpoint labels M..S, verified orthographic camera/hidden edges; blue outlines only, no fill.
Lower: generic 9<k<12 section in plane x+y+z=k, using k=10 as geometric illustration (d=1/sqrt3) but dimension labels symbolic. Big equilateral triangle X=(k,0,0),Y=(0,k,0),Z=(0,0,k); remove three congruent corner triangles side(k-6)sqrt2 from big side ksqrt2. Result is a nonregular hexagon with alternating(12-k)sqrt2 and(k-6)sqrt2. Do not reuse midpoint labels/regular-angle labels from upper case. Show big auxiliary triangle+three removed small triangles, no facefills, distinguish outer/helper vs actualsection strokes and limited red annotations.
Dots: global triangular lattice visibly stronger than oldnative dots; set lower big side15gridsteps and each removed side6steps for k10, so all lower vertices/intersections exactly ongrid. Suggested grid20previewpx, rowheight10sqrt3; lowerZ~(1390,625), X~(1240,884.8),Y~(1540,884.8). Uppercenter may translate onto a nearbygridpoint without shearing/scaling axes differently; do notforcealluppervertices ontogrid. Opaque cream flatbrush sweeps clipped consistentphase behind both, no darker overlap.
Laser: exactly2closed handlike perimeterloops around ONE removedsmalltriangle (recommendtopcorner), ~1.5–2x prior contourwidth; slightoffset, nointeriorhatching/fill. Keep labels readable.
Use approvedV3 routes for handwriting labels; add missing labelglyphs locally inshape-draft without changingapprovedV3. Frozenbackground/PDF,V1/V2/V3 prioroutputs andoldnative remainunchanged. Contextpreview should show just newright draft over frozenbackground (do notpasteknownwrongoldtoolbar or repaintleftnotes). No UI/nativebuild thisturn. Provide rightdetail +1600x1000 contextpreview, sourcegeometry/paths and independentmath/layoutchecks. Explicitdraftlabels outsidecontent.
## Approved shapes — final native integration authorized
User confirmed current geometry draft and requests nextstage. Both V3 text and rightgeometry approved. Now produce final native+composition in isolated handwriting-revision/final-v3/ so all approveddrafts and previousfinal remainrebuildable.

Integrate V3 handwriting with previous approved teaching-working layout (coordinate substitution, midpoint/length², equilateral reasoning, perimeter and six-triangle area, movingplane distance, area subtraction/expansion/max). Preserve clear process, red work andbluebackreferences, offsetsemantic yellowhighlights/redquestionmarks. Use approved shape-draft exactgeometry/labels/brushmask/dots/2laserloops; no hatch/fill. No changing approvedfontstyle. Ensure no obsolete lowerd0/60/120 annotation in(c)diagram.

Nativeadapter must MERGE corrected samplefree_hold semantics (physicalUp, lastactualmovement, productionidle settling/recovery,8ms and .055taper unchanged) with fullUI/shape/brush/laser capture. UI MUST SetSelectAndClickThroughMode(0), not1; capture actualbuttonvisibility andlabels/merge mode. en-US redsoftpen drawing, Undo enabled/Redo disabled, noSelect(Clear)/Click-through; native solidbodyrect includesDCoffsets andMainButton union, anchorbottom1884(942preview), notPNG/shadowbounds.

Triangulardotpattern is futuretexturebrush demonstration: native-render dotpattern using exactapproved triangularphase/step, clip oncebynativeopaquecreamflatbrushcoverage. Clearly document prototype composition, notproductionexistingbrushclaim. Native geometry all productionshape line/ellipse factories, nofills; laser2perimeterloops only with enlargednativecore/materialradius inexportadapter, notflatfilledshape/rasterpaint.

Use privateOutDir builds perdev/shape, full InkeysRepo.sln Debug|ARM64,vswhereARM64MSBuild, PATH normalization preservesvaluein samePS,nodereuse,>=5min; temporaryharnessbytesguardedrestore, no permanentnative/productconfig changes, noGUI/commit/push/publication. Captureinput/exe/adapters/layers/metadata/log hashes bind composition withfailures0; no draft fallback. Final1600x1000preview/3200x2000master, QA+README, independentreview. Useralreadyauthorized finalstage, no additionalgatebefore completing.