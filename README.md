# Lucky Link · Ice Blue Lucky Drop

手机链主题的消除抽奖小游戏：在写实托盘里点击投放配饰，同款三碰消除得分，通关后揭晓一件冰蓝挂件，并从盲盒中抽一张模拟优惠券。

## 玩法

- 每局 60 件初始配饰、5 个匹配身份、60 秒；同款三件相碰即消除，每件 100 分。
- 十一件冰蓝挂件按顺序解锁，通关目标从 1500 分逐关增加 100 分至 2500 分。
- 每次通关同时获得一件挂件和一张优惠券盲盒（¥5／¥10／¥15）；集齐后可继续挑战抽券。
- 已解锁的挂件和优惠券保存在本浏览器 `localStorage`。
- 商品链接为模拟占位，不具备真实兑换、购买或履约能力。

## 本地运行

```sh
npm install
npm run dev    # http://localhost:5114
npm run build  # 输出到 dist/
```

技术栈：Vite + 原生 ES Modules + Canvas 2D（托盘与消除）+ Three.js（通关挂件的 3D 揭晓，失败时自动回退为 2D 图片）。

## 目录

- `index.html` — 唯一入口，直接加载 `src/tabletop.js`。
- `src/tabletop*.js` — 托盘工作台（DIY 手机链、收藏与入口）。
- `src/collection-ui.js` + `src/gravity-game.js` — 三连消除重力气泡局。
- `src/ice-blue-mainline.js` — 挂件解锁顺序与优惠券抽奖规则。
- `src/reward-*.js` + `src/charm-geometry.js` — 通关奖励的 3D 揭晓。
- `public/assets/` — 界面与挂件图集、音频。
