import runBrowserPy from "../controller/getProductLinks.js";

const data = await runBrowserPy("lenovo loq i7 24gb ram", "amazon.in", 5);
console.log(data);
