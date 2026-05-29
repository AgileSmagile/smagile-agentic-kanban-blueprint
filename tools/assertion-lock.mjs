#!/usr/bin/env node

/**
 * assertion-lock — Mechanical enforcement against silent test weakening.
 *
 * Extracts assertion signatures from test files, hashes them into a lockfile,
 * and verifies on commit that no assertions have been weakened or removed
 * without explicit acknowledgement.
 *
 * Commands:
 *   generate [--test-pattern <glob>]   Build/rebuild .assertion-lock.json
 *   verify                             Check staged files against lockfile (pre-commit)
 *   update [file...]                   Acknowledge changes, regenerate hashes for specific files
 *   diff                               Show what changed between lockfile and current state
 *
 * Created by Test Specialist, 2026-05-29.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, relative, sep } from 'node:path'
import { glob } from 'node:fs/promises'

// ─── Configuration ───────────────────────────────────────────────────────────

const LOCKFILE = '.assertion-lock.json'
const DEFAULT_TEST_PATTERN = 'src/**/*.test.ts'

// Files matching these patterns get stricter treatment (removal/change = block)
const SECURITY_PATTERNS = [
  /[\\/]auth[\\/]/,
  /[\\/]security[\\/]/,
  /regression/i,
  /sentinel/i,
  /pentest/i,
  /ntest/i,
  /rls/i,
  /csrf/i,
  /cross-site/i,
]

// ─── Assertion extraction ────────────────────────────────────────────────────

/**
 * Matches vitest/jest expect() assertions including chained .not and .resolves/.rejects.
 *
 * Captures the full assertion line to generate a stable signature.
 * We intentionally capture the whole expect(...).toXxx(...) expression,
 * not just the matcher, because the _subject_ of the assertion matters
 * (e.g. expect(res.status).toBe(403) vs expect(res.status).toBe(200)).
 */
const EXPECT_PATTERN = /expect\s*\([\s\S]*?\)\s*\.(?:not\s*\.\s*)?(?:resolves\s*\.\s*)?(?:rejects\s*\.\s*)?to[A-Z]\w*\s*\([^)]*\)/g

/**
 * Matches expect(...).toThrow() and other no-arg matchers.
 */
const EXPECT_NOARG_PATTERN = /expect\s*\([^)]*\)\s*\.(?:not\s*\.\s*)?(?:resolves\s*\.\s*)?(?:rejects\s*\.\s*)?(?:toBeDefined|toBeUndefined|toBeNull|toBeTruthy|toBeFalsy|toThrow|toHaveBeenCalled)\s*\(\s*\)/g

/**
 * Extract the enclosing test name for an assertion at a given position.
 */
function findTestName(source, assertionIndex) {
  const before = source.slice(0, assertionIndex)
  // Find all it()/test() declarations before this assertion, take the last one
  const allTests = [...before.matchAll(/(?:it|test)\s*\(\s*(['"`])((?:(?!\1).)*)\1/g)]
  if (allTests.length > 0) return allTests[allTests.length - 1][2]

  // Fallback: template literal test names
  const tmplTests = [...before.matchAll(/(?:it|test)\s*\(\s*`([^`]*)`/g)]
  if (tmplTests.length > 0) return tmplTests[tmplTests.length - 1][1].trim()

  return '<anonymous>'
}

/**
 * Extract the enclosing describe block name.
 */
function findDescribeName(source, assertionIndex) {
  const before = source.slice(0, assertionIndex)
  const matches = [...before.matchAll(/describe\s*\(\s*(['"`])(.+?)\1/g)]
  if (matches.length > 0) return matches[matches.length - 1][2]
  return null
}

/**
 * Normalise whitespace in an assertion signature for stable hashing.
 */
function normalise(assertion) {
  return assertion.replace(/\s+/g, ' ').trim()
}

/**
 * Extract all assertions from a test file.
 *
 * Returns an array of { test, describe, signature, line, hash }.
 */
function extractAssertions(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const lines = source.split('\n')
  const assertions = []

  // Collect all matches from both patterns
  const allMatches = []

  for (const match of source.matchAll(EXPECT_PATTERN)) {
    allMatches.push({ text: match[0], index: match.index })
  }
  for (const match of source.matchAll(EXPECT_NOARG_PATTERN)) {
    // Avoid duplicates (the main pattern may also catch some no-arg matchers)
    const isDuplicate = allMatches.some(
      m => m.index === match.index && m.text === match[0]
    )
    if (!isDuplicate) {
      allMatches.push({ text: match[0], index: match.index })
    }
  }

  // Sort by position in file
  allMatches.sort((a, b) => a.index - b.index)

  for (const match of allMatches) {
    const lineNumber = source.slice(0, match.index).split('\n').length
    const signature = normalise(match.text)
    const testName = findTestName(source, match.index)
    const describeName = findDescribeName(source, match.index)

    assertions.push({
      test: testName,
      describe: describeName,
      signature,
      line: lineNumber,
      hash: hash(signature),
    })
  }

  return assertions
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

function hash(str) {
  return createHash('sha256').update(str).digest('hex').slice(0, 12)
}

function hashFileAssertions(assertions) {
  const combined = assertions.map(a => a.hash).join(':')
  return hash(combined)
}

// ─── Security classification ─────────────────────────────────────────────────

function isSecurityFile(filePath) {
  return SECURITY_PATTERNS.some(p => p.test(filePath))
}

// ─── Lockfile operations ─────────────────────────────────────────────────────

function readLockfile(root) {
  const lockPath = resolve(root, LOCKFILE)
  if (!existsSync(lockPath)) return null
  return JSON.parse(readFileSync(lockPath, 'utf8'))
}

function writeLockfile(root, data) {
  const lockPath = resolve(root, LOCKFILE)
  // Sort keys for stable diffs
  const sorted = Object.keys(data.files)
    .sort()
    .reduce((acc, key) => {
      acc[key] = data.files[key]
      return acc
    }, {})

  const output = {
    version: 1,
    generated: new Date().toISOString(),
    totalAssertions: Object.values(sorted).reduce((sum, f) => sum + f.count, 0),
    totalFiles: Object.keys(sorted).length,
    files: sorted,
  }

  writeFileSync(lockPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
  return output
}

// ─── File discovery ──────────────────────────────────────────────────────────

async function findTestFiles(root, pattern) {
  const results = []
  for await (const entry of glob(pattern, { cwd: root })) {
    results.push(resolve(root, entry))
  }
  return results.sort()
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function generate(root, pattern) {
  const files = await findTestFiles(root, pattern)
  const lockData = { files: {} }
  let totalAssertions = 0
  let securityFiles = 0

  for (const file of files) {
    const relPath = relative(root, file).split(sep).join('/')
    const assertions = extractAssertions(file)

    if (assertions.length === 0) continue

    const isSecurity = isSecurityFile(relPath)
    if (isSecurity) securityFiles++

    lockData.files[relPath] = {
      hash: hashFileAssertions(assertions),
      count: assertions.length,
      security: isSecurity,
      assertions: assertions.map(a => ({
        test: a.test,
        describe: a.describe,
        signature: a.signature,
        line: a.line,
        hash: a.hash,
      })),
    }

    totalAssertions += assertions.length
  }

  const output = writeLockfile(root, lockData)

  console.log(`\n  assertion-lock: generated ${LOCKFILE}`)
  console.log(`  ${output.totalFiles} test files, ${output.totalAssertions} assertions tracked`)
  console.log(`  ${securityFiles} security-critical files (changes will block commits)\n`)

  return output
}

async function verify(root) {
  const lock = readLockfile(root)
  if (!lock) {
    console.error(`\n  assertion-lock: no ${LOCKFILE} found. Run 'assertion-lock generate' first.\n`)
    process.exit(1)
  }

  // Get staged files
  let stagedFiles
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: root,
      encoding: 'utf8',
    })
    stagedFiles = output
      .trim()
      .split('\n')
      .filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx') || f.endsWith('.test.js'))
  } catch {
    // Not in a git repo or no staged files
    stagedFiles = []
  }

  if (stagedFiles.length === 0) {
    console.log('  assertion-lock: no staged test files to verify.')
    return
  }

  // Also check for deleted test files
  let deletedFiles
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=D', {
      cwd: root,
      encoding: 'utf8',
    })
    deletedFiles = output
      .trim()
      .split('\n')
      .filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx') || f.endsWith('.test.js'))
      .filter(f => f.length > 0)
  } catch {
    deletedFiles = []
  }

  const violations = []
  const warnings = []

  // Check deleted files
  for (const file of deletedFiles) {
    const entry = lock.files[file]
    if (!entry) continue

    if (entry.security) {
      violations.push({
        file,
        type: 'DELETED_SECURITY_FILE',
        message: `Security test file deleted (had ${entry.count} assertions)`,
      })
    } else {
      warnings.push({
        file,
        type: 'DELETED_FILE',
        message: `Test file deleted (had ${entry.count} assertions)`,
      })
    }
  }

  // Check modified files
  for (const file of stagedFiles) {
    const filePath = resolve(root, file)
    const entry = lock.files[file]

    if (!entry) {
      // New test file, not in lockfile — that's fine, just a warning to regenerate
      warnings.push({
        file,
        type: 'NEW_FILE',
        message: 'New test file not in lockfile. Run assertion-lock update after commit.',
      })
      continue
    }

    // Re-extract assertions from the staged version
    let currentAssertions
    try {
      // Read the staged version, not the working copy
      const stagedContent = execSync(`git show ":${file}"`, {
        cwd: root,
        encoding: 'utf8',
      })
      // Write to a temp analysis — we need to parse the staged content
      // Use the extraction logic on the string directly
      currentAssertions = extractAssertionsFromString(stagedContent, file)
    } catch {
      // If we can't read staged version, read the file directly
      currentAssertions = extractAssertions(filePath)
    }

    const currentHash = hashFileAssertions(currentAssertions)

    if (currentHash === entry.hash) continue // No changes to assertions

    // Assertions changed — analyse what changed
    const oldSigs = new Map(entry.assertions.map(a => [a.hash, a]))
    const newSigs = new Map(currentAssertions.map(a => [a.hash, a]))

    const removed = [...oldSigs.keys()].filter(h => !newSigs.has(h))
    const added = [...newSigs.keys()].filter(h => !oldSigs.has(h))

    // Count decrease is always suspicious
    if (currentAssertions.length < entry.count) {
      const msg = `Assertion count decreased: ${entry.count} → ${currentAssertions.length} (${entry.count - currentAssertions.length} removed)`
      if (entry.security) {
        violations.push({ file, type: 'COUNT_DECREASE_SECURITY', message: msg })
      } else {
        violations.push({ file, type: 'COUNT_DECREASE', message: msg })
      }
    }

    // Report specific changes
    for (const h of removed) {
      const old = oldSigs.get(h)
      const msg = `Assertion removed: ${old.signature} (line ${old.line}, test: "${old.test}")`
      if (entry.security) {
        violations.push({ file, type: 'REMOVED_SECURITY_ASSERTION', message: msg })
      } else {
        warnings.push({ file, type: 'REMOVED_ASSERTION', message: msg })
      }
    }

    // Check for weakened assertions (same test name, weaker matcher)
    for (const h of removed) {
      const old = oldSigs.get(h)
      for (const nh of added) {
        const newer = newSigs.get(nh)
        if (newer.test === old.test && isWeakened(old.signature, newer.signature)) {
          violations.push({
            file,
            type: 'WEAKENED_ASSERTION',
            message: `Assertion weakened in "${old.test}":\n      was:  ${old.signature}\n      now:  ${newer.signature}`,
          })
        }
      }
    }
  }

  // Report results
  if (violations.length === 0 && warnings.length === 0) {
    console.log('  assertion-lock: all assertions verified. No changes detected.')
    return
  }

  if (warnings.length > 0) {
    console.log('\n  assertion-lock WARNINGS:')
    for (const w of warnings) {
      console.log(`    ⚠ ${w.file}: ${w.message}`)
    }
  }

  if (violations.length > 0) {
    console.error('\n  ╔══════════════════════════════════════════════════════════════╗')
    console.error('  ║  assertion-lock: BLOCKED — assertion integrity violated     ║')
    console.error('  ╚══════════════════════════════════════════════════════════════╝\n')

    for (const v of violations) {
      console.error(`    ✖ [${v.type}] ${v.file}`)
      console.error(`      ${v.message}\n`)
    }

    console.error('  To acknowledge intentional changes:')
    console.error(`    npx assertion-lock update ${[...new Set(violations.map(v => v.file))].join(' ')}\n`)
    console.error('  The lockfile diff will be visible in the PR for reviewer verification.\n')
    process.exit(1)
  }
}

/**
 * Extract assertions from a string (for staged content analysis).
 */
function extractAssertionsFromString(source, filePath) {
  const assertions = []
  const allMatches = []

  for (const match of source.matchAll(EXPECT_PATTERN)) {
    allMatches.push({ text: match[0], index: match.index })
  }
  for (const match of source.matchAll(EXPECT_NOARG_PATTERN)) {
    const isDuplicate = allMatches.some(
      m => m.index === match.index && m.text === match[0]
    )
    if (!isDuplicate) {
      allMatches.push({ text: match[0], index: match.index })
    }
  }

  allMatches.sort((a, b) => a.index - b.index)

  for (const match of allMatches) {
    const lineNumber = source.slice(0, match.index).split('\n').length
    const signature = normalise(match.text)
    const testName = findTestName(source, match.index)
    const describeName = findDescribeName(source, match.index)

    assertions.push({
      test: testName,
      describe: describeName,
      signature,
      line: lineNumber,
      hash: hash(signature),
    })
  }

  return assertions
}

/**
 * Detect if a new assertion is a weakened version of an old one.
 *
 * Weakening patterns:
 *   .toBe(403) → .toBe(200)          Status code relaxed
 *   .toBe(false) → .toBe(true)       Boolean flipped
 *   .toBe(X) → .toBeDefined()        Specific → vague
 *   .toEqual({...}) → .toBeTruthy()  Specific → vague
 *   .toThrow() → not present         Error expectation removed
 *   .not.toBe → .toBe                Negation removed
 */
function isWeakened(oldSig, newSig) {
  // Specific value → vague check
  const specificMatchers = /\.toBe\(|\.toEqual\(|\.toMatch\(|\.toContain\(/
  const vagueMatchers = /\.toBeDefined\(\)|\.toBeTruthy\(\)|\.not\.toBeNull\(\)/
  if (specificMatchers.test(oldSig) && vagueMatchers.test(newSig)) return true

  // Status code relaxation: 4xx/5xx → 2xx
  const oldStatus = oldSig.match(/\.toBe\((\d{3})\)/)
  const newStatus = newSig.match(/\.toBe\((\d{3})\)/)
  if (oldStatus && newStatus) {
    const oldCode = parseInt(oldStatus[1])
    const newCode = parseInt(newStatus[1])
    // Error/forbidden → success is always suspicious
    if (oldCode >= 400 && newCode < 400) return true
  }

  // Boolean flip: false → true
  if (oldSig.includes('.toBe(false)') && newSig.includes('.toBe(true)')) return true

  // Negation removed: .not.toBe → .toBe (but not the reverse)
  if (oldSig.includes('.not.') && !newSig.includes('.not.')) {
    // Only if the core matcher is the same
    const oldCore = oldSig.replace('.not.', '.')
    if (oldCore === newSig) return true
  }

  return false
}

async function update(root, specificFiles) {
  const lock = readLockfile(root)
  if (!lock) {
    console.log('  No lockfile found. Running full generate instead.')
    return generate(root, DEFAULT_TEST_PATTERN)
  }

  if (specificFiles.length === 0) {
    // Regenerate everything
    console.log('  Regenerating full lockfile...')
    return generate(root, DEFAULT_TEST_PATTERN)
  }

  // Update only specific files
  let updated = 0
  for (const file of specificFiles) {
    const relPath = file.split(sep).join('/')
    const absPath = resolve(root, relPath)

    if (!existsSync(absPath)) {
      // File was deleted — remove from lockfile
      if (lock.files[relPath]) {
        delete lock.files[relPath]
        console.log(`  Removed deleted file: ${relPath}`)
        updated++
      }
      continue
    }

    const assertions = extractAssertions(absPath)
    const isSecurity = isSecurityFile(relPath)

    if (assertions.length === 0) {
      if (lock.files[relPath]) {
        delete lock.files[relPath]
        console.log(`  Removed (no assertions): ${relPath}`)
        updated++
      }
      continue
    }

    const oldEntry = lock.files[relPath]
    lock.files[relPath] = {
      hash: hashFileAssertions(assertions),
      count: assertions.length,
      security: isSecurity,
      assertions: assertions.map(a => ({
        test: a.test,
        describe: a.describe,
        signature: a.signature,
        line: a.line,
        hash: a.hash,
      })),
    }

    if (oldEntry) {
      const delta = assertions.length - oldEntry.count
      const sign = delta >= 0 ? '+' : ''
      console.log(`  Updated: ${relPath} (${sign}${delta} assertions)`)
    } else {
      console.log(`  Added: ${relPath} (${assertions.length} assertions)`)
    }
    updated++
  }

  writeLockfile(root, lock)
  console.log(`\n  assertion-lock: updated ${updated} file(s). Remember to stage ${LOCKFILE}.\n`)
}

async function diff(root) {
  const lock = readLockfile(root)
  if (!lock) {
    console.error(`\n  No ${LOCKFILE} found. Run 'assertion-lock generate' first.\n`)
    process.exit(1)
  }

  const pattern = DEFAULT_TEST_PATTERN
  const files = await findTestFiles(root, pattern)
  let changeCount = 0

  for (const file of files) {
    const relPath = relative(root, file).split(sep).join('/')
    const currentAssertions = extractAssertions(file)
    const entry = lock.files[relPath]

    if (!entry && currentAssertions.length > 0) {
      console.log(`  + ${relPath} (${currentAssertions.length} assertions, NEW)`)
      changeCount++
      continue
    }

    if (!entry) continue

    const currentHash = hashFileAssertions(currentAssertions)
    if (currentHash === entry.hash) continue

    changeCount++
    console.log(`\n  ~ ${relPath}:`)

    const oldSigs = new Map(entry.assertions.map(a => [a.hash, a]))
    const newSigs = new Map(currentAssertions.map(a => [a.hash, a]))

    for (const [h, a] of oldSigs) {
      if (!newSigs.has(h)) {
        console.log(`    - [line ${a.line}] ${a.signature}`)
      }
    }
    for (const [h, a] of newSigs) {
      if (!oldSigs.has(h)) {
        console.log(`    + [line ${a.line}] ${a.signature}`)
      }
    }
  }

  // Check for files in lockfile that no longer exist
  for (const relPath of Object.keys(lock.files)) {
    const absPath = resolve(root, relPath)
    if (!existsSync(absPath)) {
      console.log(`  - ${relPath} (DELETED, had ${lock.files[relPath].count} assertions)`)
      changeCount++
    }
  }

  if (changeCount === 0) {
    console.log('  assertion-lock: no changes detected.')
  } else {
    console.log(`\n  ${changeCount} file(s) with assertion changes.`)
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const command = args[0]
const root = process.cwd()

switch (command) {
  case 'generate': {
    const patternIdx = args.indexOf('--test-pattern')
    const pattern = patternIdx >= 0 ? args[patternIdx + 1] : DEFAULT_TEST_PATTERN
    await generate(root, pattern)
    break
  }

  case 'verify':
    await verify(root)
    break

  case 'update':
    await update(root, args.slice(1))
    break

  case 'diff':
    await diff(root)
    break

  default:
    console.log(`
  assertion-lock — Mechanical enforcement against silent test weakening.

  Usage:
    assertion-lock generate [--test-pattern <glob>]   Build .assertion-lock.json
    assertion-lock verify                             Check staged files (pre-commit)
    assertion-lock update [file...]                   Acknowledge changes to specific files
    assertion-lock diff                               Show changes vs lockfile

  The lockfile tracks every expect() assertion in your test suite.
  Changes to assertions require explicit acknowledgement, making
  silent test weakening visible in PRs.
`)
    if (command) {
      console.error(`  Unknown command: ${command}\n`)
      process.exit(1)
    }
}
