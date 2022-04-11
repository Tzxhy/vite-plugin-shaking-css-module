import { NodePath, transformSync, traverse } from '@babel/core';
import * as t from '@babel/types';
import { Identifier, MemberExpression, VariableDeclaration } from '@babel/types';
import crypto from 'crypto';

import { getCallUseCssModuleRef } from './src/utils/is';

function getRecurMemberExpressionName(path: NodePath): string[] {
    if (t.isMemberExpression(path)) {
        const ret: string[] = [];
        const childObj = (path.node as MemberExpression).object;
        if (t.isMemberExpression(childObj) && childObj.object) {
            if (
                t.isIdentifier(childObj.object)
                && (childObj.object.name === '_ctx' || childObj.object.name === '$setup')
            ) {
                if (t.isIdentifier(childObj.property)) {
                    ret.push(childObj.property.name);
                }
            }
        }
        if (t.isIdentifier((path.node as MemberExpression).property)) {
            ret.push(((path.node as MemberExpression).property as Identifier).name);
        }
        if (ret.length === 2) {
            return ret;
        }
    }
    return [];
}

function splitCssModule(code: string): string[] {
    return code.match(/\.[\s\S]+?\}/g) as string[];
}

const generateScopedName = (name: string, filename: string) => {
    const fileQuestionIdx = filename.indexOf('?');
    if (fileQuestionIdx >= 0) {
        filename = filename.slice(0, fileQuestionIdx);
    }
    const createHash = crypto.createHash('md5');
    createHash.update(`${filename}_${name}`);
    const hash = createHash.digest('hex').slice(0, 5);
    return `_${name}_${hash}`;
};

const cache = new Map<string, Map<string, 1>>();

export default function TreeShakingModuleCss() {
    return {
        generateScopedName,
        transform(code: string, id: string) {
            if (/\.vue$/.test(id)) {
                // 纯Vue文件，解析引用的类
                const data = transformSync(code, {
                    ast: true,
                });
                const TEMPLATE_PREFIX = 'template:';
                const SCRIPT_PREFIX = 'script:';
                const cssRefMap = new Map<string, 1>();
                let cssRefVar = '';
                traverse(data?.ast?.program, {
                    enter(path) {
                        if (t.isMemberExpression(path)) {
                            const childObj = (path.node as MemberExpression).object;
                            if (t.isMemberExpression(childObj) && childObj.object) {
                                if (
                                    t.isIdentifier(childObj.object)
                                    && (childObj.object.name === '_ctx' || childObj.object.name === '$setup')
                                ) {
                                    cssRefMap.set(TEMPLATE_PREFIX + getRecurMemberExpressionName(path).join('.'), 1);
                                }
                            }
                        } else if (t.isVariableDeclaration(path)) {
                            const map = getCallUseCssModuleRef(path);
                            if (map) {
                                map.forEach((_, key) => {
                                    cssRefMap.set(SCRIPT_PREFIX + key, 1);
                                });
                            }
                        }
                    },
                    VariableDeclaration(path: NodePath<VariableDeclaration>) {
                        const { node } = path;
                        // css module declare
                        if (
                            node.kind === 'const'
                            && node.declarations.length === 1
                            && (node.declarations[0].id as Identifier).name === 'cssModules'
                        ) {
                            const init = node.declarations[0].init as t.ObjectExpression;
                            for (const pairs of init.properties as t.ObjectProperty[]) {
                                if (pairs.key.type === 'StringLiteral') {
                                    // 拿出该key对应的变量名
                                    cssRefVar = pairs.key.value;
                                }
                            }
                        }
                    },
                });
                const afterCss = new Map<string, 1>();
                cssRefMap.forEach((val, key) => {
                    if (
                        key.indexOf(TEMPLATE_PREFIX) === 0
                        && key.slice(TEMPLATE_PREFIX.length).indexOf(cssRefVar) === 0
                    ) {
                        afterCss.set(key.replace(`${TEMPLATE_PREFIX + cssRefVar}.`, ''), val);
                    } else if (key.indexOf(SCRIPT_PREFIX) === 0) {
                        afterCss.set(key.split('.')[1], val);
                    }
                });
                cache.set(id, afterCss);
            } else if (/.vue/.test(id) && id.includes('type=style') && id.includes('module')) {
                // debugger;
                // 删除无用代码
                // 拆分 css module
                if (!code) {
                    return '';
                }
                const codes = splitCssModule(code);
                if (!codes?.length) {
                    return '';
                }
                const retCode: string[] = [];
                const vueModuleName = id.replace(/.vue[\s\S]+/, '.vue');
                const hashCache = new Map<string, 1>();
                const cacheIn = cache.get(vueModuleName)!;
                cacheIn.forEach((_, key) => {
                    const newKey = generateScopedName(key, id);
                    hashCache.set(newKey, 1);
                });
                codes.forEach((_code) => {
                    const moduleName = _code.match(/^[^ ]+/)?.[0] ?? '';
                    if (hashCache.has(moduleName.slice(1))) {
                        // 有引用
                        retCode.push(_code);
                    }
                });
                return `${retCode.join('\n')}\n`;
            }
            return code;
        },
    };
}
