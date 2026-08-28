import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "dakuten-normalizer" is now active!');

    // TODO: Implement highlights, diagnostics (Problems), and quick fixes

    let disposable = vscode.commands.registerCommand('dakuten-normalizer.normalizeAll', () => {
        vscode.window.showInformationMessage('Normalize all command invoked!');
        // TODO: Implement bulk normalization
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
