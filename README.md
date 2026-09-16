# ReSwap 二手闲置物品交换平台

```bash
pnpm install
pnpm dev
```

访问地址：`http://localhost:18415`

## 项目介绍

ReSwap 是一个纯前端以物换物 Web 应用。用户可以本地模拟登录、发布闲置物品、浏览他人物品、发起交换请求，并在浏览器内管理交换记录。

## 主要功能

- 首页瀑布流浏览、分类筛选、关键词搜索。
- 物品详情、物主资料、选择自己的物品发起交换。
- 发布物品，支持本地 base64 图片上传、分类和成色选择。
- 交换管理，区分我发起的和我收到的请求，支持同意、拒绝、完成。
- **交换信用评价**：交换完成后参与双方各有一次评价机会，1-5 星评分生效时对方信用分按其“全部已生效评分”的平均分重算；评价记录与信用分更新在同一事务内提交，任一步失败则两者都不留下。
- 刷新后评价记录、平均星级与信用分从 localStorage / IndexedDB 回读。
- 个人中心，编辑资料、上传头像、查看我发布的物品、收到评价数与平均星级。
- 主题切换、全局错误处理和 Vant 提示。

## 启动与构建

```bash
pnpm install
pnpm dev
```

```bash
pnpm build
```

生产部署：执行 `pnpm build` 后，将 `dist/` 目录交给 Nginx 或任意静态文件服务器托管。

### 全新环境安装（构建脚本白名单）

pnpm 10 及以上默认禁止依赖执行安装脚本，未配置时 `pnpm install` 会在构建脚本放行检查处中止（`ERR_PNPM_IGNORED_BUILDS`）。本项目根目录的 `pnpm-workspace.yaml` 用 `allowBuilds` 显式声明白名单：

- `esbuild: true`：其 postinstall 负责就位平台专属二进制，是 Vite 构建的硬依赖，必须放行；
- `vue-demi: false`：其 postinstall 仅按 Vue 版本切换构建，发布包顶层默认即 Vue 3 构建，本项目使用 Vue 3，不需要执行，继续禁用。

因此无缓存环境直接执行下面的命令即可退出码 0 完成安装并进入可构建状态，重复安装结果一致：

```bash
pnpm install --frozen-lockfile
pnpm build
```

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| UI | Vant + Tailwind CSS |
| 持久化 | localStorage + IndexedDB（idb-keyval） |
| 工具库 | dayjs、lodash-es |

## 项目目录结构

```text
src/
├── api/              # userApi.ts, itemApi.ts, exchangeApi.ts, reviewApi.ts：本地数据 API 层
├── stores/           # authStore.ts, itemStore.ts, exchangeStore.ts, reviewStore.ts, themeStore.ts
├── models/           # user.ts, item.ts, exchange.ts, review.ts：独立数据模型
├── types/            # 共享类型补充
├── components/common/# 共享业务组件（含 StarRating、ExchangeReviewPanel）和 GlobalErrorBoundary
├── hooks/            # useAuth.ts, useLocalStorage.ts, useExchangeStats.ts, useExchangeReview.ts
├── pages/            # Home, ItemDetail, Publish, Exchanges, Profile
├── router/           # index.ts + guards.ts（guards 水合 reviewStore，刷新即可回读评价）
├── utils/            # storage.ts（含 runInTransaction 原子事务）, reviewSeed.ts（演示评价初始化规划）, formatters.ts, validators.ts, credit.ts, message.ts, themeUtils.ts
├── constants/        # item.ts, exchange.ts, review.ts, themes.ts, messages.ts
├── App.vue
├── main.ts
└── styles.css
```

## 信用评价模块说明

- 入口：交换管理页中**状态为“已完成”**的交换卡片底部展示 `<ExchangeReviewPanel>`（仅参与者可见/可用，越权由 API 层复核拦截）。
- 评分：`<StarRating>`（Vant `Rate`）选择 1-5 整星，可附选填文字；每个交换参与方**只能生效一条评价**。
- 信用分规则：`utils/credit.ts` 的 `recalcCreditScore` 按被评价人**全部已生效评分**的平均分换算，1-5 星线性映射到 20-100 分（`平均分 × 20`，四舍五入），每次新评价生效都重新汇总重算。
- 原子性：`reviewApi.submit` 在 `storage.runInTransaction` 内完成“校验 → 追加评价 → 重算信用分”，reviews 与 users 两个 key 同一批次提交；存储层先快照、失败整体回滚，保证评价记录与分值更新**同时成立或都不留下**。
- 并发与重复：事务队列把双方同时评价、重复点击串行化，`(exchange_id, reviewer_id)` 唯一约束在事务内复查，重复提交/并发提交只有一次生效，双方互不影响、各评一次。
- 回读：评价与信用分通过 `storage.ts` 双写 localStorage + IndexedDB，`router/guards.ts` 与 `App.vue` 启动时水合 `reviewStore` / `authStore`，刷新页面后评价列表、星级和信用分依旧可见。

### 演示评价初始化（防数据污染）

`reviewApi.list()` 每次读取都会**幂等补齐**演示评价，但严格遵守“不污染已有数据”：

- 先用各实体 API 既有规则引导 users/items/exchanges（已有数据原样返回），再由纯函数 `utils/reviewSeed.ts` 的 `planReviewSeeds` 逐条校验候选。
- 只有当演示评价对应的**已完成交换、双方参与者账户、双方物品归属关系都齐全**时才补齐；任一关系缺失则跳过该候选，**其他候选照常处理**（只剩部分演示交换时只补仍匹配的部分）。
- 自然键 `(exchange_id, reviewer_id)` 已存在评价的候选跳过；演示评价使用稳定 id，因此**重试不会重复补评价、不会重复改分**。
- 本次待补评价与受影响被评价人的信用分在 `runInTransaction` 同一批次写入，**任一步失败则评价与信用分都不变**；不在更新名单内的用户（含未参与者）信用分与账户资料保持不变。
- 回滚按 localStorage 与 IndexedDB **两层各自独立**处理：事务首次触碰一个 key 时同时记录该键在两层的事务前原貌，失败后每层只恢复自己的原貌（有则还原、无则删除），不会拿一层的值去顶替另一层。因此当旧账户只存在一层快照时，信用分写入失败也不会清掉另一层原本可见的账户、交换、物品与评价；失败后重试仍可幂等补齐匹配评价。
- 信用分按“已有评价 + 本次补齐评价”的全部已生效评分平均分重算，保证评价数、平均分、信用分三者一致。

## 数据持久化说明

- `utils/storage.ts` 统一封装 localStorage 和 IndexedDB。
- 所有 `api/*Api.ts` 通过 `storage.ts` 读写数据，不在组件里直接写业务数据。
- 存储层包含序列化、版本号、过期清理、存储 key 管理。
- `runInTransaction` 提供跨 key 的互斥事务（快照 + 失败回滚），供信用评价的评价记录（`reswap:reviews`）与信用分（`reswap:users`）原子提交使用。
- 首次启动会写入演示用户、物品、交换请求（含两笔已完成交换）与评价记录。

## 横切关注点

- 主题切换：`stores/themeStore.ts`、`constants/themes.ts`、`utils/themeUtils.ts`、`App.vue`、`components/common/CategoryFilter.vue`、`components/common/UserBrief.vue`、`components/common/ItemCard.vue`。
- 全局错误处理/提示：`utils/message.ts`、`components/common/GlobalErrorBoundary.tsx`、`stores/authStore.ts`、`stores/itemStore.ts`、`stores/exchangeStore.ts`、`components/common/ImageUploader.vue`。

## 枚举出现位置清单

### ItemStatus

定义位置：`src/constants/item.ts`

出现位置：

- `src/models/item.ts`
- `src/constants/messages.ts`
- `src/api/itemApi.ts`
- `src/api/exchangeApi.ts`
- `src/stores/itemStore.ts`
- `src/router/guards.ts`
- `src/utils/formatters.ts`
- `src/components/common/ItemCard.vue`
- `src/pages/ItemDetail.vue`
- `src/pages/Publish.vue`
- `src/pages/Profile.vue`

### ExchangeStatus

定义位置：`src/constants/exchange.ts`

出现位置：

- `src/models/exchange.ts`
- `src/constants/messages.ts`
- `src/api/exchangeApi.ts`
- `src/stores/exchangeStore.ts`
- `src/router/guards.ts`
- `src/utils/formatters.ts`
- `src/hooks/useExchangeStats.ts`
- `src/components/common/ExchangeCard.vue`
- `src/pages/ItemDetail.vue`
- `src/pages/Exchanges.vue`

## 分层与高耦合约束

本项目保留提示词要求的“严禁合并职责到单一文件”：模型、常量、API、store、页面、组件、hooks、utils 均独立拆分。

同时保留“屎山代码设计要求”的低内聚高耦合特征：

- `utils/formatters.ts` 同时负责日期、物品状态、交换状态、成色、信用等级文本。
- `constants/messages.ts` 同时包含页面提示、表单校验、日志式文案和状态文案。
- `ItemStatus` 与 `ExchangeStatus` 被模型、API、store、组件、页面、router guards、formatters 多处引用。
- `utils/storage.ts` 是存储入口，但全应用 API 和 store 都依赖它的 key 与数据结构。

例如新增 `ItemStatus.BOOKED` 时，应至少修改：`src/constants/item.ts`、`src/models/item.ts`、`src/api/itemApi.ts`、`src/api/exchangeApi.ts`、`src/stores/itemStore.ts`、`src/router/guards.ts`、`src/utils/formatters.ts`、`src/constants/messages.ts`、`src/components/common/ItemCard.vue`、`src/pages/ItemDetail.vue`、`src/pages/Publish.vue` 等文件。

## 环境变量

当前项目无必需环境变量。

## License

MIT
