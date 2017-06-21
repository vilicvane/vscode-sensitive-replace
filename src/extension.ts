'use strict';

import * as vscode from 'vscode';

interface CasePattern {
  regex: RegExp;
  build(words: string[], groups: RegExpExecArray): string;
}

const patterns: CasePattern[] = [
  {
    regex: /^(_*)[A-Z]+(?=_|$)/,
    build(words, groups) {
      return groups[1] + words.map(word => word.toUpperCase()).join('_');
    },
  },
  {
    regex: /[-._/\\: ]/,
    build(words, groups) {
      return words
        .map(word => replace(word, [word]) || word)
        .join(groups[0]);
    },
  },
  {
    regex: /^[a-z][a-z\d]*(?=[A-Z]|$)/,
    build(words) {
      return format(words[0], true) + words.slice(1).map(word => format(word)).join('');

      function format(word: string, first = false): string {
        if (/^[A-Z\d]+$/.test(word)) {
          return first ? word.toLowerCase() : word;
        } else {
          word = word.toLowerCase();
          return first ? word : word[0].toUpperCase() + word.slice(1);
        }
      }
    },
  },
  {
    regex: /^[A-Z][a-z\d]*(?=[A-Z]|$)/,
    build(words) {
      return format(words[0]) + words.slice(1).map(word => format(word)).join('');

      function format(word: string): string {
        return word[0].toUpperCase() + word.slice(1);
      }
    },
  },
];

function replace(text: string, words: string[]): string | undefined {
  for (let pattern of patterns) {
    let groups = pattern.regex.exec(text);

    if (groups) {
      return pattern.build(words, groups);
    }
  }

  return undefined;
}

function split(text: string): string[] {
  let precededByNumber = false;

  return text
    .split(/[^a-z\d]+/i)
    .filter(part => !!part)
    .reduce<string[]>((allWords, part) => {
      let words = part
        .replace(/[A-Z]+(?=[A-Z][a-z]|$)|[A-Z]|(\d+)|([a-z])/g, (text: string, digits: string, lowerChar: string, index: number) => {
          if (index) {
            if (precededByNumber) {
              precededByNumber = !!digits;
              return ` ${text}`;
            }

            precededByNumber = !!digits;

            if (lowerChar) {
              return text;
            } else {
              return ` ${text}`;
            }
          } else {
            return text;
          }
        })
        .split(' ');

      return allWords.concat(words);
    }, []);
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerTextEditorCommand('sensitive.replace', async editor => {
    let selections = editor.selections;

    if (!selections.length) {
      return;
    }

    let document = editor.document;

    let text = await vscode.window.showInputBox({
      placeHolder: 'Replace (e.g.: "hello world")',
    });

    if (typeof text !== 'string') {
      return;
    }

    let words = split(text);

    await editor.edit(builder => {
      for (let selection of selections) {
        let replacement = replace(document.getText(selection), words);
        builder.replace(selection, replacement || text!);
      }
    });
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
