# parisny

A correspondence between Maria (drawings) and Maybelle (writing),
one letter answering the last, bound into a single scrolling book.

## Adding a new letter

1. Download the new piece(s) from Drive into `inbox/`
   (Maybelle's letter: File → Download → Markdown).
2. Run `node bind.js` and answer the date questions.
3. Open `docs/index.html` in a browser to check it.
4. Commit and push. The site updates in a minute or two.

## Layout

- `pages/`: the chain, one file per piece, named by date
- `template/`: the page design (edit here)
- `docs/`: built by bind.js (never edit by hand)
- `inbox/`: private, ignored by git
