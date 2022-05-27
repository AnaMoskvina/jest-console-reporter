/* global require module */

import { DefaultReporter } from '@jest/reporters'
import { getLogGroupKey } from './getLogGroupKey.mjs'
import { getLogGroupSummary } from './getLogGroupSummary.mjs'

/**
 * Overrides Jest's default reporter to filter out known console messages,
 * and prints a summary at the end of the test run.
 */
export default class CleanConsoleReporter extends DefaultReporter {
  constructor(globalConfig, options = {}) {
    super(globalConfig)
    this.rules = options.rules || []
    this.levels = options.levels || ['error', 'warn', 'info', 'debug', 'log']
    this.logs = new Map()
    this.ignored = 0
  }

  // Override DefaultReporter method
  printTestFileHeader(testPath, config, result) {
    // Strip out known console messages before passing to base implementation
    const filteredResult = {
      ...result,
      console: this.filterOutKnownMessages(result.console),
    }

    DefaultReporter.prototype.printTestFileHeader.call(this, testPath, config, filteredResult)
  }

  filterOutKnownMessages(consoleBuffer = []) {
    const rules = this.rules
    const retain = []

    for (const frame of consoleBuffer) {
      // Check if this a known type message
      const [key, keep] = getLogGroupKey(rules, frame)
      if (key) {
        this.groupMessageByKey(frame.type, key)
        if (keep) {
          retain.push(frame)
        }
      } else if (key === null) {
        this.ignored++
      } else {
        retain.push(frame)
      }
    }

    // Based implementation expects undefined instead of empty array
    return retain.length ? retain : undefined
  }

  groupMessageByKey(type, key) {
    // this.logs : Map<string, Map<string, number>>
    let level = this.logs.get(type)
    if (!level) {
      this.logs.set(type, (level = new Map()))
    }

    level.set(key, (level.get(key) || 0) + 1)
  }

  onRunStart(...args) {
    DefaultReporter.prototype.onRunStart.call(this, ...args)
  }

  onRunComplete(...args) {
    const summary = getLogGroupSummary(this.logs, this.levels, this.ignored)
    if (summary) {
      summary.forEach(this.log)
    }

    DefaultReporter.prototype.onRunComplete.call(this, ...args)
  }
}
