# INSTALL

Install skills from this repo into target project `.agents/skills/`.

- **Repo**: `https://github.com/DanielMontilla/skills` (branch `main`)
- **Skills**: `.agents/skills/<skill-name>/`

## Modes

- **all** — install every skill
- **multi** — install named skills (list provided)
- **single** — install one skill

## Pre-install Checklist (per-skill)

### 1. Metadata

Read `<skill-name>/SKILL.md` frontmatter. Extract `version` field.

### 2. Existence Check

Check `$TARGET/.agents/skills/<skill-name>/` exists.

- **Missing** → fresh install
- **Exists** → compare `version` from target SKILL.md frontmatter

### 3. Version Resolution

- **Match** → skip (up-to-date)
- **Source > target** → overwrite target with source
- **Source < target** → local modification. Ask user:

  > "Local `<skill-name>` at X.Y.Z, source at A.B.C (older). Options: 1) Keep local 2) Downgrade 3) Merge manually"

- **Same version, content differs** → ask user:

  > "Versions match but content differs. Options: 1) Overwrite 2) Keep local 3) Show diff"

### 4. CHANGELOG

Before overwriting, read target + source CHANGELOG. If target has local entries not in source, ask:

> "Target CHANGELOG has local entries not in source. Options: 1) Discard local 2) Append local to source 3) Merge manually"

## Installation

### Fresh

```
mkdir -p $TARGET/.agents/skills/<skill-name>
cp -r <skill-name>/* $TARGET/.agents/skills/<skill-name>/
```

### Update

```
rm -rf $TARGET/.agents/skills/<skill-name>
mkdir -p $TARGET/.agents/skills/<skill-name>
cp -r <skill-name>/* $TARGET/.agents/skills/<skill-name>/
```

Merge preserved changelog entries if any.

### Git (preferred)

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/DanielMontilla/skills.git /tmp/skills-install
cd /tmp/skills-install
git sparse-checkout set .agents/skills/<skill-name>
cp -r .agents/skills/<skill-name> $TARGET/.agents/skills/<skill-name>/
rm -rf /tmp/skills-install
```

## Post-install

1. Verify SKILL.md frontmatter `version`
2. Verify all source files present
3. Regenerate `AGENTS.md` table from installed skills (re-read SKILL.md frontmatter from target)
4. Report installed/updated/skipped

## AGENTS.md Update

After install, update `AGENTS.md` so skill table matches installed skills:

1. List installed skills
2. Generate markdown table row per skill: `| [name](.agents/skills/<name>/SKILL.md) | description |`
3. Write updated table to `AGENTS.md`
4. Commit AGENTS.md changes