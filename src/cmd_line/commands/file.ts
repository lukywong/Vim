"use strict";

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as node from "../node";

export enum FilePosition {
  CurrentWindow,
  NewWindow
}

export interface IFileCommandArguments extends node.ICommandArgs {
  name?: string;
  position?: FilePosition;
}

export class FileCommand extends node.CommandBase {
  protected _arguments: IFileCommandArguments;

  constructor(args : IFileCommandArguments) {
    super();
    this._name = 'file';
    this._arguments = args;
  }

  get arguments() : IFileCommandArguments {
    return this._arguments;
  }

  getActiveViewColumn(): vscode.ViewColumn {
    const active = vscode.window.activeTextEditor;

    if (!active) {
      return vscode.ViewColumn.One;
    }

    return active.viewColumn;
  }

  getViewColumnToRight() : vscode.ViewColumn {
    const active = vscode.window.activeTextEditor;

    if (!active) {
      return vscode.ViewColumn.One;
    }

    switch (active.viewColumn) {
      case vscode.ViewColumn.One:
        return vscode.ViewColumn.Two;
      case vscode.ViewColumn.Two:
        return vscode.ViewColumn.Three;
    }

    return active.viewColumn;
  }

  async execute(): Promise<void> {
    if (!this._arguments.name) {
      // Open an empty file
      if (this._arguments.position === FilePosition.CurrentWindow) {
        await vscode.commands.executeCommand("workbench.action.files.newUntitledFile");
      } else {
        await vscode.commands.executeCommand("workbench.action.splitEditor");
      }

      return;
    }

    let currentFilePath = vscode.window.activeTextEditor.document.uri.path;
    let newFilePath = path.isAbsolute(this._arguments.name) ?
      this._arguments.name :
      path.join(path.dirname(currentFilePath), this._arguments.name);

    if (newFilePath !== currentFilePath) {
      const newFileDoesntExist = !await this.fileExists(newFilePath);
      const newFileHasNoExtname = path.extname(newFilePath) === '';
      if (newFileDoesntExist && newFileHasNoExtname) {
        const pathWithExtname = newFilePath + path.extname(currentFilePath);
        if (await this.fileExists(pathWithExtname)) {
          newFilePath = pathWithExtname;
        }
      }

      let folder = vscode.Uri.file(newFilePath);
      await vscode.commands.executeCommand("vscode.open", folder,
        this._arguments.position === FilePosition.NewWindow ? this.getViewColumnToRight() : this.getActiveViewColumn());
    }
  }

  protected async fileExists(filePath: string) {
    return new Promise<boolean>((resolve, reject) => {
      fs.stat(filePath, async (error, stat) => {
        resolve(!error);
      });
    });
  }
}
