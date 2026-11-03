import { simulateWelford } from "./welford.js";
self.onmessage = async ({data}) => {
  try { self.postMessage({result: await simulateWelford(data, progress=>self.postMessage({progress}))}); }
  catch(error) { self.postMessage({error:error.message}); }
};
