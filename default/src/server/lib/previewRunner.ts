/**
 * previewRunner.ts
 *
 * Extracts the FILE_MANIFEST from an agent result and builds a self-contained
 * preview HTML file that runs entirely in the browser using React + Babel CDN.
 *
 * IMPORTANT: The HTML is built with string concatenation, NOT template literals.
 * Agent-generated source code can contain backticks and ${...} which would break
 * a template literal and corrupt the output.
 */

import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';

// @babel/traverse and @babel/generator ship as CJS with a .default wrapper
const traverse = ((_traverse as unknown as { default: typeof _traverse }).default ?? _traverse) as typeof _traverse;
const generate = ((_generate as unknown as { default: typeof _generate }).default ?? _generate) as typeof _generate;

export type PreviewStatus = 'idle' | 'building' | 'ready' | 'error';

export interface PreviewState {
  status: PreviewStatus;
  error?: string;
  builtAt?: number;
}

const statusMap = new Map<string, PreviewState>();
const PREVIEWS_DIR = '/private/previews';

export function getPreviewStatus(jobId: string): PreviewState {
  return statusMap.get(jobId) ?? { status: 'idle' };
}

// ── File manifest extraction ──────────────────────────────────────────────────

interface ManifestFile {
  path: string;
  content: string;
}

/**
 * Ensure a source string has real newlines.
 *
 * The agent outputs FILE_MANIFEST as JSON where content strings use \n for newlines.
 * JSON.parse correctly converts \n → real newline (U+000A). However, if the DB
 * or any intermediate layer double-encodes the string, we may receive literal
 * backslash-n sequences instead of real newlines. This function detects and fixes
 * that case without corrupting strings that are already correct.
 *
 * Detection: if the string has zero real newlines but contains the two-character
 * sequence backslash-n, it was double-escaped.
 */
function ensureNewlines(s: string): string {
  // Count real newlines vs escaped \n sequences.
  // If the string has far more \\n than real \n, it's double-escaped even if
  // it has a few real newlines (e.g. a trailing newline after the closing }).
  const realNewlines = (s.match(/\n/g) || []).length;
  const escapedNewlines = (s.match(/\\n/g) || []).length;

  // If escaped sequences outnumber real newlines by 5:1 or more, unescape.
  if (escapedNewlines > 0 && escapedNewlines >= realNewlines * 5) {
    return s
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return s;
}

export function extractFileManifest(result: string): ManifestFile[] | null {
  // Use the LAST FILE_MANIFEST block — the auto-fix pass appends a corrected
  // manifest after the original, so we always want the most recent one.
  const allMatches = [...result.matchAll(/```FILE_MANIFEST\s*\n([\s\S]*?)```/g)];
  if (allMatches.length === 0) return null;
  const match = allMatches[allMatches.length - 1];
  try {
    const raw = match[1].trim();
    const files = JSON.parse(raw) as ManifestFile[];
    if (!Array.isArray(files) || files.length === 0) return null;
    const out: ManifestFile[] = [];
    for (const f of files) {
      if (typeof f.path !== 'string' || typeof f.content !== 'string') return null;
      // Apply double-escape fix at extraction time so compileModule always
      // receives properly-newlined source code.
      out.push({ path: f.path, content: ensureNewlines(f.content) });
    }
    return out;
  } catch {
    return null;
  }
}
// ── Server-side compilation ───────────────────────────────────────────────────
// Uses @babel/parser + @babel/traverse + @babel/generator (all bundleable) to
// transform TSX/TS source into CommonJS JS that runs in the browser via
// new Function("require","module","exports", code).
//
// Transform rules:
//   import foo from 'x'           → var _foo = require('x'); var foo = _foo.default ?? _foo;
//   import { a, b } from 'x'      → var _x = require('x'); var a = _x.a; var b = _x.b;
//   import * as ns from 'x'       → var ns = require('x');
//   export default expr/decl      → exports.default = expr; Object.defineProperty(exports,"__esModule",{value:true});
//   export { a, b }               → exports.a = a; exports.b = b;
//   export const/let/var/fn/class → declaration + exports.name = name;
//   type imports / type exports   → removed
//   JSX                           → React.createElement(...)  (classic runtime)
//   TypeScript types              → stripped by parser (stripTypes option)

function normalise(p: string): string {
  return p.replace(/^\.\//, '').replace(/^src\//, '');
}

/**
 * Resolve a require() specifier to a flat module key.
 * - Relative paths (./foo, ../bar/baz) are resolved against callerDir and normalised.
 * - Absolute/package specifiers are returned as-is.
 */
function resolveImport(specifier: string, callerDir: string): string {
  // @/ alias → src/ (common in agent-generated code)
  if (specifier.startsWith('@/')) {
    return normalise('src/' + specifier.slice(2)).replace(/\.(tsx|ts|jsx|js)$/, '');
  }
  if (!specifier.startsWith('.')) return specifier; // package or absolute
  // posix-style join: callerDir is already normalised (no leading ./ or src/)
  const joined = path.posix.join(callerDir, specifier);
  // Strip leading ../ that escape the root — clamp to root
  const clamped = joined.replace(/^(\.\.\/)+/, '');
  return normalise(clamped).replace(/\.(tsx|ts|jsx|js)$/, '');
}

function compileModule(src: string, filename: string, callerDir: string): string {
  // Pre-process: ensure real newlines (guard against double-escaped content)
  let source = ensureNewlines(src);

  // Pre-parse sanitizer: strip negative literal types that break Babel's code generator.
  // These are valid TypeScript but Babel's generator can emit dangling `-N` after type
  // stripping, producing "Unexpected token '-'" in the post-generation new Function check.
  //
  // Patterns handled (type positions only — value positions are NOT touched):
  //   type Foo = -1 | 0 | 1         →  type Foo = number
  //   type Foo = -1                  →  type Foo = number
  //   | -1  (union member)           →  (member removed)
  //   ): -1  (return type)           →  ): number
  //   prop: -1 |  (interface body)   →  prop: number |
  //   prop: -1;  (interface body)    →  prop: number;
  //   Array<-1>  (generic arg)       →  Array<number>
  //
  // NOT touched: `const x = -1`, `{ timeout: -1 }`, `case -1:`, `return -1`
  source = source
    // A) type alias: `type Foo = -1` or `type Foo<T> = -1 | ...`
    .replace(/\btype\s+(\w+)\s*(<[^>]*>)?\s*=\s*-\d+/g, 'type $1$2 = number')
    // B) union member: `| -1` → remove the member
    .replace(/\|\s*-\d+\b/g, '')
    // C) return type after closing paren: `): -1`
    .replace(/(\))\s*:\s*-\d+\b/g, '$1: number')
    // D) interface/type-body property: `word: -N |` or `word: -N;`
    .replace(/(\w\s*:\s*)-(\d+)(\s*[|;])/g, '$1number$3')
    // E) generic type argument: `<-1>`
    .replace(/<\s*-\d+\s*>/g, '<number>');

  try {
    // 1. Parse with Babel parser — handles TSX + TypeScript + modern JS
    // NOTE: do NOT use errorRecovery:true — it swallows errors and produces
    // a broken AST that @babel/generator serialises as a single corrupt line,
    // which then fails with "Unexpected token (1:N)".
    const ast = parse(source, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        'optionalCatchBinding',
        'logicalAssignment',
        'numericSeparator',
        'bigInt',
        'doExpressions',
        'throwExpressions',
      ],
    });

    let hasDefaultExport = false;

    // 2. Transform AST
    traverse(ast, {
      // ── Imports ────────────────────────────────────────────────────────────
      ImportDeclaration(nodePath) {
        const rawSource = nodePath.node.source.value;
        const source = resolveImport(rawSource, callerDir);
        const specs = nodePath.node.specifiers;

        // Type-only import → remove entirely
        if (nodePath.node.importKind === 'type') {
          nodePath.remove();
          return;
        }

        const stmts: t.Statement[] = [];
        // var _mod = require('source');
        const tmpId = t.identifier('_req_' + source.replace(/[^a-zA-Z0-9]/g, '_'));
        stmts.push(
          t.variableDeclaration('var', [
            t.variableDeclarator(tmpId, t.callExpression(t.identifier('require'), [t.stringLiteral(source)])),
          ])
        );

        for (const spec of specs) {
          if (spec.type === 'ImportSpecifier' && spec.importKind === 'type') continue;

          if (t.isImportDefaultSpecifier(spec)) {
            // var foo = (_mod.default != null) ? _mod.default : _mod;
            // Using != null (loose) catches both null and undefined.
            stmts.push(
              t.variableDeclaration('var', [
                t.variableDeclarator(
                  t.identifier(spec.local.name),
                  t.conditionalExpression(
                    t.binaryExpression('!=', t.memberExpression(tmpId, t.identifier('default')), t.nullLiteral()),
                    t.memberExpression(tmpId, t.identifier('default')),
                    tmpId
                  )
                ),
              ])
            );
          } else if (t.isImportNamespaceSpecifier(spec)) {
            // var ns = _mod;
            stmts.push(
              t.variableDeclaration('var', [
                t.variableDeclarator(t.identifier(spec.local.name), tmpId),
              ])
            );
          } else if (t.isImportSpecifier(spec)) {
            const imported = t.isIdentifier(spec.imported) ? spec.imported.name : (spec.imported as t.StringLiteral).value;
            // For user modules (relative / @/ imports), use a lazy getter so the
            // binding is resolved at USE TIME rather than at module-load time.
            // This prevents "undefined component" errors caused by circular deps or
            // execution-order issues where the exporting module hasn't finished
            // populating its exports object when the importing module's var declarations run.
            //
            // For external packages (already fully populated by EXTERNALS), an eager
            // IIFE is fine and avoids the Object.defineProperty overhead.
            //
            // isUserModule: rawSource starts with '.' or '@/'
            // Named import resolution — two-step lookup:
            //   1. _mod[key]                      — named export: export function X() {}
            //   2. _mod.default && _mod.default[key] — named key on a default-exported object
            //      (e.g. some libs export { default: { Foo, Bar } })
            //
            // We deliberately do NOT fall back to _mod.default itself for named imports.
            // That fallback caused TypeScript type-only imports (e.g. `import { Activity }
            // from 'types'` where Activity is an interface) to resolve to the whole exports
            // object, which React then received as a component type and threw "got: object".
            //
            // For user modules (relative / @/ imports) with PascalCase names (React components),
            // emit a lazy forwarding wrapper so the binding is resolved at RENDER TIME rather
            // than at module-load time. This prevents "undefined component" errors caused by
            // circular deps or execution-order issues.
            //
            // For non-PascalCase names and external packages, use an eager IIFE.
            const isUserModule = rawSource.startsWith('.') || rawSource.startsWith('@/');
            const isPascalCase = /^[A-Z]/.test(spec.local.name);

            // Shared two-step resolve body (no _m.default fallback for named imports)
            const makeResolveStmts = (mId: t.Identifier, kId: t.Identifier): t.Statement[] => [
              // if (_m[_k] != null) return _m[_k];
              t.ifStatement(
                t.binaryExpression('!=', t.memberExpression(mId, kId, true), t.nullLiteral()),
                t.returnStatement(t.memberExpression(mId, kId, true))
              ),
              // if (_m.default && _m.default[_k] != null) return _m.default[_k];
              t.ifStatement(
                t.logicalExpression('&&',
                  t.memberExpression(mId, t.identifier('default')),
                  t.binaryExpression('!=',
                    t.memberExpression(t.memberExpression(mId, t.identifier('default')), kId, true),
                    t.nullLiteral()
                  )
                ),
                t.returnStatement(t.memberExpression(t.memberExpression(mId, t.identifier('default')), kId, true))
              ),
              // return undefined;  ← no _m.default fallback — avoids returning module object for type imports
              t.returnStatement(t.identifier('undefined')),
            ];

            if (isUserModule && isPascalCase) {
              // Lazy component wrapper — resolves at first render, not at import time.
              // var X = (function(_m, _k) {
              //   function _resolve() { /* two-step lookup */ }
              //   var _resolved = null;
              //   return function LazyWrapper(props) {
              //     if (!_resolved) _resolved = _resolve();
              //     if (!_resolved) return null;
              //     return React.createElement(_resolved, props);
              //   };
              // })(_mod, 'X');
              const mId = t.identifier('_m');
              const kId = t.identifier('_k');
              const resolveBody = t.blockStatement(makeResolveStmts(mId, kId));
              const outerFn = t.functionExpression(null, [mId, kId], t.blockStatement([
                t.functionDeclaration(t.identifier('_resolve'), [], resolveBody),
                t.variableDeclaration('var', [t.variableDeclarator(t.identifier('_resolved'), t.nullLiteral())]),
                t.returnStatement(
                  t.functionExpression(t.identifier('LazyWrapper'), [t.identifier('props')], t.blockStatement([
                    t.ifStatement(
                      t.unaryExpression('!', t.identifier('_resolved')),
                      t.expressionStatement(t.assignmentExpression('=', t.identifier('_resolved'), t.callExpression(t.identifier('_resolve'), [])))
                    ),
                    t.ifStatement(
                      t.unaryExpression('!', t.identifier('_resolved')),
                      t.returnStatement(t.nullLiteral())
                    ),
                    t.returnStatement(
                      t.callExpression(
                        t.memberExpression(t.identifier('React'), t.identifier('createElement')),
                        [t.identifier('_resolved'), t.identifier('props')]
                      )
                    ),
                  ]))
                ),
              ]));
              stmts.push(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier(spec.local.name),
                    t.callExpression(t.parenthesizedExpression(outerFn), [tmpId, t.stringLiteral(imported)])
                  ),
                ])
              );
            } else {
              // Eager IIFE for non-component names and external packages
              const mId = t.identifier('_m');
              const kId = t.stringLiteral(imported);
              stmts.push(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier(spec.local.name),
                    t.callExpression(
                      t.parenthesizedExpression(
                        t.functionExpression(null, [mId, t.identifier('_k')], t.blockStatement(
                          makeResolveStmts(mId, t.identifier('_k'))
                        ))
                      ),
                      [tmpId, kId]
                    )
                  ),
                ])
              );
            }
          }
        }

        if (stmts.length === 1) {
          // Only the require() call, no bindings needed — just remove
          nodePath.remove();
        } else {
          nodePath.replaceWithMultiple(stmts);
        }
      },

      // ── export default ─────────────────────────────────────────────────────
      ExportDefaultDeclaration(nodePath) {
        hasDefaultExport = true;
        const decl = nodePath.node.declaration;
        let valExpr: t.Expression;

        if (t.isFunctionDeclaration(decl) || t.isClassDeclaration(decl)) {
          if (decl.id) {
            // function Foo() {} → keep declaration, then exports.default = Foo
            nodePath.replaceWithMultiple([
              decl as unknown as t.Statement,
              t.expressionStatement(
                t.assignmentExpression('=',
                  t.memberExpression(t.identifier('exports'), t.identifier('default')),
                  t.identifier(decl.id.name)
                )
              ),
            ]);
            return;
          }
          // anonymous function/class → exports.default = function() {}
          valExpr = decl as unknown as t.Expression;
        } else {
          valExpr = decl as t.Expression;
        }

        nodePath.replaceWith(
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(t.identifier('exports'), t.identifier('default')),
              valExpr
            )
          )
        );
      },

      // ── export named ───────────────────────────────────────────────────────
      ExportNamedDeclaration(nodePath) {
        // Type-only export → remove
        if (nodePath.node.exportKind === 'type') {
          nodePath.remove();
          return;
        }

        const decl = nodePath.node.declaration;
        const specifiers = nodePath.node.specifiers;
        const reExportSource = nodePath.node.source; // set for: export { X } from './module'
        const stmts: t.Statement[] = [];

        // ── Re-export with source: export { X, Y as Z } from './module' ──────
        // Must require the source module and assign each specifier from it.
        // Cannot reference local bindings (they don't exist in this scope).
        if (reExportSource) {
          const rawSrc = reExportSource.value;
          const resolvedSrc = resolveImport(rawSrc, callerDir);
          const tmpId = t.identifier('_reexp_' + resolvedSrc.replace(/[^a-zA-Z0-9]/g, '_'));
          stmts.push(
            t.variableDeclaration('var', [
              t.variableDeclarator(
                tmpId,
                t.callExpression(t.identifier('require'), [t.stringLiteral(resolvedSrc)])
              ),
            ])
          );
          for (const spec of specifiers) {
            if (t.isExportSpecifier(spec)) {
              const localName = t.isIdentifier(spec.local) ? spec.local.name : (spec.local as t.StringLiteral).value;
              const exportedName = t.isIdentifier(spec.exported) ? spec.exported.name : (spec.exported as t.StringLiteral).value;
              // Two-step resolution for re-exports (no _m.default fallback — avoids
              // exporting the whole module object when the key is a type-only export):
              //   1. _reexp[key]                      — named export
              //   2. _reexp.default && _reexp.default[key] — key on default-exported object
              stmts.push(t.expressionStatement(
                t.assignmentExpression('=',
                  t.memberExpression(t.identifier('exports'), t.identifier(exportedName)),
                  t.callExpression(
                    t.parenthesizedExpression(
                      t.functionExpression(null, [t.identifier('_m'), t.identifier('_k')], t.blockStatement([
                        t.ifStatement(
                          t.binaryExpression('!=', t.memberExpression(t.identifier('_m'), t.identifier('_k'), true), t.nullLiteral()),
                          t.returnStatement(t.memberExpression(t.identifier('_m'), t.identifier('_k'), true))
                        ),
                        t.ifStatement(
                          t.logicalExpression('&&',
                            t.memberExpression(t.identifier('_m'), t.identifier('default')),
                            t.binaryExpression('!=',
                              t.memberExpression(t.memberExpression(t.identifier('_m'), t.identifier('default')), t.identifier('_k'), true),
                              t.nullLiteral()
                            )
                          ),
                          t.returnStatement(t.memberExpression(t.memberExpression(t.identifier('_m'), t.identifier('default')), t.identifier('_k'), true))
                        ),
                        t.returnStatement(t.identifier('undefined')),
                      ]))
                    ),
                    [tmpId, t.stringLiteral(localName)]
                  )
                )
              ));
            }
          }
          if (stmts.length > 0) {
            nodePath.replaceWithMultiple(stmts);
          } else {
            nodePath.remove();
          }
          return;
        }

        if (decl) {
          stmts.push(decl as t.Statement);
          if (t.isFunctionDeclaration(decl) || t.isClassDeclaration(decl)) {
            if (decl.id) {
              stmts.push(t.expressionStatement(
                t.assignmentExpression('=',
                  t.memberExpression(t.identifier('exports'), t.identifier(decl.id.name)),
                  t.identifier(decl.id.name)
                )
              ));
            }
          } else if (t.isVariableDeclaration(decl)) {
            for (const d of decl.declarations) {
              if (t.isIdentifier(d.id)) {
                stmts.push(t.expressionStatement(
                  t.assignmentExpression('=',
                    t.memberExpression(t.identifier('exports'), t.identifier(d.id.name)),
                    t.identifier(d.id.name)
                  )
                ));
              }
            }
          }
        }

        for (const spec of specifiers) {
          if (t.isExportSpecifier(spec)) {
            const exportedName = t.isIdentifier(spec.exported) ? spec.exported.name : (spec.exported as t.StringLiteral).value;
            stmts.push(t.expressionStatement(
              t.assignmentExpression('=',
                t.memberExpression(t.identifier('exports'), t.identifier(exportedName)),
                t.identifier(spec.local.name)
              )
            ));
          }
        }

        if (stmts.length > 0) {
          nodePath.replaceWithMultiple(stmts);
        } else {
          nodePath.remove();
        }
      },

      // ── export * from './x' ───────────────────────────────────────────────
      // Compile to: Object.assign(exports, require('./x'))
      // Previously removed entirely — that caused every barrel file to be a no-op,
      // making all re-exported names undefined at the import site.
      ExportAllDeclaration(nodePath) {
        const rawSource = nodePath.node.source.value;
        const source = resolveImport(rawSource, callerDir);
        nodePath.replaceWith(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier('Object'), t.identifier('assign')),
              [
                t.identifier('exports'),
                t.callExpression(t.identifier('require'), [t.stringLiteral(source)]),
              ]
            )
          )
        );
      },

      // ── JSX → React.createElement ─────────────────────────────────────────
      // Process innermost JSX first (exit = bottom-up) so children are already
      // transformed to CallExpressions before the parent visits them.
      JSXElement: {
        exit(nodePath) {
          nodePath.replaceWith(transformJSX(nodePath.node));
        },
      },
      JSXFragment: {
        exit(nodePath) {
          const children = nodePath.node.children
            .map(transformJSXChild)
            .filter((c): c is t.Expression => c !== null);
          nodePath.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier('React'), t.identifier('createElement')),
              [t.memberExpression(t.identifier('React'), t.identifier('Fragment')), t.nullLiteral(), ...children]
            )
          );
        },
      },

      // ── TypeScript-specific nodes to strip ────────────────────────────────
      TSTypeAnnotation(nodePath) { nodePath.remove(); },
      TSTypeParameterDeclaration(nodePath) { nodePath.remove(); },
      TSTypeParameterInstantiation(nodePath) { nodePath.remove(); },
      TSAsExpression(nodePath) { nodePath.replaceWith(nodePath.node.expression); },
      TSSatisfiesExpression(nodePath) { nodePath.replaceWith(nodePath.node.expression); },
      TSNonNullExpression(nodePath) { nodePath.replaceWith(nodePath.node.expression); },
      // <Type>expr cast syntax (TSTypeAssertion) — strip the type, keep the expression
      TSTypeAssertion(nodePath) { nodePath.replaceWith(nodePath.node.expression); },
      // fn<Type> instantiation expression — strip type args, keep the callee expression
      TSInstantiationExpression(nodePath) { nodePath.replaceWith(nodePath.node.expression); },
      TSTypeAliasDeclaration(nodePath) { nodePath.remove(); },
      TSInterfaceDeclaration(nodePath) { nodePath.remove(); },
      TSEnumDeclaration(nodePath) {
        // Convert enum to object: enum Foo { A = 1 } → var Foo = { A: 1 };
        const props = nodePath.node.members.map(m => {
          const key = t.isIdentifier(m.id) ? m.id.name : (m.id as t.StringLiteral).value;
          const val = m.initializer ?? t.numericLiteral(0);
          return t.objectProperty(t.stringLiteral(key), val as t.Expression);
        });
        nodePath.replaceWith(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier((nodePath.node.id as t.Identifier).name),
              t.objectExpression(props)
            ),
          ])
        );
      },
      TSModuleDeclaration(nodePath) { nodePath.remove(); },
      TSImportEqualsDeclaration(nodePath) { nodePath.remove(); },
      TSExportAssignment(nodePath) { nodePath.remove(); },
      TSParameterProperty(nodePath) {
        // constructor(private x: T) → constructor(x)
        nodePath.replaceWith(nodePath.node.parameter);
      },
    });

    // 3. Prepend __esModule marker + optional default stub
    const preamble: t.Statement[] = [
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('defineProperty')),
          [
            t.identifier('exports'),
            t.stringLiteral('__esModule'),
            t.objectExpression([t.objectProperty(t.identifier('value'), t.booleanLiteral(true))]),
          ]
        )
      ),
    ];
    if (!hasDefaultExport) {
      preamble.push(
        t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(t.identifier('exports'), t.identifier('default')),
            t.identifier('undefined')
          )
        )
      );
    }
    ast.program.body.unshift(...preamble);

    // 4. Generate code
    const output = generate(ast, { retainLines: false, compact: false });
    const generatedCode = output.code;

    // 5. Post-generation syntax validation — catch any JS that new Function would reject
    // before it's embedded in the preview HTML. This catches edge cases where Babel's
    // generator emits invalid JS (e.g. dangling unary minus from TS type stripping).
    try {
      // eslint-disable-next-line no-new-func
      new Function('require', 'module', 'exports', generatedCode);
    } catch (syntaxErr: unknown) {
      const errMsg = syntaxErr instanceof Error ? syntaxErr.message : String(syntaxErr);
      const safeMsg = errMsg.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      const safeFile = filename.replace(/'/g, "\\'");
      return (
        '"use strict";'
        + 'Object.defineProperty(exports,"__esModule",{value:true});'
        + 'exports.default=function CompileError(){'
        + '  var R=window.React;'
        + '  return R.createElement("div",{style:{color:"#f87171",padding:16,fontFamily:"monospace",background:"#111",borderLeft:"4px solid #f87171",margin:8}},'
        + '    R.createElement("b",{style:{fontSize:14}},"Compile error in ' + safeFile + '"),'
        + '    R.createElement("pre",{style:{whiteSpace:"pre-wrap",fontSize:12,marginTop:8,color:"#fca5a5"}},\'[Generated JS syntax error] ' + safeMsg + '\')'
        + '  );'
        + '};'
      );
    }

    return generatedCode;

  } catch (e: unknown) {
    // Build a helpful error message that includes the source context around the failure
    const err = e instanceof Error ? e : new Error(String(e));
    let msg = err.message;

    // If it's a Babel parse error with a location, extract the source snippet
    const locMatch = msg.match(/\((\d+):(\d+)\)/);
    if (locMatch) {
      const line = parseInt(locMatch[1], 10);
      const col = parseInt(locMatch[2], 10);
      const lines = source.split('\n');
      const snippet = lines.slice(Math.max(0, line - 2), line + 1).join('\n');
      msg += '\n\nSource context (line ' + line + ', col ' + col + '):\n' + snippet;
      // If it's line 1 with a high column, the content is still a single line — double-escape issue
      if (line === 1 && col > 100) {
        msg += '\n\n[Hint: content appears to be on a single line — possible double-escape issue in FILE_MANIFEST]';
      }
    }

    const safeMsg = msg
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');

    const safeFile = filename.replace(/'/g, "\\'");

    return (
      '"use strict";'
      + 'Object.defineProperty(exports,"__esModule",{value:true});'
      + 'exports.default=function CompileError(){'
      + '  var R=window.React;'
      + '  return R.createElement("div",{style:{color:"#f87171",padding:16,fontFamily:"monospace",background:"#111",borderLeft:"4px solid #f87171",margin:8}},'
      + '    R.createElement("b",{style:{fontSize:14}},"Compile error in ' + safeFile + '"),'
      + '    R.createElement("pre",{style:{whiteSpace:"pre-wrap",fontSize:12,marginTop:8,color:"#fca5a5"}},\'' + safeMsg + '\')'
      + '  );'
      + '};'
    );
  }
}

// ── JSX transform helpers ─────────────────────────────────────────────────────

function transformJSX(node: t.JSXElement): t.CallExpression {
  const opening = node.openingElement;
  const nameExpr = jsxNameToExpr(opening.name);
  const props = jsxAttrsToProps(opening.attributes);
  // At exit time, children may already be CallExpression (transformed by inner exit).
  // transformJSXChild handles both cases.
  const children = node.children
    .map(transformJSXChild)
    .filter((c): c is t.Expression => c !== null);

  return t.callExpression(
    t.memberExpression(t.identifier('React'), t.identifier('createElement')),
    [nameExpr, props, ...children]
  );
}

function jsxNameToExpr(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName, isObjectOfMember = false): t.Expression {
  if (t.isJSXIdentifier(name)) {
    // When this identifier is the object part of a member expression (e.g. `motion` in
    // `<motion.main>`), it MUST be an identifier — never a string literal — regardless
    // of case. `motion.main` is a variable property access, not an HTML tag name.
    // Only bare lowercase tags like `<div>` or `<span>` become string literals.
    if (!isObjectOfMember && /^[a-z]/.test(name.name)) return t.stringLiteral(name.name);
    return t.identifier(name.name);
  }
  if (t.isJSXMemberExpression(name)) {
    // Pass isObjectOfMember=true so the object part is always an identifier
    return t.memberExpression(jsxNameToExpr(name.object, true), t.identifier(name.property.name));
  }
  return t.stringLiteral(name.namespace.name + ':' + name.name.name);
}

function jsxAttrsToProps(attrs: (t.JSXAttribute | t.JSXSpreadAttribute)[]): t.Expression {
  if (attrs.length === 0) return t.nullLiteral();
  const props: (t.ObjectProperty | t.SpreadElement)[] = [];
  for (const attr of attrs) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
    } else {
      const key = t.isJSXIdentifier(attr.name)
        ? t.identifier(attr.name.name)
        : t.stringLiteral(attr.name.namespace.name + ':' + attr.name.name.name);
      let val: t.Expression;
      if (attr.value === null) {
        val = t.booleanLiteral(true);
      } else if (t.isJSXExpressionContainer(attr.value)) {
        val = t.isJSXEmptyExpression(attr.value.expression)
          ? t.booleanLiteral(true)
          : (attr.value.expression as t.Expression);
      } else if (t.isJSXElement(attr.value)) {
        val = transformJSX(attr.value);
      } else {
        val = attr.value as t.StringLiteral;
      }
      props.push(t.objectProperty(key, val));
    }
  }
  return t.objectExpression(props);
}

function transformJSXChild(child: t.JSXElement['children'][number]): t.Expression | null {
  if (t.isJSXElement(child)) return transformJSX(child);
  if (t.isJSXFragment(child)) {
    const children = child.children.map(transformJSXChild).filter((c): c is t.Expression => c !== null);
    return t.callExpression(
      t.memberExpression(t.identifier('React'), t.identifier('createElement')),
      [t.memberExpression(t.identifier('React'), t.identifier('Fragment')), t.nullLiteral(), ...children]
    );
  }
  if (t.isJSXExpressionContainer(child)) {
    if (t.isJSXEmptyExpression(child.expression)) return null;
    return child.expression as t.Expression;
  }
  if (t.isJSXSpreadChild(child)) return child.expression;
  if (t.isJSXText(child)) {
    const text = child.value.replace(/\n\s*/g, ' ').trim();
    if (!text) return null;
    return t.stringLiteral(text);
  }
  // Already-transformed node (CallExpression from bottom-up JSX.exit pass)
  if (t.isExpression(child as t.Node)) return child as unknown as t.Expression;
  return null;
}

/**
 * Builds a self-contained HTML string using plain string concatenation.
 * Never use template literals here — agent source code contains backticks
 * and ${...} that would escape and corrupt the output.
 */
function buildPreviewHtml(files: ManifestFile[]): string {
  // Find entry point — prefer main.tsx (side-effect entry that calls createRoot itself),
  // then App.tsx (component entry that we mount ourselves).
  // Normalise paths: strip leading src/ so "src/main.tsx" and "main.tsx" both match.
  const norm = (p: string) => normalise(p).replace(/\.(tsx|ts|jsx|js)$/, '');

  const entryFile =
    files.find(f => norm(f.path) === 'main') ||
    files.find(f => norm(f.path) === 'index') ||
    files.find(f => norm(f.path) === 'App') ||
    // Fallback: first file that looks like a component (has JSX / export default)
    files.find(f => f.content.includes('export default') && /\.(tsx|jsx)$/.test(f.path)) ||
    files[0];

  if (!entryFile) return errorHtml('No entry file found in FILE_MANIFEST.');

  // Compile all modules server-side to CommonJS JS.
  // Register each module under EVERY key variant it might be required as:
  //   "src/screens/HomeScreen.tsx"  → "screens/HomeScreen"
  //   "./screens/HomeScreen"        → "screens/HomeScreen"
  //   "screens/HomeScreen"          → "screens/HomeScreen"
  //   "HomeScreen"                  → "HomeScreen"  (bare basename fallback)
  const compiledModules: Record<string, string> = {};

  for (const f of files) {
    const fileNorm = normalise(f.path);                              // e.g. "screens/HomeScreen.tsx"
    const noExt    = fileNorm.replace(/\.(tsx|ts|jsx|js|css)$/, ''); // e.g. "screens/HomeScreen"
    const callerDir = noExt.includes('/')
      ? noExt.substring(0, noExt.lastIndexOf('/'))
      : '';

    // CSS files: inject as a no-op (styles are handled by Tailwind CDN)
    const compiled = /\.(css|scss|sass|less)$/.test(f.path)
      ? '"use strict";Object.defineProperty(exports,"__esModule",{value:true});'
      : compileModule(f.content, fileNorm, callerDir);

    // Register under all key variants
    compiledModules[fileNorm] = compiled;          // "screens/HomeScreen.tsx"
    compiledModules[noExt]    = compiled;          // "screens/HomeScreen"

    // Bare basename — lets `require('HomeScreen')` work even if caller used a full path
    const basename = noExt.includes('/')
      ? noExt.substring(noExt.lastIndexOf('/') + 1)
      : noExt;
    if (!compiledModules[basename]) compiledModules[basename] = compiled;

    // Also register with src/ prefix in case the agent uses absolute-style imports
    compiledModules['src/' + noExt]    = compiled;
    compiledModules['src/' + fileNorm] = compiled;

    // If this file is an index file (e.g. components/index.tsx), also register
    // the parent directory key so `require('./components')` resolves it.
    if (basename === 'index') {
      const parentDir = noExt.substring(0, noExt.lastIndexOf('/'));
      if (parentDir && !compiledModules[parentDir]) {
        compiledModules[parentDir] = compiled;
      }
      if (parentDir && !compiledModules['src/' + parentDir]) {
        compiledModules['src/' + parentDir] = compiled;
      }
    }
  }

  const entryKey = norm(entryFile.path);
  const isSideEffect = entryKey === 'main' || entryKey === 'index';

  // Serialize compiled module map safely — escape </script> sequences
  const compiledMapJson = JSON.stringify(compiledModules)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  const html = '<!DOCTYPE html>\n'
    + '<html lang="en">\n'
    + '<head>\n'
    + '<meta charset="UTF-8" />\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
    + '<title>Preview</title>\n'
    + '<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}</style>\n'
    // React + ReactDOM UMD — no Babel needed in the browser anymore
    + '<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.development.js"><\/script>\n'
    + '<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.development.js"><\/script>\n'
    + '<script src="https://cdn.jsdelivr.net/npm/lucide-react@0.469.0/dist/umd/lucide-react.js"><\/script>\n'
    + '<script src="https://cdn.tailwindcss.com"><\/script>\n'
    + '</head>\n'
    + '<body>\n'
    + '<div id="root"></div>\n'
    + '<script>\n'
    + '(function(){\n'
    + '"use strict";\n'
    + 'function showError(title,msg){\n'
    + '  var d=document.getElementById("root");\n'
    + '  d.style.cssText="padding:24px;font-family:monospace;background:#111;color:#f87171;min-height:100vh";\n'
    + '  d.innerHTML="<h2 style=\'margin:0 0 8px\'>"+title+"<\/h2><pre style=\'white-space:pre-wrap;font-size:13px\'>"+String(msg)+"<\/pre>";\n'
    + '}\n'
    + 'if(!window.React||!window.ReactDOM){\n'
    + '  showError("CDN load failed","React or ReactDOM failed to load.");\n'
    + '  return;\n'
    + '}\n'
    // Pre-compiled module map (CommonJS JS strings, compiled server-side)
    + 'window.__PREVIEW_MODULES__=' + compiledMapJson + ';\n'
    + 'window.__PREVIEW_CACHE__={};\n'
    // EXTERNALS: modules resolved to window globals instead of require()
    // @babel/preset-env CommonJS output calls require() for every import.
    // _interopRequireDefault checks __esModule: if true, returns as-is;
    // otherwise wraps as {default: obj}. We set __esModule:true everywhere.
    + 'var EXTERNALS={\n'
    + '  "react":function(){\n'
    + '    var R=window.React;\n'
    + '    return {__esModule:true,default:R,createElement:R.createElement,useState:R.useState,useEffect:R.useEffect,useRef:R.useRef,useCallback:R.useCallback,useMemo:R.useMemo,useContext:R.useContext,useReducer:R.useReducer,useLayoutEffect:R.useLayoutEffect,createContext:R.createContext,forwardRef:R.forwardRef,memo:R.memo,Fragment:R.Fragment,Children:R.Children,cloneElement:R.cloneElement,isValidElement:R.isValidElement,StrictMode:R.StrictMode,startTransition:R.startTransition,useTransition:R.useTransition,useId:R.useId,useDeferredValue:R.useDeferredValue,useImperativeHandle:R.useImperativeHandle,useDebugValue:R.useDebugValue,Component:R.Component,PureComponent:R.PureComponent,createRef:R.createRef,createPortal:window.ReactDOM.createPortal};\n'
    + '  },\n'
    + '  "react-dom":function(){\n'
    + '    var RD=window.ReactDOM;\n'
    + '    return {__esModule:true,default:RD,createRoot:RD.createRoot,hydrateRoot:RD.hydrateRoot,render:RD.render,unmountComponentAtNode:RD.unmountComponentAtNode,createPortal:RD.createPortal,flushSync:RD.flushSync};\n'
    + '  },\n'
    + '  "react-dom/client":function(){\n'
    + '    var RD=window.ReactDOM;\n'
    + '    var c={__esModule:true,createRoot:RD.createRoot,hydrateRoot:RD.hydrateRoot};\n'
    + '    c.default=c; return c;\n'
    + '  },\n'
    + '  "react/jsx-runtime":function(){\n'
    + '    var R=window.React;\n'
    + '    return {__esModule:true,jsx:R.createElement,jsxs:R.createElement,Fragment:R.Fragment};\n'
    + '  },\n'
    + '  "react/jsx-dev-runtime":function(){\n'
    + '    var R=window.React;\n'
    + '    return {__esModule:true,jsxDEV:R.createElement,Fragment:R.Fragment};\n'
    + '  },\n'
    + '  "lucide-react":function(){\n'
    + '    var L=window.LucideReact||{};\n'
    // The UMD build exposes every icon as a named export at the top level.
    // Spread them all so named imports like { ChevronRight } resolve correctly.
    + '    return Object.assign({__esModule:true,default:L},L);\n'
    + '  },\n'
    + '  "clsx":function(){\n'
    + '    function clsx(){return Array.prototype.slice.call(arguments).flat(9).filter(Boolean).join(" ");}\n'
    + '    return {__esModule:true,default:clsx,clsx:clsx};\n'
    + '  },\n'
    + '  "class-variance-authority":function(){\n'
    + '    return {__esModule:true,cva:function(b){return function(){return b;};},cx:function(){return Array.prototype.slice.call(arguments).join(" ");}};\n'
    + '  },\n'
    + '  "tailwind-merge":function(){\n'
    + '    function tw(){return Array.prototype.slice.call(arguments).flat(9).filter(Boolean).join(" ");}\n'
    + '    return {__esModule:true,default:tw,twMerge:tw,twJoin:tw};\n'
    + '  },\n'
    // ── react-router-dom ────────────────────────────────────────────────────
    // Full in-memory router: BrowserRouter, Routes, Route, Link, NavLink,
    // useNavigate, useLocation, useParams, useSearchParams, Outlet, Navigate
    + '  "react-router-dom":function(){\n'
    + '    var R=window.React;\n'
    // Minimal router state — single context, hash-based so it works in sandboxed iframes
    + '    var _listeners=[];\n'
    + '    function _getPath(){return window.location.hash.replace(/^#/,"")||"/";}\n'
    + '    function _push(to){\n'
    + '      var path=typeof to==="string"?to:(to.pathname||"/")+(to.search||"")+(to.hash||"");\n'
    + '      window.location.hash=path;\n'
    + '      _listeners.forEach(function(fn){fn();});\n'
    + '    }\n'
    + '    window.addEventListener("hashchange",function(){_listeners.forEach(function(fn){fn();});});\n'
    // RouterContext: {path, params, navigate}
    + '    var RouterCtx=R.createContext({path:"/",params:{},navigate:_push,search:"",state:null});\n'
    + '    var OutletCtx=R.createContext(null);\n'
    // BrowserRouter / MemoryRouter / HashRouter — all the same here
    + '    function BrowserRouter(p){\n'
    + '      var _s=R.useState(_getPath()),path=_s[0],setPath=_s[1];\n'
    + '      R.useEffect(function(){var fn=function(){setPath(_getPath());};_listeners.push(fn);return function(){_listeners=_listeners.filter(function(f){return f!==fn;});};}, []);\n'
    + '      return R.createElement(RouterCtx.Provider,{value:{path:path,params:{},navigate:_push,search:window.location.search||"",state:null}},p.children);\n'
    + '    }\n'
    + '    var MemoryRouter=BrowserRouter, HashRouter=BrowserRouter, Router=BrowserRouter;\n'
    // matchPath: simple pattern → params extractor
    + '    function matchPath(pattern,path){\n'
    + '      var pat=typeof pattern==="string"?pattern:(pattern.path||"");\n'
    + '      var keys=[];\n'
    + '      var re=new RegExp("^"+pat.replace(/:[^/]+/g,function(m){keys.push(m.slice(1));return "([^/]+)";}).replace(/\\*/g,".*")+"\\/?$");\n'
    + '      var m=path.match(re);\n'
    + '      if(!m) return null;\n'
    + '      var params={}; keys.forEach(function(k,i){params[k]=m[i+1];});\n'
    + '      return {params:params,pathname:path};\n'
    + '    }\n'
    // Routes + Route
    + '    function Routes(p){\n'
    + '      var ctx=R.useContext(RouterCtx);\n'
    + '      var children=R.Children.toArray(p.children);\n'
    + '      for(var i=0;i<children.length;i++){\n'
    + '        var child=children[i];\n'
    + '        if(!child||!child.props) continue;\n'
    + '        var routePath=child.props.path||"";\n'
    + '        var m=matchPath(routePath,ctx.path);\n'
    + '        if(m){\n'
    + '          return R.createElement(RouterCtx.Provider,{value:Object.assign({},ctx,{params:m.params})},\n'
    + '            R.createElement(OutletCtx.Provider,{value:child.props.children||null},child.props.element||null));\n'
    + '        }\n'
    + '      }\n'
    + '      return null;\n'
    + '    }\n'
    + '    function Route(){return null;}\n'
    // Link / NavLink
    + '    function Link(p){\n'
    + '      return R.createElement("a",Object.assign({},p,{href:"#"+(p.to||""),onClick:function(e){e.preventDefault();_push(p.to||"/");if(p.onClick)p.onClick(e);}}));\n'
    + '    }\n'
    + '    function NavLink(p){\n'
    + '      var ctx=R.useContext(RouterCtx);\n'
    + '      var active=ctx.path===(typeof p.to==="string"?p.to:(p.to&&p.to.pathname)||"");\n'
    + '      var cls=typeof p.className==="function"?p.className({isActive:active}):((p.className||"")+(active?" active":""));\n'
    + '      return R.createElement("a",Object.assign({},p,{className:cls,href:"#"+(typeof p.to==="string"?p.to:(p.to&&p.to.pathname)||""),onClick:function(e){e.preventDefault();_push(p.to);if(p.onClick)p.onClick(e);}}));\n'
    + '    }\n'
    // Navigate
    + '    function Navigate(p){R.useEffect(function(){_push(p.to||"/");},[]);return null;}\n'
    // Outlet
    + '    function Outlet(){return R.useContext(OutletCtx);}\n'
    // Hooks
    + '    function useNavigate(){return _push;}\n'
    + '    function useLocation(){var ctx=R.useContext(RouterCtx);return {pathname:ctx.path,search:ctx.search||"",hash:"",state:ctx.state};}\n'
    + '    function useParams(){return R.useContext(RouterCtx).params||{};}\n'
    + '    function useSearchParams(){\n'
    + '      var loc=useLocation();\n'
    + '      var sp=new URLSearchParams(loc.search);\n'
    + '      function set(next){_push(loc.pathname+"?"+next.toString());}\n'
    + '      return [sp,set];\n'
    + '    }\n'
    + '    function useMatch(pattern){var ctx=R.useContext(RouterCtx);return matchPath(pattern,ctx.path);}\n'
    + '    function useRouteError(){return null;}\n'
    + '    function useLoaderData(){return {};}\n'
    + '    function useOutletContext(){return R.useContext(OutletCtx);}\n'
    + '    function useHref(to){return "#"+(typeof to==="string"?to:(to&&to.pathname)||"");}\n'
    + '    function createBrowserRouter(routes){\n'
    + '      return {routes:routes,_isBrowserRouter:true};\n'
    + '    }\n'
    + '    function RouterProvider(p){\n'
    + '      return R.createElement(BrowserRouter,null,R.createElement(Routes,null,\n'
    + '        (p.router&&p.router.routes||[]).map(function(r,i){\n'
    + '          return R.createElement(Route,{key:i,path:r.path,element:r.element});\n'
    + '        })\n'
    + '      ));\n'
    + '    }\n'
    + '    return {__esModule:true,default:BrowserRouter,\n'
    + '      BrowserRouter:BrowserRouter,MemoryRouter:MemoryRouter,HashRouter:HashRouter,Router:Router,\n'
    + '      Routes:Routes,Route:Route,Link:Link,NavLink:NavLink,Navigate:Navigate,Outlet:Outlet,\n'
    + '      useNavigate:useNavigate,useLocation:useLocation,useParams:useParams,\n'
    + '      useSearchParams:useSearchParams,useMatch:useMatch,useRouteError:useRouteError,\n'
    + '      useLoaderData:useLoaderData,useOutletContext:useOutletContext,useHref:useHref,\n'
    + '      createBrowserRouter:createBrowserRouter,RouterProvider:RouterProvider,\n'
    + '      matchPath:matchPath};\n'
    + '  },\n'
    // ── react-router (alias) ─────────────────────────────────────────────────
    + '  "react-router":function(){return EXTERNALS["react-router-dom"]();},\n'
    // ── zustand ─────────────────────────────────────────────────────────────
    + '  "zustand":function(){\n'
    + '    var R=window.React;\n'
    + '    function create(initializer){\n'
    + '      var listeners=new Set();\n'
    + '      var state=initializer(function(partial){\n'
    + '        var next=typeof partial==="function"?partial(state):partial;\n'
    + '        state=Object.assign({},state,next);\n'
    + '        listeners.forEach(function(fn){fn(state);});\n'
    + '      },function(){return state;});\n'
    + '      function useStore(selector){\n'
    + '        var sel=selector||function(s){return s;};\n'
    + '        var _s=R.useState(function(){return sel(state);});\n'
    + '        var snap=_s[0],setSnap=_s[1];\n'
    + '        R.useEffect(function(){\n'
    + '          function sub(s){setSnap(sel(s));}\n'
    + '          listeners.add(sub);\n'
    + '          return function(){listeners.delete(sub);};\n'
    + '        },[]);\n'
    + '        return snap;\n'
    + '      }\n'
    + '      useStore.getState=function(){return state;};\n'
    + '      useStore.setState=function(partial){var next=typeof partial==="function"?partial(state):partial;state=Object.assign({},state,next);listeners.forEach(function(fn){fn(state);});};\n'
    + '      useStore.subscribe=function(fn){listeners.add(fn);return function(){listeners.delete(fn);};};\n'
    + '      return useStore;\n'
    + '    }\n'
    + '    return {__esModule:true,default:create,create:create};\n'
    + '  },\n'
    + '  "zustand/middleware":function(){\n'
    + '    function persist(fn){return fn;}\n'
    + '    function devtools(fn){return fn;}\n'
    + '    function immer(fn){return fn;}\n'
    + '    return {__esModule:true,persist:persist,devtools:devtools,immer:immer};\n'
    + '  },\n'
    // ── framer-motion / motion ───────────────────────────────────────────────
    + '  "framer-motion":function(){\n'
    + '    var R=window.React;\n'
    + '    function makeMotion(tag){\n'
    + '      return R.forwardRef(function(p,ref){\n'
    + '        var rest=Object.assign({},p);\n'
    + '        ["initial","animate","exit","whileHover","whileTap","whileInView","transition","variants","viewport","layout","layoutId"].forEach(function(k){delete rest[k];});\n'
    + '        return R.createElement(tag,Object.assign({ref:ref},rest));\n'
    + '      });\n'
    + '    }\n'
    + '    var tags=["div","span","p","h1","h2","h3","h4","h5","h6","section","article","main","header","footer","nav","ul","li","button","a","img","svg","path","form","input","textarea","label","figure","aside"];\n'
    + '    var motion={}; tags.forEach(function(t){motion[t]=makeMotion(t);});\n'
    + '    function AnimatePresence(p){return p.children||null;}\n'
    + '    function useAnimation(){return {start:function(){},stop:function(){},set:function(){}};}\n'
    + '    function useMotionValue(v){return {get:function(){return v;},set:function(n){v=n;},onChange:function(){return function(){};}};}\n'
    + '    function useSpring(v){return {get:function(){return v;},set:function(n){v=n;}};}\n'
    + '    function useTransform(mv,fn){return {get:function(){return fn(mv.get());},set:function(){}};}\n'
    + '    function useScroll(){return {scrollY:{get:function(){return 0;},onChange:function(){return function(){};}},scrollYProgress:{get:function(){return 0;},onChange:function(){return function(){};}},scrollX:{get:function(){return 0;},onChange:function(){return function(){};}},scrollXProgress:{get:function(){return 0;},onChange:function(){return function(){};}}}; }\n'
    + '    function useInView(){return false;}\n'
    + '    function useDragControls(){return {start:function(){}};}\n'
    + '    function useAnimate(){return [null,function(){}];}\n'
    + '    return {__esModule:true,default:motion,motion:motion,AnimatePresence:AnimatePresence,\n'
    + '      useAnimation:useAnimation,useMotionValue:useMotionValue,useSpring:useSpring,\n'
    + '      useTransform:useTransform,useScroll:useScroll,useInView:useInView,\n'
    + '      useDragControls:useDragControls,useAnimate:useAnimate};\n'
    + '  },\n'
    + '  "motion/react":function(){return EXTERNALS["framer-motion"]();},\n'
    + '  "motion":function(){return EXTERNALS["framer-motion"]();},\n'
    // ── date-fns ─────────────────────────────────────────────────────────────
    + '  "date-fns":function(){\n'
    + '    function fmt(d,f){if(!f)return new Date(d).toLocaleDateString();var s=new Date(d);var pad=function(n){return String(n).padStart(2,"0");};return f.replace("yyyy",s.getFullYear()).replace("MM",pad(s.getMonth()+1)).replace("dd",pad(s.getDate())).replace("HH",pad(s.getHours())).replace("mm",pad(s.getMinutes())).replace("ss",pad(s.getSeconds())).replace("MMM",s.toLocaleString("default",{month:"short"})).replace("MMMM",s.toLocaleString("default",{month:"long"})).replace("EEE",s.toLocaleString("default",{weekday:"short"})).replace("EEEE",s.toLocaleString("default",{weekday:"long"}));}\n'
    + '    function parseISO(s){return new Date(s);}\n'
    + '    function formatISO(d,opts){var s=new Date(d);var pad=function(n){return String(n).padStart(2,"0");};if(opts&&opts.representation==="date")return s.getFullYear()+"-"+pad(s.getMonth()+1)+"-"+pad(s.getDate());return s.toISOString();}\n'
    + '    function addDays(d,n){var r=new Date(d);r.setDate(r.getDate()+n);return r;}\n'
    + '    function subDays(d,n){return addDays(d,-n);}\n'
    + '    function addWeeks(d,n){return addDays(d,n*7);}\n'
    + '    function subWeeks(d,n){return addDays(d,-n*7);}\n'
    + '    function addMonths(d,n){var r=new Date(d);r.setMonth(r.getMonth()+n);return r;}\n'
    + '    function subMonths(d,n){return addMonths(d,-n);}\n'
    + '    function addYears(d,n){var r=new Date(d);r.setFullYear(r.getFullYear()+n);return r;}\n'
    + '    function subYears(d,n){return addYears(d,-n);}\n'
    + '    function addHours(d,n){var r=new Date(d);r.setHours(r.getHours()+n);return r;}\n'
    + '    function addMinutes(d,n){var r=new Date(d);r.setMinutes(r.getMinutes()+n);return r;}\n'
    + '    function differenceInDays(a,b){return Math.round((new Date(a)-new Date(b))/(864e5));}\n'
    + '    function differenceInHours(a,b){return Math.round((new Date(a)-new Date(b))/36e5);}\n'
    + '    function differenceInMinutes(a,b){return Math.round((new Date(a)-new Date(b))/6e4);}\n'
    + '    function differenceInMonths(a,b){var da=new Date(a),db=new Date(b);return (da.getFullYear()-db.getFullYear())*12+(da.getMonth()-db.getMonth());}\n'
    + '    function differenceInYears(a,b){return Math.floor(differenceInDays(a,b)/365);}\n'
    + '    function isBefore(a,b){return new Date(a)<new Date(b);}\n'
    + '    function isAfter(a,b){return new Date(a)>new Date(b);}\n'
    + '    function isSameDay(a,b){var da=new Date(a),db=new Date(b);return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate();}\n'
    + '    function isSameMonth(a,b){var da=new Date(a),db=new Date(b);return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth();}\n'
    + '    function isToday(d){return isSameDay(d,new Date());}\n'
    + '    function startOfDay(d){var r=new Date(d);r.setHours(0,0,0,0);return r;}\n'
    + '    function endOfDay(d){var r=new Date(d);r.setHours(23,59,59,999);return r;}\n'
    + '    function startOfWeek(d){var r=new Date(d);r.setDate(r.getDate()-r.getDay());r.setHours(0,0,0,0);return r;}\n'
    + '    function endOfWeek(d){var r=startOfWeek(d);r.setDate(r.getDate()+6);r.setHours(23,59,59,999);return r;}\n'
    + '    function startOfMonth(d){var r=new Date(d);r.setDate(1);r.setHours(0,0,0,0);return r;}\n'
    + '    function endOfMonth(d){var r=new Date(d);r.setMonth(r.getMonth()+1,0);r.setHours(23,59,59,999);return r;}\n'
    + '    function startOfYear(d){var r=new Date(d);r.setMonth(0,1);r.setHours(0,0,0,0);return r;}\n'
    + '    function getDay(d){return new Date(d).getDay();}\n'
    + '    function getDate(d){return new Date(d).getDate();}\n'
    + '    function getMonth(d){return new Date(d).getMonth();}\n'
    + '    function getYear(d){return new Date(d).getFullYear();}\n'
    + '    function getHours(d){return new Date(d).getHours();}\n'
    + '    function getMinutes(d){return new Date(d).getMinutes();}\n'
    + '    function setHours(d,h){var r=new Date(d);r.setHours(h);return r;}\n'
    + '    function setMinutes(d,m){var r=new Date(d);r.setMinutes(m);return r;}\n'
    + '    function isValid(d){return d instanceof Date&&!isNaN(d.getTime());}\n'
    + '    function formatDistanceToNow(d,opts){var diff=Date.now()-new Date(d);var abs=Math.abs(diff);var future=diff<0;var s=Math.floor(abs/1000);var suffix=opts&&opts.addSuffix?(future?" from now":" ago"):"";if(s<60)return s+"s"+suffix;if(s<3600)return Math.floor(s/60)+"m"+suffix;if(s<86400)return Math.floor(s/3600)+"h"+suffix;return Math.floor(s/86400)+"d"+suffix;}\n'
    + '    function formatDistance(a,b,opts){return formatDistanceToNow(b,opts);}\n'
    + '    function formatRelative(d,base){return formatDistanceToNow(d,{addSuffix:true});}\n'
    + '    function eachDayOfInterval(interval){var days=[];var cur=new Date(interval.start);var end=new Date(interval.end);while(cur<=end){days.push(new Date(cur));cur.setDate(cur.getDate()+1);}return days;}\n'
    + '    function eachWeekOfInterval(interval){var weeks=[];var cur=startOfWeek(new Date(interval.start));var end=new Date(interval.end);while(cur<=end){weeks.push(new Date(cur));cur.setDate(cur.getDate()+7);}return weeks;}\n'
    + '    function eachMonthOfInterval(interval){var months=[];var cur=startOfMonth(new Date(interval.start));var end=new Date(interval.end);while(cur<=end){months.push(new Date(cur));cur=addMonths(cur,1);}return months;}\n'
    + '    function max(dates){return new Date(Math.max.apply(null,dates.map(function(d){return new Date(d).getTime();})));}\n'
    + '    function min(dates){return new Date(Math.min.apply(null,dates.map(function(d){return new Date(d).getTime();})));}\n'
    + '    function clamp(d,interval){var t=new Date(d).getTime();return new Date(Math.min(Math.max(t,new Date(interval.start).getTime()),new Date(interval.end).getTime()));}\n'
    + '    function toDate(d){return d instanceof Date?d:new Date(d);}\n'
    + '    function fromUnixTime(t){return new Date(t*1000);}\n'
    + '    function getUnixTime(d){return Math.floor(new Date(d).getTime()/1000);}\n'
    + '    function getTime(d){return new Date(d).getTime();}\n'
    + '    function lightFormat(d,f){return fmt(d,f);}\n'
    + '    var all={__esModule:true,format:fmt,formatISO:formatISO,parseISO:parseISO,addDays:addDays,subDays:subDays,addWeeks:addWeeks,subWeeks:subWeeks,addMonths:addMonths,subMonths:subMonths,addYears:addYears,subYears:subYears,addHours:addHours,addMinutes:addMinutes,differenceInDays:differenceInDays,differenceInHours:differenceInHours,differenceInMinutes:differenceInMinutes,differenceInMonths:differenceInMonths,differenceInYears:differenceInYears,isBefore:isBefore,isAfter:isAfter,isSameDay:isSameDay,isSameMonth:isSameMonth,isToday:isToday,startOfDay:startOfDay,endOfDay:endOfDay,startOfWeek:startOfWeek,endOfWeek:endOfWeek,startOfMonth:startOfMonth,endOfMonth:endOfMonth,startOfYear:startOfYear,getDay:getDay,getDate:getDate,getMonth:getMonth,getYear:getYear,getHours:getHours,getMinutes:getMinutes,setHours:setHours,setMinutes:setMinutes,isValid:isValid,formatDistanceToNow:formatDistanceToNow,formatDistance:formatDistance,formatRelative:formatRelative,eachDayOfInterval:eachDayOfInterval,eachWeekOfInterval:eachWeekOfInterval,eachMonthOfInterval:eachMonthOfInterval,max:max,min:min,clamp:clamp,toDate:toDate,fromUnixTime:fromUnixTime,getUnixTime:getUnixTime,getTime:getTime,lightFormat:lightFormat};\n'
    + '    all.default=all;\n'
    + '    return all;\n'
    + '  },\n'
    // ── uuid ─────────────────────────────────────────────────────────────────
    + '  "uuid":function(){\n'
    + '    function v4(){return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==="x"?r:(r&0x3|0x8)).toString(16);});}\n'
    + '    return {__esModule:true,default:v4,v4:v4,v1:v4,v5:v4};\n'
    + '  },\n'
    // ── nanoid ───────────────────────────────────────────────────────────────
    + '  "nanoid":function(){\n'
    + '    function nanoid(n){n=n||21;var s="";var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";for(var i=0;i<n;i++)s+=c[Math.random()*64|0];return s;}\n'
    + '    return {__esModule:true,default:nanoid,nanoid:nanoid};\n'
    + '  },\n'
    // ── immer ────────────────────────────────────────────────────────────────
    + '  "immer":function(){\n'
    + '    function produce(base,recipe){var draft=JSON.parse(JSON.stringify(base));recipe(draft);return draft;}\n'
    + '    return {__esModule:true,default:produce,produce:produce,enableMapSet:function(){},enableAllPlugins:function(){}};\n'
    + '  },\n'
    // ── axios ────────────────────────────────────────────────────────────────
    + '  "axios":function(){\n'
    + '    function request(cfg){\n'
    + '      return fetch(cfg.url||cfg,{method:cfg.method||"GET",headers:cfg.headers||{},body:cfg.data?JSON.stringify(cfg.data):undefined})\n'
    + '        .then(function(r){return r.json().then(function(d){return {data:d,status:r.status,headers:{}};});});\n'
    + '    }\n'
    + '    var axios=function(cfg){return request(cfg);};\n'
    + '    axios.get=function(url,cfg){return request(Object.assign({url:url,method:"GET"},cfg));};\n'
    + '    axios.post=function(url,data,cfg){return request(Object.assign({url:url,method:"POST",data:data},cfg));};\n'
    + '    axios.put=function(url,data,cfg){return request(Object.assign({url:url,method:"PUT",data:data},cfg));};\n'
    + '    axios.delete=function(url,cfg){return request(Object.assign({url:url,method:"DELETE"},cfg));};\n'
    + '    axios.create=function(defaults){return axios;};\n'
    + '    axios.defaults={headers:{common:{}}};\n'
    + '    return {__esModule:true,default:axios};\n'
    + '  },\n'
    // ── @tanstack/react-query ────────────────────────────────────────────────
    + '  "@tanstack/react-query":function(){\n'
    + '    var R=window.React;\n'
    + '    function QueryClient(){this._cache={};}\n'
    + '    QueryClient.prototype.invalidateQueries=function(){return Promise.resolve();};\n'
    + '    QueryClient.prototype.setQueryData=function(key,data){this._cache[JSON.stringify(key)]=data;};\n'
    + '    QueryClient.prototype.getQueryData=function(key){return this._cache[JSON.stringify(key)];};\n'
    + '    var QCCtx=R.createContext(new QueryClient());\n'
    + '    function QueryClientProvider(p){return R.createElement(QCCtx.Provider,{value:p.client},p.children);}\n'
    + '    function useQuery(opts){\n'
    + '      var _s=R.useState({data:undefined,isLoading:true,error:null,isError:false,isSuccess:false});\n'
    + '      var state=_s[0],setState=_s[1];\n'
    + '      R.useEffect(function(){\n'
    + '        if(!opts||opts.enabled===false){setState({data:undefined,isLoading:false,error:null,isError:false,isSuccess:false});return;}\n'
    + '        var fn=opts.queryFn||opts.fn;\n'
    + '        if(!fn){setState({data:undefined,isLoading:false,error:null,isError:false,isSuccess:false});return;}\n'
    + '        Promise.resolve(fn()).then(function(d){setState({data:d,isLoading:false,error:null,isError:false,isSuccess:true});}).catch(function(e){setState({data:undefined,isLoading:false,error:e,isError:true,isSuccess:false});});\n'
    + '      },[]);\n'
    + '      return state;\n'
    + '    }\n'
    + '    function useMutation(opts){\n'
    + '      var _s=R.useState({isLoading:false,error:null,data:undefined});\n'
    + '      var state=_s[0],setState=_s[1];\n'
    + '      function mutate(vars){\n'
    + '        setState({isLoading:true,error:null,data:undefined});\n'
    + '        Promise.resolve((opts.mutationFn||opts.fn)(vars)).then(function(d){setState({isLoading:false,error:null,data:d});if(opts.onSuccess)opts.onSuccess(d,vars);}).catch(function(e){setState({isLoading:false,error:e,data:undefined});if(opts.onError)opts.onError(e,vars);});\n'
    + '      }\n'
    + '      return Object.assign({},state,{mutate:mutate,mutateAsync:function(v){return Promise.resolve((opts.mutationFn||opts.fn)(v));}});\n'
    + '    }\n'
    + '    function useQueryClient(){return R.useContext(QCCtx);}\n'
    + '    return {__esModule:true,QueryClient:QueryClient,QueryClientProvider:QueryClientProvider,useQuery:useQuery,useMutation:useMutation,useQueryClient:useQueryClient};\n'
    + '  },\n'
    // ── socket.io-client ─────────────────────────────────────────────────────
    + '  "socket.io-client":function(){\n'
    + '    function io(url,opts){\n'
    + '      var _handlers={};\n'
    + '      var sock={\n'
    + '        on:function(ev,fn){(_handlers[ev]=_handlers[ev]||[]).push(fn);return sock;},\n'
    + '        off:function(ev,fn){if(_handlers[ev])_handlers[ev]=_handlers[ev].filter(function(f){return f!==fn;});return sock;},\n'
    + '        emit:function(ev){console.log("[preview] socket.emit",ev);return sock;},\n'
    + '        disconnect:function(){return sock;},\n'
    + '        connect:function(){return sock;},\n'
    + '        id:"preview-socket-id",\n'
    + '        connected:false\n'
    + '      };\n'
    + '      return sock;\n'
    + '    }\n'
    + '    return {__esModule:true,default:io,io:io};\n'
    + '  },\n'
    // ── recharts ─────────────────────────────────────────────────────────────
    + '  "recharts":function(){\n'
    + '    var R=window.React;\n'
    + '    function stub(name){return function(p){return R.createElement("div",{style:{background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:16,color:"#94a3b8",fontSize:12,textAlign:"center",minHeight:120,display:"flex",alignItems:"center",justifyContent:"center"}},name+" chart");};}\n'
    + '    return {__esModule:true,\n'
    + '      ResponsiveContainer:function(p){return R.createElement("div",{style:{width:"100%",height:p.height||300}},p.children);},\n'
    + '      LineChart:stub("Line"),BarChart:stub("Bar"),PieChart:stub("Pie"),AreaChart:stub("Area"),\n'
    + '      RadarChart:stub("Radar"),ScatterChart:stub("Scatter"),ComposedChart:stub("Composed"),\n'
    + '      Line:function(){return null;},Bar:function(){return null;},Pie:function(){return null;},\n'
    + '      Area:function(){return null;},XAxis:function(){return null;},YAxis:function(){return null;},\n'
    + '      CartesianGrid:function(){return null;},Tooltip:function(){return null;},Legend:function(){return null;},\n'
    + '      Cell:function(){return null;},PolarGrid:function(){return null;},PolarAngleAxis:function(){return null;},\n'
    + '      Radar:function(){return null;},Scatter:function(){return null;}};\n'
    + '  },\n'
    // ── @radix-ui stubs (passthrough wrappers) ───────────────────────────────
    + '  "@radix-ui/react-dialog":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({open:false,setOpen:function(){}});\n'
    + '    function Root(p){var _s=R.useState(p.defaultOpen||false);var open=p.open!==undefined?p.open:_s[0];var setOpen=p.onOpenChange||_s[1];return R.createElement(Ctx.Provider,{value:{open:open,setOpen:setOpen}},p.children);}\n'
    + '    function Trigger(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setOpen(true);if(p.onClick)p.onClick(e);}},{"data-state":ctx.open?"open":"closed"}));}\n'
    + '    function Portal(p){return p.children||null;}\n'
    + '    function Overlay(p){var ctx=R.useContext(Ctx);if(!ctx.open)return null;return R.createElement("div",Object.assign({},p,{style:Object.assign({position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50},p.style),onClick:function(){ctx.setOpen(false);}},{"data-state":"open"}));}\n'
    + '    function Content(p){var ctx=R.useContext(Ctx);if(!ctx.open)return null;return R.createElement("div",Object.assign({},p,{style:Object.assign({position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#1e293b",borderRadius:8,padding:24,zIndex:51,maxWidth:"90vw",maxHeight:"90vh",overflow:"auto"},p.style)},{"data-state":"open"}));}\n'
    + '    function Close(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setOpen(false);if(p.onClick)p.onClick(e);}}));}\n'
    + '    function Title(p){return R.createElement("h2",p);}\n'
    + '    function Description(p){return R.createElement("p",p);}\n'
    + '    return {__esModule:true,Root:Root,Trigger:Trigger,Portal:Portal,Overlay:Overlay,Content:Content,Close:Close,Title:Title,Description:Description,default:{Root:Root,Trigger:Trigger,Portal:Portal,Overlay:Overlay,Content:Content,Close:Close,Title:Title,Description:Description}};\n'
    + '  },\n'
    + '  "@radix-ui/react-dropdown-menu":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({open:false,setOpen:function(){}});\n'
    + '    function Root(p){var _s=R.useState(false);var open=p.open!==undefined?p.open:_s[0];var setOpen=p.onOpenChange||_s[1];return R.createElement(Ctx.Provider,{value:{open:open,setOpen:setOpen}},p.children);}\n'
    + '    function Trigger(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setOpen(!ctx.open);if(p.onClick)p.onClick(e);}},{"data-state":ctx.open?"open":"closed"}));}\n'
    + '    function Portal(p){return p.children||null;}\n'
    + '    function Content(p){var ctx=R.useContext(Ctx);if(!ctx.open)return null;return R.createElement("div",Object.assign({},p,{style:Object.assign({position:"absolute",background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"4px 0",zIndex:50,minWidth:160},p.style)},{"data-state":"open"}));}\n'
    + '    function Item(p){return R.createElement("div",Object.assign({},p,{style:Object.assign({padding:"6px 12px",cursor:"pointer",fontSize:14},p.style),role:"menuitem"}));}\n'
    + '    function Label(p){return R.createElement("div",Object.assign({},p,{style:Object.assign({padding:"4px 12px",fontSize:12,color:"#64748b"},p.style)}));}\n'
    + '    function Separator(p){return R.createElement("hr",Object.assign({},p,{style:Object.assign({border:"none",borderTop:"1px solid #334155",margin:"4px 0"},p.style)}));}\n'
    + '    function CheckboxItem(p){return R.createElement(Item,p);}\n'
    + '    function RadioItem(p){return R.createElement(Item,p);}\n'
    + '    function Sub(p){return p.children||null;}\n'
    + '    function SubTrigger(p){return R.createElement(Item,p);}\n'
    + '    function SubContent(p){return R.createElement(Content,p);}\n'
    + '    function Group(p){return R.createElement("div",p);}\n'
    + '    function RadioGroup(p){return R.createElement("div",p);}\n'
    + '    function ItemIndicator(p){return p.children||null;}\n'
    + '    return {__esModule:true,Root:Root,Trigger:Trigger,Portal:Portal,Content:Content,Item:Item,Label:Label,Separator:Separator,CheckboxItem:CheckboxItem,RadioItem:RadioItem,Sub:Sub,SubTrigger:SubTrigger,SubContent:SubContent,Group:Group,RadioGroup:RadioGroup,ItemIndicator:ItemIndicator};\n'
    + '  },\n'
    + '  "@radix-ui/react-tooltip":function(){\n'
    + '    var R=window.React;\n'
    + '    function Provider(p){return p.children||null;}\n'
    + '    function Root(p){return p.children||null;}\n'
    + '    function Trigger(p){return R.createElement("span",p);}\n'
    + '    function Portal(p){return p.children||null;}\n'
    + '    function Content(p){return null;}\n'
    + '    function Arrow(p){return null;}\n'
    + '    return {__esModule:true,Provider:Provider,Root:Root,Trigger:Trigger,Portal:Portal,Content:Content,Arrow:Arrow};\n'
    + '  },\n'
    + '  "@radix-ui/react-tabs":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({value:"",setValue:function(){}});\n'
    + '    function Root(p){var _s=R.useState(p.defaultValue||"");var val=p.value!==undefined?p.value:_s[0];var setVal=p.onValueChange||_s[1];return R.createElement(Ctx.Provider,{value:{value:val,setValue:setVal}},R.createElement("div",p));}\n'
    + '    function List(p){return R.createElement("div",Object.assign({},p,{role:"tablist"}));}\n'
    + '    function Trigger(p){var ctx=R.useContext(Ctx);var active=ctx.value===p.value;return R.createElement("button",Object.assign({},p,{role:"tab","data-state":active?"active":"inactive",onClick:function(e){ctx.setValue(p.value);if(p.onClick)p.onClick(e);}}));}\n'
    + '    function Content(p){var ctx=R.useContext(Ctx);if(ctx.value!==p.value)return null;return R.createElement("div",Object.assign({},p,{role:"tabpanel","data-state":"active"}));}\n'
    + '    return {__esModule:true,Root:Root,List:List,Trigger:Trigger,Content:Content};\n'
    + '  },\n'
    + '  "@radix-ui/react-select":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({value:"",setValue:function(){},open:false,setOpen:function(){}});\n'
    + '    function Root(p){var _sv=R.useState(p.defaultValue||"");var _so=R.useState(false);var val=p.value!==undefined?p.value:_sv[0];var setVal=p.onValueChange||_sv[1];return R.createElement(Ctx.Provider,{value:{value:val,setValue:setVal,open:_so[0],setOpen:_so[1]}},p.children);}\n'
    + '    function Trigger(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setOpen(!ctx.open);if(p.onClick)p.onClick(e);},"data-state":ctx.open?"open":"closed"}));}\n'
    + '    function Value(p){var ctx=R.useContext(Ctx);return R.createElement("span",null,ctx.value||p.placeholder||"");}\n'
    + '    function Portal(p){return p.children||null;}\n'
    + '    function Content(p){var ctx=R.useContext(Ctx);if(!ctx.open)return null;return R.createElement("div",Object.assign({},p,{style:Object.assign({position:"absolute",background:"#1e293b",border:"1px solid #334155",borderRadius:6,zIndex:50,minWidth:160,padding:"4px 0"},p.style),"data-state":"open"}));}\n'
    + '    function Item(p){var ctx=R.useContext(Ctx);return R.createElement("div",Object.assign({},p,{style:Object.assign({padding:"6px 12px",cursor:"pointer",fontSize:14,"data-highlighted":ctx.value===p.value?"":undefined},p.style),onClick:function(e){ctx.setValue(p.value);ctx.setOpen(false);if(p.onClick)p.onClick(e);}}));}\n'
    + '    function ItemText(p){return R.createElement("span",p);}\n'
    + '    function ItemIndicator(p){return null;}\n'
    + '    function Group(p){return R.createElement("div",p);}\n'
    + '    function Label(p){return R.createElement("div",Object.assign({},p,{style:Object.assign({padding:"4px 12px",fontSize:12,color:"#64748b"},p.style)}));}\n'
    + '    function Separator(p){return R.createElement("hr",Object.assign({},p,{style:Object.assign({border:"none",borderTop:"1px solid #334155",margin:"4px 0"},p.style)}));}\n'
    + '    function ScrollUpButton(p){return null;}\n'
    + '    function ScrollDownButton(p){return null;}\n'
    + '    function Viewport(p){return R.createElement("div",p);}\n'
    + '    function Icon(p){return R.createElement("span",p,p.children||"▾");}\n'
    + '    return {__esModule:true,Root:Root,Trigger:Trigger,Value:Value,Portal:Portal,Content:Content,Item:Item,ItemText:ItemText,ItemIndicator:ItemIndicator,Group:Group,Label:Label,Separator:Separator,ScrollUpButton:ScrollUpButton,ScrollDownButton:ScrollDownButton,Viewport:Viewport,Icon:Icon};\n'
    + '  },\n'
    + '  "@radix-ui/react-popover":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({open:false,setOpen:function(){}});\n'
    + '    function Root(p){var _s=R.useState(false);var open=p.open!==undefined?p.open:_s[0];var setOpen=p.onOpenChange||_s[1];return R.createElement(Ctx.Provider,{value:{open:open,setOpen:setOpen}},p.children);}\n'
    + '    function Trigger(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setOpen(!ctx.open);if(p.onClick)p.onClick(e);},"data-state":ctx.open?"open":"closed"}));}\n'
    + '    function Portal(p){return p.children||null;}\n'
    + '    function Content(p){var ctx=R.useContext(Ctx);if(!ctx.open)return null;return R.createElement("div",Object.assign({},p,{style:Object.assign({position:"absolute",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:16,zIndex:50},p.style),"data-state":"open"}));}\n'
    + '    function Close(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setOpen(false);if(p.onClick)p.onClick(e);}}));}\n'
    + '    function Arrow(p){return null;}\n'
    + '    return {__esModule:true,Root:Root,Trigger:Trigger,Portal:Portal,Content:Content,Close:Close,Arrow:Arrow};\n'
    + '  },\n'
    + '  "@radix-ui/react-slot":function(){\n'
    + '    var R=window.React;\n'
    + '    var Slot=R.forwardRef(function(p,ref){var children=p.children;if(R.isValidElement(children)){return R.cloneElement(children,Object.assign({},p,children.props,{ref:ref}));}return children||null;});\n'
    + '    return {__esModule:true,Slot:Slot,default:Slot};\n'
    + '  },\n'
    + '  "@radix-ui/react-label":function(){\n'
    + '    var R=window.React;\n'
    + '    var Root=R.forwardRef(function(p,ref){return R.createElement("label",Object.assign({ref:ref},p));});\n'
    + '    return {__esModule:true,Root:Root,default:Root};\n'
    + '  },\n'
    + '  "@radix-ui/react-checkbox":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({checked:false});\n'
    + '    var Root=R.forwardRef(function(p,ref){var _s=R.useState(p.defaultChecked||false);var checked=p.checked!==undefined?p.checked:_s[0];var setChecked=p.onCheckedChange||_s[1];return R.createElement(Ctx.Provider,{value:{checked:checked}},R.createElement("button",Object.assign({ref:ref},p,{role:"checkbox","aria-checked":checked,"data-state":checked?"checked":"unchecked",onClick:function(e){setChecked(!checked);if(p.onCheckedChange)p.onCheckedChange(!checked);if(p.onClick)p.onClick(e);}})));});\n'
    + '    function Indicator(p){var ctx=R.useContext(Ctx);if(!ctx.checked)return null;return R.createElement("span",p);}\n'
    + '    return {__esModule:true,Root:Root,Indicator:Indicator};\n'
    + '  },\n'
    + '  "@radix-ui/react-switch":function(){\n'
    + '    var R=window.React;\n'
    + '    var Root=R.forwardRef(function(p,ref){var _s=R.useState(p.defaultChecked||false);var checked=p.checked!==undefined?p.checked:_s[0];var setChecked=p.onCheckedChange||_s[1];return R.createElement("button",Object.assign({ref:ref},p,{role:"switch","aria-checked":checked,"data-state":checked?"checked":"unchecked",onClick:function(e){setChecked(!checked);if(p.onCheckedChange)p.onCheckedChange(!checked);if(p.onClick)p.onClick(e);}}));});\n'
    + '    function Thumb(p){return R.createElement("span",p);}\n'
    + '    return {__esModule:true,Root:Root,Thumb:Thumb};\n'
    + '  },\n'
    + '  "@radix-ui/react-progress":function(){\n'
    + '    var R=window.React;\n'
    + '    var Root=R.forwardRef(function(p,ref){return R.createElement("div",Object.assign({ref:ref},p,{role:"progressbar","aria-valuenow":p.value,"aria-valuemax":p.max||100}));});\n'
    + '    var Indicator=R.forwardRef(function(p,ref){return R.createElement("div",Object.assign({ref:ref},p));});\n'
    + '    return {__esModule:true,Root:Root,Indicator:Indicator};\n'
    + '  },\n'
    + '  "@radix-ui/react-separator":function(){\n'
    + '    var R=window.React;\n'
    + '    var Root=R.forwardRef(function(p,ref){return R.createElement("hr",Object.assign({ref:ref},p,{role:"separator"}));});\n'
    + '    return {__esModule:true,Root:Root,default:Root};\n'
    + '  },\n'
    + '  "@radix-ui/react-avatar":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({loaded:false});\n'
    + '    function Root(p){return R.createElement(Ctx.Provider,{value:{loaded:false}},R.createElement("span",p));}\n'
    + '    function Image(p){var _s=R.useState(false);return R.createElement("img",Object.assign({},p,{onLoad:function(){_s[1](true);},style:Object.assign({},p.style,{display:_s[0]?"block":"none"})}));}\n'
    + '    function Fallback(p){return R.createElement("span",p);}\n'
    + '    return {__esModule:true,Root:Root,Image:Image,Fallback:Fallback};\n'
    + '  },\n'
    + '  "@radix-ui/react-scroll-area":function(){\n'
    + '    var R=window.React;\n'
    + '    var Root=R.forwardRef(function(p,ref){return R.createElement("div",Object.assign({ref:ref},p,{style:Object.assign({overflow:"auto"},p.style)}));});\n'
    + '    function Viewport(p){return R.createElement("div",p);}\n'
    + '    function Scrollbar(p){return null;}\n'
    + '    function Thumb(p){return null;}\n'
    + '    function Corner(p){return null;}\n'
    + '    return {__esModule:true,Root:Root,Viewport:Viewport,Scrollbar:Scrollbar,Thumb:Thumb,Corner:Corner};\n'
    + '  },\n'
    + '  "@radix-ui/react-accordion":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({value:null,setValue:function(){}});\n'
    + '    function Root(p){var _s=R.useState(p.defaultValue||null);var val=p.value!==undefined?p.value:_s[0];var setVal=p.onValueChange||_s[1];return R.createElement(Ctx.Provider,{value:{value:val,setValue:setVal}},R.createElement("div",p));}\n'
    + '    function Item(p){return R.createElement("div",p);}\n'
    + '    function Trigger(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setValue(ctx.value===p.value?null:p.value);if(p.onClick)p.onClick(e);}}));}\n'
    + '    function Content(p){var ctx=R.useContext(Ctx);if(ctx.value!==p.value)return null;return R.createElement("div",p);}\n'
    + '    function Header(p){return R.createElement("h3",p);}\n'
    + '    return {__esModule:true,Root:Root,Item:Item,Trigger:Trigger,Content:Content,Header:Header};\n'
    + '  },\n'
    + '  "@radix-ui/react-collapsible":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({open:false,setOpen:function(){}});\n'
    + '    function Root(p){var _s=R.useState(p.defaultOpen||false);var open=p.open!==undefined?p.open:_s[0];var setOpen=p.onOpenChange||_s[1];return R.createElement(Ctx.Provider,{value:{open:open,setOpen:setOpen}},R.createElement("div",p));}\n'
    + '    function Trigger(p){var ctx=R.useContext(Ctx);return R.createElement("button",Object.assign({},p,{onClick:function(e){ctx.setOpen(!ctx.open);if(p.onClick)p.onClick(e);},"data-state":ctx.open?"open":"closed"}));}\n'
    + '    function Content(p){var ctx=R.useContext(Ctx);if(!ctx.open)return null;return R.createElement("div",Object.assign({},p,{"data-state":"open"}));}\n'
    + '    return {__esModule:true,Root:Root,Trigger:Trigger,Content:Content};\n'
    + '  },\n'
    // ── @radix-ui/react-toast ────────────────────────────────────────────────
    + '  "@radix-ui/react-toast":function(){\n'
    + '    var R=window.React;\n'
    + '    function Provider(p){return p.children||null;}\n'
    + '    function Viewport(p){return R.createElement("div",Object.assign({},p,{style:Object.assign({position:"fixed",bottom:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8},p.style)}));}\n'
    + '    function Root(p){if(p.open===false)return null;return R.createElement("div",Object.assign({},p,{role:"status","data-state":p.open?"open":"closed",style:Object.assign({background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"12px 16px",minWidth:200},p.style)}));}\n'
    + '    function Title(p){return R.createElement("div",Object.assign({},p,{style:Object.assign({fontWeight:600,fontSize:14},p.style)}));}\n'
    + '    function Description(p){return R.createElement("div",Object.assign({},p,{style:Object.assign({fontSize:13,color:"#94a3b8"},p.style)}));}\n'
    + '    function Action(p){return R.createElement("button",p);}\n'
    + '    function Close(p){return R.createElement("button",p);}\n'
    + '    function useToast(){return {toast:function(){},dismiss:function(){}};}\n'
    + '    return {__esModule:true,Provider:Provider,Viewport:Viewport,Root:Root,Title:Title,Description:Description,Action:Action,Close:Close,useToast:useToast};\n'
    + '  },\n'
    // ── @radix-ui/react-hover-card ───────────────────────────────────────────
    + '  "@radix-ui/react-hover-card":function(){\n'
    + '    var R=window.React;\n'
    + '    function Root(p){return p.children||null;}\n'
    + '    function Trigger(p){return R.createElement("span",p);}\n'
    + '    function Portal(p){return p.children||null;}\n'
    + '    function Content(p){return null;}\n'
    + '    function Arrow(p){return null;}\n'
    + '    return {__esModule:true,Root:Root,Trigger:Trigger,Portal:Portal,Content:Content,Arrow:Arrow};\n'
    + '  },\n'
    // ── @radix-ui/react-navigation-menu ─────────────────────────────────────
    + '  "@radix-ui/react-navigation-menu":function(){\n'
    + '    var R=window.React;\n'
    + '    function Root(p){return R.createElement("nav",p);}\n'
    + '    function List(p){return R.createElement("ul",p);}\n'
    + '    function Item(p){return R.createElement("li",p);}\n'
    + '    function Trigger(p){return R.createElement("button",p);}\n'
    + '    function Content(p){return R.createElement("div",p);}\n'
    + '    function Link(p){return R.createElement("a",p);}\n'
    + '    function Viewport(p){return null;}\n'
    + '    function Indicator(p){return null;}\n'
    + '    function Sub(p){return p.children||null;}\n'
    + '    return {__esModule:true,Root:Root,List:List,Item:Item,Trigger:Trigger,Content:Content,Link:Link,Viewport:Viewport,Indicator:Indicator,Sub:Sub};\n'
    + '  },\n'
    // ── @radix-ui/react-context-menu ────────────────────────────────────────
    + '  "@radix-ui/react-context-menu":function(){return EXTERNALS["@radix-ui/react-dropdown-menu"]();},\n'
    // ── @radix-ui/react-menubar ──────────────────────────────────────────────
    + '  "@radix-ui/react-menubar":function(){return EXTERNALS["@radix-ui/react-dropdown-menu"]();},\n'
    // ── @radix-ui/react-toggle ───────────────────────────────────────────────
    + '  "@radix-ui/react-toggle":function(){\n'
    + '    var R=window.React;\n'
    + '    var Root=R.forwardRef(function(p,ref){var _s=R.useState(p.defaultPressed||false);var pressed=p.pressed!==undefined?p.pressed:_s[0];var setPressed=p.onPressedChange||_s[1];return R.createElement("button",Object.assign({ref:ref},p,{"aria-pressed":pressed,"data-state":pressed?"on":"off",onClick:function(e){setPressed(!pressed);if(p.onPressedChange)p.onPressedChange(!pressed);if(p.onClick)p.onClick(e);}}));});\n'
    + '    return {__esModule:true,Root:Root,default:Root};\n'
    + '  },\n'
    // ── @radix-ui/react-toggle-group ────────────────────────────────────────
    + '  "@radix-ui/react-toggle-group":function(){\n'
    + '    var R=window.React;\n'
    + '    var Ctx=R.createContext({value:"",setValue:function(){}});\n'
    + '    function Root(p){var _s=R.useState(p.defaultValue||"");var val=p.value!==undefined?p.value:_s[0];var setVal=p.onValueChange||_s[1];return R.createElement(Ctx.Provider,{value:{value:val,setValue:setVal}},R.createElement("div",p));}\n'
    + '    function Item(p){var ctx=R.useContext(Ctx);var active=ctx.value===p.value;return R.createElement("button",Object.assign({},p,{"data-state":active?"on":"off",onClick:function(e){ctx.setValue(p.value);if(p.onClick)p.onClick(e);}}));}\n'
    + '    return {__esModule:true,Root:Root,Item:Item};\n'
    + '  },\n'
    // ── @radix-ui/react-alert-dialog ────────────────────────────────────────
    + '  "@radix-ui/react-alert-dialog":function(){return EXTERNALS["@radix-ui/react-dialog"]();},\n'
    // ── @radix-ui/react-aspect-ratio ────────────────────────────────────────
    + '  "@radix-ui/react-aspect-ratio":function(){\n'
    + '    var R=window.React;\n'
    + '    var Root=R.forwardRef(function(p,ref){var ratio=p.ratio||1;return R.createElement("div",{ref:ref,style:{position:"relative",width:"100%",paddingBottom:(100/ratio)+"%"}},R.createElement("div",{style:{position:"absolute",inset:0}},p.children));});\n'
    + '    return {__esModule:true,Root:Root,default:Root};\n'
    + '  },\n'
    // ── react-native ─────────────────────────────────────────────────────────
    // Maps every RN primitive to a web equivalent so generated RN code renders
    // in the browser preview without "element type is invalid" crashes.
    + '  "react-native":function(){\n'
    + '    var R=window.React;\n'
    + '    function mkDiv(displayName,defaultStyle){\n'
    + '      var C=R.forwardRef(function(p,ref){\n'
    + '        var style=Object.assign({},defaultStyle||{},p.style);\n'
    + '        return R.createElement("div",Object.assign({},p,{ref:ref,style:style}));\n'
    + '      });\n'
    + '      C.displayName=displayName;\n'
    + '      return C;\n'
    + '    }\n'
    + '    var View=mkDiv("View",{display:"flex",flexDirection:"column"});\n'
    + '    var ScrollView=mkDiv("ScrollView",{display:"flex",flexDirection:"column",overflowY:"auto"});\n'
    + '    var SafeAreaView=mkDiv("SafeAreaView",{display:"flex",flexDirection:"column"});\n'
    + '    var KeyboardAvoidingView=mkDiv("KeyboardAvoidingView",{display:"flex",flexDirection:"column"});\n'
    + '    var FlatList=R.forwardRef(function(p,ref){\n'
    + '      var data=p.data||[];\n'
    + '      return R.createElement("div",{ref:ref,style:Object.assign({display:"flex",flexDirection:"column"},p.style)},\n'
    + '        data.map(function(item,i){return p.renderItem({item:item,index:i});}))\n'
    + '    });\n'
    + '    FlatList.displayName="FlatList";\n'
    + '    var SectionList=FlatList;\n'
    + '    var Text=R.forwardRef(function(p,ref){return R.createElement("span",Object.assign({},p,{ref:ref,style:Object.assign({fontFamily:"inherit"},p.style)}));});\n'
    + '    Text.displayName="Text";\n'
    + '    var Image=R.forwardRef(function(p,ref){var src=p.source&&(typeof p.source==="string"?p.source:p.source.uri)||p.src||"";return R.createElement("img",{ref:ref,src:src,alt:p.alt||"",style:Object.assign({maxWidth:"100%"},p.style)});});\n'
    + '    Image.displayName="Image";\n'
    + '    var TextInput=R.forwardRef(function(p,ref){return R.createElement("input",Object.assign({},p,{ref:ref,value:p.value,defaultValue:p.defaultValue,placeholder:p.placeholder,onChange:function(e){if(p.onChangeText)p.onChangeText(e.target.value);if(p.onChange)p.onChange(e);},style:Object.assign({border:"1px solid #ccc",borderRadius:4,padding:"6px 10px",fontSize:14},p.style)}));});\n'
    + '    TextInput.displayName="TextInput";\n'
    + '    var TouchableOpacity=R.forwardRef(function(p,ref){return R.createElement("button",Object.assign({},p,{ref:ref,onClick:p.onPress||p.onClick,style:Object.assign({background:"none",border:"none",cursor:"pointer",padding:0},p.style)}));});\n'
    + '    TouchableOpacity.displayName="TouchableOpacity";\n'
    + '    var TouchableHighlight=TouchableOpacity;\n'
    + '    var TouchableWithoutFeedback=R.forwardRef(function(p,ref){return R.createElement("div",{ref:ref,onClick:p.onPress||p.onClick,style:p.style},p.children);});\n'
    + '    var Pressable=R.forwardRef(function(p,ref){var style=typeof p.style==="function"?p.style({pressed:false}):p.style;return R.createElement("div",{ref:ref,onClick:p.onPress||p.onClick,style:Object.assign({cursor:"pointer"},style)},p.children);});\n'
    + '    Pressable.displayName="Pressable";\n'
    + '    var ActivityIndicator=function(p){return R.createElement("div",{style:Object.assign({display:"flex",alignItems:"center",justifyContent:"center",padding:16},p.style)},R.createElement("span",{style:{fontSize:12,color:p.color||"#999"}},"Loading…"));};\n'
    + '    var Modal=function(p){if(!p.visible)return null;return R.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}},p.children);};\n'
    + '    var Switch=function(p){return R.createElement("input",{type:"checkbox",checked:!!p.value,onChange:function(e){if(p.onValueChange)p.onValueChange(e.target.checked);}});};\n'
    + '    var Slider=function(p){return R.createElement("input",{type:"range",min:p.minimumValue||0,max:p.maximumValue||1,step:p.step||0.01,value:p.value||0,onChange:function(e){if(p.onValueChange)p.onValueChange(parseFloat(e.target.value));}});};\n'
    + '    var StatusBar=function(){return null;};\n'
    + '    var Platform={OS:"web",Version:"1.0",select:function(obj){return obj.web||obj.default||Object.values(obj)[0];},isPad:false,isTV:false};\n'
    + '    var Dimensions={get:function(dim){return dim==="window"?{width:window.innerWidth,height:window.innerHeight,scale:1,fontScale:1}:{width:window.screen.width,height:window.screen.height,scale:1,fontScale:1};},addEventListener:function(){return {remove:function(){}};},removeEventListener:function(){}};\n'
    + '    var StyleSheet={create:function(s){return s;},flatten:function(s){if(!s)return {};if(Array.isArray(s))return Object.assign.apply(Object,[{}].concat(s.filter(Boolean)));return s;},hairlineWidth:1,absoluteFill:{position:"absolute",top:0,left:0,right:0,bottom:0},absoluteFillObject:{position:"absolute",top:0,left:0,right:0,bottom:0}};\n'
    + '    var Animated={Value:function(v){this._value=v;this.setValue=function(n){this._value=n;};this.interpolate=function(cfg){return cfg;};},ValueXY:function(v){this.x=new Animated.Value((v||{}).x||0);this.y=new Animated.Value((v||{}).y||0);},timing:function(v,cfg){return {start:function(cb){if(cb)cb({finished:true});},stop:function(){}};},spring:function(v,cfg){return {start:function(cb){if(cb)cb({finished:true});},stop:function(){}};},decay:function(v,cfg){return {start:function(cb){if(cb)cb({finished:true});},stop:function(){}};},sequence:function(a){return {start:function(cb){if(cb)cb({finished:true});},stop:function(){}};},parallel:function(a){return {start:function(cb){if(cb)cb({finished:true});},stop:function(){}};},loop:function(a){return {start:function(){},stop:function(){}};},event:function(){return function(){};},View:mkDiv("Animated.View"),Text:R.forwardRef(function(p,ref){return R.createElement("span",Object.assign({},p,{ref:ref}));}),Image:R.forwardRef(function(p,ref){return R.createElement("img",Object.assign({},p,{ref:ref}));}),FlatList:FlatList,ScrollView:ScrollView,createAnimatedComponent:function(C){return C;}};\n'
    + '    var useWindowDimensions=function(){return {width:window.innerWidth,height:window.innerHeight,scale:1,fontScale:1};};\n'
    + '    var useColorScheme=function(){return "light";};\n'
    + '    var Alert={alert:function(title,msg,btns){window.alert(title+(msg?("\\n"+msg):""));}};\n'
    + '    var Linking={openURL:function(url){window.open(url,"_blank");},canOpenURL:function(){return Promise.resolve(true);},getInitialURL:function(){return Promise.resolve(null);}};\n'
    + '    var Vibration={vibrate:function(){},cancel:function(){}};\n'
    + '    var Keyboard={dismiss:function(){},addListener:function(){return {remove:function(){}};},removeAllListeners:function(){}};\n'
    + '    var AppState={currentState:"active",addEventListener:function(){return {remove:function(){}};}};\n'
    + '    var BackHandler={addEventListener:function(){return {remove:function(){}};},removeEventListener:function(){},exitApp:function(){}};\n'
    + '    var Clipboard={getString:function(){return Promise.resolve("");},setString:function(){}};\n'
    + '    var Share={share:function(c){return Promise.resolve({action:"sharedAction"});}};\n'
    + '    var PixelRatio={get:function(){return window.devicePixelRatio||1;},getFontScale:function(){return 1;},getPixelSizeForLayoutSize:function(s){return s*(window.devicePixelRatio||1);},roundToNearestPixel:function(s){return s;}};\n'
    + '    var InteractionManager={runAfterInteractions:function(cb){setTimeout(cb,0);return {cancel:function(){}};}};\n'
    + '    return {__esModule:true,View:View,ScrollView:ScrollView,SafeAreaView:SafeAreaView,KeyboardAvoidingView:KeyboardAvoidingView,FlatList:FlatList,SectionList:SectionList,Text:Text,Image:Image,TextInput:TextInput,TouchableOpacity:TouchableOpacity,TouchableHighlight:TouchableHighlight,TouchableWithoutFeedback:TouchableWithoutFeedback,Pressable:Pressable,ActivityIndicator:ActivityIndicator,Modal:Modal,Switch:Switch,Slider:Slider,StatusBar:StatusBar,Platform:Platform,Dimensions:Dimensions,StyleSheet:StyleSheet,Animated:Animated,useWindowDimensions:useWindowDimensions,useColorScheme:useColorScheme,Alert:Alert,Linking:Linking,Vibration:Vibration,Keyboard:Keyboard,AppState:AppState,BackHandler:BackHandler,Clipboard:Clipboard,Share:Share,PixelRatio:PixelRatio,InteractionManager:InteractionManager};\n'
    + '  },\n'
    // ── Catch-all for any other @radix-ui/* package ──────────────────────────
    // Prevents "module not found" errors for any Radix package not explicitly stubbed.
    + '};\n'
    // __previewRequire__: resolve externals, then execute pre-compiled CJS modules
    + 'window.__previewRequire__=function previewRequire(id){\n'
    + '  if(EXTERNALS[id]) return EXTERNALS[id]();\n'
    // Catch-all for any @radix-ui/* package not explicitly stubbed
    + '  if(id.startsWith("@radix-ui/")){\n'
    + '    var R=window.React;\n'
    + '    var stub=function(p){return p&&p.children||null;};\n'
    + '    var proxy=new Proxy({},{get:function(t,k){if(k==="__esModule")return true;if(k==="default")return stub;return R.forwardRef(function(p,ref){return p&&p.children||null;});}});\n'
    + '    return proxy;\n'
    + '  }\n'
    // Normalise the module key: strip ./, src/, and extension.
    // Try multiple key variants in order of specificity.
    + '  function _norm(s){return s.replace(/^\\.\\//,"").replace(/^src\\//,"").replace(/\\.(tsx|ts|jsx|js|css|scss)$/,"");}\n'
    + '  var key=_norm(id);\n'
    + '  var bare=key.indexOf("/")>=0?key.substring(key.lastIndexOf("/")+1):key;\n'
    // Check cache under ALL key variants — prevents double-execution when the same
    // module is required under different forms (e.g. bare "HomeScreen" vs full path
    // "screens/HomeScreen"). Without this, a second execution produces a fresh exports
    // object that the original importer never sees, leaving named imports as undefined.
    + '  var cached=window.__PREVIEW_CACHE__[key]||window.__PREVIEW_CACHE__[bare]||window.__PREVIEW_CACHE__["src/"+key];\n'
    + '  if(cached) return cached.exports;\n'
    // Try all key variants: full path, bare name, with src/ prefix
    + '  var code=window.__PREVIEW_MODULES__[key]\n'
    + '    ||window.__PREVIEW_MODULES__[bare]\n'
    + '    ||window.__PREVIEW_MODULES__["src/"+key]\n'
    + '    ||window.__PREVIEW_MODULES__[key+"/index"]\n'
    + '    ||window.__PREVIEW_MODULES__[key+"/index.tsx"]\n'
    + '    ||window.__PREVIEW_MODULES__[key+"/index.ts"]\n'
    + '    ||window.__PREVIEW_MODULES__[key+".tsx"]\n'
    + '    ||window.__PREVIEW_MODULES__[key+".ts"]\n'
    + '    ||window.__PREVIEW_MODULES__[key+".jsx"]\n'
    + '    ||window.__PREVIEW_MODULES__[key+".js"];\n'
    + '  if(!code){\n'
    + '    console.warn("[preview] module not found:",id,"→ key:",key,"| available:",Object.keys(window.__PREVIEW_MODULES__).join(", "));\n'
    + '    var R2=window.React;\n'
    // For third-party packages (no leading ./ or src/), return a Proxy so named
    // imports resolve to stub components instead of undefined — prevents the
    // "element type is invalid" crash when the agent imports from an unshimmed package.
    + '    var isThirdParty=!id.startsWith(".")&&!id.startsWith("src/")&&!id.startsWith("/");\n'
    + '    if(isThirdParty){\n'
    + '      var stubComp=R2.forwardRef(function(p,ref){return R2.createElement("div",{ref:ref,style:{padding:4,border:"1px dashed #fbbf24",fontSize:11,color:"#fbbf24",fontFamily:"monospace"}},id+"."+(p&&p.__name||"?"));});\n'
    + '      return new Proxy({__esModule:true,default:stubComp},{get:function(t,k){if(k==="__esModule")return true;if(k==="default")return stubComp;if(typeof k==="string")return R2.forwardRef(function(p,ref){return R2.createElement("div",{ref:ref,style:{padding:4,border:"1px dashed #fbbf24",fontSize:11,color:"#fbbf24",fontFamily:"monospace"}},id+"."+k);});return undefined;}});\n'
    + '    }\n'
    + '    return {__esModule:true,default:function MissingMod(){\n'
    + '      return R2.createElement("div",{style:{color:"#fbbf24",padding:"8px 12px",fontFamily:"monospace",background:"#1a1a1a",fontSize:12,borderLeft:"3px solid #fbbf24",margin:4}},\n'
    + '        "Module not found: "+id);\n'
    + '    }};\n'
    + '  }\n'
    + '  var mod={exports:{}};\n'
    // Cache under ALL key variants before executing to prevent double-execution
    // when the same module is required under different key forms (e.g. bare vs full path).
    + '  window.__PREVIEW_CACHE__[key]=mod;\n'
    + '  window.__PREVIEW_CACHE__[bare]=mod;\n'
    + '  window.__PREVIEW_CACHE__["src/"+key]=mod;\n'
    + '  try{\n'
    + '    var fn=new Function("require","module","exports",code);\n'
    + '    fn(window.__previewRequire__,mod,mod.exports);\n'
    // Surface named exports that only exist on .default (handles re-export patterns)
    + '    if(mod.exports.__esModule&&mod.exports.default&&typeof mod.exports.default==="object"&&mod.exports.default!==null){\n'
    + '      var def=mod.exports.default;\n'
    + '      Object.keys(def).forEach(function(k){\n'
    + '        if(mod.exports[k]===undefined&&def[k]!==undefined) mod.exports[k]=def[k];\n'
    + '      });\n'
    + '    }\n'
    + '  }catch(e){\n'
    + '    console.error("[preview] runtime error in module",key,":",e.message,"\\n",e.stack);\n'
    + '    var R3=window.React,errMsg=e.stack||e.message||String(e);\n'
    + '    mod.exports={__esModule:true,default:function ErrMod(){\n'
    + '      return R3.createElement("div",{style:{color:"#f87171",padding:16,fontFamily:"monospace",background:"#111",borderLeft:"4px solid #f87171",margin:8}},\n'
    + '        R3.createElement("b",{style:{fontSize:14}},"Runtime error in "+key),\n'
    + '        R3.createElement("pre",{style:{whiteSpace:"pre-wrap",fontSize:12,marginTop:8,color:"#fca5a5"}},errMsg));\n'
    + '    }};\n'
    + '  }\n'
    + '  return mod.exports;\n'
    + '};\n'
    // Error boundary (vanilla JS class, no JSX)
    + 'var R=window.React;\n'
    + 'function PreviewErrorBoundary(p){R.Component.call(this,p);this.state={err:null};}\n'
    + 'PreviewErrorBoundary.prototype=Object.create(R.Component.prototype);\n'
    + 'PreviewErrorBoundary.prototype.constructor=PreviewErrorBoundary;\n'
    + 'PreviewErrorBoundary.getDerivedStateFromError=function(e){return {err:e};};\n'
    + 'PreviewErrorBoundary.prototype.render=function(){\n'
    + '  if(this.state.err){\n'
    + '    var msg=this.state.err.stack||this.state.err.message||String(this.state.err);\n'
    + '    return R.createElement("div",{style:{padding:24,fontFamily:"monospace",background:"#111",color:"#f87171",minHeight:"100vh"}},\n'
    + '      R.createElement("b",{style:{fontSize:16}},"React render error"),\n'
    + '      R.createElement("pre",{style:{whiteSpace:"pre-wrap",fontSize:12,marginTop:8}},msg));\n'
    + '  }\n'
    + '  return this.props.children;\n'
    + '};\n'
    // Boot
    + 'try{\n'
    + (isSideEffect
      // Side-effect entry (main.tsx): intercept createRoot to wrap with ErrorBoundary,
      // then run the module which calls ReactDOM.createRoot().render() itself.
      ? '  var _orig=window.ReactDOM.createRoot.bind(window.ReactDOM);\n'
        + '  window.ReactDOM.createRoot=function(c,o){var root=_orig(c,o);var _r=root.render.bind(root);root.render=function(el){_r(R.createElement(PreviewErrorBoundary,null,el));};return root;};\n'
        + '  EXTERNALS["react-dom/client"]=function(){var c={__esModule:true,createRoot:window.ReactDOM.createRoot,hydrateRoot:window.ReactDOM.hydrateRoot};c.default=c;return c;};\n'
        + '  EXTERNALS["react-dom"]=function(){var RD=window.ReactDOM;return {__esModule:true,default:RD,createRoot:RD.createRoot,hydrateRoot:RD.hydrateRoot,render:RD.render,unmountComponentAtNode:RD.unmountComponentAtNode,createPortal:RD.createPortal,flushSync:RD.flushSync};};\n'
        + '  window.__previewRequire__("' + entryKey + '");\n'
      // Component entry (App.tsx): find default export and mount it ourselves.
      : '  var ex=window.__previewRequire__("' + entryKey + '");\n'
        + '  var App=ex["default"]||ex["App"]||Object.values(ex).find(function(v){return typeof v==="function";});\n'
        + '  if(!App){\n'
        + '    var exportedKeys=Object.keys(ex).join(", ")||"(none)";\n'
        + '    throw new Error("No renderable export found in: ' + entryKey + '.\\nExported keys: "+exportedKeys+"\\nMake sure App.tsx has: export default function App() { ... }");\n'
        + '  }\n'
        + '  window.ReactDOM.createRoot(document.getElementById("root")).render(\n'
        + '    R.createElement(PreviewErrorBoundary,null,R.createElement(R.StrictMode,null,R.createElement(App))));\n'
    )
    + '}catch(e){\n'
    + '  showError("Preview error",e.stack||e.message||String(e));\n'
    + '}\n'
    + '})();\n'
    + '<\/script>\n'
    + '</body>\n'
    + '</html>';

  return html;
}

function errorHtml(msg: string): string {
  return '<!DOCTYPE html><html><body style="padding:24px;font-family:monospace;color:#ef4444;background:#111">'
    + '<h2>Preview error</h2><pre>' + msg.replace(/</g, '&lt;') + '</pre></body></html>';
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function buildPreview(jobId: string, result: string): Promise<void> {
  statusMap.set(jobId, { status: 'building' });

  const previewDir = path.join(PREVIEWS_DIR, jobId);

  try {
    const files = extractFileManifest(result);
    if (!files || files.length === 0) {
      throw new Error(
        'No FILE_MANIFEST found in this build result. Run a new build to generate a previewable project.'
      );
    }

    await fs.rm(previewDir, { recursive: true, force: true });
    await fs.mkdir(previewDir, { recursive: true });

    const html = buildPreviewHtml(files);
    await fs.writeFile(path.join(previewDir, 'index.html'), html, 'utf8');

    statusMap.set(jobId, { status: 'ready', builtAt: Date.now() });
    console.log('preview.build.ready jobId=' + jobId);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('preview.build.failed jobId=' + jobId, message);
    statusMap.set(jobId, { status: 'error', error: message });
    try { await fs.rm(previewDir, { recursive: true, force: true }); } catch {}
  }
}

export function getPreviewDistDir(jobId: string): string {
  return path.join(PREVIEWS_DIR, jobId);
}

export async function checkPreviewOnDisk(jobId: string): Promise<boolean> {
  try {
    await fs.access(path.join(PREVIEWS_DIR, jobId, 'index.html'));
    return true;
  } catch {
    return false;
  }
}
