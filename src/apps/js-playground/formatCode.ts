import prettier from "prettier/standalone";
import prettierPluginBabel from "prettier/plugins/babel";
import prettierPluginEstree from "prettier/plugins/estree";

export async function formatJavaScript(code: string): Promise<string> {
  return prettier.format(code, {
    parser: "babel",
    plugins: [prettierPluginBabel, prettierPluginEstree],
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    printWidth: 80,
  });
}

export function minifyJavaScript(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
