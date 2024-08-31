# Visual Studio Code Dev Workshop Extension

[![version](https://img.shields.io/visual-studio-marketplace/v/khulnasoft.dev-workshop)](https://marketplace.visualstudio.com/items?itemName=khulnasoft.dev-workshop)
[![updated](https://img.shields.io/visual-studio-marketplace/last-updated/khulnasoft.dev-workshop)](https://marketplace.visualstudio.com/items?itemName=khulnasoft.dev-workshop)
[![release](https://img.shields.io/visual-studio-marketplace/release-date/khulnasoft.dev-workshop)](https://vsmarketplacebadge.apphb.com/downloads-short/khulnasoft.dev-workshop.svg)

[![downloads](https://img.shields.io/visual-studio-marketplace/d/khulnasoft.dev-workshop)](https://vsmarketplacebadge.apphb.com/downloads-short/khulnasoft.dev-workshop.svg)
[![installs](https://img.shields.io/visual-studio-marketplace/i/khulnasoft.dev-workshop)](https://marketplace.visualstudio.com/items?itemName=khulnasoft.dev-workshop)
[![rating](https://img.shields.io/visual-studio-marketplace/r/khulnasoft.dev-workshop)](https://marketplace.visualstudio.com/items?itemName=khulnasoft.dev-workshop)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/khulnasoft/devenv/master/LICENSE.txt)

[![TeX Live on Windows](https://github.com/khulnasoft/devenv/workflows/TeX%20Live%20on%20Windows/badge.svg)](https://github.com/khulnasoft/devenv/actions?query=workflow%3A%22TeX+Live+on+Windows%22)
[![TeX Live on macOS](https://github.com/khulnasoft/devenv/workflows/TeX%20Live%20on%20macOS/badge.svg)](https://github.com/khulnasoft/devenv/actions?query=workflow%3A%22TeX+Live+on+macOS%22)
[![TeX Live on Linux](https://github.com/khulnasoft/devenv/workflows/TeX%20Live%20on%20Linux/badge.svg)](https://github.com/khulnasoft/devenv/actions?query=workflow%3A%22TeX+Live+on+Linux%22)

Dev Workshop is an extension for [Visual Studio Code](https://code.visualstudio.com/), aiming to provide core features for Dev typesetting with Visual Studio Code.

This project won't be successful without contributions from the community, especially from the current and past key contributors:

- Jerome Lelong [`@jlelong`](https://github.com/jlelong)
- Takashi Tamura [`@khulnasoft`](https://github.com/khulnasoft)
- Tecosaur [`@tecosaur`](https://github.com/tecosaur)
- James Booth [`@jabooth`](https://github.com/jabooth)

Thank you so much!

**Note that the latest version of Devenv requires at least VSCode `1.88.0` (March 2024 or later).**

## Manual

The manual of the extension is maintained as a [wiki](https://github.com/khulnasoft/devenv/wiki)

### Table of Contents

- [Home](https://github.com/khulnasoft/devenv/wiki/Home)
- [Installation and basic settings](https://github.com/khulnasoft/devenv/wiki/Install)
  - [Requirements](https://github.com/khulnasoft/devenv/wiki/Install#requirements)
  - [Installation](https://github.com/khulnasoft/devenv/wiki/Install#installation)
  - [Setting PATH environment variable](https://github.com/khulnasoft/devenv/wiki/Install#setting-path-environment-variable)
  - [Settings](https://github.com/khulnasoft/devenv/wiki/Install#settings)
  - [Usage](https://github.com/khulnasoft/devenv/wiki/Install#usage)
    - [Supported languages](https://github.com/khulnasoft/devenv/wiki/Install#supported-languages)
  - [Using Docker](https://github.com/khulnasoft/devenv/wiki/Install#using-docker)
  - [Using WSL](https://github.com/khulnasoft/devenv/wiki/Install#using-wsl)
- [Compiling](https://github.com/khulnasoft/devenv/wiki/Compile)
  - [Building the document](https://github.com/khulnasoft/devenv/wiki/Compile#building-the-document)
  - [Terminating the current compilation](https://github.com/khulnasoft/devenv/wiki/Compile#terminating-the-current-compilation)
  - [Auto build Dev](https://github.com/khulnasoft/devenv/wiki/Compile#auto-build-dev)
  - [Dev recipes](https://github.com/khulnasoft/devenv/wiki/Compile#dev-recipes)
    - [Dev tools](https://github.com/khulnasoft/devenv/wiki/Compile#dev-tools)
    - [Placeholders](https://github.com/khulnasoft/devenv/wiki/Compile#placeholders)
  - [Multi file projects](https://github.com/khulnasoft/devenv/wiki/Compile#multi-file-projects)
  - [Cleaning generated files](https://github.com/khulnasoft/devenv/wiki/Compile#cleaning-generated-files)
  - [Catching errors and warnings](https://github.com/khulnasoft/devenv/wiki/Compile#catching-errors-and-warnings)
  - [External build command](https://github.com/khulnasoft/devenv/wiki/Compile#external-build-command)
  - [Magic comments](https://github.com/khulnasoft/devenv/wiki/Compile#magic-comments)
  - [Building a `.jnw` file](https://github.com/khulnasoft/devenv/wiki/Compile#building-a-jnw-file)
  - [Building a `.rnw` file](https://github.com/khulnasoft/devenv/wiki/Compile#building-a-rnw-file)
- [Linting](https://github.com/khulnasoft/devenv/wiki/Linters)
  - [Duplicate labels](https://github.com/khulnasoft/devenv/wiki/Linters#duplicate-labels)
  - [Chktex](https://github.com/khulnasoft/devenv/wiki/Linters#chktex)
- [Viewing & SyncTeX](https://github.com/khulnasoft/devenv/wiki/View)
  - [Internal PDF viewer](https://github.com/khulnasoft/devenv/wiki/View#internal-pdf-viewer)
    - [Color](https://github.com/khulnasoft/devenv/wiki/View#color)
    - [Invert mode](https://github.com/khulnasoft/devenv/wiki/View#invert-mode)
  - [SyncTeX](https://github.com/khulnasoft/devenv/wiki/View#synctex)
  - [External PDF viewer](https://github.com/khulnasoft/devenv/wiki/View#external-pdf-viewer)
    - [Using SyncTeX with an external viewer](https://github.com/khulnasoft/devenv/wiki/View#using-synctex-with-an-external-viewer)
- [Formatting](https://github.com/khulnasoft/devenv/wiki/Format)
  - [Dev files](https://github.com/khulnasoft/devenv/wiki/Format#Dev-files)
  - [Bibtex files](https://github.com/khulnasoft/devenv/wiki/Format#Bibtex-files)
- [Intellisense](https://github.com/khulnasoft/devenv/wiki/Intellisense)
  - [Citations](https://github.com/khulnasoft/devenv/wiki/Intellisense#Citations)
  - [References](https://github.com/khulnasoft/devenv/wiki/Intellisense#References)
  - [Commands](https://github.com/khulnasoft/devenv/wiki/Intellisense#Commands)
  - [Environments](https://github.com/khulnasoft/devenv/wiki/Intellisense#Environments)
  - [Files](https://github.com/khulnasoft/devenv/wiki/Intellisense#files)
  - [Bibtex Files](https://github.com/khulnasoft/devenv/wiki/Intellisense#bibtex-files)
  - [`@` suggestions](https://github.com/khulnasoft/devenv/wiki/Intellisense#-suggestions)
    - [Inserting Greek letters](https://github.com/khulnasoft/devenv/wiki/Intellisense#inserting-greek-letters)
    - [Handy mathematical helpers](https://github.com/khulnasoft/devenv/wiki/Intellisense#Handy-mathematical-helpers)
- [Snippets and shortcuts](https://github.com/khulnasoft/devenv/wiki/Snippets)
  - [Environments](https://github.com/khulnasoft/devenv/wiki/Snippets#Environments)
  - [Sectioning](https://github.com/khulnasoft/devenv/wiki/Snippets#Sectioning)
  - [Font commands](https://github.com/khulnasoft/devenv/wiki/Snippets#font-commands-and-snippets)
  - [Mathematical font commands](https://github.com/khulnasoft/devenv/wiki/Snippets#Mathematical-font-commands)
  - [Surrounding text](https://github.com/khulnasoft/devenv/wiki/Snippets#surrounding-text)
  - [Miscellaneous actions](https://github.com/khulnasoft/devenv/wiki/Snippets#Miscellaneous-Actions)
- [Hovering and previewing features](https://github.com/khulnasoft/devenv/wiki/Hover)
  - [Documentation of a package](https://github.com/khulnasoft/devenv/wiki/Hover#documentation-of-a-package)
  - [Previewing equations](https://github.com/khulnasoft/devenv/wiki/Hover#previewing-equations)
  - [Previewing graphics](https://github.com/khulnasoft/devenv/wiki/Hover#previewing-graphics)
  - [Previewing citation details](https://github.com/khulnasoft/devenv/wiki/Hover#previewing-citation-details)
  - [Previewing references](https://github.com/khulnasoft/devenv/wiki/Hover#previewing-references)
  - [Documentation of a command](https://github.com/khulnasoft/devenv/wiki/Hover#documentation-of-a-command)
- [Playing with environments](https://github.com/khulnasoft/devenv/wiki/Environments)
  - [Inserting an environment](https://github.com/khulnasoft/devenv/wiki/Environments#inserting-an-environment)
  - [Itemize like environments](https://github.com/khulnasoft/devenv/wiki/Environments#Itemize-like-environments)
  - [Navigating and selecting](https://github.com/khulnasoft/devenv/wiki/Environments#Navigating-and-selecting)
  - [Changing between `\[...\]` and `\begin{}...\end{}`](https://github.com/khulnasoft/devenv/wiki/Environments#changing-between--and-beginend)
  - [Closing the current environment](https://github.com/khulnasoft/devenv/wiki/Environments#Closing-the-current-environment)
  - [Surrounding selection with an environment](https://github.com/khulnasoft/devenv/wiki/Environments#Surrounding-selection-with-an-environment)
- [Extra features](https://github.com/khulnasoft/devenv/wiki/ExtraFeatures)
  - [Structure of the document](https://github.com/khulnasoft/devenv/wiki/ExtraFeatures#structure-of-the-document)
  - [Code folding](https://github.com/khulnasoft/devenv/wiki/ExtraFeatures#code-folding)
  - [Counting words](https://github.com/khulnasoft/devenv/wiki/ExtraFeatures#counting-words)
  - [Literate programming support using Dev](https://github.com/khulnasoft/devenv/wiki/ExtraFeatures#Literate-programming-support-using-Dev)
- [VS Code Remote Development](https://github.com/khulnasoft/devenv/wiki/Remote)
- [FAQ and common issues](https://github.com/khulnasoft/devenv/wiki/FAQ)

## Features (Taster)

This is not a complete list but rather a preview of some of the coolest features.

- Build Dev (including BibTeX) to PDF automatically on save.

  <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/build.gif" alt="build process gif" height="20px">

- View PDF on-the-fly (in VS Code or browser).

  <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/preview.gif" alt="demo of preview feature" height="220px">

- Direct and reverse [SyncTeX](https://github.com/khulnasoft/devenv/wiki/View#synctex). Click to jump between location in `.tex` source and PDF and vice versa.

  <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/synctex.gif" alt="demo of SyncTeX" height="220px">

- Intellisense, including completions for bibliography keys (`\cite{}`) and labels (`\ref{}`).

  <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/ref.gif" alt="intellisense demo" height="80px">

- Dev log parser, with errors and warnings in Dev build automatically reported in VS Code.

  <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/errors.png" alt="error reporting demo" height="125px">

  - Linting

  <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/chktex.gif" alt="auto \item demo" height="90px">

- [Snippets](https://github.com/khulnasoft/devenv/wiki/Snippets)

  - A lot of Dev commands can be typed using snippets starting in `\`, then type part of the command to narrow the search.

    <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/subparagraph.gif" alt="auto \item demo" height="80px">

  - Surround some selected text with a Dev command using <kbd>ctrl</kbd>+<kbd>l</kbd>, <kbd>ctrl</kbd>+<kbd>w</kbd> (<kbd>⌘</kbd>+<kbd>l</kbd>, <kbd>⌘</kbd>+<kbd>w</kbd> on Mac). A new menu pops up to select the command. This works with multi selections. The former approach using `\` has been deprecated.

    <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/wrap.gif" alt="wrap demo" height="140px">

  - We also provide a few other suggestion mechanisms

    - Greek letters are obtained as `@` + `letter`. Some letters have variants, which are available as `@v` + `letter`. See [here](https://github.com/khulnasoft/devenv/wiki/Intellisense#inserting-greek-letters).

        <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/greek letter.gif" alt="greek letters demo" height="20px">

    - Common environments can be obtained by `BXY` where `XY` are the first two letters of the environment name, eg. `BEQ` gives the `equation` environment. If you want the star version of the environment, use `BSXX`, eg. `BSEQ` gives the `equation*` environment. See [here](https://github.com/khulnasoft/devenv/wiki/Intellisense#Handy-mathematical-helpers).

        <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/BSAL snippet.gif" alt="BSAL demo" height="55px">

    - Common font commands can be obtained by `FXY` where `XY` are the last two letters of the font command name, eg. `FIT` gives `\textit{}`. See [here](https://github.com/khulnasoft/devenv/wiki/Snippets#font-commands-and-snippets).

        <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/FBF snippet.gif" alt="FBF demo" height="20px">

    - Many other maths symbols can be obtained with the `@` prefix. See [here](https://github.com/khulnasoft/devenv/wiki/Snippets#Handy-mathematical-helpers).

      <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/frac.gif" alt="\frac shortcut demo" height="20px">
      <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/int.gif" alt="\int shortcut demo" height="20px">

- [Shortcuts](https://github.com/khulnasoft/devenv/wiki/Snippets#font-commands-and-snippets)

  - In addition to snippets, there are shortcuts provided by the extension that allow you to easily format text (and one or two other things).

    <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/emph.gif" alt="\emph{} demo" height="20px">

- When the current line starts with `\item` or `\item[]`, hitting `Enter` automatically adds a newline starting in the same way. For a better handling of the last item, hitting `Enter` on a line only containing `\item` or `\item[]` actually deletes the content of the line. The `alt+Enter` is bind to the standard newline command. This automatic insertion of `\item` can be deactivated by setting `dev-workshop.bind.enter.key` to `false`.

    <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/auto item.gif" alt="auto \item demo" height="80px">

- [Preview on hover](https://github.com/khulnasoft/devenv/wiki/Hover#previewing-equations). Hovering over the start tag of a math environment causes a mathjax preview to pop up.

    <img src="https://github.com/khulnasoft/devenv/raw/master/demo_media/hover.gif" alt="equation hover demo" height="120px">

## GitHub

The code for this extension is available on github at: https://github.com/khulnasoft/devenv

## Like this work?

- :smile: Star this project on GitHub and Visual Studio Marketplace
- :blush: Leave a comment
- :relaxed: Thank the develops and community for their effort.

## License

[MIT](https://opensource.org/licenses/MIT)
