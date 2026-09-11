"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// webRestourant/src/components/dashboard/mesas/pdfNpago.tsx
var pdfNpago_exports = {};
__export(pdfNpago_exports, {
  buildReceiptPdf: () => buildReceiptPdf,
  gerarPDFReciboNaoPago: () => gerarPDFReciboNaoPago,
  gerarPDFReciboPago: () => gerarPDFReciboPago
});
module.exports = __toCommonJS(pdfNpago_exports);
var import_jspdf = __toESM(require("jspdf"));
var import_jspdf_autotable = __toESM(require("jspdf-autotable"));

// webRestourant/config.js
var getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || process.env.BASE_API_URL || "http://localhost:3333";
  }
  const hostname = window.location.hostname;
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl && envApiUrl !== "") {
    return envApiUrl;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3333";
  }
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    return `http://${hostname}:3333`;
  }
  return "/api";
};
var API_BASE_URL = getApiBaseUrl();
console.log("API Base URL (corrigida):", API_BASE_URL);
var getMediaUrl = (mediaPath) => {
  if (!mediaPath) return "";
  const value = String(mediaPath);
  if (/^(https?:)?\/\//.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  const cleanPath = value.replace(/^\/?(tmp|files)\//, "");
  return `${API_BASE_URL}/files/${cleanPath}`;
};

// webRestourant/src/utils/printPdf.ts
function printPdf(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), frame = document.createElement("iframe");
    frame.title = "Documento para impress\xE3o";
    Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "800px", height: "600px", border: "0" });
    let printed = false;
    const cleanup = () => {
      frame.remove();
      URL.revokeObjectURL(url);
    };
    const timeout = window.setTimeout(() => {
      if (!printed) {
        cleanup();
        reject(new Error("N\xE3o foi poss\xEDvel abrir a impress\xE3o. Verifique o visualizador PDF do navegador."));
      }
    }, 3e4);
    frame.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("N\xE3o foi poss\xEDvel carregar o documento para impress\xE3o."));
    };
    frame.onload = () => {
      window.setTimeout(() => {
        try {
          if (printed) return;
          const target = frame.contentWindow;
          if (!target) throw new Error("Janela de impress\xE3o indispon\xEDvel");
          target.addEventListener("afterprint", cleanup, { once: true });
          target.focus();
          target.print();
          printed = true;
          clearTimeout(timeout);
          window.setTimeout(cleanup, 3e5);
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          cleanup();
          reject(error);
        }
      }, 500);
    };
    frame.src = url;
    document.body.appendChild(frame);
  });
}

// webRestourant/src/components/dashboard/mesas/pdfNpago.tsx
var money = (value) => Number(value ?? 0).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Kz";
function buildReceiptPdf(dados, payment, format = "80", paid = true, pageHeight = 297) {
  const thermal = Boolean(format);
  const width = thermal ? format === "58" ? 58 : 80 : 210;
  const height = pageHeight;
  const margin = thermal ? 4 : 18;
  const usable = width - margin * 2;
  const font = thermal ? width === 58 ? 9 : 10 : 11;
  const lineHeight = font * 0.3528 * 1.3;
  const doc = new import_jspdf.default({ unit: "mm", format: thermal ? [width, height] : "a4" });
  let y = thermal ? 7 : 18;
  function space(amount) {
    if (y + amount > height - 12) {
      doc.addPage();
      y = thermal ? 7 : 18;
    }
  }
  function text(value, options = {}) {
    const size = options.size ?? font;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(value, usable);
    const step = size * 0.3528 * 1.3;
    for (const line of lines) {
      space(step + 2);
      doc.text(line, options.center ? width / 2 : margin, y, { align: options.center ? "center" : "left" });
      y += step;
    }
    y += 1;
  }
  function rule() {
    space(4);
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(margin, y, width - margin, y);
    y += 7;
  }
  const org = dados.organization;
  if (org) {
    if (org.imageLogo) {
      try {
        doc.addImage(getMediaUrl(org.imageLogo), "PNG", width / 2 - 8, y, 16, 16);
        y += 20;
      } catch {
      }
    }
    text(org.name.toUpperCase(), { bold: true, center: true, size: thermal ? 12 : 17 });
    text("NIF: " + org.nif, { center: true });
    if (org.phone) text("Tel: " + org.phone, { center: true });
    if (org.address) text(org.address, { center: true });
  }
  rule();
  text(paid ? "RECIBO DE PAGAMENTO" : "CONSULTA DE MESA", { bold: true, center: true, size: thermal ? 12 : 16 });
  if (!paid) text("POR PAGAR - N\xC3O SERVE DE FATURA", { bold: true, center: true });
  text("Mesa: " + dados.mesaNumero, { bold: true });
  const date = paid ? dados.fechadaEm || dados.abertaEm : /* @__PURE__ */ new Date();
  if (date) text((paid ? "Data: " : "Consulta: ") + new Date(date).toLocaleString("pt-PT"));
  if (dados.abertaEm) text("Abertura: " + new Date(dados.abertaEm).toLocaleString("pt-PT"));
  text("Doc: " + (paid ? dados.agtDocumentNo || dados.numero || dados.codigoAbertura : dados.codigoAbertura));
  const waiter = dados.abertoPorNome || dados.pedidos?.find((p) => p.atendidoPor)?.atendidoPor;
  if (waiter) text("Atendido por: " + waiter);
  if (paid || dados.clienteNome || dados.clienteNif) {
    rule();
    text("Cliente: " + (dados.clienteNome || "Consumidor Final"));
    text("NIF: " + (dados.clienteNif || "999999999"));
  }
  rule();
  const items = dados.pedidos.flatMap((p) => p.items);
  (0, import_jspdf_autotable.default)(doc, {
    startY: y,
    head: [["Produto / Quantidade", "Subtotal"]],
    body: items.map((item) => [item.produto + "\n" + item.quantidade + " x " + money(item.precoUnitario), money(item.subtotal)]),
    margin: { top: thermal ? 7 : 18, left: margin, right: margin, bottom: 12 },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    theme: "plain",
    styles: { fontSize: font, cellPadding: thermal ? 1.5 : 3, overflow: "linebreak", textColor: 0, lineColor: 180, lineWidth: { bottom: 0.1 } },
    headStyles: { fontStyle: "bold", fillColor: 255, textColor: 0 },
    columnStyles: { 0: { cellWidth: usable - (thermal ? width === 58 ? 22 : 27 : 45) }, 1: { cellWidth: thermal ? width === 58 ? 22 : 27 : 45, halign: "right" } }
  });
  y = doc.lastAutoTable.finalY + 6;
  space(lineHeight * 4);
  rule();
  if (paid) {
    const net = Number((Number(dados.totalGeral) / 1.14).toFixed(2));
    text("Subtotal (Base): " + money(net));
    text("IVA (14%): " + money(Number(dados.totalGeral) - net));
  }
  text((paid ? "TOTAL PAGO: " : "TOTAL A PAGAR: ") + money(dados.totalGeral), { bold: true, center: true, size: thermal ? 12 : 16 });
  if (paid && payment) {
    text("M\xE9todo: " + (payment.metodo || "").toUpperCase());
    text("Valor pago: " + money(payment.valorPago));
    if (payment.trocoPara != null && Number(payment.trocoPara) > 0) {
      text("Entregue: " + money(payment.trocoPara));
      text("Troco: " + money(Number(payment.trocoPara) - Number(payment.valorPago)));
    }
  }
  text(paid ? "STATUS: PAGO" : "AGUARDA PAGAMENTO", { bold: true, center: true });
  if (paid && dados.agtDocumentNo) {
    text(org?.softwareValidationNumber ? "Processado por CipherPath Fiscal Engine n.\xBA " + org.softwareValidationNumber : "Processado por CipherPath Fiscal Engine", { center: true, size: thermal ? 8 : 10 });
  }
  if (paid && dados.agtQRCode) {
    const qr = thermal ? 26 : 32;
    space(qr + 5);
    try {
      doc.addImage(dados.agtQRCode, "PNG", width / 2 - qr / 2, y, qr, qr);
      y += qr + 4;
    } catch {
      text("QR fiscal indispon\xEDvel. Consulte a fatura no Caixa.", { center: true });
    }
  }
  if (paid && dados.agtDocumentNo && !dados.agtQRCode) text("QR fiscal em processamento. Consulte a fatura no Caixa.", { center: true });
  text("Obrigado pela sua prefer\xEAncia!", { center: true });
  if (thermal && pageHeight === 297 && doc.getNumberOfPages() === 1 && y + 20 < 297) return buildReceiptPdf(dados, payment, format, paid, Math.max(80, y + 20));
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.text("Mesa " + dados.mesaNumero + " | " + page + "/" + doc.getNumberOfPages(), width / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
  }
  return doc;
}
async function gerarPDFReciboNaoPago(dados, format = "80", autoPrint = true) {
  const doc = buildReceiptPdf(dados, void 0, format, false);
  if (autoPrint) await printPdf(doc.output("blob"));
  else doc.save("consulta_mesa_" + dados.mesaNumero + ".pdf");
  return doc;
}
async function gerarPDFReciboPago(dados, payment, format = "80", autoPrint = true) {
  const doc = buildReceiptPdf(dados, payment, format, true);
  if (autoPrint) await printPdf(doc.output("blob"));
  else doc.save("recibo_mesa_" + dados.mesaNumero + ".pdf");
  return doc;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildReceiptPdf,
  gerarPDFReciboNaoPago,
  gerarPDFReciboPago
});
