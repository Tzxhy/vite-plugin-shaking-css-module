import { NodePath } from '@babel/core';
import { Identifier, StringLiteral, VariableDeclaration, Node, BlockStatement, MemberExpression, Literal } from '@babel/types';
import * as t from '@babel/types';

export function isCallUseCssModule(path: NodePath): boolean | string {
	if (path.isVariableDeclaration()) {
		const node = path.node as VariableDeclaration;
		if (node.declarations?.[0]) {
			const d = node.declarations[0];
			if (d.init && t.isCallExpression(d.init) && ((d.init as t.CallExpression).callee as t.V8IntrinsicIdentifier)?.name === 'useCssModule') {
				return (d.id as Identifier).name;
			}
		}
	}
	return false;
}

function findBlockParent(path: any): NodePath<BlockStatement> | null {
	while (path) {
		if (path.isBlockStatement()) {
			return path;
		}
		path = path.parentPath;
	}
	return null;
}
export function getCallUseCssModuleRef(path: NodePath): Map<string, 1> | null {
	const cssModuleName = isCallUseCssModule(path);
	if (!cssModuleName) {
		return null;
	}
	console.log('cssModuleName: ', cssModuleName);
	const map = new Map<string, 1>();

	const block = findBlockParent(path);
	if (!block) {
		return null;
	}
	
	block.traverse({
		enter(path: NodePath) {
			if (path.isMemberExpression()) {
				const node = path.node as MemberExpression;
				const oj = node.object;
				if (t.isIdentifier(oj) && oj.name === cssModuleName) { // 直接访问属性
					if (t.isIdentifier(node.property)) {
						map.set(cssModuleName + '.' +(node.property as Identifier).name, 1);
					} else if (t.isStringLiteral(node.property)) {
						map.set(cssModuleName + '.' + node.property.value, 1);
					}
				} else if (t.isCallExpression(oj) && t.isIdentifier(oj.callee) && (oj.callee as Identifier).name === '_unref') { // unref 访问
					map.set(`_unref(${cssModuleName})` + '.' +(node.property as Identifier).name, 1);
				}
			}
		},
	});

	return map;
}
