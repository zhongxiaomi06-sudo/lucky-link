# Lucky Link 内容

## V44 当前素材事实

本轮没有新增或下载外部图片、音频、模型。V44 将获批 V43 灰白摄影棚的本地程序纸面／光影接入揭晓，保留原模型、四材质物理和声音。默认使用 V22 首页 Hook、V30 托盘分层、现有配饰图册及 V34 冰蓝模块图册。盘内为独立 2D 配饰实例／运动层，揭晓使用十一套程序 3D 几何；V42 只精修“冰晶星愿”的封闭切面星星、梨形水滴及五金连接，其余十款未重做。已有单项批准不扩为真实商品摄影、实物扫描、贵金属成分或 Meshy 精确复刻；refraction fill 仍是屏幕空间光学近似。

当前目录保留稳定 ID 以兼容旧数据；展示白名单排除用户已移除的棕色绳结／流苏、绿色圆环、粉心、贝壳、蓝眼球与粉骰子。旧原始文件和来源证据保留，禁用显示不等于销毁素材文件。

## 图片与模型来源

| 用途 | 来源与可核对记录 | 权利／批准边界 |
| --- | --- | --- |
| 首页完整手机链 | [V22 生成来源](./content/home-hook-provenance-v22.json)、[批准记录](./evidence/home-hook-approval-v22-20260916.json) | 内置 image_gen 原创替代图；允许作为首页 Hook。用户参考照片只借鉴色彩和层次，不直接抠取部件 |
| 托盘底图和透明五金 HUD | [V30 来源及哈希](./content/gravity-tray-provenance-v30.json)、[运行批准](./evidence/runtime-approval-v30-20260917.json) | PNG／WebP 独立运行层；透明 HUD 不是烘焙棋盘底，底图不包含可玩珠子 |
| 十一件冰蓝模块精灵 | [V34 来源](./content/ice-blue-modules-provenance-v34.json) | 1448×1086、4×3 图册，SHA-256 `9e598f2a662f3c31e4ec7e463c76a7d82e91981c9b6508af1a9e7ae5cd0bf657`；项目已批准 Hook 的生成衍生，不是第三方商品照片 |
| V42 首件“冰晶星愿”3D 精修 | `src/charm-geometry.js` 中本地原创几何与材质代码；[单项批准范围](./evidence/v42-review-response-20260918.json)，运行验证见 [TESTING](./TESTING.md) | 一个完整模块的封闭星体、梨形水滴、吊头及连接环；未下载第三方网格，不把已展示部分的批准扩为另外十款精修或完整交付签收 |
| V44 灰白摄影棚揭晓 | `src/reward-studio.js` 中本地程序纸面、纹理与光源；[V43 批准记录](./evidence/reveal-background-v43/approval.json)绑定[批准稿](./evidence/reveal-background-v43/portrait.png) | 390×844，SHA-256 `ddd99bfd4a36fe1d70e000b999a04646ea5e9368aeae51be240d96630d8d5929`；非新外部素材或生成商品照片，不宣称真实折射／焦散；未实现待澄清的“ins风拆解” |
| 原有六系列配饰 | [V17 图册生成记录](./content/collections-provenance-v17.json) | 原创生成图，逐素材运行审美状态按权利账本，不以布局批准覆盖 |
| 手作配饰 | [V18 来源与 cell 映射](./content/craft-provenance-v18.json) | 原创色键图册；棕色绳结／流苏现已禁用显示，原件不覆盖 |
| 独立银白手机、绳材 | [V19 来源](./content/cords-provenance-v19.json) | 手机原件为洋红色键底，运行去底，不冒称源文件原生透明；绳材是原创程序纹理 |
| 早期工作台、珠盒、五金 | [V11 来源](./evidence/tabletop-assets-v11.json)、[V12 来源](./evidence/asset-provenance-v12.json) | 独立原创生成素材，部分用色键／alpha 提取；残余边缘与视觉质量待审 |
| 保留的 Meshy 星星实验资产 | [Meshy 来源](./content/versions/ice-blue-v33/meshy-star-provenance.json) | Owner 登录工作区文本建模及重拓，仅本地 BUILDING 使用记录；不是当前十一件揭晓模型 |

Meshy GLB 为 27,227,512 字节、18,052 triangles／12,821 vertices，SHA-256 `2a940402d85a1d2cc53aea020f9ec7b3b155c8e81a1b9ac0d538b4bc3c2ff501`。保留来源记录，但该记录没有完整商业再分发条款，不能推断正式发布权利已验清。V33 实验不再是默认入口，不以该模型证明当前所有挂件都由 Meshy 复刻。

[无损交付记录](./content/lossless-delivery-v17.json)保留四份不透明图的 PNG／WebP 像素比对。失败的透明编码候选位于非 public 目录，不作运行交付；PNG 回退和生成原件保留。素材总体积、历史 manifest 数量不等于当前首屏实际下载量。

## 音频许可与加工

四份本地处理音频共 521,649 字节，原始公开 HQ MP3 在非 public 的 `content/audio-sources-v15/`，运行文件在 `public/assets/audio/`。[音频来源记录](./content/audio-provenance-v15.json)包含原页、作者、许可、取得时间、原始／加工哈希、短切与处理流程。

| 作者／原页 | 录音事实 | 用途 |
| --- | --- | --- |
| [Anthousai](https://freesound.org/people/Anthousai/sounds/399006/) | 玻璃珠串拿起／掉入容器 | 取珠、串入短切 |
| [Solar01](https://freesound.org/people/Solar01/sounds/661650/) | 玻璃弹珠在木面滚动 | 退盒和轻接触 |
| [AardsReal](https://freesound.org/people/AardsReal/sounds/842180/) | 玻璃杯轻碰，不是珠子 | 消除／揭晓亮音 |
| [SamuelGremaud](https://freesound.org/people/SamuelGremaud/sounds/544844/) | 风吹枯叶现场声 | 环境底声 |

取得时四原页均显示 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。公开 MP3 不是原始无损 WAV，转换 WAV 不会恢复缺失信息。没有绕过登录、复制商业游戏音乐或采集麦克风。玻璃、珍珠、树脂、金属的听感还包含调速、滤波和原创合成，不冒称分别实录四种材料。账本 `pending-review` 保留最终听感审核，不等于此四项许可未知。

原创背景旋律与揭晓乐谱位于源码，V41 将采样／合成分层并恢复背景增益。录音为验证证据，不额外混入商业音乐，不当作新增运行媒体。

V42 将材质类型、接触材质对、位置及强度传给采样与合成声音。新增的[24 组离线声音测量](./evidence/material-physics-v42-audio/report.json)和[接触强度对比 MP3](./evidence/material-physics-v42-audio/contact-comparison.mp3)由现有运行声音生成，仅保存在 evidence，不是新的外部录音或新增商品音频。报告来自 Chromium OfflineAudioContext，不能证明真实 iPhone 扬声器听感。

V44 未改变声音源码或运行音频；[实际首关音频报告](./evidence/reveal-studio-v44-audio/actual-flow/report.json)来自隔离浏览器的真实游戏过程，已记录碰撞、揭晓主题和券面音，无页面异常。该录音仍是验证证据，不是新增运行资产，也不代替真机扬声器验收。

## 台账与审核边界

[运行 manifest](./content/data-manifest.json)已增量至 contentVersion 3.1.0，共 37 项、56,464,966 字节，包含历史资源及回退副本，不等于首屏下载量。V34 图册经独立核对为 950,266 字节，文件 SHA-256 与既有生成来源一致，已加入 manifest 及[权利总账](./content/rights-ledger.tsv)，来源直接引用现有 provenance，未编造工具执行 ID。该项登记为 original-generated-derivative／pending-review，表示来源已登记、运行审美仍待签收，不冒充 Owner 新批准。

保留的 Meshy 实验资产仍需核实正式分发权利并完善交付登记。本轮未改变原始资源或 service worker；正式交付仍须核对实际交付文件与来源／许可／哈希，不因新增一项登记宣称全部素材已获最终验收。

用户照片及小红书、Instagram、Pinterest、品牌页面只作审美参考；未因公开可见就获得素材复用许可。[研究来源账本](./research/2026-09-15-style-collections/source-ledger.md)不等于商用授权。新增原创素材不得复制品牌标志、角色或独特商品表达。素材名是游戏美术名称，不证明真实材质成分、功效或实物库存。

## 数据与链接

草稿、收藏、券、静音、备注和商家配置仅在本浏览器保存，不自动上传。作品卡由实际组成与 Note 本地生成；只有用户显式保存／分享才交给系统，无水印、品牌或推广，取消分享不谎报成功。外链显式打开且不自动附带私人备注。

主线默认商品链接是已批准的 example.com 模拟占位；旧商家配置为空时不虚构真实商店。可选远程字体失败使用本地字体，核心流程不要求远程模型服务或麦克风。当前素材、音频与移动性能验证见 [TESTING](./TESTING.md)，最终听感和运行审美待钟笑咪确认。
