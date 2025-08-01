var ortWasmThreaded = (() => {
  var _scriptName = import.meta.url;

  return async function (moduleArg = {}) {
    var moduleRtn;

    function aa() {
      g.buffer != l.buffer && m();
      return l;
    }
    function n() {
      g.buffer != l.buffer && m();
      return ba;
    }
    function r() {
      g.buffer != l.buffer && m();
      return ca;
    }
    function u() {
      g.buffer != l.buffer && m();
      return da;
    }
    function ea() {
      g.buffer != l.buffer && m();
      return fa;
    }
    var w = Object.assign({}, moduleArg),
      ha,
      x,
      ia = new Promise((a, b) => {
        ha = a;
        x = b;
      }),
      ja = "object" == typeof window,
      A = "function" == typeof importScripts,
      B =
        "object" == typeof process &&
        "object" == typeof process.versions &&
        "string" == typeof process.versions.node,
      C = A && "em-pthread" == self.name;
    if (B) {
      const { createRequire: a } = await import("module");
      var require = a(import.meta.url),
        D = require("worker_threads");
      global.Worker = D.Worker;
      C = (A = !D.lb) && "em-pthread" == D.workerData;
    }
    ("use strict");
    w.mountExternalData = (a, b) => {
      (w.Ua || (w.Ua = new Map())).set(a, b);
    };
    w.unmountExternalData = () => {
      delete w.Ua;
    };
    var SharedArrayBuffer =
        globalThis.SharedArrayBuffer ??
        new WebAssembly.Memory({ initial: 0, maximum: 0, shared: !0 }).buffer
          .constructor,
      ka = Object.assign({}, w),
      la = "./this.program",
      E = (a, b) => {
        throw b;
      },
      F = "",
      ma,
      G,
      H;
    if (B) {
      var fs = require("fs"),
        na = require("path");
      F = require("url").fileURLToPath(new URL("./", import.meta.url));
      ma = (a, b) => {
        a = oa(a) ? new URL(a) : na.normalize(a);
        return fs.readFileSync(a, b ? void 0 : "utf8");
      };
      H = (a) => {
        a = ma(a, !0);
        a.buffer || (a = new Uint8Array(a));
        return a;
      };
      G = (a, b, c, d = !0) => {
        a = oa(a) ? new URL(a) : na.normalize(a);
        fs.readFile(a, d ? void 0 : "utf8", (f, h) => {
          f ? c(f) : b(d ? h.buffer : h);
        });
      };
      !w.thisProgram &&
        1 < process.argv.length &&
        (la = process.argv[1].replace(/\\/g, "/"));
      process.argv.slice(2);
      E = (a, b) => {
        process.exitCode = a;
        throw b;
      };
    } else if (ja || A)
      A
        ? (F = self.location.href)
        : "undefined" != typeof document &&
          document.currentScript &&
          (F = document.currentScript.src),
        _scriptName && (F = _scriptName),
        F.startsWith("blob:")
          ? (F = "")
          : (F = F.substr(0, F.replace(/[?#].*/, "").lastIndexOf("/") + 1)),
        B ||
          ((ma = (a) => {
            var b = new XMLHttpRequest();
            b.open("GET", a, !1);
            b.send(null);
            return b.responseText;
          }),
          A &&
            (H = (a) => {
              var b = new XMLHttpRequest();
              b.open("GET", a, !1);
              b.responseType = "arraybuffer";
              b.send(null);
              return new Uint8Array(b.response);
            }),
          (G = (a, b, c) => {
            var d = new XMLHttpRequest();
            d.open("GET", a, !0);
            d.responseType = "arraybuffer";
            d.onload = () => {
              200 == d.status || (0 == d.status && d.response)
                ? b(d.response)
                : c();
            };
            d.onerror = c;
            d.send(null);
          }));
    B &&
      "undefined" == typeof performance &&
      (global.performance = require("perf_hooks").performance);
    var pa = console.log.bind(console),
      qa = console.error.bind(console);
    B &&
      ((pa = (...a) => fs.writeSync(1, a.join(" ") + "\n")),
      (qa = (...a) => fs.writeSync(2, a.join(" ") + "\n")));
    var ra = pa,
      I = qa;
    Object.assign(w, ka);
    ka = null;
    if (C) {
      var sa;
      if (B) {
        var ta = D.parentPort;
        ta.on("message", (b) => onmessage({ data: b }));
        Object.assign(globalThis, {
          self: global,
          importScripts: () => {},
          postMessage: (b) => ta.postMessage(b),
          performance: global.performance || { now: Date.now },
        });
      }
      var ua = !1;
      I = function (...b) {
        b = b.join(" ");
        B ? fs.writeSync(2, b + "\n") : console.error(b);
      };
      self.alert = function (...b) {
        postMessage({ Za: "alert", text: b.join(" "), mb: K() });
      };
      w.instantiateWasm = (b, c) =>
        new Promise((d) => {
          sa = (f) => {
            f = new WebAssembly.Instance(f, va());
            c(f);
            d();
          };
        });
      self.onunhandledrejection = (b) => {
        throw b.reason || b;
      };
      function a(b) {
        try {
          var c = b.data,
            d = c.cmd;
          if ("load" === d) {
            let f = [];
            self.onmessage = (h) => f.push(h);
            self.startWorker = () => {
              postMessage({ cmd: "loaded" });
              for (let h of f) a(h);
              self.onmessage = a;
            };
            for (const h of c.handlers)
              if (!w[h] || w[h].proxy)
                (w[h] = (...k) => {
                  postMessage({ Za: "callHandler", kb: h, args: k });
                }),
                  "print" == h && (ra = w[h]),
                  "printErr" == h && (I = w[h]);
            g = c.wasmMemory;
            m();
            sa(c.wasmModule);
          } else if ("run" === d) {
            wa(c.pthread_ptr, 0, 0, 1, 0, 0);
            xa(c.pthread_ptr);
            ya();
            za();
            ua ||= !0;
            try {
              Aa(c.start_routine, c.arg);
            } catch (f) {
              if ("unwind" != f) throw f;
            }
          } else
            "cancel" === d
              ? K() && Ba(-1)
              : "setimmediate" !== c.target &&
                ("checkMailbox" === d
                  ? ua && Ca()
                  : d && (I(`worker: received unknown command ${d}`), I(c)));
        } catch (f) {
          throw (Da(), f);
        }
      }
      self.onmessage = a;
    }
    var L;
    w.wasmBinary && (L = w.wasmBinary);
    var g,
      Ea,
      Fa = !1,
      M,
      l,
      ba,
      ca,
      da,
      N,
      fa;
    function m() {
      var a = g.buffer;
      w.HEAP8 = l = new Int8Array(a);
      w.HEAP16 = new Int16Array(a);
      w.HEAPU8 = ba = new Uint8Array(a);
      w.HEAPU16 = new Uint16Array(a);
      w.HEAP32 = ca = new Int32Array(a);
      w.HEAPU32 = da = new Uint32Array(a);
      w.HEAPF32 = new Float32Array(a);
      w.HEAPF64 = fa = new Float64Array(a);
      w.HEAP64 = N = new BigInt64Array(a);
      w.HEAPU64 = new BigUint64Array(a);
    }
    if (!C) {
      g = new WebAssembly.Memory({ initial: 256, maximum: 65536, shared: !0 });
      if (!(g.buffer instanceof SharedArrayBuffer))
        throw (
          (I(
            "requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag",
          ),
          B &&
            I(
              "(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and/or recent version)",
            ),
          Error("bad memory"))
        );
      m();
    }
    var Ga = [],
      Ha = [],
      Ia = [],
      O = 0,
      Ja = null,
      P = null;
    function Ka() {
      O--;
      if (0 == O && (null !== Ja && (clearInterval(Ja), (Ja = null)), P)) {
        var a = P;
        P = null;
        a();
      }
    }
    function La(a) {
      a = "Aborted(" + a + ")";
      I(a);
      Fa = !0;
      M = 1;
      a = new WebAssembly.RuntimeError(
        a + ". Build with -sASSERTIONS for more info.",
      );
      x(a);
      throw a;
    }
    var Ma = (a) => a.startsWith("data:application/octet-stream;base64,"),
      oa = (a) => a.startsWith("file://"),
      Na;
    function Oa(a) {
      if (a == Na && L) return new Uint8Array(L);
      if (H) return H(a);
      throw "both async and sync fetching of the wasm failed";
    }
    function Pa(a) {
      if (!L && (ja || A)) {
        if ("function" == typeof fetch && !oa(a))
          return fetch(a, { credentials: "same-origin" })
            .then((b) => {
              if (!b.ok) throw `failed to load wasm binary file at '${a}'`;
              return b.arrayBuffer();
            })
            .catch(() => Oa(a));
        if (G)
          return new Promise((b, c) => {
            G(a, (d) => b(new Uint8Array(d)), c);
          });
      }
      return Promise.resolve().then(() => Oa(a));
    }
    function Qa(a, b, c) {
      return Pa(a)
        .then((d) => WebAssembly.instantiate(d, b))
        .then(c, (d) => {
          I(`failed to asynchronously prepare wasm: ${d}`);
          La(d);
        });
    }
    function Ra(a, b) {
      var c = Na;
      return L ||
        "function" != typeof WebAssembly.instantiateStreaming ||
        Ma(c) ||
        oa(c) ||
        B ||
        "function" != typeof fetch
        ? Qa(c, a, b)
        : fetch(c, { credentials: "same-origin" }).then((d) =>
            WebAssembly.instantiateStreaming(d, a).then(b, function (f) {
              I(`wasm streaming compile failed: ${f}`);
              I("falling back to ArrayBuffer instantiation");
              return Qa(c, a, b);
            }),
          );
    }
    function va() {
      Sa = {
        j: Ta,
        b: Ua,
        E: Va,
        g: Wa,
        V: Xa,
        A: Ya,
        C: Za,
        W: $a,
        T: ab,
        L: bb,
        S: cb,
        o: db,
        B: eb,
        y: fb,
        U: gb,
        z: hb,
        _: ib,
        Z: jb,
        P: kb,
        w: lb,
        F: mb,
        k: nb,
        O: xa,
        Y: ob,
        I: pb,
        J: qb,
        K: rb,
        G: sb,
        H: tb,
        v: ub,
        q: vb,
        l: wb,
        p: xb,
        e: yb,
        X: zb,
        x: Ab,
        d: Bb,
        f: Cb,
        i: Db,
        u: Eb,
        t: Fb,
        s: Gb,
        Q: Hb,
        R: Ib,
        D: Jb,
        h: Kb,
        n: Lb,
        M: Mb,
        m: Nb,
        a: g,
        r: Ob,
        N: Pb,
        c: Qb,
      };
      return { a: Sa };
    }
    var Rb = {
      822132: (a, b, c, d) => {
        if ("undefined" == typeof w || !w.Ua) return 1;
        a = Q(a >>> 0);
        a.startsWith("./") && (a = a.substring(2));
        a = w.Ua.get(a);
        if (!a) return 2;
        b >>>= 0;
        c >>>= 0;
        d >>>= 0;
        if (b + c > a.byteLength) return 3;
        try {
          return n().set(a.subarray(b, b + c), d >>> 0), 0;
        } catch {
          return 4;
        }
      },
      822633: () => "undefined" !== typeof wasmOffsetConverter,
    };
    function Ta() {
      return "undefined" !== typeof wasmOffsetConverter;
    }
    function Sb(a) {
      this.name = "ExitStatus";
      this.message = `Program terminated with exit(${a})`;
      this.status = a;
    }
    var Tb = (a) => {
        a.terminate();
        a.onmessage = () => {};
      },
      Wb = (a) => {
        0 == R.length && (Ub(), Vb(R[0]));
        var b = R.pop();
        if (!b) return 6;
        S.push(b);
        T[a.Ra] = b;
        b.Ra = a.Ra;
        var c = {
          cmd: "run",
          start_routine: a.cb,
          arg: a.ab,
          pthread_ptr: a.Ra,
        };
        B && b.unref();
        b.postMessage(c, a.ib);
        return 0;
      },
      U = 0,
      V = (a, b, ...c) => {
        for (
          var d = 2 * c.length, f = $b(), h = ac(8 * d), k = h >>> 3, q = 0;
          q < c.length;
          q++
        ) {
          var y = c[q];
          "bigint" == typeof y
            ? ((N[k + 2 * q] = 1n), (N[k + 2 * q + 1] = y))
            : ((N[k + 2 * q] = 0n), (ea()[(k + 2 * q + 1) >>> 0] = y));
        }
        a = bc(a, 0, d, h, b);
        cc(f);
        return a;
      };
    function Ob(a) {
      if (C) return V(0, 1, a);
      M = a;
      if (!(0 < U)) {
        for (var b of S) Tb(b);
        for (b of R) Tb(b);
        R = [];
        S = [];
        T = [];
        Fa = !0;
      }
      E(a, new Sb(a));
    }
    function dc(a) {
      if (C) return V(1, 0, a);
      Jb(a);
    }
    var Jb = (a) => {
        M = a;
        if (C) throw (dc(a), "unwind");
        Ob(a);
      },
      R = [],
      S = [],
      ec = [],
      T = {};
    function fc() {
      for (var a = w.numThreads - 1; a--; ) Ub();
      Ga.unshift(() => {
        O++;
        gc(() => Ka());
      });
    }
    var ic = (a) => {
      var b = a.Ra;
      delete T[b];
      R.push(a);
      S.splice(S.indexOf(a), 1);
      a.Ra = 0;
      hc(b);
    };
    function za() {
      ec.forEach((a) => a());
    }
    var Vb = (a) =>
      new Promise((b) => {
        a.onmessage = (h) => {
          h = h.data;
          var k = h.cmd;
          if (h.targetThread && h.targetThread != K()) {
            var q = T[h.targetThread];
            q
              ? q.postMessage(h, h.transferList)
              : I(
                  `Internal error! Worker sent a message "${k}" to target pthread ${h.targetThread}, but that thread no longer exists!`,
                );
          } else if ("checkMailbox" === k) Ca();
          else if ("spawnThread" === k) Wb(h);
          else if ("cleanupThread" === k) ic(T[h.thread]);
          else if ("killThread" === k)
            (h = h.thread),
              (k = T[h]),
              delete T[h],
              Tb(k),
              hc(h),
              S.splice(S.indexOf(k), 1),
              (k.Ra = 0);
          else if ("cancelThread" === k)
            T[h.thread].postMessage({ cmd: "cancel" });
          else if ("loaded" === k)
            (a.loaded = !0), B && !a.Ra && a.unref(), b(a);
          else if ("alert" === k) alert(`Thread ${h.threadId}: ${h.text}`);
          else if ("setimmediate" === h.target) a.postMessage(h);
          else if ("callHandler" === k) w[h.handler](...h.args);
          else k && I(`worker sent an unknown command ${k}`);
        };
        a.onerror = (h) => {
          I(
            `${"worker sent an error!"} ${h.filename}:${h.lineno}: ${h.message}`,
          );
          throw h;
        };
        B &&
          (a.on("message", (h) => a.onmessage({ data: h })),
          a.on("error", (h) => a.onerror(h)));
        var c = [],
          d = [],
          f;
        for (f of d) w.hasOwnProperty(f) && c.push(f);
        a.postMessage({
          cmd: "load",
          handlers: c,
          wasmMemory: g,
          wasmModule: Ea,
        });
      });
    function gc(a) {
      C ? a() : Promise.all(R.map(Vb)).then(a);
    }
    function Ub() {
      var a = new Worker(new URL(import.meta.url), {
        type: "module",
        workerData: "em-pthread",
        name: "em-pthread",
      });
      R.push(a);
    }
    var jc = (a) => {
        for (; 0 < a.length; ) a.shift()(w);
      },
      ya = () => {
        var a = K(),
          b = u()[((a + 52) >>> 2) >>> 0];
        a = u()[((a + 56) >>> 2) >>> 0];
        kc(b, b - a);
        cc(b);
      },
      lc = [],
      mc,
      Aa = (a, b) => {
        U = 0;
        var c = lc[a];
        c || (a >= lc.length && (lc.length = a + 1), (lc[a] = c = mc.get(a)));
        a = c(b);
        0 < U ? (M = a) : Ba(a);
      };
    class nc {
      constructor(a) {
        this.Xa = a - 24;
      }
    }
    var oc = 0,
      pc = 0;
    function Ua(a, b, c) {
      a >>>= 0;
      var d = new nc(a);
      b >>>= 0;
      c >>>= 0;
      u()[((d.Xa + 16) >>> 2) >>> 0] = 0;
      u()[((d.Xa + 4) >>> 2) >>> 0] = b;
      u()[((d.Xa + 8) >>> 2) >>> 0] = c;
      oc = a;
      pc++;
      throw oc;
    }
    function qc(a, b, c, d) {
      return C ? V(2, 1, a, b, c, d) : Va(a, b, c, d);
    }
    function Va(a, b, c, d) {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      if ("undefined" == typeof SharedArrayBuffer)
        return (
          I(
            "Current environment does not support SharedArrayBuffer, pthreads are not available!",
          ),
          6
        );
      var f = [];
      if (C && 0 === f.length) return qc(a, b, c, d);
      a = { cb: c, Ra: a, ab: d, ib: f };
      return C ? ((a.Za = "spawnThread"), postMessage(a, f), 0) : Wb(a);
    }
    var rc =
        "undefined" != typeof TextDecoder ? new TextDecoder("utf8") : void 0,
      sc = (a, b, c) => {
        b >>>= 0;
        var d = b + c;
        for (c = b; a[c] && !(c >= d); ) ++c;
        if (16 < c - b && a.buffer && rc)
          return rc.decode(
            a.buffer instanceof SharedArrayBuffer
              ? a.slice(b, c)
              : a.subarray(b, c),
          );
        for (d = ""; b < c; ) {
          var f = a[b++];
          if (f & 128) {
            var h = a[b++] & 63;
            if (192 == (f & 224)) d += String.fromCharCode(((f & 31) << 6) | h);
            else {
              var k = a[b++] & 63;
              f =
                224 == (f & 240)
                  ? ((f & 15) << 12) | (h << 6) | k
                  : ((f & 7) << 18) | (h << 12) | (k << 6) | (a[b++] & 63);
              65536 > f
                ? (d += String.fromCharCode(f))
                : ((f -= 65536),
                  (d += String.fromCharCode(
                    55296 | (f >> 10),
                    56320 | (f & 1023),
                  )));
            }
          } else d += String.fromCharCode(f);
        }
        return d;
      },
      Q = (a, b) => ((a >>>= 0) ? sc(n(), a, b) : "");
    function Wa(a, b, c) {
      return C ? V(3, 1, a, b, c) : 0;
    }
    function Xa(a, b) {
      if (C) return V(4, 1, a, b);
    }
    var tc = (a) => {
        for (var b = 0, c = 0; c < a.length; ++c) {
          var d = a.charCodeAt(c);
          127 >= d
            ? b++
            : 2047 >= d
              ? (b += 2)
              : 55296 <= d && 57343 >= d
                ? ((b += 4), ++c)
                : (b += 3);
        }
        return b;
      },
      uc = (a, b, c, d) => {
        c >>>= 0;
        if (!(0 < d)) return 0;
        var f = c;
        d = c + d - 1;
        for (var h = 0; h < a.length; ++h) {
          var k = a.charCodeAt(h);
          if (55296 <= k && 57343 >= k) {
            var q = a.charCodeAt(++h);
            k = (65536 + ((k & 1023) << 10)) | (q & 1023);
          }
          if (127 >= k) {
            if (c >= d) break;
            b[c++ >>> 0] = k;
          } else {
            if (2047 >= k) {
              if (c + 1 >= d) break;
              b[c++ >>> 0] = 192 | (k >> 6);
            } else {
              if (65535 >= k) {
                if (c + 2 >= d) break;
                b[c++ >>> 0] = 224 | (k >> 12);
              } else {
                if (c + 3 >= d) break;
                b[c++ >>> 0] = 240 | (k >> 18);
                b[c++ >>> 0] = 128 | ((k >> 12) & 63);
              }
              b[c++ >>> 0] = 128 | ((k >> 6) & 63);
            }
            b[c++ >>> 0] = 128 | (k & 63);
          }
        }
        b[c >>> 0] = 0;
        return c - f;
      },
      W = (a, b, c) => uc(a, n(), b, c);
    function Ya(a, b) {
      if (C) return V(5, 1, a, b);
    }
    function Za(a, b, c) {
      if (C) return V(6, 1, a, b, c);
    }
    function $a(a, b, c) {
      return C ? V(7, 1, a, b, c) : 0;
    }
    function ab(a, b) {
      if (C) return V(8, 1, a, b);
    }
    function bb(a, b, c) {
      if (C) return V(9, 1, a, b, c);
    }
    function cb(a, b, c, d) {
      if (C) return V(10, 1, a, b, c, d);
    }
    function db(a, b, c, d) {
      if (C) return V(11, 1, a, b, c, d);
    }
    function eb(a, b, c, d) {
      if (C) return V(12, 1, a, b, c, d);
    }
    function fb(a) {
      if (C) return V(13, 1, a);
    }
    function gb(a, b) {
      if (C) return V(14, 1, a, b);
    }
    function hb(a, b, c) {
      if (C) return V(15, 1, a, b, c);
    }
    var ib = () => {
        La("");
      },
      jb = () => 1;
    function kb(a) {
      wa(a >>> 0, !A, 1, !ja, 131072, !1);
      za();
    }
    function xa(a) {
      a >>>= 0;
      "function" === typeof Atomics.jb &&
        (Atomics.jb(r(), a >>> 2, a).value.then(Ca),
        (a += 128),
        Atomics.store(r(), a >>> 2, 1));
    }
    var Ca = () => {
      var a = K();
      if (a && (xa(a), (a = vc), !Fa))
        try {
          if ((a(), !(0 < U)))
            try {
              C ? Ba(M) : Jb(M);
            } catch (b) {
              b instanceof Sb || "unwind" == b || E(1, b);
            }
        } catch (b) {
          b instanceof Sb || "unwind" == b || E(1, b);
        }
    };
    function lb(a, b) {
      a >>>= 0;
      a == b >>> 0
        ? setTimeout(Ca)
        : C
          ? postMessage({ targetThread: a, cmd: "checkMailbox" })
          : (a = T[a]) && a.postMessage({ cmd: "checkMailbox" });
    }
    var wc = [];
    function mb(a, b, c, d, f) {
      b >>>= 0;
      d /= 2;
      wc.length = d;
      c = (f >>> 0) >>> 3;
      for (f = 0; f < d; f++)
        wc[f] = N[c + 2 * f] ? N[c + 2 * f + 1] : ea()[(c + 2 * f + 1) >>> 0];
      return (b ? Rb[b] : xc[a])(...wc);
    }
    function nb(a) {
      a >>>= 0;
      C ? postMessage({ cmd: "cleanupThread", thread: a }) : ic(T[a]);
    }
    function ob(a) {
      B && T[a >>> 0].ref();
    }
    function pb(a, b) {
      a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
      b >>>= 0;
      a = new Date(1e3 * a);
      r()[(b >>> 2) >>> 0] = a.getUTCSeconds();
      r()[((b + 4) >>> 2) >>> 0] = a.getUTCMinutes();
      r()[((b + 8) >>> 2) >>> 0] = a.getUTCHours();
      r()[((b + 12) >>> 2) >>> 0] = a.getUTCDate();
      r()[((b + 16) >>> 2) >>> 0] = a.getUTCMonth();
      r()[((b + 20) >>> 2) >>> 0] = a.getUTCFullYear() - 1900;
      r()[((b + 24) >>> 2) >>> 0] = a.getUTCDay();
      a =
        ((a.getTime() - Date.UTC(a.getUTCFullYear(), 0, 1, 0, 0, 0, 0)) /
          864e5) |
        0;
      r()[((b + 28) >>> 2) >>> 0] = a;
    }
    var X = (a) => 0 === a % 4 && (0 !== a % 100 || 0 === a % 400),
      yc = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335],
      zc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function qb(a, b) {
      a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
      b >>>= 0;
      a = new Date(1e3 * a);
      r()[(b >>> 2) >>> 0] = a.getSeconds();
      r()[((b + 4) >>> 2) >>> 0] = a.getMinutes();
      r()[((b + 8) >>> 2) >>> 0] = a.getHours();
      r()[((b + 12) >>> 2) >>> 0] = a.getDate();
      r()[((b + 16) >>> 2) >>> 0] = a.getMonth();
      r()[((b + 20) >>> 2) >>> 0] = a.getFullYear() - 1900;
      r()[((b + 24) >>> 2) >>> 0] = a.getDay();
      var c =
        ((X(a.getFullYear()) ? yc : zc)[a.getMonth()] + a.getDate() - 1) | 0;
      r()[((b + 28) >>> 2) >>> 0] = c;
      r()[((b + 36) >>> 2) >>> 0] = -(60 * a.getTimezoneOffset());
      c = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
      var d = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
      a = (c != d && a.getTimezoneOffset() == Math.min(d, c)) | 0;
      r()[((b + 32) >>> 2) >>> 0] = a;
    }
    function rb(a) {
      a >>>= 0;
      var b = new Date(
          r()[((a + 20) >>> 2) >>> 0] + 1900,
          r()[((a + 16) >>> 2) >>> 0],
          r()[((a + 12) >>> 2) >>> 0],
          r()[((a + 8) >>> 2) >>> 0],
          r()[((a + 4) >>> 2) >>> 0],
          r()[(a >>> 2) >>> 0],
          0,
        ),
        c = r()[((a + 32) >>> 2) >>> 0],
        d = b.getTimezoneOffset(),
        f = new Date(b.getFullYear(), 6, 1).getTimezoneOffset(),
        h = new Date(b.getFullYear(), 0, 1).getTimezoneOffset(),
        k = Math.min(h, f);
      0 > c
        ? (r()[((a + 32) >>> 2) >>> 0] = Number(f != h && k == d))
        : 0 < c != (k == d) &&
          ((f = Math.max(h, f)),
          b.setTime(b.getTime() + 6e4 * ((0 < c ? k : f) - d)));
      r()[((a + 24) >>> 2) >>> 0] = b.getDay();
      c = ((X(b.getFullYear()) ? yc : zc)[b.getMonth()] + b.getDate() - 1) | 0;
      r()[((a + 28) >>> 2) >>> 0] = c;
      r()[(a >>> 2) >>> 0] = b.getSeconds();
      r()[((a + 4) >>> 2) >>> 0] = b.getMinutes();
      r()[((a + 8) >>> 2) >>> 0] = b.getHours();
      r()[((a + 12) >>> 2) >>> 0] = b.getDate();
      r()[((a + 16) >>> 2) >>> 0] = b.getMonth();
      r()[((a + 20) >>> 2) >>> 0] = b.getYear();
      a = b.getTime();
      return BigInt(isNaN(a) ? -1 : a / 1e3);
    }
    function sb(a, b, c, d, f, h, k) {
      return C ? V(16, 1, a, b, c, d, f, h, k) : -52;
    }
    function tb(a, b, c, d, f, h) {
      if (C) return V(17, 1, a, b, c, d, f, h);
    }
    function ub(a, b, c, d) {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      var f = new Date().getFullYear(),
        h = new Date(f, 0, 1),
        k = new Date(f, 6, 1);
      f = h.getTimezoneOffset();
      var q = k.getTimezoneOffset(),
        y = Math.max(f, q);
      u()[(a >>> 2) >>> 0] = 60 * y;
      r()[(b >>> 2) >>> 0] = Number(f != q);
      a = (v) =>
        v
          .toLocaleTimeString(void 0, { hour12: !1, timeZoneName: "short" })
          .split(" ")[1];
      h = a(h);
      k = a(k);
      q < f ? (W(h, c, 17), W(k, d, 17)) : (W(h, d, 17), W(k, c, 17));
    }
    var Ac = [];
    function vb(a, b, c) {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      Ac.length = 0;
      for (var d; (d = n()[b++ >>> 0]); ) {
        var f = 105 != d;
        f &= 112 != d;
        c += f && c % 8 ? 4 : 0;
        Ac.push(
          112 == d
            ? u()[(c >>> 2) >>> 0]
            : 106 == d
              ? N[c >>> 3]
              : 105 == d
                ? r()[(c >>> 2) >>> 0]
                : ea()[(c >>> 3) >>> 0],
        );
        c += f ? 8 : 4;
      }
      return Rb[a](...Ac);
    }
    var wb = () => {},
      xb = () => Date.now();
    function yb(a, b) {
      return I(Q(a >>> 0, b >>> 0));
    }
    var zb = () => {
      U += 1;
      throw "unwind";
    };
    function Ab() {
      return 4294901760;
    }
    var Bb;
    Bb = () => performance.timeOrigin + performance.now();
    var Cb = () =>
      B ? require("os").cpus().length : navigator.hardwareConcurrency;
    function Db() {
      La(
        "Cannot use emscripten_pc_get_function without -sUSE_OFFSET_CONVERTER",
      );
      return 0;
    }
    function Eb(a) {
      a >>>= 0;
      var b = n().length;
      if (a <= b || 4294901760 < a) return !1;
      for (var c = 1; 4 >= c; c *= 2) {
        var d = b * (1 + 0.2 / c);
        d = Math.min(d, a + 100663296);
        var f = Math;
        d = Math.max(a, d);
        a: {
          f =
            (f.min.call(f, 4294901760, d + ((65536 - (d % 65536)) % 65536)) -
              g.buffer.byteLength +
              65535) /
            65536;
          try {
            g.grow(f);
            m();
            var h = 1;
            break a;
          } catch (k) {}
          h = void 0;
        }
        if (h) return !0;
      }
      return !1;
    }
    var Bc = () => {
        La(
          "Cannot use convertFrameToPC (needed by __builtin_return_address) without -sUSE_OFFSET_CONVERTER",
        );
        return 0;
      },
      Y = {},
      Cc = (a) => {
        a.forEach((b) => {
          var c = Bc();
          c && (Y[c] = b);
        });
      };
    function Fb() {
      var a = Error().stack.toString().split("\n");
      "Error" == a[0] && a.shift();
      Cc(a);
      Y.$a = Bc();
      Y.bb = a;
      return Y.$a;
    }
    function Gb(a, b, c) {
      a >>>= 0;
      b >>>= 0;
      if (Y.$a == a) var d = Y.bb;
      else
        (d = Error().stack.toString().split("\n")),
          "Error" == d[0] && d.shift(),
          Cc(d);
      for (var f = 3; d[f] && Bc() != a; ) ++f;
      for (a = 0; a < c && d[a + f]; ++a) r()[((b + 4 * a) >>> 2) >>> 0] = Bc();
      return a;
    }
    var Dc = {},
      Fc = () => {
        if (!Ec) {
          var a = {
              USER: "web_user",
              LOGNAME: "web_user",
              PATH: "/",
              PWD: "/",
              HOME: "/home/web_user",
              LANG:
                (
                  ("object" == typeof navigator &&
                    navigator.languages &&
                    navigator.languages[0]) ||
                  "C"
                ).replace("-", "_") + ".UTF-8",
              _: la || "./this.program",
            },
            b;
          for (b in Dc) void 0 === Dc[b] ? delete a[b] : (a[b] = Dc[b]);
          var c = [];
          for (b in a) c.push(`${b}=${a[b]}`);
          Ec = c;
        }
        return Ec;
      },
      Ec;
    function Hb(a, b) {
      if (C) return V(18, 1, a, b);
      a >>>= 0;
      b >>>= 0;
      var c = 0;
      Fc().forEach((d, f) => {
        var h = b + c;
        f = u()[((a + 4 * f) >>> 2) >>> 0] = h;
        for (h = 0; h < d.length; ++h) aa()[f++ >>> 0] = d.charCodeAt(h);
        aa()[f >>> 0] = 0;
        c += d.length + 1;
      });
      return 0;
    }
    function Ib(a, b) {
      if (C) return V(19, 1, a, b);
      a >>>= 0;
      b >>>= 0;
      var c = Fc();
      u()[(a >>> 2) >>> 0] = c.length;
      var d = 0;
      c.forEach((f) => (d += f.length + 1));
      u()[(b >>> 2) >>> 0] = d;
      return 0;
    }
    function Kb(a) {
      return C ? V(20, 1, a) : 52;
    }
    function Lb(a, b, c, d) {
      return C ? V(21, 1, a, b, c, d) : 52;
    }
    function Mb(a, b, c, d) {
      return C ? V(22, 1, a, b, c, d) : 70;
    }
    var Gc = [null, [], []];
    function Nb(a, b, c, d) {
      if (C) return V(23, 1, a, b, c, d);
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      for (var f = 0, h = 0; h < c; h++) {
        var k = u()[(b >>> 2) >>> 0],
          q = u()[((b + 4) >>> 2) >>> 0];
        b += 8;
        for (var y = 0; y < q; y++) {
          var v = n()[(k + y) >>> 0],
            z = Gc[a];
          0 === v || 10 === v
            ? ((1 === a ? ra : I)(sc(z, 0)), (z.length = 0))
            : z.push(v);
        }
        f += q;
      }
      u()[(d >>> 2) >>> 0] = f;
      return 0;
    }
    var Hc = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      Ic = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function Jc(a) {
      var b = Array(tc(a) + 1);
      uc(a, b, 0, b.length);
      return b;
    }
    var Kc = (a, b) => {
      aa().set(a, b >>> 0);
    };
    function Pb(a, b, c, d) {
      function f(e, p, t) {
        for (e = "number" == typeof e ? e.toString() : e || ""; e.length < p; )
          e = t[0] + e;
        return e;
      }
      function h(e, p) {
        return f(e, p, "0");
      }
      function k(e, p) {
        function t(Xb) {
          return 0 > Xb ? -1 : 0 < Xb ? 1 : 0;
        }
        var J;
        0 === (J = t(e.getFullYear() - p.getFullYear())) &&
          0 === (J = t(e.getMonth() - p.getMonth())) &&
          (J = t(e.getDate() - p.getDate()));
        return J;
      }
      function q(e) {
        switch (e.getDay()) {
          case 0:
            return new Date(e.getFullYear() - 1, 11, 29);
          case 1:
            return e;
          case 2:
            return new Date(e.getFullYear(), 0, 3);
          case 3:
            return new Date(e.getFullYear(), 0, 2);
          case 4:
            return new Date(e.getFullYear(), 0, 1);
          case 5:
            return new Date(e.getFullYear() - 1, 11, 31);
          case 6:
            return new Date(e.getFullYear() - 1, 11, 30);
        }
      }
      function y(e) {
        var p = e.Sa;
        for (e = new Date(new Date(e.Ta + 1900, 0, 1).getTime()); 0 < p; ) {
          var t = e.getMonth(),
            J = (X(e.getFullYear()) ? Hc : Ic)[t];
          if (p > J - e.getDate())
            (p -= J - e.getDate() + 1),
              e.setDate(1),
              11 > t
                ? e.setMonth(t + 1)
                : (e.setMonth(0), e.setFullYear(e.getFullYear() + 1));
          else {
            e.setDate(e.getDate() + p);
            break;
          }
        }
        t = new Date(e.getFullYear() + 1, 0, 4);
        p = q(new Date(e.getFullYear(), 0, 4));
        t = q(t);
        return 0 >= k(p, e)
          ? 0 >= k(t, e)
            ? e.getFullYear() + 1
            : e.getFullYear()
          : e.getFullYear() - 1;
      }
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      var v = u()[((d + 40) >>> 2) >>> 0];
      d = {
        gb: r()[(d >>> 2) >>> 0],
        fb: r()[((d + 4) >>> 2) >>> 0],
        Va: r()[((d + 8) >>> 2) >>> 0],
        Ya: r()[((d + 12) >>> 2) >>> 0],
        Wa: r()[((d + 16) >>> 2) >>> 0],
        Ta: r()[((d + 20) >>> 2) >>> 0],
        Qa: r()[((d + 24) >>> 2) >>> 0],
        Sa: r()[((d + 28) >>> 2) >>> 0],
        nb: r()[((d + 32) >>> 2) >>> 0],
        eb: r()[((d + 36) >>> 2) >>> 0],
        hb: v ? Q(v) : "",
      };
      c = Q(c);
      v = {
        "%c": "%a %b %d %H:%M:%S %Y",
        "%D": "%m/%d/%y",
        "%F": "%Y-%m-%d",
        "%h": "%b",
        "%r": "%I:%M:%S %p",
        "%R": "%H:%M",
        "%T": "%H:%M:%S",
        "%x": "%m/%d/%y",
        "%X": "%H:%M:%S",
        "%Ec": "%c",
        "%EC": "%C",
        "%Ex": "%m/%d/%y",
        "%EX": "%H:%M:%S",
        "%Ey": "%y",
        "%EY": "%Y",
        "%Od": "%d",
        "%Oe": "%e",
        "%OH": "%H",
        "%OI": "%I",
        "%Om": "%m",
        "%OM": "%M",
        "%OS": "%S",
        "%Ou": "%u",
        "%OU": "%U",
        "%OV": "%V",
        "%Ow": "%w",
        "%OW": "%W",
        "%Oy": "%y",
      };
      for (var z in v) c = c.replace(new RegExp(z, "g"), v[z]);
      var Yb = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(
          " ",
        ),
        Zb =
          "January February March April May June July August September October November December".split(
            " ",
          );
      v = {
        "%a": (e) => Yb[e.Qa].substring(0, 3),
        "%A": (e) => Yb[e.Qa],
        "%b": (e) => Zb[e.Wa].substring(0, 3),
        "%B": (e) => Zb[e.Wa],
        "%C": (e) => h(((e.Ta + 1900) / 100) | 0, 2),
        "%d": (e) => h(e.Ya, 2),
        "%e": (e) => f(e.Ya, 2, " "),
        "%g": (e) => y(e).toString().substring(2),
        "%G": y,
        "%H": (e) => h(e.Va, 2),
        "%I": (e) => {
          e = e.Va;
          0 == e ? (e = 12) : 12 < e && (e -= 12);
          return h(e, 2);
        },
        "%j": (e) => {
          for (
            var p = 0, t = 0;
            t <= e.Wa - 1;
            p += (X(e.Ta + 1900) ? Hc : Ic)[t++]
          );
          return h(e.Ya + p, 3);
        },
        "%m": (e) => h(e.Wa + 1, 2),
        "%M": (e) => h(e.fb, 2),
        "%n": () => "\n",
        "%p": (e) => (0 <= e.Va && 12 > e.Va ? "AM" : "PM"),
        "%S": (e) => h(e.gb, 2),
        "%t": () => "\t",
        "%u": (e) => e.Qa || 7,
        "%U": (e) => h(Math.floor((e.Sa + 7 - e.Qa) / 7), 2),
        "%V": (e) => {
          var p = Math.floor((e.Sa + 7 - ((e.Qa + 6) % 7)) / 7);
          2 >= (e.Qa + 371 - e.Sa - 2) % 7 && p++;
          if (p)
            53 == p &&
              ((t = (e.Qa + 371 - e.Sa) % 7),
              4 == t || (3 == t && X(e.Ta)) || (p = 1));
          else {
            p = 52;
            var t = (e.Qa + 7 - e.Sa - 1) % 7;
            (4 == t || (5 == t && X((e.Ta % 400) - 1))) && p++;
          }
          return h(p, 2);
        },
        "%w": (e) => e.Qa,
        "%W": (e) => h(Math.floor((e.Sa + 7 - ((e.Qa + 6) % 7)) / 7), 2),
        "%y": (e) => (e.Ta + 1900).toString().substring(2),
        "%Y": (e) => e.Ta + 1900,
        "%z": (e) => {
          e = e.eb;
          var p = 0 <= e;
          e = Math.abs(e) / 60;
          return (
            (p ? "+" : "-") +
            String("0000" + ((e / 60) * 100 + (e % 60))).slice(-4)
          );
        },
        "%Z": (e) => e.hb,
        "%%": () => "%",
      };
      c = c.replace(/%%/g, "\x00\x00");
      for (z in v)
        c.includes(z) && (c = c.replace(new RegExp(z, "g"), v[z](d)));
      c = c.replace(/\0\0/g, "%");
      z = Jc(c);
      if (z.length > b) return 0;
      Kc(z, a);
      return z.length - 1;
    }
    function Qb(a, b, c, d) {
      return Pb(a >>> 0, b >>> 0, c >>> 0, d >>> 0);
    }
    C || fc();
    var xc = [
        Ob,
        dc,
        qc,
        Wa,
        Xa,
        Ya,
        Za,
        $a,
        ab,
        bb,
        cb,
        db,
        eb,
        fb,
        gb,
        hb,
        sb,
        tb,
        Hb,
        Ib,
        Kb,
        Lb,
        Mb,
        Nb,
      ],
      Sa,
      Z = (function () {
        function a(c, d) {
          Z = c.exports;
          Z = Lc();
          ec.push(Z.Ea);
          mc = Z.Fa;
          Ha.unshift(Z.$);
          Ea = d;
          Ka();
          return Z;
        }
        var b = va();
        O++;
        if (w.instantiateWasm)
          try {
            return w.instantiateWasm(b, a);
          } catch (c) {
            I(`Module.instantiateWasm callback failed with error: ${c}`), x(c);
          }
        Na ||= w.locateFile
          ? Ma("ort-wasm-simd-threaded.wasm")
            ? "ort-wasm-simd-threaded.wasm"
            : w.locateFile
              ? w.locateFile("ort-wasm-simd-threaded.wasm", F)
              : F + "ort-wasm-simd-threaded.wasm"
          : new URL("ort-wasm-simd-threaded.wasm", import.meta.url).href;
        Ra(b, function (c) {
          a(c.instance, c.module);
        }).catch(x);
        return {};
      })();
    w._OrtInit = (a, b) => (w._OrtInit = Z.aa)(a, b);
    w._OrtGetLastError = (a, b) => (w._OrtGetLastError = Z.ba)(a, b);
    w._OrtCreateSessionOptions = (a, b, c, d, f, h, k, q, y, v) =>
      (w._OrtCreateSessionOptions = Z.ca)(a, b, c, d, f, h, k, q, y, v);
    w._OrtAppendExecutionProvider = (a, b) =>
      (w._OrtAppendExecutionProvider = Z.da)(a, b);
    w._OrtAddFreeDimensionOverride = (a, b, c) =>
      (w._OrtAddFreeDimensionOverride = Z.ea)(a, b, c);
    w._OrtAddSessionConfigEntry = (a, b, c) =>
      (w._OrtAddSessionConfigEntry = Z.fa)(a, b, c);
    w._OrtReleaseSessionOptions = (a) =>
      (w._OrtReleaseSessionOptions = Z.ga)(a);
    w._OrtCreateSession = (a, b, c) => (w._OrtCreateSession = Z.ha)(a, b, c);
    w._OrtReleaseSession = (a) => (w._OrtReleaseSession = Z.ia)(a);
    w._OrtGetInputOutputCount = (a, b, c) =>
      (w._OrtGetInputOutputCount = Z.ja)(a, b, c);
    w._OrtGetInputName = (a, b) => (w._OrtGetInputName = Z.ka)(a, b);
    w._OrtGetOutputName = (a, b) => (w._OrtGetOutputName = Z.la)(a, b);
    w._OrtFree = (a) => (w._OrtFree = Z.ma)(a);
    w._OrtCreateTensor = (a, b, c, d, f, h) =>
      (w._OrtCreateTensor = Z.na)(a, b, c, d, f, h);
    w._OrtGetTensorData = (a, b, c, d, f) =>
      (w._OrtGetTensorData = Z.oa)(a, b, c, d, f);
    w._OrtReleaseTensor = (a) => (w._OrtReleaseTensor = Z.pa)(a);
    w._OrtCreateRunOptions = (a, b, c, d) =>
      (w._OrtCreateRunOptions = Z.qa)(a, b, c, d);
    w._OrtAddRunConfigEntry = (a, b, c) =>
      (w._OrtAddRunConfigEntry = Z.ra)(a, b, c);
    w._OrtReleaseRunOptions = (a) => (w._OrtReleaseRunOptions = Z.sa)(a);
    w._OrtCreateBinding = (a) => (w._OrtCreateBinding = Z.ta)(a);
    w._OrtBindInput = (a, b, c) => (w._OrtBindInput = Z.ua)(a, b, c);
    w._OrtBindOutput = (a, b, c, d) => (w._OrtBindOutput = Z.va)(a, b, c, d);
    w._OrtClearBoundOutputs = (a) => (w._OrtClearBoundOutputs = Z.wa)(a);
    w._OrtReleaseBinding = (a) => (w._OrtReleaseBinding = Z.xa)(a);
    w._OrtRunWithBinding = (a, b, c, d, f) =>
      (w._OrtRunWithBinding = Z.ya)(a, b, c, d, f);
    w._OrtRun = (a, b, c, d, f, h, k, q) =>
      (w._OrtRun = Z.za)(a, b, c, d, f, h, k, q);
    w._OrtEndProfiling = (a) => (w._OrtEndProfiling = Z.Aa)(a);
    var K = () => (K = Z.Ba)();
    w._malloc = (a) => (w._malloc = Z.Ca)(a);
    w._free = (a) => (w._free = Z.Da)(a);
    var wa = (a, b, c, d, f, h) => (wa = Z.Ga)(a, b, c, d, f, h),
      Da = () => (Da = Z.Ha)(),
      bc = (a, b, c, d, f) => (bc = Z.Ia)(a, b, c, d, f),
      hc = (a) => (hc = Z.Ja)(a),
      Ba = (a) => (Ba = Z.Ka)(a),
      vc = () => (vc = Z.La)(),
      kc = (a, b) => (kc = Z.Ma)(a, b),
      cc = (a) => (cc = Z.Na)(a),
      ac = (a) => (ac = Z.Oa)(a),
      $b = () => ($b = Z.Pa)();
    w.___start_em_js = 822690;
    w.___stop_em_js = 822751;
    function Lc() {
      var a = Z;
      a = Object.assign({}, a);
      var b = (d) => () => d() >>> 0,
        c = (d) => (f) => d(f) >>> 0;
      a.Ba = b(a.Ba);
      a.Ca = c(a.Ca);
      a.emscripten_main_runtime_thread_id = b(
        a.emscripten_main_runtime_thread_id,
      );
      a.Oa = c(a.Oa);
      a.Pa = b(a.Pa);
      return a;
    }
    w.stackSave = () => $b();
    w.stackRestore = (a) => cc(a);
    w.stackAlloc = (a) => ac(a);
    w.UTF8ToString = Q;
    w.stringToUTF8 = W;
    w.lengthBytesUTF8 = tc;
    var Mc;
    P = function Nc() {
      Mc || Oc();
      Mc || (P = Nc);
    };
    function Oc() {
      0 < O ||
        (C
          ? (ha(w), C || jc(Ha), startWorker(w))
          : (jc(Ga),
            0 < O ||
              Mc ||
              ((Mc = !0),
              (w.calledRun = !0),
              Fa || (C || jc(Ha), ha(w), C || jc(Ia)))));
    }
    Oc();
    moduleRtn = ia;

    return moduleRtn;
  };
})();
export default ortWasmThreaded;
var isPthread = globalThis.self?.name === "em-pthread";
var isNode = typeof globalThis.process?.versions?.node == "string";
if (isNode)
  isPthread = (await import("worker_threads")).workerData === "em-pthread";

// When running as a pthread, construct a new instance on startup
isPthread && ortWasmThreaded();
