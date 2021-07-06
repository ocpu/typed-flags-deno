# Typed Flags for Deno

This is a simple module to to declaratively set the type of the flags you accept. It uses the std/flags under the hood so parsing of flags is handled by it and type ensuring is provided by this module. All parts of the flag definition are strictly type defined (you event get some auto completion at places).

```typescript
import { parseFlags } from 'https://deno.land/x/typed_flags@v1.0.1/mod.ts'

const { _: args, ...flags } = parseFlags({
  help: Boolean, // Use either of Boolean, String, or Number constructors to define your type
  port: { // Make the definition an object if you want to specify more than type
    type: Number,
    default: 3000, // Default values must be in the type you specify
    alias: 'p', // Define an alias or an array of them
  },
  name: String,
  h: 'help', // Another way of specifying an alias to a command (these can be auto completed)
}/*, <array of arguments default Deno.args>*/)

type MyFlags = typeof flags // { help: boolean, post: number, name: string | undefined }
type MyArgs = typeof args // string[]
```
