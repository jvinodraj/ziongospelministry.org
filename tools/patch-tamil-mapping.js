/**
 * tools/patch-tamil-mapping.js
 * Adds the 2 remaining unmapped Tamil book name variants to migrate-bible-data.js
 */
"use strict";
const fs = require("fs");

const hosea = "\u0B93\u0B9A\u0BBF\u0BAF\u0BBE";  // ஓசியா  — U+0B93 U+0B9A U+0BBF U+0BAF U+0BBE
const joel  = "\u0BAF\u0BCB\u0BB5\u0BC7\u0BB2\u0BCD"; // யோவேல் — U+0BAF U+0BCB U+0BB5 U+0BC7 U+0BB2 U+0BCD

let src = fs.readFileSync("tools/migrate-bible-data.js", "utf8");

const anchor = '  "\u0bb5\u0bc6\u0bb3\u0bbf\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4\u0bb2\u0bcd":          "Revelation",';
const insert  = '  "' + hosea + '":                   "Hosea",\n  "' + joel  + '":                  "Joel",\n  ';

if (src.includes(hosea)) {
  console.log("Keys already present — nothing to do.");
} else {
  src = src.replace(anchor, insert + anchor.slice(2));
  fs.writeFileSync("tools/migrate-bible-data.js", src, "utf8");
  console.log("Patched:");
  console.log(" ", hosea, "-> Hosea");
  console.log(" ", joel,  "-> Joel");
}
