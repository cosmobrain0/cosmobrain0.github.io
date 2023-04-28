import("../pkg/index.js").then(module => {
    console.log(module);
    module.start();
  }).catch(console.error);
  
  