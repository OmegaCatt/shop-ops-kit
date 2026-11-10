import {mkdir,copyFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);await mkdir(new URL('dist/',root),{recursive:true});
for(const file of ['index.html','style.css','red.css','app.mjs','engine.mjs','workflow.mjs','fixtures.mjs','catalog-input.mjs','drafts.mjs','draft-ui.mjs'])await copyFile(new URL(file,root),new URL('dist/'+file,root));
await writeFile(new URL('dist/.nojekyll',root),'');console.log('Built explicit public-only asset allowlist.');
