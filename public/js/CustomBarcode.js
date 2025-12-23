/**
 * CustomBarcode.js
 * Simple, customizable linear barcode generator (SVG / Canvas)
 *
 * Usage:
 *   const svg = CustomBarcode.generateSVG("HELLO123", { mode: "alphanumeric", includeText: true });
 *   document.getElementById("badge").innerHTML = svg;
 *
 *   // or render to canvas
 *   CustomBarcode.renderToCanvas(canvasElement, "HELLO123", { ...options });
 *
 * Options:
 *  - mode: "binary" | "alphanumeric"  // encoding mode
 *  - moduleWidth: integer (pixels)    // width of 1 module/bit (default 2)
 *  - height: integer (pixels)         // barcode bar height (default 80)
 *  - margin: integer (pixels)         // quiet zone on left/right (default 10)
 *  - background: css color (default "#fff")
 *  - lineColor: css color (default "#000")
 *  - includeText: boolean (default true)
 *  - font: css font string (default "12px monospace")
 *  - checksum: boolean (default false) // simple additive checksum
 */

const CustomBarcode = (function () {
  // helper: convert text to a bit array according to mode
  function encodeToBits(text, mode = "alphanumeric", checksum = false) {
    let bits = [];

    if (mode === "alphanumeric") {
      // each char => 8-bit ASCII
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        const b = code.toString(2).padStart(8, "0").split("").map(Number);
        bits.push(...b);
      }
    } else if (mode === "alphanumeric") {
      // pack pairs of characters into 11 bits each (simple custom packing)
      // mapping: space=0, 0-9=1-10, A-Z=11-36, a-z=37-62, others fallback to charCode % 64 + 63
      function mapChar(c) {
        if (c === " ") return 0;
        if (c >= "0" && c <= "9") return 1 + (c.charCodeAt(0) - 48);
        if (c >= "A" && c <= "Z") return 11 + (c.charCodeAt(0) - 65);
        if (c >= "a" && c <= "z") return 37 + (c.charCodeAt(0) - 97);
        return 63 + ((c.charCodeAt(0)) % 64); // fallback
      }
      for (let i = 0; i < text.length; i += 2) {
        const a = mapChar(text[i]);
        const b = i + 1 < text.length ? mapChar(text[i + 1]) : 0;
        // combine into 11 bits: (a * 64 + b) => supports 0..(63*64+63)=4095 -> 12 bits normally, but we'll use 11 bits for compactness
        // To keep it simple: produce two 6-bit values concatenated to 12 bits, then drop the MSB if needed.
        const val = (a << 6) | b; // 12 bits
        const bits12 = val.toString(2).padStart(12, "0").split("").map(Number);
        bits.push(...bits12);
      }
    } else {
      throw new Error("Unsupported mode: " + mode);
    }

    // optional simple additive checksum (mod 256), appended as 8 bits
    if (checksum) {
      let sum = 0;
      for (let i = 0; i < text.length; i++) sum = (sum + text.charCodeAt(i)) & 0xff;
      const cs = sum.toString(2).padStart(8, "0").split("").map(Number);
      bits.push(...cs);
    }

    // surround with start/stop pattern: we add guard patterns to help scanners
    // start: 101 (three modules), stop: 11101
    return [1,0,1, ...bits, 1,1,1,0,1];
  }

  function bitsToRuns(bits) {
    // Convert array of bits to run-length encoded bars: [ {bit:1, len:3}, ...]
    const runs = [];
    if (bits.length === 0) return runs;
    let currentBit = bits[0], len = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] === currentBit) len++;
      else {
        runs.push({ bit: currentBit, len });
        currentBit = bits[i];
        len = 1;
      }
    }
    runs.push({ bit: currentBit, len });
    return runs;
  }

  function generateSVGMarkup(text, options = {}) {
    const opts = Object.assign({
      mode: "alphanumeric",
      moduleWidth: 2,
      height: 60,
      margin: 6,
      background: "#ffffff",
      lineColor: "#000000",
      includeText: true,
      width: 220,
      font: "12px monospace",
      checksum: false,
      // allow explicit width override
      width: null
    }, options);

    const bits = encodeToBits(String(text), opts.mode, !!opts.checksum);
    const runs = bitsToRuns(bits);

    // compute total modules
    const totalModules = bits.length;
    const w = opts.width || (totalModules * opts.moduleWidth + opts.margin * 2);

    // start building bars (we draw only bars for bit=1)
    let x = opts.margin;
    const svgParts = [];
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${opts.height + (opts.includeText ? 24 : 0)}" viewBox="0 0 ${w} ${opts.height + (opts.includeText ? 24 : 0)}">`);
    svgParts.push(`<rect width="100%" height="100%" fill="${opts.background}" />`);

    for (const run of runs) {
      const runWidth = run.len * opts.moduleWidth;
      if (run.bit === 1) {
        svgParts.push(`<rect x="${x}" y="0" width="${runWidth}" height="${opts.height}" fill="${opts.lineColor}" />`);
      }
      x += runWidth;
    }

    if (opts.includeText) {
      // text centered under barcode
      const textX = w / 2;
      const textY = opts.height + 16;
      // use a background rect for text readability if background not white? We'll leave it simple
      svgParts.push(`<text x="${textX}" y="${textY}" font-family="${escapeXml(opts.font)}" font-size="${extractFontSize(opts.font)}" fill="${opts.lineColor}" text-anchor="middle">${escapeXml(String(text))}</text>`);
    }

    svgParts.push(`</svg>`);
    return svgParts.join("\n");
  }

  function escapeXml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function extractFontSize(font) {
    // rough parse: look for number (px) at start
    const m = String(font).match(/(\d+(?:\.\d+)?)(px|pt)?/);
    return m ? m[1] : 12;
  }

  function generateSVG(text, options) {
    return generateSVGMarkup(text, options);
  }

  function renderToCanvas(canvas, text, options = {}) {
    if (!(canvas && canvas.getContext)) {
      throw new Error("First argument must be a canvas DOM node");
    }
    const opts = Object.assign({
      mode: "alphanumeric",
      moduleWidth: 1,
      height: 60,
      margin: 6,
      background: "#fff",
      lineColor: "#000",
      includeText: true,
      width: 220,
      font: "12px ",
      checksum: false,
    }, options);

    const bits = encodeToBits(String(text), opts.mode, !!opts.checksum);
    const runs = bitsToRuns(bits);
    const totalModules = bits.length;
    const width = totalModules * opts.moduleWidth + opts.margin * 2;
    const height = opts.height + (opts.includeText ? 24 : 0);

    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    const ctx = canvas.getContext("2d");
    // background
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = opts.lineColor;

    let x = opts.margin;
    for (const run of runs) {
      const runWidth = run.len * opts.moduleWidth;
      if (run.bit === 1) {
        ctx.fillRect(x, 0, runWidth, opts.height);
      }
      x += runWidth;
    }

    if (opts.includeText) {
      ctx.fillStyle = opts.lineColor;
      ctx.font = opts.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(String(text), canvas.width / 2, opts.height + 4);
    }

    return canvas;
  }

  // small helper to produce dataURL SVG
  function svgToDataURL(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  return {
    generateSVG,
    renderToCanvas,
    svgToDataURL,
    // convenience: create an <img> element with the barcode
    createImageElement(text, options = {}) {
      const svg = generateSVG(text, options);
      const img = new Image();
      img.src = svgToDataURL(svg);
      return img;
    }
  };
})();

// export for node / browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = CustomBarcode;
} else {
  window.CustomBarcode = CustomBarcode;
}
