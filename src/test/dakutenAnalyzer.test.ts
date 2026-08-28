import * as assert from 'assert';
import { findDakuten } from '../dakutenAnalyzer';

describe('dakutenAnalyzer', () => {
    it('ひらがなの正常系: か\u3099 -> が', () => {
        const text = 'か\u3099';
        const matches = findDakuten(text);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].original, 'か\u3099');
        assert.strictEqual(matches[0].normalized, 'が');
    });

    it('カタカナの正常系: カ\u3099 -> ガ', () => {
        const text = 'カ\u3099';
        const matches = findDakuten(text);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].normalized, 'ガ');
    });

    it('半濁点の正常系: は\u309A -> ぱ、 ハ\u309A -> パ', () => {
        const text1 = 'は\u309A';
        const text2 = 'ハ\u309A';
        const matches1 = findDakuten(text1);
        const matches2 = findDakuten(text2);
        assert.strictEqual(matches1[0].normalized, 'ぱ');
        assert.strictEqual(matches2[0].normalized, 'パ');
    });

    it('非正規化文字: あ\u3099 や 漢字\u3099 は無視されること', () => {
        const text = 'あ\u3099と漢字\u309AとA\u3099';
        const matches = findDakuten(text);
        // NFC化しても結合されないため無視（対象外）となる
        assert.strictEqual(matches.length, 0);
    });

    it('連続する結合文字: か\u3099\u3099 -> が', () => {
        const text = 'か\u3099\u3099';
        const matches = findDakuten(text);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].original, 'か\u3099\u3099');
        assert.strictEqual(matches[0].normalized, 'が'); // 余分な濁点は削除され「が」となること
    });

    it('行頭の結合文字: 単独の \u3099 は無視されること', () => {
        const text = '\u3099あいうえお';
        const matches = findDakuten(text);
        // baseChar が存在しないため無視される
        assert.strictEqual(matches.length, 0);
    });

    it('結合文字を含まないテキストは無視されること', () => {
        const text = 'がぎぐげごパピプペポ';
        const matches = findDakuten(text);
        assert.strictEqual(matches.length, 0);
    });

    it('サロゲートペア: 𠮷\u3099 のような文字は無視されること', () => {
        const text = '𠮷\u3099';
        const matches = findDakuten(text);
        // 𠮷 は結合しないため無視される
        assert.strictEqual(matches.length, 0);
    });

    it('文中の複数の結合文字を正しく検出すること', () => {
        const text = 'これはい\u3099ちこ\u3099て\u3099す。';
        const matches = findDakuten(text);
        // 「い\u3099」は結合しないので無視される
        // 「こ\u3099」 -> ご
        // 「て\u3099」 -> で
        assert.strictEqual(matches.length, 2);
        assert.strictEqual(matches[0].original, 'こ\u3099');
        assert.strictEqual(matches[0].normalized, 'ご');
        assert.strictEqual(matches[0].index, 6); 
        assert.strictEqual(matches[1].original, 'て\u3099');
        assert.strictEqual(matches[1].normalized, 'で');
        assert.strictEqual(matches[1].index, 8);
        // "これはい\u3099ちこ\u3099て\u3099す。"
        // 0: こ
        // 1: れ
        // 2: は
        // 3: い
        // 4: \u3099
        // 5: ち
        // 6: こ
        // 7: \u3099
        // 8: て
        // 9: \u3099
        assert.strictEqual(matches[0].index, 6);
        assert.strictEqual(matches[1].index, 8);
    });
});
