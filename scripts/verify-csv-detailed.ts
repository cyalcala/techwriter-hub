import fs from "fs";
import path from "path";

function testCsvParserDetailed() {
  const csvPath = "c:/Users/admin/Desktop/freelance-directory/career7.csv";
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").slice(1);
  
  console.log("🧐 Examining failed lines...");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (parts.length < 2 || !parts[1].trim().startsWith("http")) {
      console.log(`❌ Line ${i+2} failed:`, line.substring(0, 50) + "...");
    }
  }
}

testCsvParserDetailed();
