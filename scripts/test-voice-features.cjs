const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const englishHome = require('./lib/english-home.cjs');
const html=englishHome(fs.readFileSync('index.html','utf8'));
assert.match(html,/<html lang="en" dir="ltr">/);
assert.match(html,/<link rel="canonical" href="https:\/\/tycoons-inv.com\/en\/"/);
assert.match(html,/Tell us what you have in mind/);
assert.doesNotMatch(html,/"@type": "FAQPage"/);
const code=ts.transpileModule(fs.readFileSync('src/lib/homeLanguage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const context={exports:{},window:{location:{pathname:'/en/'}}};vm.runInNewContext(code,context);
assert.equal(context.exports.tr('حاسبة الأقساط'),'Payment calculator');
assert.equal(context.exports.tr('٣٢٨ م²'),'328 m²');
assert.equal(context.exports.localeHref('/ar/'),' /en/directory/'.trim());
context.window.location.pathname='/';assert.equal(context.exports.tr('حاسبة الأقساط'),'حاسبة الأقساط');
// Record both streams and finalize once without sending anything over the network.
let recording; let closeCount=0; let sourceCount=0; let completed;
class AudioContextMock {createMediaStreamDestination(){return {stream:{}};}createMediaStreamSource(){sourceCount++;return {connect(){}};}resume(){return Promise.resolve();}close(){closeCount++;return Promise.resolve();}}
class RecorderMock { static isTypeSupported(){return true;}constructor(s,options){this.mimeType=options.mimeType;recording=this;}state='inactive';start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['synthetic test audio'])});this.onstop();}}
const recContext={exports:{},AudioContext:AudioContextMock,MediaRecorder:RecorderMock,Blob,Date,crypto:require('node:crypto').webcrypto};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/voiceRecording.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,recContext);
const session=recContext.exports.beginVoiceRecording({},draft=>{assert.equal(completed,undefined);completed=draft;});
session.addRemote({});session.append('client','Hello');session.append('client',' there');session.append('assistant','Hi');session.qualify({name:'Test',summary:'Synthetic test'});session.stop();session.stop();
assert.equal(sourceCount,2);assert.equal(closeCount,1);assert.equal(recording.state,'inactive');assert.equal(completed.transcript[0].text,'Hello there');assert.equal(completed.summary,'Synthetic test');assert.ok(completed.audio.size>0);
const hook=fs.readFileSync('src/hooks/useRealtimeVoice.ts','utf8');
assert.match(hook,/Date\.now\(\) \+ 240_000/);assert.match(hook,/if \(left === 0\) endImmediately\(\)/);assert.match(hook,/visibilitychange/);assert.match(hook,/getTracks\(\).*stop/s);assert.match(hook,/await onSearchQuery\(query\)/);assert.doesNotMatch(hook,/callbackPayload \?\? getLastSearchVoicePayload/);
const voiceContext=fs.readFileSync('src/contexts/VoiceSessionContext.tsx','utf8');assert.match(voiceContext,/searchInventoryForVoice\(units, clean\)/);
const propertyHook=fs.readFileSync('src/hooks/usePropertySearch.ts','utf8');assert.match(propertyHook,/down_payment: item\.unit\.down_payment_text/);assert.match(propertyHook,/installments: item\.unit\.installments_text/);
console.log('Voice recording mocks, locale and timeout configuration checks passed');
