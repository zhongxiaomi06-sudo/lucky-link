# Lucky Link 审核与验证

## V45 淡蓝背景独立预览（未接默认入口）

Owner否定灰白背景并明确要求淡蓝色。本轮仅新增独立HTML／JS和截图脚本，复用现有星星、摄影棚与取景算法；只在预览实例中把纸面换成低对比淡蓝。模型、灯光、曝光、物理、声音和奖励源码未改。

[截图报告](./evidence/reveal-background-v45/report.json)记录390×844、320×568、844×390及真实鼠标拖动侧视图，console/page异常0，localStorage为空；预览JS定向lint通过。这是独立真实WebGL视觉样稿，按钮只占位，没有实际闯关、抽券或音频。本轮未重跑V44全套227项／生产两浏览器，不把下方旧证据作为淡蓝主线完成证明。

当前默认5114入口仍为V44灰白，淡蓝仅见[独立预览](http://127.0.0.1:5114/tests/fixtures/reveal-studio-v45.html)。提交视觉后暂停等待Owner；真机、其他十款、完整游戏及声音未在该预览验证。原有光学近似／密集穿插／大块警告不因调色关闭。

## V44 当前结论：获批灰白背景接入（2026-09-18）

Owner回复“可以\nins风拆解，继续”，已将V43获批背景接入实际解锁页；[批准记录](./evidence/reveal-background-v43/approval.json)绑定390×844预览及SHA-256 `ddd99bfd4a36fe1d70e000b999a04646ea5e9368aeae51be240d96630d8d5929`。“ins风拆解”已单独询问具体表现，尚未得到解释，未自行实现分层、爆炸或拆件动效。V42模型、四材质物理、音乐、玩法和模拟券逻辑保留。

[试玩](http://127.0.0.1:5114/) · [实际通关预览](./evidence/reveal-studio-v44-flow/chromium-final/reward-390x844.png) · [实际首关录音](./evidence/reveal-studio-v44-audio/actual-flow/game-and-unlock.mp3)

### 实现与验证边界

- `reward-studio.js`复用获批灰白曲面纸、主光、补光和半球光，拥有并独立释放纸面／材质／纹理／阴影资源。`reward-framing.js`将原方形模型框映射到全幅画布，保持挂件的屏幕尺寸与位置；背景不再是小画布上的矩形贴片。实际查看器、结果页结构和图标／券对比色已接入。
- 保留V42隐藏refraction fill；这仍是屏幕空间透射近似，不宣称玻璃内部光路与纸面完全一致，也不提供真实玻璃焦散。透明晶体不投不准确的实心阴影，保留金属投影。没有新增外部图片／模型／声音素材，没有把程序模型称为Meshy复刻。
- 全应用 **30文件227项单元测试通过**，含5项摄影棚资源行为及4项全幅取景测试；scoped lint、生产构建通过。构建65模块，Three.js环境块 **573.64kB／gzip145.89kB**，超过500kB警告线，未调整阈值掩盖。应用为普通JS，无独立typecheck目标，未宣称仓库静态类型门禁通过。
- 冻结源文件后在5114实际入口、独立浏览器存档实玩：[Chromium](./evidence/reveal-studio-v44-flow/chromium-final/report.json)、[WebKit](./evidence/reveal-studio-v44-flow/webkit/report.json)各完成星星→郁金香两关、2模块＋2券。四视口390×844／320×568／844×390／1280×800与第二关减少动态；各10项断言通过：控件完整可见且命中、无描述文字、无溢出、画布在屏内、单局单奖励、新目标、存档／静音持久化、页面与同源资源错误0。测试未改Owner正常浏览器存档；未点击商品执行购买或核销。
- [四件材质抽查](./evidence/reveal-studio-v44-gallery/report.json)覆盖星星、企鹅、珍珠心蝴蝶结、火箭；生产CSS／查看器、全幅画布和frameElement，真实鼠标拖动前后像素改变，destroy后loaded清除，console／page／resource错误0。这是独立展示fixture，不是四件逐关解锁；WebGL2实际执行但Chromium报告SwiftShader软件光栅化，不是真iPhone或硬件GPU性能证据。仅抽查现有模型在新背景中的显示，没有精修其余十款。
- [实际首关音频](./evidence/reveal-studio-v44-audio/actual-flow/report.json)：9次真实投放通关，impact、unlock-theme和coupon-reveal均录到；全程平均−31.8dB／峰值−7.3dB，撞击峰值−17.4dB，开奖平均−27.0dB／峰值−7.9dB，无削波、pageerror为0。只录应用总线，不等同于Owner扬声器听感或系统输出路由验证；声音源文件未改。
- Chromium截屏记录4条ReadPixels停顿提示，WebKit无警告；不据此宣称手机60fps。全幅WebGL填充面积增加，真实设备显存／功耗仍未测。
- [WebGL故障回退](./evidence/reveal-studio-v44-fallback/report.json)：只在奖励画布禁用WebGL，保留实际游戏投放通关；2D图片完整加载、失效画布隐藏、仍只发1券、可再玩。记录1条预期的WebGL创建失败日志，页面异常和其它console错误0。本轮浏览器验证使用冻结源码的开发入口；打包另行通过，未把它冒充生产构建浏览器实跑。

### 中间失败与未关闭项

1. 摄影棚与取景新测试先因模块不存在失败；首轮整套测试又发现中心X返回`-0`而非`0`，统一等价表达式后227项通过，没有改变取景位置。
2. 首次Chromium脚本在读取playing后、点击前遇到托盘隐藏而退出，未保存完整结论，见[失败记录](./evidence/reveal-studio-v44-flow/chromium/initial-failure.json)。脚本现在只有读取到实际won才允许该点击竞争，否则仍抛错；未强制胜利、未改生产玩法。新目录最终重跑两关通过，记录的竞争为0，不将初次异常计为通过。
3. 仍为`BUILDING`／本地运行预览，不是最终验收。真实iPhone两轮、扬声器／最终听感、其余十模型精修、素材权利和真实商品券未关闭。V42高阶密度穿插12.730／6.814仍超过4单位线；本轮不修改物理，不以背景通过关闭该缺口。
4. 应用／feature仍在父仓库未跟踪区，scoped git diff覆盖有限；另对10份本轮源码／测试检查尾空白，0问题。七文档／miniapp合同及37素材manifest均通过，没有提交、推送或部署。提交运行预览后暂停，等Owner反馈和“ins风拆解”定义。

V43[独立预览记录](./evidence/reveal-background-v43/report.json)仅证明批准前的背景稿；下文V42／V41结果仅属于各自版本，不充当本轮实跑结论。文档／合同／manifest最终检查与本轮内容哈希见[交付检查](./evidence/reveal-studio-v44-checks.json)。

## V42 模型与材质修正证据（历史版本）

本地 `BUILDING`／精修预览，未发布、未修改 Owner 正常浏览器存档。按材质物理技能先完成一件代表性模块：星星、梨形水滴与连接五金；其余十款未批量精修，首件也不宣称达到参考照片或 Meshy 精确复刻。背景、Hook、60件初始数量、五身份匹配、计分和每次通关抽券规则保留。

最终应用 **28文件218项测试、定向lint、生产构建、七文档／miniapp合同、37文件manifest校验通过**。Chromium与WebKit各真实点击两次通关、各十项流程断言通过，页面／同源资源错误为0。下列未达标项仍开放，不能称最终完成。

[试玩](http://127.0.0.1:5114/) · [实际通关星星预览](./evidence/material-physics-v42-flow/after/chromium/reward-390x844.png) · [四材质试听](./evidence/material-physics-v42-audio/contact-comparison.mp3) · [真实首关总线录音](./evidence/material-physics-v42-audio/actual-flow-fixed/game-and-unlock.mp3)

### 模型修正与边界

- 旧星星采用悬在主体前方的透明平面片模拟切面、水滴采用拉长球体。本轮在 [charm-geometry.js](./src/charm-geometry.js) 改为封闭的前冠／腰棱／背亭切割体，真实面法线与厚度、梨形收颈水滴、银色吊头与相扣细环；不靠叠透明色片伪造切面。
- [真实WebGL四视角](./evidence/material-model-v42/report.json)：正面、45°、90°、背面；11个网格、5344个三角面，闭合边、正体积、无退化三角形，控制台／页面异常0。该脚本为独立模型fixture、真实GPU和鼠标拖动，不是正常游戏通关证明；生产两关另见下一节。
- 水晶材质使用体积透射及吸收，opacity=1、无重复透明混合。CSS背景不能被WebGL透射采样，所以新增仅进入折射缓冲区的程序灯箱，最终页面不绘制该平面；没有替换已有背景。相关实现以 [Three.js材质文档](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) 和本地渲染器传输通道为依据。
- 四视角和两浏览器能证明运行、厚度与切面响应，不能证明照片级水晶、焦散、商品结构尺寸或审美接受。当前星星仍有简化几何／均匀冰蓝的程序模型感；其余十款、游戏内2D素材与3D的一致精修仍待本件审阅后继续。

### 四材质碰撞与实测

[重复测量报告](./evidence/material-physics-v42/report.json)使用相同半径24、相同初始条件；下表均为托盘游戏单位／相对质量，不是实物材料实验测得的SI值。

| 材质 | 相对质量 | 回弹高度 | 滑行距离 | 声音 |
| --- | ---: | ---: | ---: | --- |
| 玻璃 | 1.686 | 17.53 | 134.44 | 清脆玻璃珠，强撞更明亮 |
| 珍珠 | 1.896 | 4.35 | 84.76 | 短、柔和干敲 |
| 树脂 | 0.808 | 1.20 | 68.65 | 较闷、衰减短 |
| 金属 | 3.933 | 9.32 | 103.82 | 较重、短金属鸣响 |

`material-physics.js`统一材质分类；求解器接入质量／惯量、法向成对冲量、切向摩擦与旋转。8ms固定步、每帧最多4步；过长帧记录丢弃物理时间，游戏时限仍按真实前台时间推进。冲量／位置进入声音及短促接触点环，不再以每次撞击摇晃整个托盘。静止接触不重复发声；相同接触冷却与声部上限保留。

默认60件盘最大圆形代理穿插 **2.734**，最终平移／旋转为0，末两秒接触声为0。高阶密集组合 **16.322→12.730、12.528→6.814**，虽改善仍超过4单位验收线，明确未通过；未降低数量、缩小既有碰撞体或放宽计分。当前仍为2D圆形代理，不是完整三维挂链约束或精准异形碰撞；复杂轮廓碰撞与密度容量仍待修。

四个确定性种子均两关胜利、各获得2模块＋2券。自动策略数秒通关只证明可解，不能证明真人40–70秒体验已经成立。

### 实际页面与声音

- 冻结生产构建临时5118端口，独立上下文，真实点击Hook与投放，不注入胜利或奖励：[Chromium](./evidence/material-physics-v42-flow/after/chromium/report.json)、[WebKit](./evidence/material-physics-v42-flow/after/webkit/report.json)。四视口390×844、320×568、844×390、1280×800，加第二关减少动态；控件可见／命中、无描述文字、无溢出、模型在屏、两关各一奖励、目标更新、存档及静音持久化均通过。
- 实际接触记录Chromium26次／强度0.072–0.608，WebKit9次／0.098–0.565；前三材质族为玻璃、珍珠、金属。默认前两关未出现树脂，树脂只由隔离物理和声音测量覆盖，不能称四类都在这两局实玩。
- [24段碰撞输出](./evidence/material-physics-v42-audio/report.json)：采样／程序降级 × 四材质 × 轻中重，峰值、RMS与频谱亮度递增，衰减非递减，无削波。这是Chromium OfflineAudioContext真实生产声音函数输出，不是扬声器录音。
- [修后真实首关录音](./evidence/material-physics-v42-audio/actual-flow-fixed/report.json)：11次真实投放达到won，碰撞、开奖主题和券尾音均输出；全程平均−32.8dB／峰值−7.6dB，撞击片段峰值−17.6dB，开奖平均−27.0dB／峰值−8.5dB，页面错误0。仅录应用总线，不录麦克风／其他应用；设备输出路由、系统静音和Owner主观听感仍待验。
- Chromium截图产生4条ReadPixels GPU停顿提示，WebKit无警告；不能由此称手机恒定60fps。构建Three.js环境块574.98kB／gzip146.16kB仍超500kB，未调高阈值掩盖。

### 失败记录与未验证项

1. 新声音包络局部`release`数值遮蔽同名清理函数；初次实际两浏览器报错，首关音频32次错误。已先补实际onended回调红测，再更名`releaseDuration`修复，最终218项包含该回归。保留[Chromium初次失败](./evidence/material-physics-v42-flow/chromium/report.json)、[WebKit初次失败](./evidence/material-physics-v42-flow/webkit/report.json)、[音频初次失败](./evidence/material-physics-v42-audio/actual-flow/report.json)，不将其计为通过。
2. 折射背景初稿在画布内形成深色方块，内部截图检查未通过；改为只写透射缓冲区，并新增不覆盖页面背景的回归。提交给Owner前已重跑四视角和实际两浏览器。
3. 初次浏览器启动被macOS沙箱IPC拒绝；通过本轮批准的隔离浏览器执行权限重跑，不使用用户登录上下文，不将启动失败计为产品通过。
4. 高阶密度穿插仍未达标；仅首件几何精修，十款未扩展；完整真iPhone／内存／弱网／多指打断、物理扬声器、参考照片级质感及最终审美未验收。优惠券与商品继续模拟。
5. 应用是普通JS，无独立typecheck目标；Vitest转译测试不等于仓库静态类型门禁。应用及feature本身仍在父仓库未跟踪区，scoped git diff不能证明全部新增文件；没有提交、推送或发布。

本轮按Spec Kit FR-148–151、SC-055–056及Phase38执行。视觉提交后暂停实现／测试修复，等待钟笑咪对首件方向反馈；当前保持BUILDING。临时5118验证服务完成后停止，原5114开发服务保留。

复现命令：原有Vitest／lint／build命令见下方历史复现；本轮新增 `rtk node apps/lucky-link/tests/material-physics-v42-audit.mjs`、`rtk python3 apps/lucky-link/tests/model-v42-audit.py`。流程脚本增加`--out`保留历史证据，最终报告位于`evidence/material-physics-v42-flow/after/`；音频脚本见 [碰撞输出](./tests/impact-audio-v42.py) 和 [真实首关](./tests/audio-v41-flow.py)。

## V41 历史记录（以下仅证明当时状态，不定义V42结果）

当前为本地 `BUILDING` 修正版，保留既有 Hook／托盘与十一模块主线。不是已否决的 V33 四身份独立单关。审核同时采用材质物理、前端设计和本地浏览器测试检查：能证明的问题已修复，材质／审美缺口与工程正确性分开记录。

188 项应用测试通过；生产构建与定向 lint 通过。Chromium、WebKit 各完成两次真实投放通关，四种尺寸及一次减少动态揭晓的十项断言均通过。此结论不等于真 iPhone、扬声器听感、全部历史兼容路径、最终审美或正式交付通过。

[本地试玩](http://127.0.0.1:5114/) · [手机揭晓](./evidence/project-review-v41/after/chromium/reward-390x844.png) · [小游戏](./evidence/project-review-v41/after/chromium/game.png) · [实际开奖音乐](./evidence/ice-blue-v41-audio/after/chromium/unlock-theme.mp3)

## 发现及处理

| 优先级 | 不合适之处／复现证据 | 本轮修复与验证 |
| --- | --- | --- |
| P1 | 录音素材已加载时，`samples.play` 的成功结果短路程序旋律；旧总线实际只有6个采样、0个旋律声部。“事件触发”并未证明音乐存在 | [音频入口](./src/tabletop-sound.js)改为纹理与旋律分层；揭晓独立8声部、常规16，合计上限24。实际录到8个旋律＋6个采样，取消旧源码字符串断言，增加生产模块行为测试 |
| P1 | 异常存档的 `unlocked` 对象、数字或旧 `claimed` 对象会在展开／includes时抛错，阻断初始化 | [收藏迁移](./src/collection-game.js)和[主线](./src/ice-blue-mainline.js)校验字段类型，保留合法草稿、模块与券；新增损坏字段回归 |
| P1 | 小屏奖励操作裁切、横屏操作完全出界：320×568按钮底边595；844×390按钮仍在y539、底边595，模型也超出 | [揭晓布局](./src/collection.css)按可用高度缩放、横屏分列。修后按钮底边分别544／272，全部54–56px控件中心命中、无遮挡；两浏览器一致 |
| P2 | 关闭结算期或立刻重开，旧延时仍可能领奖；透明阶段按钮可操作；下一关HUD仍显示上一件 | [回合UI](./src/collection-ui.js)集中管理可暂停延时，离场清理并加状态守卫；按钮同步disabled/inert；新局同步目标图和ID。双引擎受控集成验证离场0奖励、正常1奖励 |
| P2 | 页面后台回来3D被销毁，手动拖动松手后角度又被自动旋转覆盖；环境渲染资源只释放纹理 | [3D查看器](./src/reward-3d-viewer.js)提供pause/resume、保留手动角度、完整释放render target。真实场景＋GPU替身单元验证生命周期，不能当成真机内存记录 |
| P2 | 计时使用被物理截到32ms的间隔，低帧率下60秒变长；消除帧也漏扣时 | [物理回合](./src/gravity-game.js)按真实前台时间扣倒计时／连锁，物理仍限步32ms；超时后不额外加分，后台恢复重置上帧时间 |
| P2 | 解锁后背景音乐从初始.2错误恢复到.12；1.6秒恢复门槛会丢掉整个揭晓 | 统一环境基准.35；揭晓以场景生命周期而非短时限取消。1900ms恢复可播，离场不会补播；普通接触仍保留220ms过期保护 |
| P2 | 旧迁移支路能把棕色流苏／粉色骰子带回作品和盒子；存档商品URL允许脚本地址 | 所有迁移统一过滤排除目录，保留原输入不变；商品URL复用完整HTTPS无凭据规则，非法值回落已批准的模拟地址 |
| P2 | 倒计时与下一件预览重叠、目标进度圈被隐藏、静音图标没有明确区别、键盘无法投放 | 时间移到队列下方，恢复细进度环、静音斜线及焦点；方向键选点、Space/Enter投放。保留原图层，不重做构图 |
| P2 | 七文档同时把V33、V31和旧DIY称为“当前”，会诱导后续开发接错入口 | 七文档收束为V41当前事实；旧证明文件保留为证据，不将旧测试数或弃用计划当当前完成结论 |

另修正模型展示时间与声音／按钮不同步：原50ms每帧钳制会让低帧率揭晓越来越慢，现按真实前台时间走同一展示节奏，后台暂停不计入。代价是严重卡顿时可能跳过中间画面，不再声称每台设备都能呈现完整四阶段运镜。

## 真实生产页面检查

使用独立浏览器上下文、新本地存档和固定随机种子，通过实际点击从 Hook 开始，按“下一件”选择落点；未注入胜利、得分或奖励。生产构建在临时5118端口运行，避免多任务开发时热更新干扰；Owner的5114服务与正常浏览器存档不操作。固定种子便于复现，不证明所有随机局面都能在40–70秒完成。

- [Chromium报告](./evidence/project-review-v41/after/chromium/report.json)、[WebKit报告](./evidence/project-review-v41/after/webkit/report.json)：每个引擎2次真实胜利，星星→郁金香，2模块＋2券，第二关目标图更新，刷新持久化。
- 390×844、320×568、844×390、1280×800共四视口；第二关在减少动态设置下重新挂载真实3D，直接到inspect且按钮可用。
- 两引擎各检查：控件完整可见／命中、无描述文字、无横向溢出、画布在屏内、每关一次奖励、新目标更新、进度持久化、静音持久化、页面错误0、同源资源错误0。
- [修前报告](./evidence/project-review-v41/before/chromium/report.json)、[修后短屏](./evidence/project-review-v41/after/webkit/reward-320x568.png)、[修后横屏](./evidence/project-review-v41/after/webkit/reward-844x390.png)、[减少动态第二件](./evidence/project-review-v41/after/chromium/reduced-motion-second-round.png)。
- WebKit无警告；Chromium截图出现4条GPU ReadPixels停顿提示。保留为性能提醒，不称手机恒定60fps或真机通过。
- 5114当前HTTP返回200。测试没有点击模拟商品执行购买，也没有兑换、外发或修改真实商家配置。

## 声音：输出证据而非事件计数

[修前Chromium](./evidence/ice-blue-v41-audio/before/chromium/report.json)、[修后Chromium](./evidence/ice-blue-v41-audio/after/chromium/report.json)、[修后WebKit](./evidence/ice-blue-v41-audio/after/webkit/report.json)；专项各8项，包含有效手势、静音持久化、后台停止、1900ms恢复、离场取消与声部上限。

同一揭晓采集的平均电平由−38.1dB提升到−30.1dB，修后峰值−8.0dB，无削波。新增旋律声部确实输出，不是仅检查 `lastSound`。真实首关另完成6次投放并达到won，[总线实录](./evidence/ice-blue-v41-audio/actual-flow/game-and-unlock.mp3)及[报告](./evidence/ice-blue-v41-audio/actual-flow/report.json)包含开奖和券尾音，平均−32.1dB、峰值−8.0dB，页面错误0。

这些录音来自应用音频总线，不录麦克风、系统其他应用或外部配乐；不能证明Owner设备没有系统静音、音量过低或输出路由问题，也不替代主观听感批准。没有新增外部音频素材，沿用既有许可样本与原创旋律。

## 受控行为测试的边界

[生命周期Chromium](./evidence/project-review-v41/lifecycle/chromium.json)、[生命周期WebKit](./evidence/project-review-v41/lifecycle/webkit.json)均明确记录 `controlledWinFixture`、`viewerStubbed`、`syntheticVisibility`、`soundStubbed` 为true、`realDevice`为false。它们验证关闭／重開不误领奖、按钮门禁、后台回调、键盘及目标ID／名称／素材更新，不是实际物理通关和真实GPU后台切换证据；真实通关由上一节独立承担。

[查看器行为测试](./src/reward-viewer-lifecycle.test.ts)执行真实Three.js场景和真实mount，仅替换GPU渲染器；覆盖拖动后的角度保持、暂停／恢复、卡顿时间轴、销毁释放。没有以mock结果声称iPhone资源压力已通过。

## 自动化与失败记录

| 检查 | 本轮最终实跑结果 |
| --- | --- |
| 应用Vitest | 25文件、188项全部通过；覆盖新逻辑并保留既有应用单元回归 |
| 定向Oxlint | `apps/lucky-link/src`与`tests/e2e`，deny-warnings通过 |
| 生产构建 | 通过，61模块；Three.js环境共享块574.97kB／gzip146.15kB，仍超过500kB警告线，未调阈值掩盖 |
| 类型检查 | 应用为普通JS，无独立typecheck目标；Vitest转译TS测试不等于全量静态类型检查，不宣称仓库类型门禁通过 |
| 七文档／miniapp合同 | 两项最终实跑通过，本地链接有效；只针对lucky-link，不代表其他脏工作区项目 |
| 素材manifest | 3.1.0、37文件、56,464,966字节校验通过；补登记V34图册950,266字节，hash与既有provenance一致，权利状态保留pending-review；不伪造素材签收 |
| scoped git diff --check | 退出0，但应用与feature本身尚未被父仓库跟踪，覆盖有限；另扫描93份源码／测试／文档，仅发现未改动的旧实验ice-blue-drop.css第1行尾空白，未为本轮清理无关文件 |

中间失败没有计为通过：

1. 初次基线171项中 `craft-v18` 仍期望已删除棕色流苏；改为合法银雕花珠并保持禁件回归。
2. 合并后184项中V40测试仍绑定旧1.6秒与.2源码字符串；移除脆弱断言，新增实际执行音频模块的4项行为测试，最终188通过。
3. 首次开发服布局测试及前两次音频整流程未到won；当时存在并行热更新，与页面重载相符。最终UI在冻结生产构建重跑，两引擎连续两次通关；音频最终实录单独成功。不将早期超时当通过。
4. 初次真实GL生命周期fixture被shader编译拖慢，改用明确标注替身的定时／关闭集成；真实GPU仍由生产浏览器通关覆盖，不隐去替身边界。

## 剩余不合适之处与建议顺序

1. **模型和参考图精度差距**：当前11套3D为程序几何，星星切面／水滴及部分轮廓偏简化，2D珠图与3D揭晓材质不完全一致。下一轮最推荐先选一件完整模块做到参考级再复用，未擅自替换已批准全套视觉。
2. **材质物理未闭合**：当前碰撞仍采用圆形代理与统一参数；四材质的density／restitution配置未接入求解器。应在独立、可测的材质实验中校准后迁入，不将本轮稳定性修复冒充真实玻璃／珍珠／树脂／金属差异完成。
3. **电商仍模拟**：5／10／15券仅本地记录，默认example.com商品地址；没有真实券核销、商品页／库存、支付或履约。券历史查看入口也未提供，不能称完整商业闭环。
4. **交付治理**：运行素材总账与逐素材批准要分开；Meshy实验模型分发许可仍待核验，见CONTENT。当前主要UI无描述文字，但保留的辅助标签／兼容页中仍有中文，en-US统一审核未关闭。
5. **性能与设备**：大块构建警告、弱网首开、移动内存、两轮真iPhone、四边真实安全区／浏览器栏、扬声器与全部多指中断／离线失败、最终审美仍未全验。本轮浏览器尺寸测试不替代设备验收。

全部保持在BUILDING，没有发布、父仓库提交／推送、全局偏好更新或阶段跃迁。临时5118生产验证服务已停止，原5114开发服务保留。查看[交付边界](./RELEASE.md)。提交本轮视觉预览后暂停实现，等待钟笑咪反馈。

## 复现

在工程底座仓库根运行，已有5114服务时不重复启动：

```sh
rtk pnpm --filter @eazo/lucky-link dev
rtk pnpm exec vitest run apps/lucky-link/src
rtk pnpm exec oxlint --deny-warnings apps/lucky-link/src apps/lucky-link/tests/e2e
rtk pnpm --filter @eazo/lucky-link build
rtk python3 apps/lucky-link/tests/project-review-v41.py --engine chromium
rtk python3 apps/lucky-link/tests/project-review-v41.py --engine webkit
rtk python3 apps/lucky-link/tests/lifecycle-v41-audit.py --engine chromium
rtk python3 apps/lucky-link/tests/lifecycle-v41-audit.py --engine webkit
rtk node scripts/check-docs.mjs --only lucky-link
rtk node scripts/validate-miniapps.mjs --only lucky-link
rtk node scripts/validate-manifests.mjs lucky-link
```

当前UI脚本默认连接5114；冻结验证可用静态服务指向app/dist并传入 `--url http://127.0.0.1:5118/`。生命周期脚本需要Vite源码入口，不能指向生产dist。音频脚本与参数见[音频专项](./tests/audio-v41-audit.py)和[真实通关录音](./tests/audio-v41-flow.py)。

Spec Kit沿用 `specs/014-lucky-link`，以明确feature目录只读解析，不依赖共享指针；FR-142–147与SC-053–054、本轮Phase37对应以上证据。较早证据文件仅证明当时状态，旧默认玩法、旧素材数及旧通过数不定义当前版本。
