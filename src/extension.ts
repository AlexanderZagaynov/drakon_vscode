import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const provider = new DrakonEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      DrakonEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('drakonViewer.exportActiveDiagram', async () => {
      await provider.exportActiveDiagram();
    })
  );
}

export function deactivate() {
  // no-op
}

class DrakonEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'drakonViewer.drakonEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}
  private readonly panels = new Map<string, vscode.WebviewPanel>();

  private async handleExport(
    document: vscode.TextDocument,
    format: 'svg' | 'png' | 'webp',
    data: string
  ): Promise<void> {
    const defaultFileName = document.uri.path.split('/').pop()?.replace('.drakon', '') || 'diagram';
    const extension = format === 'svg' ? 'svg' : format === 'png' ? 'png' : 'webp';

    // Use the same directory as the source .drakon file
    const sourceDir = vscode.Uri.joinPath(document.uri, '..');
    const defaultUri = vscode.Uri.joinPath(sourceDir, `${defaultFileName}.${extension}`);

    const uri = await vscode.window.showSaveDialog({
      defaultUri: defaultUri,
      filters: {
        [format.toUpperCase()]: [extension]
      }
    });

    if (!uri) {
      return;
    }

    try {
      let buffer: Buffer;

      if (format === 'svg') {
        buffer = Buffer.from(data, 'utf-8');
      } else {
        // For PNG and WebP, data is base64 encoded
        const base64Data = data.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      }

      await vscode.workspace.fs.writeFile(uri, buffer);
      vscode.window.showInformationMessage(`Diagram exported to ${uri.fsPath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export diagram: ${error}`);
    }
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    this.panels.set(document.uri.toString(), webviewPanel);

    webviewPanel.webview.options = {
      enableScripts: true
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    const updateWebview = () => {
      if (webviewPanel.webview) {
        webviewPanel.webview.postMessage({
          type: 'update',
          text: document.getText()
        });
      }
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (event.document.uri.toString() === document.uri.toString()) {
          updateWebview();
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      this.panels.delete(document.uri.toString());
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message?.type === 'ready') {
        updateWebview();
      } else if (message?.type === 'export') {
        await this.handleExport(document, message.format, message.data);
      }
    });

    updateWebview();
  }

  private getActiveDiagramUri(): vscode.Uri | undefined {
    const activeGroup = vscode.window.tabGroups.activeTabGroup;
    const activeTab = activeGroup?.activeTab;
    if (activeTab?.input instanceof vscode.TabInputCustom && activeTab.input.viewType === DrakonEditorProvider.viewType) {
      return activeTab.input.uri;
    }
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.languageId === 'drakon') {
      return editor.document.uri;
    }
    return undefined;
  }

  public async exportActiveDiagram(): Promise<void> {
    const uri = this.getActiveDiagramUri();
    if (!uri) {
      vscode.window.showWarningMessage('No active DRAKON diagram to export. Open a .drakon file first.');
      return;
    }
    const panel = this.panels.get(uri.toString());
    if (!panel) {
      vscode.window.showWarningMessage('Open the DRAKON diagram in the custom editor before exporting.');
      return;
    }

    const format = await vscode.window.showQuickPick(['svg', 'png', 'webp'], {
      title: 'Export Diagram As',
      placeHolder: 'Choose export format'
    });
    if (!format) {
      return;
    }

    panel.webview.postMessage({
      type: 'exportCommand',
      format
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'js', 'main.js')
    );
    const d3Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'd3.v7.min.js')
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'styles.css')
    );
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data: blob:; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};"
    />
    <link rel="stylesheet" href="${stylesUri}" />
    <title>DRAKON Diagram</title>
  </head>
  <body>
    <main>
      <div id="toolbar">
        <div class="toolbar-group">
          <span class="toolbar-label">Zoom:</span>
          <button class="export-btn" id="zoom-out" title="Zoom out">-</button>
          <button class="export-btn" id="zoom-in" title="Zoom in">+</button>
          <button class="export-btn" id="zoom-fit" title="Zoom to fit width">Fit</button>
          <button class="export-btn" id="zoom-actual" title="Zoom to 100%">100%</button>
        </div>
        <div class="toolbar-group">
          <span class="toolbar-label">Export:</span>
          <button class="export-btn" id="export-svg" title="Export as SVG">SVG</button>
          <button class="export-btn" id="export-png" title="Export as PNG">PNG</button>
          <button class="export-btn" id="export-webp" title="Export as WebP">WebP</button>
        </div>
      </div>
      <section id="diagram-container">
        <div id="diagram" aria-label="DRAKON diagram"></div>
      </section>
      <section id="errors" aria-live="polite"></section>
    </main>
    <script nonce="${nonce}" src="${d3Uri}"></script>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
