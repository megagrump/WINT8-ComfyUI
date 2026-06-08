import { app } from "../../scripts/app.js";

const NODE_TYPE = "WINT8DiffuserLoader";

// ── Extension ─────────────────────────────────────────────────────────────────
app.registerExtension({
    name: "WINT8.DiffuserLoader",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_TYPE) return;

        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origCreated?.call(this);
            this.color     = "#2a1a00";
            this.bgcolor   = "#1a1000";
            this.title     = "WINT8 Diffuser Loader";
        };

        const origFg = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            origFg?.call(this, ctx);
            if (this.flags?.collapsed) return;
            const W = this.size[0];
            ctx.save();
            // Badge
            ctx.font="bold 10px sans-serif"; ctx.textAlign="right";
            ctx.textBaseline="alphabetic"; ctx.fillStyle="#f5a623";
            ctx.shadowColor="#f5a623"; ctx.shadowBlur=6;
            ctx.fillText("WINT8", W-8, 14);
            // INT8 pill
            ctx.shadowBlur=0; ctx.shadowColor="transparent";
            const label = "INT8";
            ctx.font="bold 9px monospace";
            const tw = ctx.measureText(label).width;
            const pad=5, pw=tw+pad*2, ph=14;
            const px=8, py=2;
            ctx.beginPath(); ctx.roundRect(px,py,pw,ph,4);
            ctx.fillStyle="#2a1800"; ctx.fill();
            ctx.strokeStyle="#cc8800"; ctx.lineWidth=1; ctx.stroke();
            ctx.fillStyle="#ffcc66"; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.fillText(label, px+pw/2, py+ph/2);
            ctx.restore();
        };
    },
});
