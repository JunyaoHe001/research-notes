# Junyao's Research Notes

This repository contains a Quartz v5 academic research site for research notes, methods, project documentation, publications, and working papers.

- Site: https://junyaohe001.github.io/research-notes/
- Framework: Quartz v5
- Content editor: Pages CMS through the root-level `.pages.yml`
- Deployment: GitHub Pages via GitHub Actions

Content is maintained in the `content/` directory and deployed automatically from the `v5` branch.

## Automatic collection indexes

The deployment workflow runs `scripts/sync-content-indexes.mjs` before every Quartz build. It scans the frontmatter of collection entries and synchronizes:

- `content/publications/index.md`
- `content/working-papers/index.md`
- `content/projects/index.md`
- `content/methods/index.md`

After adding or editing a collection entry in Pages CMS, the relevant overview page, internal link, title, year, venue, status, and lead/co-authored classification are updated automatically. The workflow commits generated index changes back to `v5` and deploys the same synchronized files.

Do not manually edit text between `AUTO-GENERATED` markers in overview files. Introductory and concluding text outside those markers remains manually editable.

### Optional frontmatter controls

- `show-in-overview: false` excludes an entry from its overview page.
- `display-order: 10` gives an entry an explicit order within the same year.
- Working papers are classified as lead-authored when the first author is `He, J.`. Add `authorship: Lead-authored` or `authorship: Co-authored` to override this rule.
