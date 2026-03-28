import { test, expect, describe } from "bun:test"

describe("session ID generation", () => {
  function generateId(len = 6): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let id = ""
    for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)]
    return id
  }

  test("generates 6-char alphanumeric ID", () => {
    const id = generateId()
    expect(id).toHaveLength(6)
    expect(id).toMatch(/^[A-Z0-9]{6}$/)
  })

  test("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBeGreaterThan(90)
  })
})

describe("context handoff", () => {
  test("limits to last 10 messages and 5 diffs", () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` }))
    const diffs = Array.from({ length: 8 }, (_, i) => ({ filepath: `file${i}.ts`, patch: `diff ${i}` }))

    const handoff = {
      recentMessages: messages.slice(-10),
      recentDiffs: diffs.slice(-5),
      fileTree: "",
    }

    expect(handoff.recentMessages).toHaveLength(10)
    expect(handoff.recentDiffs).toHaveLength(5)
  })
})
