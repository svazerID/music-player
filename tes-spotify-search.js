const sp = require('spotify-clients');

async function test() {
    // Search 
    const res = await sp.search("lagu hits");
    console.log(res);
}

test();