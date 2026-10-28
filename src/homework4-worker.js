import { simulate } from "./stochastic.js";
self.onmessage = async ({ data }) => {
  try { self.postMessage({ result: await simulate(data, progress => self.postMessage({ progress })) }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
