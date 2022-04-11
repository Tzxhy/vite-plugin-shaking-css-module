# vite-plugin-shaking-css-module
用于去除 vue3 css module 中未引用的样式。

例如：
style.less 文件（独立 SFC 样式文件）：
```less
.test() {
    background-color: white;
}
// 被 template 引用
.app3 {
    .test;
    color: yellow;
}
```

.vue 文件（SFC 单组件，包含内嵌 style 标签）:
```vue
<template>
    <img :class="css.app" alt="Vue logo" src="./assets/logo.png" />
    <span :class="css.app3">{{ count }}</span>
</template>
<script>
// 略

import {
    ref, useCssModule,
} from 'vue';
const css = useCssModule('css');
// 引用 app2
console.log('css: ', css.app2);
</script>
<style lang="less" module="css">
@import "./style.less"; // 引用上面的样式文件
// 被 template 引用
.app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
// 被 script 引用
.app2 {
    margin-top: 60px;
}
</style>

```

main.ts 中可引用公共样式（不会被 tree shaking）：
```ts
import './public.less';
```

public.less文件：
```less
// 即使没有显式引用，也不会被剔除，因为没有作为 vue SFC 的样式
#root {
    background-color: blue;
}
body {
    color: #666
}
```

则打包后，css文件只会包含：.app， .app3，.app2 和非 SFC 样式。其余未被依赖的样式将被剔除，如：
```css
#root{background-color:#00f}body{color:#666}._app3_368a9{background-color:#fff;color:#ff0}._app_b4102{font-family:Avenir,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-align:center;color:#2c3e50;margin-top:60px}._app2_87af3{margin-top:60px}

```

# 引入方式
在 `vite.config.js` 中声明插件：

```js
// 引入插件
import pureCss from '@tzxhy/vite-plugin-shaking-css-module';
import vue from '@vitejs/plugin-vue';

export default defineConfig((env) => {
    // 插件
    const pureCssPlugin = pureCss();
	// 插件位置在 vue 插件之后
    const plugins = [vue(), pureCssPlugin];
    
    return {
        css: {
            modules: {
				// 必要步骤，用于替换内置的 css 模块名命名方式
                generateScopedName: pureCssPlugin.generateScopedName,
            },
        },
        plugins,
    };
});
```

# 其他
当前仅能分析出 template 和 script 中直接使用 CssModulesName.moduleName (或者 CssModulesName['moduleName]) 和 useCssModule 的形式获取依赖；对于动态求值类型，无法计算。当出现这种情况时，可以在 script 中增加引用，如：
```vue
<template>
	<div :class="'dynamicModule' + no" />
</template>
<script>
// 略
import {
    ref, useCssModule,
} from 'vue';
const css = useCssModule('css');
const no = ref(1); // 1 或者 2

// 依赖检测注入
(css.dynamicModule1, css.dynamicModule2);
</script>
```

# 贡献&提问
如有问题，可以在[仓库](https://github.com/Tzxhy/vite-plugin-shaking-css-module)内提issue。欢迎共建。
