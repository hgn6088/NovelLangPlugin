import * as vscode from 'vscode';

// 소설 요소들을 저장할 데이터 구조
interface Character {
  name: string;
  age?: number;
  description?: string;
  traits?: string[];
  locations?: Set<string>; // 캐릭터가 등장한 위치
  timeline?: Map<string, string>; // 시간별 캐릭터 상태
}

interface Setting {
  name: string;
  location: string;
  time?: string;
  description?: string;
}

interface Event {
  name: string;
  time?: string;
  participants?: string[];
  description?: string;
  consequences?: string[];
}

interface NovelData {
  characters: Map<string, Character>;
  settings: Map<string, Setting>;
  events: Map<string, Event>;
  timeline: Map<string, Set<string>>; // 시간별 이벤트
}

// 전역 변수로 소설 데이터 저장
let novelData: NovelData = {
  characters: new Map(),
  settings: new Map(),
  events: new Map(),
  timeline: new Map(),
};

export function activate(context: vscode.ExtensionContext) {
  console.log('novellang extension is now active!');

  // 파일 열릴 때 파싱
  vscode.workspace.onDidOpenTextDocument(parseDocument);

  // 파일 저장 시 파싱
  vscode.workspace.onDidSaveTextDocument(parseDocument);

  // 현재 열린 모든 문서 파싱
  if (vscode.window.activeTextEditor) {
    parseDocument(vscode.window.activeTextEditor.document);
  }

  // 스토리 일관성 검사 명령 등록
  const disposable = vscode.commands.registerCommand(
    'novellang.checkConsistency',
    () => {
      checkStoryConsistency();
    }
  );

  context.subscriptions.push(disposable);

  // 자동 완성 제공자 등록
  const provider = vscode.languages.registerCompletionItemProvider(
    'novellang',
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        const linePrefix = document
          .lineAt(position)
          .text.substr(0, position.character);

        // 키워드 자동 완성
        if (linePrefix.endsWith('')) {
          const keywords = [
            'character',
            'setting',
            'event',
            'timeline',
            'scene',
            'chapter',
          ];
          return keywords.map((keyword) => {
            const completionItem = new vscode.CompletionItem(
              keyword,
              vscode.CompletionItemKind.Keyword
            );
            completionItem.insertText = keyword + ' ';
            return completionItem;
          });
        }

        // 캐릭터 이름 자동 완성
        if (linePrefix.match(/\w+:\s*$/)) {
          return Array.from(novelData.characters.keys()).map((name) => {
            const completionItem = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Variable
            );
            completionItem.insertText = name;
            return completionItem;
          });
        }

        return undefined;
      },
    }
  );

  context.subscriptions.push(provider);
}

// 문서 파싱 함수
function parseDocument(document: vscode.TextDocument) {
  if (document.languageId !== 'novellang') {
    return;
  }

  // 새로 파싱하기 전에 데이터 초기화
  novelData = {
    characters: new Map(),
    settings: new Map(),
    events: new Map(),
    timeline: new Map(),
  };

  const text = document.getText();

  // 정규식으로 캐릭터, 설정, 이벤트 파싱
  // 캐릭터 파싱
  const characterRegex = /character\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([^}]*)\}/g;
  let match;

  while ((match = characterRegex.exec(text)) !== null) {
    const charName = match[1];
    const charContent = match[2];

    const character: Character = {
      name: charName,
      locations: new Set(),
      timeline: new Map(),
    };

    // 캐릭터 속성 파싱
    const ageMatch = charContent.match(/age\s*:\s*(\d+)/);
    if (ageMatch) {
      character.age = parseInt(ageMatch[1]);
    }

    const descMatch = charContent.match(/description\s*:\s*"([^"]*)"/);
    if (descMatch) {
      character.description = descMatch[1];
    }

    const traitsMatch = charContent.match(/traits\s*:\s*\[(.*)\]/);
    if (traitsMatch) {
      character.traits = traitsMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/"/g, ''));
    }

    novelData.characters.set(charName, character);
  }

  // 설정 파싱
  const settingRegex = /setting\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([^}]*)\}/g;
  while ((match = settingRegex.exec(text)) !== null) {
    const settingName = match[1];
    const settingContent = match[2];

    const locationMatch = settingContent.match(/location\s*:\s*"([^"]*)"/);
    if (locationMatch) {
      const setting: Setting = {
        name: settingName,
        location: locationMatch[1],
      };

      const timeMatch = settingContent.match(/time\s*:\s*"([^"]*)"/);
      if (timeMatch) {
        setting.time = timeMatch[1];
      }

      const descMatch = settingContent.match(/description\s*:\s*"([^"]*)"/);
      if (descMatch) {
        setting.description = descMatch[1];
      }

      novelData.settings.set(settingName, setting);
    }
  }

  // 이벤트 파싱
  const eventRegex = /event\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([^}]*)\}/g;
  while ((match = eventRegex.exec(text)) !== null) {
    const eventName = match[1];
    const eventContent = match[2];

    const event: Event = {
      name: eventName,
    };

    const timeMatch = eventContent.match(/time\s*:\s*"([^"]*)"/);
    if (timeMatch) {
      event.time = timeMatch[1];

      // 타임라인에 이벤트 추가
      if (!novelData.timeline.has(timeMatch[1])) {
        novelData.timeline.set(timeMatch[1], new Set());
      }
      novelData.timeline.get(timeMatch[1])?.add(eventName);
    }

    const participantsMatch = eventContent.match(/participants\s*:\s*\[(.*)\]/);
    if (participantsMatch) {
      event.participants = participantsMatch[1]
        .split(',')
        .map((p) => p.trim().replace(/"/g, ''));

      // 각 캐릭터의 타임라인에 이벤트 추가
      if (event.time) {
        event.participants.forEach((charName) => {
          const character = novelData.characters.get(charName);
          if (character && character.timeline) {
            character.timeline.set(event.time as string, eventName);
          }
        });
      }
    }

    const descMatch = eventContent.match(/description\s*:\s*"([^"]*)"/);
    if (descMatch) {
      event.description = descMatch[1];
    }

    const consequencesMatch = eventContent.match(/consequences\s*:\s*\[(.*)\]/);
    if (consequencesMatch) {
      event.consequences = consequencesMatch[1]
        .split(',')
        .map((c) => c.trim().replace(/"/g, ''));
    }

    novelData.events.set(eventName, event);
  }

  // 정보 파싱 완료 로그
  console.log('Parsed novel data:', novelData);
}

// 스토리 일관성 검사 함수
function checkStoryConsistency() {
  const diagnostics = new Map<string, vscode.Diagnostic[]>();
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document.languageId !== 'novellang') {
    vscode.window.showInformationMessage(
      'Please open a novellang file to check consistency.'
    );
    return;
  }

  const document = editor.document;
  const issues: vscode.Diagnostic[] = [];

  // 타임라인 일관성 검사
  novelData.timeline.forEach((events, time) => {
    events.forEach((eventName) => {
      const event = novelData.events.get(eventName);
      if (event && event.participants) {
        event.participants.forEach((charName) => {
          const character = novelData.characters.get(charName);
          if (!character) {
            // 이벤트에 존재하지 않는 캐릭터 참조
            const regex = new RegExp(`participants\\s*:.*"${charName}"`, 'g');
            const text = document.getText();
            let match;

            while ((match = regex.exec(text)) !== null) {
              const position = document.positionAt(match.index);
              const range = new vscode.Range(
                position,
                document.positionAt(match.index + match[0].length)
              );

              const diagnostic = new vscode.Diagnostic(
                range,
                `Character '${charName}' referenced in event '${eventName}' but not defined.`,
                vscode.DiagnosticSeverity.Error
              );

              issues.push(diagnostic);
            }
          }
        });
      }
    });
  });

  // 캐릭터 동시 위치 충돌 검사
  // (실제 구현에서는 더 복잡한 논리가 필요)

  // 다이어그램 표시
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection('novellang');
  diagnosticCollection.set(document.uri, issues);

  if (issues.length > 0) {
    vscode.window.showWarningMessage(
      `Found ${issues.length} consistency issues in your story.`
    );
  } else {
    vscode.window.showInformationMessage(
      'No consistency issues found in your story. Great job!'
    );
  }
}

export function deactivate() {
  // 확장 프로그램 비활성화 시 정리 작업
}
