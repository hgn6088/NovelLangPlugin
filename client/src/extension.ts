// client/src/extension.ts
import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // 서버 모듈 경로
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  // 서버 옵션
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  // 클라이언트 옵션
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'novellang' }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
  };

  // 클라이언트 생성 및 시작
  client = new LanguageClient(
    'novellangLanguageServer',
    'NovelLang Language Server',
    serverOptions,
    clientOptions
  );

  // 클라이언트 시작
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
