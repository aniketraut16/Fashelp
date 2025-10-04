const url =
  "https://www.amazon.in/Lenovo-I5-12450HX-NVIDIA-Windows-83GS00LNIN/dp/B0DPQGVH85/?th=1";
import { savePageData, findRelevantContent } from "../controller/singlepage.js";

// (async () => {
//   try {
//     const result = await savePageData(url);
//     console.log(result);
//   } catch (error) {
//     console.error("Error saving page data:");
//   }
// })();

const query = "What is the RAM capacity of this laptop?";

(async () => {
  try {
    const result = await findRelevantContent(query, url);
    console.log(result);
  } catch (error) {
    console.error("Error finding relevant content:");
  }
})();
