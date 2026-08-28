import * as vscode from 'vscode';
import { findDakuten } from './dakutenAnalyzer';

export class DakutenCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        
        // Code Actions can be triggered in two ways:
        // 1. By diagnostic (Diagnostics exist in context)
        // 2. By cursor selection over the dakuten

        const actions: vscode.CodeAction[] = [];

        // 1. Diagnostic からのクイックフィックス生成
        const diagnostics = context.diagnostics.filter(d => d.source === 'dakuten-normalizer');
        for (const diagnostic of diagnostics) {
            const text = document.getText(diagnostic.range);
            // 文字列中に含まれる濁点を再検索して修正案を作る
            const matches = findDakuten(text);
            if (matches.length > 0) {
                // 1つのDiagnosticにつき、1つだけマッチすると想定
                const match = matches[0];
                const action = new vscode.CodeAction(`Convert to NFC (${match.normalized})`, vscode.CodeActionKind.QuickFix);
                action.edit = new vscode.WorkspaceEdit();
                action.edit.replace(document.uri, diagnostic.range, match.normalized);
                action.diagnostics = [diagnostic];
                action.isPreferred = true;
                actions.push(action);
            }
        }

        // もし Diagnostic が無い場合でも、カーソル位置のテキストを見て提案する
        if (actions.length === 0) {
            // 現在の行のテキストを取得して、カーソルが含まれる範囲の結合文字を探す
            const line = document.lineAt(range.start.line);
            const matches = findDakuten(line.text);

            for (const match of matches) {
                // match.index は UTF-16ベースのインデックス。vscode の Position の character も UTF-16 ベース。
                const matchRange = new vscode.Range(
                    range.start.line, match.index,
                    range.start.line, match.index + match.length
                );

                // カーソルが結合文字の範囲内にあるか判定
                if (matchRange.intersection(range)) {
                    const action = new vscode.CodeAction(`Convert to NFC (${match.normalized})`, vscode.CodeActionKind.QuickFix);
                    action.edit = new vscode.WorkspaceEdit();
                    action.edit.replace(document.uri, matchRange, match.normalized);
                    action.isPreferred = true;
                    actions.push(action);
                }
            }
        }

        // 3. ファイル内の一括修正 (Fix all) の提供
        // ドキュメント全体からすべての濁点・半濁点を検索
        const allMatches = findDakuten(document.getText());
        if (allMatches.length > 1) { // 複数存在する場合に一括修正を提案
            const fixAllAction = new vscode.CodeAction('Fix all combining dakuten in file', vscode.CodeActionKind.QuickFix);
            const fixAllEdit = new vscode.WorkspaceEdit();
            
            for (const m of allMatches) {
                const startPos = document.positionAt(m.index);
                const endPos = document.positionAt(m.index + m.length);
                fixAllEdit.replace(document.uri, new vscode.Range(startPos, endPos), m.normalized);
            }
            
            fixAllAction.edit = fixAllEdit;
            if (diagnostics.length > 0) {
                fixAllAction.diagnostics = diagnostics;
            }
            actions.push(fixAllAction);
        }

        return actions;
    }
}
