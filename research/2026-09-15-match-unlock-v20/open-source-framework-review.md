# V20 技术与框架边界

本轮不需要搜索或引入开源游戏框架。现有原生DOM、Canvas 2D、Web Audio、收藏状态机足以实现12格对对消、短粒子、计时和独立奖励页；新增依赖会增加包体、许可与触控回归风险。

决定（待Owner确认后执行）：
- 继续原生Canvas／DOM；不引入Phaser、Three.js或物理引擎。
- 玩法状态保持纯函数：ready → playing → resolving → won/lost → reveal。
- 视觉层只消费事件：select、miss、match、combo、win；不得决定奖励。
- 声音沿用本地合法资源／原创合成，不能拷贝“解手镯”音频。
- 首页第三方图只做研究参考；生产图必须原创生成或另有书面商用授权。
- 低性能模式减少粒子数量；reduced-motion改为淡入与高亮，不位移碰撞。

