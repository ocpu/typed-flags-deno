import { parse } from "https://deno.land/std@0.90.0/flags/mod.ts";

interface FlagDefinitionObject<T, TCtor extends LiteralConstructor<T>> {
  type: TCtor;
  alias?: string | string[];
  default?: T;
}

type FlagDefinition =
  | BooleanConstructor
  | StringConstructor
  | NumberConstructor
  | FlagDefinitionObject<boolean, BooleanConstructor>
  | FlagDefinitionObject<string, StringConstructor>
  | FlagDefinitionObject<number, NumberConstructor>

type ToLiteral<L> = L extends String ? string
  : L extends Boolean ? boolean
  : L extends Number ? number
  : L extends string ? string
  : L extends boolean ? boolean
  : L extends number ? number
  : never

type FromLiteral<L> = L extends String ? String
  : L extends Boolean ? Boolean
  : L extends Number ? Number
  : L extends string ? String
  : L extends boolean ? Boolean
  : L extends number ? Number
  : never

type LiteralConstructor<T> = new (...args: any[]) => FromLiteral<T>
type Constructor<T> = new (...args: any[]) => T
type FlagType<FlagDef extends FlagDefinition> = FlagDef extends Constructor<infer R>
  ? ToLiteral<R> extends boolean
    ? boolean
    : ToLiteral<R> | undefined
  : FlagDef extends FlagDefinitionObject<any, any>
    ? FlagDef["type"] extends Constructor<infer TR>
      ? FlagDef["default"] extends ToLiteral<TR>
        ? ToLiteral<TR>
        : ToLiteral<TR> extends boolean
          ? ToLiteral<TR>
          : ToLiteral<TR> | undefined
      : never
    : never
type OmitKeysOfType<T, ExcludeType> = { [K in keyof T]: T[K] extends ExcludeType ? never : K }[keyof T]
type OnlyKeysOfType<T, IncludeType> = { [K in keyof T]: T[K] extends IncludeType ? K : never }[keyof T]
type FlagResult<Def extends FlagsDefinition<Def>> = {
  readonly [K in keyof Omit<Def, OnlyKeysOfType<Def, string>>]: Def[K] extends FlagDefinition ? FlagType<Def[K]> : never
}

export interface FlagsDefinition<Def extends FlagsDefinition<Def>> {
  [name: string]: FlagDefinition | OmitKeysOfType<Def, string>
}

export type FlagsResult<Def extends FlagsDefinition<Def>> = FlagResult<Def> & { _: readonly string[] }

export function parseFlags<Def extends FlagsDefinition<Def>>(def: Def): FlagsResult<Def>
export function parseFlags<Def extends FlagsDefinition<Def>>(def: Def, args: string[]): FlagsResult<Def>
export function parseFlags<Def extends FlagsDefinition<Def>>(def: Def, args: string[] = Deno.args): FlagsResult<Def> {
  const entries = Object.entries(def) as [string, FlagDefinition | OmitKeysOfType<Def, string>][]
  const alias = (entries
    .filter(([, value]) => typeof value === 'string') as [string, string][])
    .reduce((aliases, [alias, flag]) => {
      if (flag in aliases) aliases[flag].includes(alias) || aliases[flag].push(alias)
      else aliases[flag] = [alias]
      return aliases
    }, {} as Record<string, string[]>)

  const defaults = {} as Record<string, string | number | boolean>
  const strings = [] as string[]
  const booleans = [] as string[]
  for (const [key, value] of entries) {
    if (typeof value === 'string') continue
    if (value === Boolean) booleans.push(key)
    else if (value === String || value === Number) strings.push(key)
    else if (typeof value === 'object') {
      if (value.type === Boolean) booleans.push(key)
      else if (value.type === String || value.type === Number) strings.push(key)
      if ('default' in value && value.default !== undefined) defaults[key] = value.default
      if ('alias' in value) {
        const current = alias[key] ??= []
        if (Array.isArray(value.alias)) current.push(...value.alias.filter(alias => !current.includes(alias)))
        else if (typeof value.alias === 'string' && current.includes(value.alias)) current.push(value.alias)
      }
    }
  }

  const result = parse(args, { alias, default: defaults, string: strings, boolean: booleans })

  const res: { [key: string]: any } & { _: readonly string[] } = { _: result._.map((it) => "" + it) }

  for (const [key, value] of entries) {
    if (typeof value === 'string') continue
    if (value === Boolean) res[key] = result[key]
    else if (value === String && !(key in res)) res[key] = ''+result[key]
    else if (value === Number && !(key in res)) res[key] = +result[key]
    else if (typeof value === 'object') {
      if (value.type === Boolean) res[key] = result[key]
      else if (value.type === String && !(key in res)) res[key] = ''+result[key]
      else if (value.type === Number && !(key in res)) res[key] = +result[key]
    }
  }

  return res as FlagResult<Def> & { _: readonly string[] };
}
