import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { buildOfflineQuizHtml } from "./js/offline-export.js";

const bank = JSON.parse(readFileSync("./data/rad-rapid-application-development.json", "utf8"));
const html = buildOfflineQuizHtml(bank);
writeFileSync("_tmp-offline-quiz.html", html);

const jsonMatch = html.match(/<script id="quiz-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!jsonMatch) throw new Error("quiz-data script missing");
const parsed = JSON.parse(jsonMatch[1]);
console.log("embedded questions:", parsed.questions.length);

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const client = scripts.find((s) => s[0].includes("parseBankData"))?.[1];
if (!client) throw new Error("client script missing");
if (!client.includes("function escapeHtml")) throw new Error("escapeHtml missing in client");

new Function(client);
console.log("client script parses");
console.log("has topics:", Boolean(parsed.questions[0]?.topic));
unlinkSync("_tmp-offline-quiz.html");
