---
id: <LETTER><NN>
name: <kebab-desc>
depends-on: <parent-task-id>
status: pending|in-progress|complete
generated: gate | orchestrator | user
gate-source: <parent-task-id>/G<n>.<i>  <!-- only when generated: gate -->
---

# Task <LETTER><NN>: <Title>

## Description

Defect: <original DEFECT: comment text>

## Completion

- [ ] Bug fixed or requirement met
- [ ] Tests pass
- [ ] Project conventions followed

## Depends On

<parent task ID>

## Notes

Source: <file>:<line> → marked `DEFECT-TASK(<task-id>):`
