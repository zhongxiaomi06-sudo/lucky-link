# 来源与主张账本

访问日统一为 **2026-09-15**；商品原页无明确发布日期／版本，记为动态页面快照。搜索抓取时间不冒充商品发布时间。所有材料成分均是“品牌页面如此描述”，不是独立实物鉴定。未采集价格、销量、点赞或用户身份数据。

## 核心来源

| ID／类型 | 精确主张／所读字段（转述） | 标题、发布者与URL | 证据范围／把握 | 矛盾、风险与后续 |
| --- | --- | --- | --- | --- |
| C01 Fact | 官方产品描述红色心形、虹彩水晶和小珠共同串制 | String Ting London，[Sweet Intentions Wristlet Phone Chain](https://stringting.com/en-us/collections/hearts/products/sweet-intentions-wristlet-phone-chain) | 已读取Product Details；高：描述存在，非目视／实物 | 不复制商标珠与整串配方；只提取尺寸／材质对照 |
| C02 Fact | 官方Alchemist手机链描述粉晶、玉髓、石榴石、黄水晶、绿东陵、孔雀石、松石、青金石、紫水晶及其他配珠 | String Ting London，[The Alchemist Wristlet Phone Chain](https://stringting.com/en-us/collections/bestsellers/products/the-alchemist-wristlet-phone-chain) | 第一方搜索索引给出Product Details；中：直开失败 | 某结果SEO标题错误显示Sushi on Ice，正文／URL为Alchemist；仅用一致的材料字段。不采用能量、承重或价格主张 |
| C03 Fact | 商品图注说明珍珠组成的蝴蝶结，连接粉色手机壳；页面标注Instagram账号coconutlaneuk | Coconut Lane，[Beaded Phone Strap — Pearl Bow](https://us.coconut-lane.com/products/copy-of-beaded-phone-strap-pearl-bow) | 已读取页面与图注；高：文本字段，非图片目视 | 不能改述为缎带蝴蝶结；官网账号指引不等于看过Instagram feed |
| C04 Fact | 系列列表含Jelly Heart／Flower、Frosted／Metallic Bows、Pearly Heart／Midnight Pearl、Cherry Blossom等标签 | CASETiFY，[Straps & Charms Series](https://www.casetify.cn/series/straps-and-charms-series) | 第一方索引的产品列表；中：名称分类 | “Metallic／Frosted”不证明金属合金或磨砂工艺；排除同页联名角色；不声称陶瓷 |
| C05 Fact | 商品描述深色水晶珠、金属线，提供黑／银／金选择 | GALADO，[Midnight Halo Phone Charm](https://galado.com.my/product/midnight-halo-phone-charm/) | 页面／第一方索引的描述字段；中高 | 实物兼容性、可靠性与承重未测，不能迁移为游戏电商承诺 |
| C06 Fact | 列出海星、宝螺、扇贝、海龟、异形珍珠等首饰配件；用途为项链或自有首饰 | SEA AND GLASS，[Ocean Charms](https://seaandglass.com/shop/ocean-charms) | 已读产品正文；高：品类／用途 | 替代参考而非手机链；品牌金属成分不表示未来游戏商品成分 |
| C07 Fact | 产品页明确标示其设计权利声明；官网页脚链接到string_ting账号 | String Ting London，[产品声明](https://stringting.com/en-us/collections/hearts/products/sweet-intentions-wristlet-phone-chain)、[官网](https://stringting.com/en-us/) | 已读页尾／链接；高：声明与链接存在 | 不解释为本项目可复制许可；图片只参考、原创另制 |
| I01 Inference | 上述材料与珠型可形成六个可混搭系列，而非同形换色 | 综合C01–C06，具体设计见[矩阵](./competitor-analysis.md) | 中：设计推导，不是来源原话 | 尚需原创图和Owner视觉确认 |
| H01 Hypothesis | 放大珠体并增加轮廓／表面差异，能缓解当前“像贴图、不沉浸”的感受 | Owner截图反馈＋I01；无外部行为实验 | 未验证 | 不宣称提高留存或转化；同尺寸视觉／操作检查后判断 |
| D01 Decision | 钟笑咪对V16近景稿回复“可以” | [本地批准快照](../../evidence/visual-approval-v16-20260915.json) | 高：本会话原话绑定原PNG哈希 | 不扩大为六系列素材、最终运行或发布批准 |

## Instagram与像素证据缺口

| ID | 原始入口／尝试 | 实际结果 | 不能得出的结论 |
| --- | --- | --- | --- |
| G01 Gap | [用户原Reel](https://www.instagram.com/reel/DKo1PKJI1Ib/) | fetch cache miss | 不能描述镜头、珠序、声音或互动规则 |
| G02 Gap | [String Ting官方Instagram](https://www.instagram.com/string_ting/)；由官网页脚确认 | Web读取失败；浏览器创建页超时并重置 | 不能说浏览了账号帖子／评论，未看见登录墙也不虚构登录墙 |
| G03 Gap | Instagram域限定关键词搜索与图片搜索 | 未获得可核对帖子内容；图片搜索429限流 | 不是全量检索，没有任何可验证Ins热度排名 |
| G04 Gap | Coconut Lane官网图片锚点返回[商品JPG地址](https://us.coconut-lane.com/cdn/shop/files/DSC_3072.jpg?v=1710543387&width=1080) | 返回地址但本轮没有图片像素；浏览器开页超时 | 不称已目视商品图；没有为绕过展示限制下载媒体 |
| G05 Gap | String Ting／SEA AND GLASS图片锚点、Hamee官方目录PDF | 图片抓取失败或仅URL；[Hamee PDF](https://hameeglobal.com/wp-content/uploads/catalog-pdf/iface_accessory_phone_charm_eng.pdf)超过大小限制 | 全部排除出目视／镜头证据，不据此做照片比较 |

## 反证与筛除

- 权利：C07直接否定“公开网页即可以复刻品牌图”的假设。所有商业运行图片须重新原创或取得明确许可。
- 范围：C06实际是首饰配件；不混称手机链标杆。String Ting的Glass Candy检索为钥匙链，Alchemist Bag Chain为包链，本矩阵不计作新增直接候选。
- 不足：[GALADO评论页](https://galado.com.my/review/?wcpr_image=1)索引出现2026-07-08关于潮湿下裸露金属氧化的个案。只说明不能无条件沿用耐用营销语；单条经历不证明整体质量，未纳入优劣评分。
- 弱证据：ORIENTSENSES黑曜石银链和Etsy瓷花条目只得到索引或无法完整核实，本轮不作为主结论来源；“瓷花”不提升为确认材料。
- 价格／评价数在地区页和抓取快照间不同，全部排除；不以搜索顺序、销量标签、名人或五星评价说明“网感”。

## 权利与维护

本轮代码／字体／模型／音频／运行图片／Hosted API均无新增；商业许可决策为“参考链接，不导入”。外部页面、图注和图片权利归原权利方，来源是动态页面，生成来源未知；不是开放许可资产库。仅保存短转述和链接，没有建立品牌图库。

后续由实现者在资产制作前重新核验来源；具体新增素材需记录原始工具、提示词、用途、版本、SHA-256、Owner批准。发现来源不匹配即更正本账本并移除其设计证据地位；不静默更名或捏造新URL。不设置自动监控，不将本地作品、Note或浏览器存档发送给这些站点。
