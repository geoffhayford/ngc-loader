import 'ts-metadata-collector';
import 'reflect-metadata';
import {singleTsc, check} from './single_tsc';

function ngcLoader(source, sourceMaps) {
  this.PARSED_SOURCES = [];
  this.PARSED_SOURCES.push(source);
  try {
    this.cacheable && this.cacheable();
    var compiler = this._compiler,
        compilation = this._compilation;

    let configRead = singleTsc.readConfiguration(compiler.context, compiler.context);
    check(configRead.parsed.errors);

    let parsedSource = singleTsc.recieveAndEmitSingle(source);
    check(parsedSource.diagnostics) && this.PARSED_SOURCES.push(parsedSource);

    console.log(this.PARSED_SOURCES);

    this.callback(null, parsedSource.outputText, sourceMaps);
  } catch (error) {
    console.error(error);
  }
}

export default ngcLoader;