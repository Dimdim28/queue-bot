const redC = (...text) =>
  console.log("\x1b[31m", `${text.join("")}`, "\x1b[0m");
const greenC = (...text) =>
  console.log("\x1b[32m", `${text.join("")}`, "\x1b[0m");

module.exports = { redC, greenC };
