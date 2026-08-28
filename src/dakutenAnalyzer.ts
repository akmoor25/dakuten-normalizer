export interface DakutenMatch {
    index: number;
    length: number;
    original: string;
    normalized: string;
}

export function findDakuten(text: string): DakutenMatch[] {
    const matches: DakutenMatch[] = [];
    // 任意の1文字（サロゲートペア対応）に続く1個以上の結合文字(U+3099, U+309A)、
    // または行頭など先行文字がない場合の結合文字をマッチさせる
    const regex = /(?:.)?[\u3099\u309A]+/gsu;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const original = match[0];
        let normalized = original.normalize('NFC');

        // NFC正規化しても変化がない場合（あ\u3099 など）のハンドリング
        if (original === normalized) {
            // ここでは警告対象外とする（無視する）仕様とする
            continue;
        }

        // 連続する結合文字 (か\u3099\u3099) の場合、NFC化すると が\u3099 のようになるため、
        // 完全に結合文字を取り除くために再度NFC化、あるいは置換後の文字列から余分な結合文字を削除する。
        // 文字列から \u3099 と \u309A をすべて削除したものをベース文字とし、
        // それを最初の結合文字と組み合わせてNFC化するのが確実。
        const baseChar = original.replace(/[\u3099\u309A]/g, '');
        const firstMark = original.match(/[\u3099\u309A]/)?.[0] || '';
        
        if (baseChar && firstMark) {
             const preNFC = baseChar + firstMark;
             const postNFC = preNFC.normalize('NFC');
             if (preNFC !== postNFC) {
                 normalized = postNFC; // 余分な結合文字を落とした綺麗な状態
             }
        } else if (!baseChar) {
             // 結合文字のみの場合、正規化しようがないため無視
             continue;
        }

        matches.push({
            index: match.index,
            length: original.length, // 正規表現でマッチした全体の長さ（UTF-16のlength）
            original,
            normalized
        });
    }

    return matches;
}
