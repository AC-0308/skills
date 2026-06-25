# fix-claude-plugin-commands

> 修复 Claude Code 插件斜杠命令无法使用的问题（常见于 Windows / Codemoss / 非 Anthropic API 环境）。

## 问题描述

通过 `/plugin install` 安装 Claude Code 插件后，插件的斜杠命令（如 `/understand`）有时会提示 "Unknown command"。这是因为插件技能自动发现机制在以下环境中不生效：

- **Windows**（MINGW / Git Bash 路径解析问题）
- **Codemoss 修改版 Claude Code**（使用 dashscope/aliyun、GLM 模型等）
- **非 Anthropic API** 配置

## 解决方案

此技能通过创建符号链接，将插件技能同步到个人技能目录（`~/.claude/skills/`）。个人技能加载路径始终可用，因此重启后插件斜杠命令即可正常使用。

## 用法

```bash
# 检查缺失项（试运行）
/fix-claude-plugin-commands --check

# 创建缺失的符号链接
/fix-claude-plugin-commands

# 强制重建所有符号链接（插件更新后）
/fix-claude-plugin-commands --force

# 清除本工具创建的所有符号链接
/fix-claude-plugin-commands --clean
```

也可直接运行脚本：

```bash
node ~/.agents/skills/fix-claude-plugin-commands/sync-skills.mjs
```

## 工作原理

1. 读取 `~/.claude/plugins/installed_plugins.json`，查找所有已安装的插件
2. 定位每个插件在缓存目录中的 `skills/` 子目录
3. 为每个技能（包含 `SKILL.md` 的子目录）在 `~/.claude/skills/` 中创建符号链接
4. 在 `.synced-by-fix-claude-plugin-commands.json` 中记录已创建的符号链接，便于清理

### 符号链接创建策略（Windows）

脚本按顺序尝试以下方式：
1. `fs.symlinkSync(source, target, 'junction')` — Windows junction（无需管理员权限）
2. `fs.symlinkSync(source, target, 'dir')` — 标准目录符号链接
3. `ln -s` — Git Bash / MINGW 回退方案

## 部署到其他电脑

1. 将 `fix-claude-plugin-commands/` 目录复制到 `~/.agents/skills/fix-claude-plugin-commands/`
2. 创建符号链接：`ln -s ~/.agents/skills/fix-claude-plugin-commands ~/.claude/skills/fix-claude-plugin-commands`
3. 在 Claude Code 中运行 `/fix-claude-plugin-commands`

## 环境要求

- Node.js（随 Claude Code 安装）
- Claude Code 且支持插件系统（`/plugin install`）
