// server/src/server.ts - 언어 서버 핵심 파일
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// 연결 생성
const connection = createConnection(ProposedFeatures.all);
// 문서 관리자 생성
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // 필요에 따라 추가 기능 설정
    },
  };
  return result;
});

// 문서 내용이 변경될 때마다 유효성 검사 실행
documents.onDidChangeContent((change) => {
  validateNovelLang(change.document);
});

// novellang 유효성 검사 함수
async function validateNovelLang(textDocument: TextDocument): Promise<void> {
  // 모든 텍스트 가져오기
  const text = textDocument.getText();

  // 진단 배열 생성
  const diagnostics: Diagnostic[] = [];

  // 여기서 novellang 문법 규칙에 따라 검사 로직 구현
  // 예시: 특정 패턴 검사
  const pattern = /부적절한패턴/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: textDocument.positionAt(match.index),
        end: textDocument.positionAt(match.index + match[0].length),
      },
      message: `'${match[0]}'는 올바른 novellang 문법이 아닙니다.`,
      source: 'novellang',
    };

    diagnostics.push(diagnostic);
  }

  // 진단 정보 보내기
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// 문서 관리자와 연결 초기화
documents.listen(connection);
connection.listen();
