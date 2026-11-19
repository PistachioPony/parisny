# parisny

A correspondence between Maria (drawings) and Maybelle (writing),
one letter answering the last, bound into a single scrolling book.

## Adding a new letter

1. Download the new piece(s) from Drive into `inbox/`
   (Maybelle's letter: File → Download → Markdown).
2. Run `node inbox.js` and answer the date questions (Enter = today).
   Drawings come out upright, 2000px on the long side, with no GPS or
   other metadata. Originals move to `inbox/done/`.
3. Run `node bind.js`.
4. Open `docs/index.html` in a browser to check it.
5. Commit and push. The site updates in a minute or two.

## Layout

- `pages/`: the chain, one file per piece, named by date
- `template/`: the page design (edit here)
- `docs/`: built by bind.js (never edit by hand)
- `inbox/`: private, ignored by git
