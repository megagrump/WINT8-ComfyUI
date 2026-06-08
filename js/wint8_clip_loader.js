import { app } from "../../scripts/app.js";

const NODE_TYPE = "WINT8CLIPLoader";

// ── Load mode pill colours ────────────────────────────────────────────────────
const MODE_COLORS = {
    "auto":     { bg: "#1a1a00", border: "#6a6a00", text: "#dddd44" },
    "int8":     { bg: "#2a0a00", border: "#aa3300", text: "#ff8844" },
    "standard": { bg: "#0a1a0a", border: "#2a5a2a", text: "#66cc66" },
};

function modeColor(mode) { return MODE_COLORS[mode] ?? MODE_COLORS["auto"]; }

// ── Extension ─────────────────────────────────────────────────────────────────
app.registerExtension({
    name: "WINT8.CLIPLoader",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_TYPE) return;

        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origCreated?.call(this);

            this.color     = "#2a1a00";
            this.bgcolor   = "#1a1000";
            this.title     = "WINT8 CLIP Loader";

            const getW = (name) => this.widgets?.find(ww => ww.name === name);

            const clip2W  = getW("clip_name_2");
            const type2W  = getW("clip_type_2");
            const mode2W  = getW("load_mode_2");
            const dualW   = getW("dual_clip");

            // ── Sync dual visibility ──────────────────────────────────────────
            const syncDual = (isDual) => {
                [clip2W, type2W, mode2W].forEach(ww => {
                    if (!ww) return;
                    if (!isDual) {
                        ww._origType = ww._origType ?? ww.type;
                        ww.type = "hidden";
                        ww.hidden = true;
                    } else {
                        if (ww._origType) ww.type = ww._origType;
                        ww.hidden = false;
                    }
                });
                this.setSize(this.computeSize());
                app.graph.setDirtyCanvas(true, true);
            };

            if (dualW) {
                const origCb = dualW.callback;
                dualW.callback = (val) => {
                    syncDual(val);
                    origCb?.call(dualW, val);
                };
                syncDual(dualW.value);
            }

            // Redraw on mode change
            [getW("load_mode_1"), mode2W].forEach(mw => {
                if (!mw) return;
                const origCb = mw.callback;
                mw.callback = (val) => {
                    app.graph.setDirtyCanvas(true, false);
                    origCb?.call(mw, val);
                };
            });
        };

        // ── Foreground: badge + mode pills + single/dual indicator ────────────
        const origFg = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            origFg?.call(this, ctx);
            if (this.flags?.collapsed) return;

            const W    = this.size[0];
            const getW = (name) => this.widgets?.find(ww => ww.name === name);

            const mode1  = getW("load_mode_1")?.value ?? "auto";
            const mode2  = getW("load_mode_2")?.value ?? "auto";
            const isDual = getW("dual_clip")?.value ?? false;

            ctx.save();

            // ⚡ WINT8 badge
            ctx.font="bold 10px sans-serif"; ctx.textAlign="right";
            ctx.textBaseline="alphabetic"; ctx.fillStyle="#f5a623";
            ctx.shadowColor="#f5a623"; ctx.shadowBlur=6;
            ctx.fillText("WINT8", W-52, 14);

            // INT8 badge pill top-left
            ctx.shadowBlur=0; ctx.shadowColor="transparent";
            const intLabel = "INT8";
            ctx.font="bold 9px monospace";
            const itw = ctx.measureText(intLabel).width;
            const ipw = itw+10, iph = 14, ipx = 8, ipy = 3;
            ctx.beginPath(); ctx.roundRect(ipx,ipy,ipw,iph,4);
            ctx.fillStyle="#2a1800"; ctx.fill();
            ctx.strokeStyle="#cc8800"; ctx.lineWidth=1; ctx.stroke();
            ctx.fillStyle="#ffcc66"; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.fillText(intLabel, ipx+ipw/2, ipy+iph/2);

            // Helper: draw a mode pill at right edge of a widget row
            const drawPill = (label, y) => {
                const c   = modeColor(label);
                const pad = 5;
                ctx.font  = "bold 9px monospace";
                const tw  = ctx.measureText(label).width;
                const pw  = tw + pad*2;
                const ph  = 14;
                const px  = W - pw - 8;
                const py  = y;
                ctx.beginPath(); ctx.roundRect(px,py,pw,ph,4);
                ctx.fillStyle=c.bg; ctx.fill();
                ctx.strokeStyle=c.border; ctx.lineWidth=1; ctx.stroke();
                ctx.fillStyle=c.text; ctx.textAlign="center"; ctx.textBaseline="middle";
                ctx.fillText(label, px+pw/2, py+ph/2);
            };

            // Use last_y from widgets for accurate pill placement
            const getW2    = (name) => this.widgets?.find(ww => ww.name === name);
            const mode1W   = getW2("load_mode_1");
            const dualTogW = getW2("dual_clip");
            const mode2W2  = getW2("load_mode_2");
            const wH       = LiteGraph.NODE_WIDGET_HEIGHT ?? 20;

            // Pill draws left of the ▶ arrow — offset 28px from right edge
            const pillRightEdge = W - 28;

            // Redefine drawPill to draw from a right-edge x
            const drawModePill = (label, rightX, topY) => {
                const c   = modeColor(label);
                const pad = 5;
                ctx.font  = "bold 9px monospace";
                const tw  = ctx.measureText(label).width;
                const pw  = tw + pad*2;
                const ph  = 14;
                const px  = rightX - pw;
                const py  = topY;
                ctx.beginPath(); ctx.roundRect(px,py,pw,ph,4);
                ctx.fillStyle=c.bg; ctx.fill();
                ctx.strokeStyle=c.border; ctx.lineWidth=1; ctx.stroke();
                ctx.fillStyle=c.text; ctx.textAlign="center"; ctx.textBaseline="middle";
                ctx.fillText(label, px+pw/2, py+ph/2);
            };

            // Use last_y when available, fall back to calculated slot position
            const TH2   = LiteGraph.NODE_TITLE_HEIGHT;
            const slotFb = (idx) => TH2 + 4 + idx*(wH+4) + 3;

            const m1y = mode1W?.last_y != null ? mode1W.last_y + 3 : slotFb(2);
            drawModePill(mode1, pillRightEdge, m1y);

            // SINGLE / DUAL indicator
            const dualY = dualTogW?.last_y != null ? dualTogW.last_y + wH/2 : slotFb(3) + wH/2;
            ctx.font="bold 10px sans-serif"; ctx.textAlign="left";
            ctx.textBaseline="middle";
            ctx.fillStyle    = isDual ? "#f5a623" : "#7a5a20";
            ctx.shadowColor  = isDual ? "#f5a623" : "transparent";
            ctx.shadowBlur   = isDual ? 5 : 0;
            ctx.fillText(isDual ? "◉ DUAL" : "◎ SINGLE", 12, dualY);

            if (isDual) {
                ctx.shadowBlur=0; ctx.shadowColor="transparent";
                const m2y = mode2W2?.last_y != null ? mode2W2.last_y + 3 : slotFb(6);
                drawModePill(mode2, pillRightEdge, m2y);
            }

            ctx.restore();
        };

        // ── computeSize ───────────────────────────────────────────────────────
        nodeType.prototype.computeSize = function () {
            const isDual  = this.widgets?.find(ww => ww.name === "dual_clip")?.value ?? false;
            const baseW   = 340;
            const wH      = LiteGraph.NODE_WIDGET_HEIGHT ?? 20;
            const gap     = 4;
            const TH      = LiteGraph.NODE_TITLE_HEIGHT;
            const nSlots  = isDual ? 7 : 4;
            const h       = TH + 8 + nSlots*(wH+gap) + 12;
            return [baseW, Math.max(h, isDual ? 200 : 130)];
        };
    },
});
