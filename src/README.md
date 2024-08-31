# Overview

[Providers](https://code.visualstudio.com/api/language-extensions/programmatic-language-features#language-features-listing) are defined under `providers/` and are registered in `main.ts`. All other components of the extension are defined under `components/` and are properties of the `Extension` class defined in `main.ts`, which can be accessed when needed. The `Extension` class is a kind of [service locator](https://martinfowler.com/articles/injection.html#UsingAServiceLocator).

## Root file

Where Dev Workshop differs from other extensions of VS Code is in treating the root file. For other extensions of programming languages, generally, there is only one compilation target per workspace. However, Dev Workshop dynamically detects the root file and the target depending on the document being currently edited. See [wiki](https://github.com/khulnasoft/devenv/wiki/Compile#the-root-file) for the details. `Manager.findRoot()` does the job. We register `findRoot` with `onDidChangeActiveTextEditor` in `main.ts`. This works well with multi-root workspaces.

## Application Log

When something goes wrong, we always add to log messages what went wrong with `Logger.log()`. It is much beneficial for debugging.

## VS Code filesystem and virtual workspaces

See [#2669](https://github.com/khulnasoft/devenv/pull/2669).

## EventBus

See [#3193](https://github.com/khulnasoft/devenv/pull/3193).

## workerpool

To avoid blocking the main loop of the extension host process, we execute some heavy tasks in child processes with [workerpool](https://github.com/josdejong/workerpool).

See:

- https://github.com/khulnasoft/devenv/tree/master/src/components/parser
- https://github.com/khulnasoft/devenv/tree/master/src/providers/preview

## Architecture

```mermaid
flowchart LR
  subgraph VSCode["VS Code"]
    PDFViewer["PDF viewer\n viewer/devenv.ts"]
    SnippetView["Snippet View\n snippetview.js"] --- PDFRenderer["PDF thumbnail renderer\n pdfrenderer.js"]
    MathPreview["Math Preview Panel\n mathpreview.js"]
  end
  subgraph ExtensionHost["VS Code Extension Host"]
    LW["Dev Workshop\n main.ts"]
    LW --- Server["Server for PDF viewer \n(Files and WebSocket)\n server.ts "];
    LW --- ParserPool["Parser pool\n syntax.ts"]
    LW --- MathJaxPool["MathJax pool\n mathjaxpool.ts"]
  end
  PDFViewer <--> Server
  Server <--> Browser
  subgraph Browser
    PDFViewerB["PDF viewer\n viewer/devenv.ts"]
  end
  ParserPool --> ParserWorkers["parser workers\n syntax_worker.ts"]
  MathJaxPool --> MathJaxWorkers["MathJax workers\n mathjaxpool_worker.ts "]
  click PDFViewer "https://github.com/khulnasoft/devenv/blob/master/viewer/devenv.ts"
  click PDFViewerB "https://github.com/khulnasoft/devenv/blob/master/viewer/devenv.ts"
  click SnippetView "https://github.com/khulnasoft/devenv/blob/master/resources/snippetview/snippetview.js"
  click PDFRenderer "https://github.com/khulnasoft/devenv/blob/master/resources/snippetview/pdfrenderer.js"
  click MathPreview "https://github.com/khulnasoft/devenv/blob/master/resources/mathpreviewpanel/mathpreview.js"
  click LW "https://github.com/khulnasoft/devenv/blob/master/src/main.ts"
  click Server "https://github.com/khulnasoft/devenv/blob/master/src/components/server.ts"
  click ParserPool "https://github.com/khulnasoft/devenv/blob/master/src/components/parser/syntax.ts"
  click MathJaxPool "https://github.com/khulnasoft/devenv/blob/master/src/providers/preview/mathjaxpool.ts"
  click ParserWorkers "https://github.com/khulnasoft/devenv/blob/master/src/components/parser/syntax_worker.ts"
  click MathJaxWorkers "https://github.com/khulnasoft/devenv/blob/master/src/providers/preview/mathjaxpool_worker.ts"
```

## flowchart

```mermaid
flowchart LR
  ActivationEvents{{Activation Events}}
  Activate["activate"]
  Ready((Ready))
  FindRootFile["Find root file"]
  ActivationEvents --> Activate --> FindRootFile
  ActiveDocumentOpened{{New document opened}}
  Ready --> ActiveDocumentOpened
  ActiveDocumentOpened --> FindRootFile
  ActiveDocumentChanged{{The active tab changed}}
  Ready --> ActiveDocumentChanged
  ActiveDocumentChanged --> FindRootFile
  FindRootFile --> Parse --> Ready
  ActiveDocumentSaved{{The active document saved}}
  Ready --> ActiveDocumentSaved
  ActiveDocumentSaved --> Build
  Build["Build the root file"]
  Parse["Parse files"]
  BuildCommand{{build command invoked}}
  Ready --> BuildCommand
  BuildCommand --> Build
  Build --> Parse
  ActiveTextChanged{{The active document edited}}
  Ready --> ActiveTextChanged
  ActiveTextChanged --> Parse
```
