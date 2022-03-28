"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallUseCssModuleRef = exports.isCallUseCssModule = void 0;
var tslib_1 = require("tslib");
var t = tslib_1.__importStar(require("@babel/types"));
function isCallUseCssModule(path) {
    var _a, _b;
    if (path.isVariableDeclaration()) {
        var node = path.node;
        if ((_a = node.declarations) === null || _a === void 0 ? void 0 : _a[0]) {
            var d = node.declarations[0];
            if (d.init && t.isCallExpression(d.init) && ((_b = d.init.callee) === null || _b === void 0 ? void 0 : _b.name) === 'useCssModule') {
                return d.id.name;
            }
        }
    }
    return false;
}
exports.isCallUseCssModule = isCallUseCssModule;
function findBlockParent(path) {
    while (path) {
        if (path.isBlockStatement()) {
            return path;
        }
        path = path.parentPath;
    }
    return null;
}
function getCallUseCssModuleRef(path) {
    var cssModuleName = isCallUseCssModule(path);
    if (!cssModuleName) {
        return null;
    }
    console.log('cssModuleName: ', cssModuleName);
    var map = new Map();
    var block = findBlockParent(path);
    if (!block) {
        return null;
    }
    block.traverse({
        enter: function (path) {
            if (path.isMemberExpression()) {
                var node = path.node;
                var oj = node.object;
                if (t.isIdentifier(oj) && oj.name === cssModuleName) { // 直接访问属性
                    if (t.isIdentifier(node.property)) {
                        map.set(cssModuleName + '.' + node.property.name, 1);
                    }
                    else if (t.isStringLiteral(node.property)) {
                        map.set(cssModuleName + '.' + node.property.value, 1);
                    }
                }
                else if (t.isCallExpression(oj) && t.isIdentifier(oj.callee) && oj.callee.name === '_unref') { // unref 访问
                    map.set("_unref(".concat(cssModuleName, ")") + '.' + node.property.name, 1);
                }
            }
        },
    });
    return map;
}
exports.getCallUseCssModuleRef = getCallUseCssModuleRef;
