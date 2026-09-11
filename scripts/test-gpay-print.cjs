const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/components/layouts/admin/GpayPaymentMonitor.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
async function scenario({ state = 'waiting', autoPrint = true, fiscalReady = true, printResult = true, tabs = 1 } = {}) {
  const key = 'gpay-print:org:p1';
  const storage = { [key]: JSON.stringify({ paymentId: 'p1', state, createdAt: Date.now() }) };
  Object.defineProperties(storage, { getItem: { value: k => storage[k] || null }, setItem: { value: (k,v) => { storage[k] = v; } } });
  let prints = 0, held = false;
  const effects = [], intervals = [];
  const dependencies = {
    react: { useContext: () => ({ user: { organizationId: 'org', role: 'CAIXA' } }), useEffect: fn => effects.push(fn), useRef: value => ({ current: value }) },
    '@/contexts/AuthContext': { AuthContext: {} },
    '@/contexts/SocketContext': { useSocket: () => ({ socket: { on(){}, off(){} } }) },
    '@/hooks/usePosSettings': { usePosSettings: () => ({ settings: { autoPrint }, isLoading: false }) },
    '@/hooks/useReceiptPrinter': { useReceiptPrinter: () => ({ printPaidReceipt: async () => { prints++; return printResult; } }), waitForFiscalDocument: async r => { if (!fiscalReady) throw Error('Ainda em processamento'); return r; } },
    '@/services/api': { setupAPIClient: () => ({ get: async () => ({ data: { status: 'PAID', receipt: { mesaNumero: 2, valorPago: 100, metodoPagamento: 'online' } } }) }) },
    '@/utils/gpayPrintQueue': { gpayQueuePrefix: org => 'gpay-print:' + org + ':' },
    'react-toastify': { toast: { warning(){}, success(){} } },
  };
  const context = { exports: {}, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, localStorage: storage, document: { hidden: false }, navigator: { locks: { request: async (name, options, fn) => { if (held) return fn(null); held = true; try { return await fn({}); } finally { held = false; } } } }, window: { setInterval: fn => { intervals.push(fn); return 1; }, addEventListener(){}, removeEventListener(){} }, clearInterval(){}, console };
  vm.runInNewContext(compiled, context);
  for (let i=0;i<tabs;i++) context.exports.GpayPaymentMonitor();
  effects.forEach(fn => fn());
  await new Promise(resolve => setImmediate(resolve));
  await Promise.all(intervals.map(fn => fn()));
  return { prints, state: JSON.parse(storage[key]).state };
}
(async () => {
  assert.deepEqual(await scenario(), { prints: 1, state: 'done' });
  assert.deepEqual(await scenario({tabs: 2}), { prints: 1, state: 'done' });
  assert.deepEqual(await scenario({state: 'done'}), { prints: 0, state: 'done' });
  assert.deepEqual(await scenario({state: 'printing'}), { prints: 0, state: 'review' });
  assert.deepEqual(await scenario({autoPrint: false}), { prints: 0, state: 'waiting' });
  assert.deepEqual(await scenario({fiscalReady: false}), { prints: 0, state: 'waiting' });
  assert.deepEqual(await scenario({printResult: false}), { prints: 1, state: 'review' });
  console.log('PASS: 7 cenários da fila GPay (retoma, duas abas, duplicado, interrupção, preferência, QR pendente e falha).');
})().catch(error => { console.error(error); process.exitCode = 1; });
