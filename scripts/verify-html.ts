async function verifyHTML() {
  const urls = [
    "http://localhost:3000/opportunities",
    "http://localhost:4321/"
  ];

  for (const url of urls) {
    console.log(`\n🔍 AUDITING HTML FOR: ${url}`);
    try {
      const res = await fetch(url);
      const text = await res.text();
      
      // Count titles (Astro uses h3, Next.js uses h3 in OpportunityCard)
      const matches = text.match(/<h3/g);
      const count = matches ? matches.length : 0;
      
      console.log(`Total <h3 tags (opportunities) found: ${count}`);
      
      const hasMicro = text.toLowerCase().includes("micro1");
      console.log(`Contains 'micro1'? ${hasMicro ? "YES" : "NO"}`);
      
      if (count < 100) {
        console.warn(`WARNING: High probability of truncation detected (${count} items).`);
      }
    } catch (e) {
      console.log(`Failed to fetch ${url}: ${e.message}`);
    }
  }
}

verifyHTML().catch(console.error);
