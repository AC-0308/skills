# 验收纪律（VERIFY）

子代理的产出是**线索不是事实**。主会话引用前必须独立复核。本文件定义复核方法与证据分级。

## 复核方法（按证据强度排序）

### 1. 本地实测（最强）

在 /tmp 解包两个版本直接验证声明。适合包结构、类型导出、兼容层存续类声明。

```bash
# 典型套路：npm pack 两个版本，解包后直接 diff/grep
cd /tmp && mkdir -p check && cd check
npm pack <pkg>@<旧版> && npm pack <pkg>@<新版>
mkdir vold vnew && tar xzf <pkg>-<旧版>.tgz -C vold --strip-components=1 && tar xzf <pkg>-<新版>.tgz -C vnew --strip-components=1
diff <(tr -d '\r' < vold/lib/xxx.js) <(tr -d '\r' < vnew/lib/xxx.js)   # 兼容层逐字节比对
grep -c "someApi" vnew/types/*.d.ts                                     # 移除声明验证（0 次 = 真移除）
```

### 2. API 直查（次强）

不经子代理，主会话直接 curl / gh api 一手数据：

```bash
curl -sL https://api.github.com/repos/<org>/<repo>/releases/tags/<tag>    # release notes 原文
gh api repos/<org>/<repo>/issues/<n> --jq '{title,state,milestone}'       # issue/PR 现状
curl -s https://registry.npmmirror.com/<pkg>/latest | python3 -c "..."     # peerDeps
```

注意 GitHub 匿名 API 限流 60/h——**先查 `api.github.com/rate_limit`，没额度就用已认证的 `gh api`**（子代理可能已经耗光匿名额度）。

### 3. 交叉比对（下限）

两个独立信源一致（如官方指南 × changelog 原文）。仅用于无法本地实测的行为类声明。

## 抽查规则

- 每份报告抽 **1~3 个"最影响结论"的硬事实**复核：如果这个事实是假的，产出文档的核心章节就要重写——优先抽这种
- 典型高危声明（编造高发区）：
  - "X 已被移除/修复"——移除和修复都最容易查证也最容易编
  - 具体 issue/PR 编号与状态——**编号存在 ≠ 报告说的状态对**，必须查
  - "官方推荐 X 写法"——去官方原文确认这句推荐真的存在
  - 具体版本号/发布时间——幻觉版本号（不存在的 x.y.z）是 AI 文章的典型特征
- 复核通过 → 报告整体可信度上调，其余内容可引用
- 复核失败（编号不存在/状态不对/原文没有该声明）→ 整份降级为"不可信"，该面重新调研；宁可重做也不要"部分采信"

## 子代理卡死的处理

1. 先读它的 session 日志（`.pi/agent/sessions/<cwd 目录>/<时间戳>_<id>.jsonl`），捞出已抓到的原始数据——通常卡死发生在最后一步，前面的抓取成果是完好的
2. 用带 `timeout` 的命令把它没跑完的实测补完（裸 bash 无超时是子代理卡死的最常见根因）
3. 接管产出文件的撰写，抢救出的数据标注"来自中断子代理的 session + 主会话补测"

## 证据分级标记（写进产出文档用）

| 标记 | 含义 |
|---|---|
| ✅ | 主会话独立验证（实测/API 直查） |
| 📄 | 官方一手信源原文（未再验证但有两处一致） |
| ⚠️ 未确认 | 单一信源或无法复核，已如实标注 |
