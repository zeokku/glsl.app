import workerParse from "@/workerParse?worker";
import type { Program } from "@shaderfrog/glsl-parser/ast";

let parser = new workerParse();
// let isParsing = false;

export const parse = (code: string) => {
  // @note typically parsing shouldn't take longer than debounced input
  // but in case it does there's an interesting concept of terminating the thread so
  // main thread won't wait for the completion of previous parsing request

  // previous parsing request hasn't completed,
  // so terminate the worker and reinstate it
  // if(isParsing){
  //     parser.terminate();

  //     console.log('parsing worker terminated')
  //     performance.mark('parsing-worker-terminated')

  //     parser = new workerParse();
  // }

  // isParsing = true;

  return new Promise<Program>((resolve, reject) => {
    parser.onmessage = ({ data }) => {
      // isParsing = false;

      if (data) resolve(data);
      else reject();
    };

    parser.postMessage(code);
  });
};
