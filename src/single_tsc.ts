import * as ts from 'typescript';
import {Tsc} from '@angular/tsc-wrapped/src/tsc';
import {AngularCompilerOptions} from '@angular/tsc-wrapped';
import {CodeGenerator} from '@angular/compiler-cli';

var path = require('path');
var fs = require('fs');

const DEBUG = true;
const SOURCE_EXTENSION = /\.[jt]s$/;

function debug(msg: string, ...o: any[]) {
  if (DEBUG) console.log(msg, ...o);
}

export function formatDiagnostics(diags: ts.Diagnostic[]): string {
  return diags.map((d) => {
                let res = ts.DiagnosticCategory[d.category];
                if (d.file) {
                  res += ' at ' + d.file.fileName + ':';
                  const {line, character} = d.file.getLineAndCharacterOfPosition(d.start);
                  res += (line + 1) + ':' + (character + 1) + ':';
                }
                res += ' ' + ts.flattenDiagnosticMessageText(d.messageText, '\n');
                return res;
              })
      .join('\n');
}

export function check(diags: ts.Diagnostic[]) {
  if (diags && diags.length && diags[0]) {
    throw new Error(formatDiagnostics(diags));
  }
}

export class SingleTsc extends Tsc {
  // Make sure that this.readConfiguration() is performed from outside
  public parsedSingle: ts.TranspileOutput;
  public parsed: ts.ParsedCommandLine;
  private singleBasePath: string;

  readConfiguration(project: string, singleBasePath: string) {
    this.singleBasePath = singleBasePath;

    // Allow a directory containing tsconfig.json as the project value
    if (fs.lstatSync(project).isDirectory()) {
      project = path.join(project, "tsconfig.json");
    }

    const {config, error} = ts.readConfigFile(project, ts.sys.readFile);
    check([error]);

    this.parsed = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      singleBasePath
    );

    check(this.parsed.errors);
    // Default codegen goes to the current directory
    // Parsed options are already converted to absolute paths
    this.ngOptions = config.angularCompilerOptions || <AngularCompilerOptions>{};
    this.ngOptions.genDir = path.join(singleBasePath, this.ngOptions.genDir || '.');
    return {parsed: this.parsed, ngOptions: this.ngOptions};
  }

  recieveAndEmitSingle(source: string) {
  	this.parsedSingle = ts.transpileModule(source, this.parsed.options);
  	check(this.parsedSingle.diagnostics);

    this.ngOptions.genDir = path.join(this.singleBasePath, this.ngOptions.genDir || '.');
    this.ngOptions.basePath = '.';

    try {
      let compilerHost = ts.createCompilerHost(this.parsed.options);

      let program = ts.createProgram(this.parsed.fileNames, this.parsed.options,
          compilerHost);
      CodeGenerator.create(this.ngOptions, program, compilerHost).codegen();
    } catch (error) {
      console.error(error);
    }

    return this.parsedSingle;
  }
}

export var singleTsc: SingleTsc = new SingleTsc();