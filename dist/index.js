"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var core_1 = require("@babel/core");
var t = tslib_1.__importStar(require("@babel/types"));
var crypto_1 = tslib_1.__importDefault(require("crypto"));
function getRecurMemberExpressionName(path) {
    if (t.isMemberExpression(path)) {
        var ret = [];
        var childObj = path.node.object;
        if (t.isMemberExpression(childObj) && childObj.object) {
            if (t.isIdentifier(childObj.object) && (childObj.object.name === '_ctx' || childObj.object.name === '$setup')) {
                if (t.isIdentifier(childObj.property)) {
                    ret.push(childObj.property.name);
                }
            }
        }
        if (t.isIdentifier(path.node.property)) {
            ret.push(path.node.property.name);
        }
        return ret;
    }
    return [];
}
function splitCssModule(code) {
    return code.match(/\.[\s\S]+?\}/g);
}
var generateScopedName = function (name, filename) {
    var createHash = crypto_1.default.createHash('md5');
    createHash.update(filename + '_' + name);
    var hash = createHash.digest('hex').slice(0, 5);
    return "_".concat(name, "_").concat(hash);
};
var cache = new Map();
function TreeShakingModuleCss() {
    return {
        generateScopedName: generateScopedName,
        transform: function (code, id) {
            var _a;
            if (/\.vue$/.test(id)) {
                // 纯Vue文件，解析引用的类
                var data = (0, core_1.transformSync)(code, {
                    ast: true,
                });
                var cssRefMap_1 = new Map();
                var cssRefVar_1 = '';
                (0, core_1.traverse)((_a = data === null || data === void 0 ? void 0 : data.ast) === null || _a === void 0 ? void 0 : _a.program, {
                    enter: function (path) {
                        if (t.isMemberExpression(path)) {
                            var childObj = path.node.object;
                            if (t.isMemberExpression(childObj) && childObj.object) {
                                if (t.isIdentifier(childObj.object) && (childObj.object.name === '_ctx' || childObj.object.name === '$setup')) {
                                    cssRefMap_1.set(getRecurMemberExpressionName(path).join('.'), 1);
                                }
                            }
                        }
                    },
                    VariableDeclaration: function (path) {
                        var node = path.node;
                        // css module declare
                        if (node.kind === 'const' && node.declarations.length === 1
                            && node.declarations[0].id.name === 'cssModules') {
                            var init = node.declarations[0].init;
                            for (var _i = 0, _a = init.properties; _i < _a.length; _i++) {
                                var pairs = _a[_i];
                                if (pairs.key.type === 'StringLiteral') {
                                    // 拿出该key对应的变量名
                                    cssRefVar_1 = pairs.key.value;
                                }
                            }
                        }
                    },
                });
                // 只包含 css 引用的名称
                var afterCss_1 = new Map();
                cssRefMap_1.forEach(function (val, key) {
                    if (key.includes(cssRefVar_1)) {
                        afterCss_1.set(key.replace(cssRefVar_1 + '.', ''), val);
                    }
                });
                cache.set(id, afterCss_1);
            }
            else if (/.vue/.test(id) && id.includes('type=style') && id.includes('module')) {
                // 删除无用代码
                // 拆分 css module
                var codes = splitCssModule(code);
                var retCode_1 = [];
                var vueModuleName = id.replace(/.vue[\s\S]+/, '.vue');
                var hashCache_1 = new Map();
                var cacheIn = cache.get(vueModuleName);
                cacheIn.forEach(function (_, key) {
                    var newKey = generateScopedName(key, id);
                    hashCache_1.set(newKey, 1);
                });
                codes.forEach(function (_code) {
                    var _a, _b;
                    var moduleName = (_b = (_a = _code.match(/^[^ ]+/)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : '';
                    if (hashCache_1.has(moduleName.slice(1))) { // 有引用
                        retCode_1.push(_code);
                    }
                });
                return retCode_1.join('\n') + '\n';
            }
            return code;
        },
    };
}
exports.default = TreeShakingModuleCss;
