---
name: fix-claude-plugin-commands
description: 修复 Claude Code 插件斜杠命令无法使用的问题（安装后提示 "Unknown command"）。常见于 Windows、Codemoss 修改版、非 Anthropic API 环境。当用户提到"插件不生效"、"斜杠命令找不到"、"plugin installed but command not working"、"技能没加载"、"slash command not found"等情况时，务必使用此技能。它通过符号链接将插件技能同步到个人技能目录，使 /understand 等命令重新可用。
argument-hint: ["[--check] [--force] [--clean]"]
---

# /fix-claude-plugin-commands

当通过 `/plugin install` 安装了 Claude Code 插件后，斜杠命令却提示 "Unknown command" 时，此技能通过符号链接将插件技能同步到个人技能目录（`~/.claude/skills/`）来修复该问题。

## 适用场景

- `/plugin install <插件名>` 安装成功，但 `/<技能名>` 返回 "Unknown command"
- 常见于 Windows、Codemoss 修改版 Claude Code、或非 Anthropic API 环境，这些环境下插件技能自动发现机制不生效

## 工作原理

1. 读取 `~/.claude/plugins/installed_plugins.json`，查找所有已安装的插件
2. 定位每个插件在缓存目录中的 `skills/` 子目录
3. 为每个技能（包含 `SKILL.md` 的子目录）在 `~/.claude/skills/` 中创建符号链接
4. 在 `.synced-by-fix-claude-plugin-commands.json` 中记录已创建的符号链接，便于清理
5. 报告已链接、已跳过、已失败的结果

## 运行方式

执行同步脚本：

```bash
node "$HOME/.agents/skills/fix-claude-plugin-commands/sync-skills.mjs"
```

### 参数选项

- `$ARGUMENTS` 可包含：
  - `--check` — 仅报告状态，不创建任何符号链接（试运行）
  - `--force` — 删除已有符号链接并重新创建（插件更新后使用）
  - `--clean` — 清除本工具创建的所有符号链接，恢复原始状态

### 示例

```bash
# 试运行：仅检查哪些缺失
/fix-claude-plugin-commands --check

# 修复：创建缺失的符号链接
/fix-claude-plugin-commands

# 强制重建：重新创建所有符号链接（插件更新后）
/fix-claude-plugin-commands --force

# 清理：移除本工具创建的所有符号链接
/fix-claude-plugin-commands --clean
```

## 运行后

重启 Claude Code（或开启新会话）使新技能生效。然后验证：

```bash
ls -la "$HOME/.claude/skills/" | grep <插件名>
```
