# Design

## Boundary
新增 media/inkeys3-brush-showcase/handwriting-revision/ 独立试样目录，不修改原final/draft/background和旧native适配以免破坏旧manifest绑定。原生临时harness独立备份恢复；使用本任务私有OutDir，不能复用共享EXE。

## Small proof before full scene
同一原生渲染器、同一字号/基准宽度，输出旧字形+旧时序/旧适配行为与新字形+新运动时序对照。另保留原尺寸与放大细节，不用额外平滑图像。标题/解释可使用普通排版，所有样本文字必须真实手写中心线。

字形采用明确直段/拐点/曲线段，不能把E/F/根号转角统一Catmull圆滑。以稳定作者风格代替逐字过量随机化。新采样以8ms为初始间隔，按弧长与转角约束速度，直段稳定、拐弯减速、起止平滑。停笔在Up前；初始80–110ms候选需通过原生样本校准，笔间间隔单独记录。正确区分logicalInputTime和lastMovementInputTime。保持生产55ms窗口算法，以真实停顿让笔锋消退，不直接设taper=0或改为硬笔。

native_render代理负责独立native适配/导出/源码恢复及诊断。stage1_background代理负责试样中心线/时序/scene数据和试样板合成。二者协商最小输入协议扩展（明确Up时间/停笔）；新目录完整隔离旧成品来源。只编译dev完整solution Debug|ARM64一次，不需要shape构建。可导出基准、新样本透明层与每笔起止、真实移动时间、采样/存储笔宽诊断。禁止草稿墨迹fallback。

## Later
小样确认后才把修正字形应用至全图，并做新构造图/激光/三角点阵/合并栏。当前不创建或渲染这些变更。
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