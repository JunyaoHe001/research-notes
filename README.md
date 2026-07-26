# Junyao's Research Notes

This repository contains a Quartz v5 academic research site for research notes, methods, project documentation, publications, working papers, activities, teaching, and supervision.

- Site: https://junyaohe001.github.io/research-notes/
- Framework: Quartz v5
- Content editor: Pages CMS through the root level `.pages.yml`
- Deployment: GitHub Pages through GitHub Actions

Content is maintained in the `content/` directory and deployed automatically from the `v5` branch.

## Pages CMS collections

Pages CMS can create and edit entries in:

- `content/publications/`
- `content/working-papers/`
- `content/activities/`
- `content/teaching/`
- `content/projects/`
- `content/methods/`

Activities supports blog posts, conferences, invited talks, workshops, exhibitions, and academic service. Teaching supports courses, guest lectures, and thesis supervision.

## Automatic collection indexes

The deployment workflow runs `scripts/sync-content-indexes.mjs` before every Quartz build. It scans the frontmatter of collection entries and synchronizes:

- `content/publications/index.md`
- `content/working-papers/index.md`
- `content/activities/index.md`
- `content/teaching/index.md`
- `content/projects/index.md`
- `content/methods/index.md`

After adding or editing a collection entry in Pages CMS, the relevant overview page, internal link, title, year or date, venue, role, status, and grouping are updated automatically. The workflow commits generated index changes back to `v5` and deploys the same synchronized files.

Do not manually edit text between `AUTO-GENERATED` markers in overview files. Introductory and concluding text outside those markers remains manually editable.

### Optional frontmatter controls

- `show-in-overview: false` excludes an entry from its overview page.
- `display-order: 10` gives an entry an explicit order within the same year or group.
- Working papers are classified as lead authored when the first author is `He, J.`. Add `authorship: Lead-authored` or `authorship: Co-authored` to override this rule.

The synchronization step also checks public Markdown content for sentence level em dashes. Content using that punctuation will fail the build until it is revised.
