---
name: <kebab-name>
version: <skill-version>
status: pending|in-progress|complete
created: <date>
tasks:
  - A01: <short-name>
---

# <Feature Title>

## Description

<user-provided>

## Requirements

- <req>

## Goals

- <goal>

## Dependencies

A01 -> B01, B02 -> C01, C02, C03

## Gates

| Scope | File | Phase Count | Last Phase Gate |
|---|---|---|---|
| Feature | GATES.md | N | Strict conventions check |
| A01 | A01-<task>/GATES.md | N | Strict conventions check |
| B* | B01-<task>/GATES.md | N | Strict conventions check |

## Progress

- [ ] A01: pending|in-progress|complete|defect
- [ ] B01: pending|in-progress|complete|defect
