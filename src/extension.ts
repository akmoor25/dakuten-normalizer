import * as vscode from 'vscode';
import { findDakuten } from './dakutenAnalyzer';
import { DakutenCodeActionProvider } from './DakutenCodeActionProvider';

let diagnosticCollection: vscode.DiagnosticCollection;
let decorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
    // Decoration Type (ハイライト用)
    decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 165, 0, 0.3)', // 薄いオレンジ色
        border: '1px dotted rgba(255, 165, 0, 1)'
    });

    // Diagnostic Collection (Problems パネル用)
    diagnosticCollection = vscode.languages.createDiagnosticCollection('dakuten-normalizer');
    context.subscriptions.push(diagnosticCollection);

    // Code Action Provider の登録
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        '*', // 全てのファイルタイプ
        new DakutenCodeActionProvider(),
        {
            providedCodeActionKinds: DakutenCodeActionProvider.providedCodeActionKinds
        }
    );
    context.subscriptions.push(codeActionProvider);

    // ドキュメント変更時・アクティブエディタ変更時のイベントリスナー
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                updateDecorationsAndDiagnostics(editor.document);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            updateDecorationsAndDiagnostics(event.document);
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            updateDecorationsAndDiagnostics(document);
        })
    );

    // 初期化時、現在アクティブなエディタに対して処理を実行
    if (vscode.window.activeTextEditor) {
        updateDecorationsAndDiagnostics(vscode.window.activeTextEditor.document);
    }

    // コマンドの実装: 全て一括正規化
    let disposableCommand = vscode.commands.registerCommand('dakuten-normalizer.normalizeAll', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor.');
            return;
        }

        const document = editor.document;
        const text = document.getText();
        const matches = findDakuten(text);

        if (matches.length === 0) {
            vscode.window.showInformationMessage('No combinable dakuten/handakuten found in the current document.');
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        for (const match of matches) {
            // ドキュメント全体の文字列に対するインデックスから vscode.Range を算出するのは少し手間なので、
            // positionAt() を使う
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match.length);
            const range = new vscode.Range(startPos, endPos);
            edit.replace(document.uri, range, match.normalized);
        }

        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            vscode.window.showInformationMessage(`Successfully normalized ${matches.length} dakuten/handakuten characters.`);
        } else {
            vscode.window.showErrorMessage('Failed to apply normalizations.');
        }
    });
    context.subscriptions.push(disposableCommand);
}

function updateDecorationsAndDiagnostics(document: vscode.TextDocument) {
    const text = document.getText();
    const matches = findDakuten(text);
    
    const diagnostics: vscode.Diagnostic[] = [];
    const decorations: vscode.DecorationOptions[] = [];

    for (const match of matches) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match.length);
        const range = new vscode.Range(startPos, endPos);

        // Decoration
        decorations.push({ range });

        // Diagnostic
        const diagnostic = new vscode.Diagnostic(
            range,
            `Combining character detected: can be normalized to '${match.normalized}' (NFC)`,
            vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'dakuten-normalizer';
        diagnostics.push(diagnostic);
    }

    // Set Diagnostics
    diagnosticCollection.set(document.uri, diagnostics);

    // Set Decorations (Only if this document is currently active in any editor)
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.toString() === document.uri.toString()) {
            editor.setDecorations(decorationType, decorations);
        }
    }
}

export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }
    if (decorationType) {
        decorationType.dispose();
    }
}
