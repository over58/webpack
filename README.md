### 描述
实现一个简易的webpack,用于了解webpack大致的工作机制

### webpack工作机制
1. 初始化entry、output
2. 解析entry，利用@babel/parser获取AST, 并将AST转换为code
3. 解析文件中的import语句时，视为当前文件（模块）的依赖，递归解析构建一个依赖图
4. 重写require， 输入bundle
