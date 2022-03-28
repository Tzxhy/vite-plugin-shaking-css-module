# vite-plugin-shaking-css-module
用于去除vue3中采用 \<style module\> 中未引用的样式（css module tree shaking）。

例如：
style.less 文件（独立 SFC 样式文件）：
```less
.test() {
    background-color: white;
}
// 被引用
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

// 当前版本暂不支持在 script 引用 css module 时保留样式，如：
/*
import {
    ref, useCssModule,
} from 'vue';
const css = useCssModule('css');
console.log('css: ', css.app2);
*/
// 即使在 script 中引用了 app2，但由于没有在 template 中显示引用，app2 的样式将不会被保留，将在下一版本修复。
</script>
<style lang="less" module="css">
@import "./style.less"; // 引用上面的样式文件
// 被引用
.app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
.app2 {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
</style>

```

main.js 中可引用公共样式（不会被 tree shaking）：
```js
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

则打包后，css文件只会包含：.app， .app3 和非 SFC 样式。其余违背依赖的样式将被剔除，如：
```css
#root{background-color:#00f}body{color:#666}._app3_368a9{background-color:#fff;color:#ff0}._app_b4102{font-family:Avenir,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-align:center;color:#2c3e50;margin-top:60px}

```

# 引入方式
在 `vite.config.js` 中声明插件：

```js
// vite.config.js
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
