#!/usr/bin/env node

/**
 * sync-skills.mjs — 将 Claude Code 插件技能同步到个人技能目录，修复斜杠命令不可用问题
 *
 * 问题：在某些 Claude Code 环境中（Windows、Codemoss 修改版、非 Anthropic API），
 *       通过 /plugin install 安装的插件技能在启动时不会被自动发现，
 *       斜杠命令返回 "Unknown command"。
 *
 * 修复：从 ~/.claude/skills/ 创建指向各插件技能缓存目录的符号链接，
 *       使插件技能通过个人技能路径加载（该路径始终可用）。
 *
 * 用法：
 *   node sync-skills.mjs            # 创建缺失的符号链接
 *   node sync-skills.mjs --check    # 试运行：仅报告状态
 *   node sync-skills.mjs --force    # 删除已有符号链接并重新创建
 *   node sync-skills.mjs --clean    # 清除本工具创建的所有符号链接
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// ─── 路径 ───────────────────────────────────────────────────────────────────

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const PLUGINS_JSON = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const IS_WINDOWS = process.platform === 'win32';

// 标记文件：记录本工具创建的符号链接，便于清理
const MARKER_FILE = path.join(SKILLS_DIR, '.synced-by-fix-claude-plugin-commands.json');
// 旧版标记文件名（用于迁移）
const OLD_MARKER_FILE = path.join(SKILLS_DIR, '.synced-by-fix-plugin-skills.json');

// ─── 参数 ───────────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const FORCE = args.has('--force');
const CLEAN = args.has('--clean');

// ─── 工具函数 ───────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function isSymlink(filePath) {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * 创建目录符号链接（同步）。
 * Windows 下依次尝试 junction（无需管理员权限）、dir、file，
 * 最后回退到 bash `ln -s`（适用于 Git Bash / MINGW）。
 */
function createSymlink(source, target) {
  source = path.resolve(source);
  target = path.resolve(target);

  const types = IS_WINDOWS ? ['junction', 'dir', 'file'] : ['dir'];
  let lastError;

  for (const type of types) {
    try {
      fs.symlinkSync(source, target, type);
      return type;
    } catch (e) {
      lastError = e;
    }
  }

  // 最后手段：bash ln -s
  try {
    execSync(`ln -s "${source}" "${target}"`, { stdio: 'pipe' });
    return 'ln -s';
  } catch {
    // 所有方式均失败
  }

  throw lastError || new Error('无法创建符号链接');
}

function removeSymlink(filePath) {
  try {
    fs.rmSync(filePath, { recursive: false, force: true });
    return true;
  } catch {
    return false;
  }
}

// ─── 标记文件（跟踪记录）───────────────────────────────────────────────────

function loadMarker() {
  // 迁移旧版标记文件（fix-plugin-skills → fix-claude-plugin-commands）
  if (fs.existsSync(OLD_MARKER_FILE)) {
    const old = readJSON(OLD_MARKER_FILE) || { synced: {} };
    const current = readJSON(MARKER_FILE) || { synced: {} };
    // 合并：旧数据不覆盖已有键
    for (const [k, v] of Object.entries(old.synced || {})) {
      if (!current.synced[k]) {
        current.synced[k] = v;
      }
    }
    saveMarker(current);
    try {
      fs.rmSync(OLD_MARKER_FILE, { force: true });
    } catch {
      // 忽略删除失败
    }
    return current;
  }
  return readJSON(MARKER_FILE) || { synced: {} };
}

function saveMarker(marker) {
  const dir = path.dirname(MARKER_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  writeJSON(MARKER_FILE, marker);
}

// ─── 插件发现 ───────────────────────────────────────────────────────────────

function findPluginSkills() {
  const installed = readJSON(PLUGINS_JSON);
  if (!installed || !installed.plugins) {
    return [];
  }

  const results = [];

  for (const [pluginKey, entries] of Object.entries(installed.plugins)) {
    for (const entry of entries) {
      const installPath = entry.installPath;
      if (!installPath || !fs.existsSync(installPath)) {
        results.push({ pluginKey, installPath, status: 'path-not-found', skills: [] });
        continue;
      }

      const pluginSkillsDir = path.join(installPath, 'skills');
      if (!fs.existsSync(pluginSkillsDir)) {
        results.push({ pluginKey, installPath, status: 'no-skills-dir', skills: [] });
        continue;
      }

      let skills = [];
      try {
        skills = fs
          .readdirSync(pluginSkillsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .filter((name) => fs.existsSync(path.join(pluginSkillsDir, name, 'SKILL.md')));
      } catch {
        // ignore
      }

      results.push({
        pluginKey,
        installPath,
        version: entry.version,
        status: 'ok',
        skillsDir: pluginSkillsDir,
        skills,
      });
    }
  }

  return results;
}

// ─── 主流程 ─────────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║     fix-claude-plugin-commands · 插件命令修复工具    ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  运行平台:  ${process.platform}`);
  console.log(`  用户目录:  ${HOME}`);
  console.log(`  Claude:   ${CLAUDE_DIR}`);
  console.log(`  技能目录:  ${SKILLS_DIR}`);
  console.log(`  模式:      ${CLEAN ? '清理' : CHECK_ONLY ? '检查（试运行）' : FORCE ? '强制重建' : '同步'}`);
  console.log('');

  if (!fs.existsSync(PLUGINS_JSON)) {
    console.log('  ⚠ 未找到 installed_plugins.json。');
    console.log('    请确认是否已通过 /plugin install 安装过插件？');
    console.log('');
    return;
  }

  const plugins = findPluginSkills();
  const marker = loadMarker();

  // ─── 清理模式 ───
  if (CLEAN) {
    console.log('  🧹 正在清理本工具创建的符号链接...');
    console.log('');
    let removed = 0;
    for (const skillName of Object.keys(marker.synced || {})) {
      const target = path.join(SKILLS_DIR, skillName);
      if (isSymlink(target)) {
        if (removeSymlink(target)) {
          console.log(`  ✅ 已移除: ${skillName}`);
          removed++;
        } else {
          console.log(`  ❌ 移除失败: ${skillName}`);
        }
      } else {
        console.log(`  ⏭ 非符号链接（跳过）: ${skillName}`);
      }
    }
    saveMarker({ synced: {} });
    console.log('');
    console.log(`  汇总: 已移除 ${removed} 个符号链接。`);
    console.log('');
    return;
  }

  // 确保技能目录存在
  if (!fs.existsSync(SKILLS_DIR)) {
    if (CHECK_ONLY) {
      console.log('  ⚠ 技能目录尚不存在。');
      console.log(`    将创建: ${SKILLS_DIR}`);
    } else {
      fs.mkdirSync(SKILLS_DIR, { recursive: true });
      console.log(`  📁 已创建技能目录: ${SKILLS_DIR}`);
    }
    console.log('');
  }

  let linked = 0;
  let skipped = 0;
  let failed = 0;

  for (const plugin of plugins) {
    console.log(`  📦 插件: ${plugin.pluginKey}`);
    if (plugin.version) {
      console.log(`     版本: ${plugin.version}`);
    }

    if (plugin.status === 'path-not-found') {
      console.log(`     ⚠ 安装路径不存在: ${plugin.installPath}`);
      console.log('');
      continue;
    }

    if (plugin.status === 'no-skills-dir') {
      console.log(`     ⏭ 无 skills/ 目录（插件可能仅提供 agents 或 hooks）`);
      console.log('');
      continue;
    }

    if (plugin.skills.length === 0) {
      console.log(`     ⏭ 未找到包含 SKILL.md 的技能`);
      console.log('');
      continue;
    }

    console.log(`     技能目录: ${plugin.skillsDir}`);
    console.log(`     发现 ${plugin.skills.length} 个技能: ${plugin.skills.join(', ')}`);
    console.log('');

    for (const skillName of plugin.skills) {
      const source = path.join(plugin.skillsDir, skillName);
      const target = path.join(SKILLS_DIR, skillName);

      const exists = fs.existsSync(target);
      const isLink = isSymlink(target);

      if (exists && isLink && !FORCE) {
        console.log(`     ✅ 已链接: ${skillName}`);
        skipped++;
        if (!marker.synced[skillName]) {
          marker.synced[skillName] = { source, plugin: plugin.pluginKey, createdAt: new Date().toISOString() };
        }
        continue;
      }

      if (exists && !isLink && !FORCE) {
        console.log(`     ⚠ 已存在（非符号链接，跳过）: ${skillName}`);
        console.log(`       使用 --force 覆盖`);
        skipped++;
        continue;
      }

      if (FORCE && exists) {
        if (isLink) {
          if (!removeSymlink(target)) {
            console.log(`     ❌ 移除已有符号链接失败: ${skillName}`);
            failed++;
            continue;
          }
        } else {
          console.log(`     ⚠ 非符号链接，不会移除: ${skillName}`);
          skipped++;
          continue;
        }
      }

      if (CHECK_ONLY) {
        console.log(`     🔗 将链接: ${skillName}`);
        console.log(`        ${source}`);
        console.log(`        → ${target}`);
        linked++;
        continue;
      }

      try {
        const type = createSymlink(source, target);
        console.log(`     🔗 已链接 (${type}): ${skillName}`);
        console.log(`        ${source}`);
        console.log(`        → ${target}`);
        linked++;
        marker.synced[skillName] = {
          source,
          plugin: plugin.pluginKey,
          version: plugin.version,
          type,
          createdAt: new Date().toISOString(),
        };
      } catch (e) {
        console.log(`     ❌ 失败: ${skillName} — ${e.message}`);
        failed++;
      }
    }

    console.log('');
  }

  if (!CHECK_ONLY && linked > 0) {
    saveMarker(marker);
  }

  // 汇总
  console.log('  ════════════════════════════════════════════════════');
  console.log(`  汇总:`);
  console.log(`    ${CHECK_ONLY ? '将链接' : '已链接'}:  ${linked}`);
  console.log(`    已跳过: ${skipped}`);
  console.log(`    已失败:  ${failed}`);
  console.log('  ════════════════════════════════════════════════════');
  console.log('');

  if (linked > 0 && !CHECK_ONLY) {
    console.log('  ✅ 完成！请重启 Claude Code 使新技能生效。');
    console.log('     然后尝试插件的斜杠命令（如 /understand）。');
  } else if (linked === 0 && skipped > 0 && failed === 0) {
    console.log('  ✅ 所有插件技能已同步，无需变更。');
  } else if (failed > 0) {
    console.log('  ⚠ 部分符号链接创建失败。请尝试以管理员身份运行，');
    console.log('     或在 Windows 中开启「开发者模式」以支持符号链接。');
  }

  console.log('');
}

main();
