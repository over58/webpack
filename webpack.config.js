const path = require('path')

let options ={
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'main.js'
  }
}

const fs = require('fs')
const parser = require('@babel/parser')
const traverse = require("@babel/traverse").default;
const { transformFromAst } = require("@babel/core");

const Parser = {
  getAst: path =>{
    const content = fs.readFileSync(path, 'utf-8')

    return parser.parse(content, {
      sourceType: 'module'
    })
  },
  getDependecies (ast, filename) {
    const dependencies = {}
    traverse(ast, {
      ImportDeclaration({node}) {
        const dirname = path.dirname(filename);
        const filepath = "./" + path.join(dirname, node.source.value) + '.js';
        dependencies[node.source.value] = filepath;
      }
    });
    return dependencies;
  },
  getCode (ast) {
    const { code } = transformFromAst(ast, null, {
      presets: ['@babel/preset-env']
    })
    return code
  }
}

class Compiler {
  constructor(options) {
    const { entry, output } = options;
    this.entry = entry;
    this.output = output;
    // 模块
    this.modules = [];
  }

  run () {
    // 解析文件入口
    const info = this.build(this.entry)
    this.modules.push(info)
    this.modules.forEach(({ dependecies }) => {
      // 判断有依赖对象,递归解析所有依赖项
      if (dependecies) {
        for (const dependecy in dependecies) {
          this.modules.push(this.build(dependecies[dependecy]));
        }
      }
    });
    // 生成依赖关系图

    const dependcyGraph = this.modules.reduce((graph, item) => {
      return {
        ...graph,
        [item.filename]: {
          dependecies: item.dependecies,
          code: item.code
        }
      }
    }, {})
    console.log(dependcyGraph)
    this.generate(dependcyGraph);
  }

  // 构建启动
  build(filename) {
    const { getAst, getDependecies, getCode } = Parser;    
    const ast = getAst(filename)   
    const dependecies = getDependecies(ast, filename);
    const code = getCode(ast)
    return {
      // 文件路径,可以作为每个模块的唯一标识符
      filename,
      // 依赖对象,保存着依赖模块路径
      dependecies,
      // 文件内容
      code
    };
  }

  // 重写require函数，输出bundle
  generate(code) {
    const filePath = path.join(this.output.path, this.output.filename)

    const bundle =   `(function(graph){      function require(module){        function localRequire(relativePath){          return require(graph[module].dependecies[relativePath])        }        var exports = {};        (function(require,exports,code){          eval(code)        })(localRequire,exports,graph[module].code);        return exports;      }      require('${this.entry}')    })(${JSON.stringify(code)})`

    // 把文件内容写入到文件系统
    fs.writeFileSync(filePath, bundle, 'utf-8')
  }
}


new Compiler(options).run()
