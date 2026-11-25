// type ToolOutput = {
//   id: string,
//   toolName: string,
//   output: string
// }


// export  const offLoadToolOutPut = async (
//   toolOutput: ToolOutput
// ) => {  
//   const directory = './agent-storge'

//   await Bun.$`mkdir -p ${directory}`

//   const path = `${directory}/${toolOutput.id}.json`

//   await Bun.write(
//     path,
//     JSON.stringify(toolOutput, null, 2)
//   )

//   return {
//     type: "offload",
//     toolName: toolOutput.toolName,
//     reference: path,
//     message: `Original result stored at ${path}`
//   }
// }


// export function shouldCompact(
//   currentTokens: number,
//   threshold: number,
// ) {
//   return currentTokens >= threshold;
// }


// export const compactToolOuput = async (
//   toolOutput: ToolOutput[]
// ) => {
//   const references = [];

//   for(const output of toolOutput){
//     const reference = await offLoadToolOutPut(output);

//     references.push(reference)
//   }

//   return references;
// }


// export async function retrieveToolOutput(path: string) {
//   const file = Bun.file(path);

//   if (!(await file.exists())) {
//     throw new Error("Output not found");
//   }

//   return await file.json();
// }